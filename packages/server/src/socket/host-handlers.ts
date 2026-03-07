import type { TypedServer, TypedSocket } from './index.js';
import { getActiveGame, setActiveGame, type ActiveGame } from './index.js';
import * as db from '../db/index.js';
import { getQuestionPlugin, type GradeEntry, type Question, type QuestionForPlayer } from '@live-trivia/shared';

export function registerHostHandlers(io: TypedServer, socket: TypedSocket): void {

  // Host joins the game room and registers as host
  socket.on('host:create', async (data: { gameCode: string }) => {
    const { gameCode } = data;
    const game = await db.getGame(gameCode);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Verify ownership if socket is authenticated
    if (socket.data.userId && game.hostId !== socket.data.userId) {
      socket.emit('error', { message: 'Not authorized to host this game' });
      return;
    }

    socket.join(`game:${gameCode}`);
    socket.join(`host:${gameCode}`);

    // Reuse existing active game if host reconnects (preserves player state)
    const existing = getActiveGame(gameCode);
    if (existing) {
      existing.hostSocketId = socket.id;

      // Send current lobby state so host UI syncs
      const dbPlayers = await db.getPlayers(gameCode);
      const pendingList = Array.from(existing.pendingPlayers.values()).map((p) => ({
        playerId: p.playerId,
        displayName: p.displayName,
      }));
      socket.emit('lobby_state', { players: dbPlayers, pending: pendingList });

      console.log(`Host reconnected to game ${gameCode}`);
    } else {
      const activeGame: ActiveGame = {
        gameCode,
        hostSocketId: socket.id,
        timers: new Map(),
        playerSockets: new Map(),
        pendingPlayers: new Map(),
        wagers: new Map(),
      };
      setActiveGame(gameCode, activeGame);
      console.log(`Host joined game ${gameCode}`);
    }
  });

  // Host starts a question — pushes it to all players
  socket.on('host:start_question', async (data: { questionIdx: number }) => {
    const { questionIdx } = data;
    const gameCode = getGameCodeFromSocket(socket);
    if (!gameCode) return;

    const game = await db.getGame(gameCode);
    if (!game) return;

    const question = game.questions[questionIdx];
    if (!question) {
      socket.emit('error', { message: `Question ${questionIdx} not found` });
      return;
    }

    // Update game state
    await db.updateGameStatus(gameCode, 'active', questionIdx);

    // Strip correct answers before sending to players
    const plugin = getQuestionPlugin(question.type);
    const safeQuestion = (plugin ? plugin.stripCorrectAnswer(question) : question) as QuestionForPlayer;

    const activeGame = getActiveGame(gameCode);
    if (!activeGame) return;

    // Clear any existing timer
    const existingTimer = activeGame.timers.get(questionIdx);
    if (existingTimer) clearTimeout(existingTimer);

    if (question.wager) {
      // ── Wager phase ──
      activeGame.wagers.clear();
      const wagerTime = question.wagerTimeLimit || 15;
      const wagerEndTime = Date.now() + wagerTime * 1000;

      // Send personalized wager_phase to each player (maxWager = their current score)
      const players = await db.getPlayers(gameCode);
      for (const [playerId, socketId] of activeGame.playerSockets.entries()) {
        const player = players.find((p) => p.playerId === playerId);
        const maxWager = Math.max(0, player?.totalScore ?? 0);
        io.to(socketId).emit('wager_phase', {
          question: safeQuestion,
          questionIdx,
          totalQuestions: game.questions.length,
          wagerEndTime,
          maxWager,
        });
      }

      // Wager timer — when it expires, notify host that wagers are done (host decides when to start)
      const wagerTimer = setTimeout(() => {
        // Clear the timer and notify host
        activeGame.timers.delete(questionIdx);
        io.to(activeGame.hostSocketId).emit('wagers_complete');
        console.log(`Game ${gameCode}: Wager phase ended for question ${questionIdx + 1}, waiting for host`);
      }, wagerTime * 1000);
      activeGame.timers.set(questionIdx, wagerTimer);

      // Also emit wager_phase to host so their UI updates
      io.to(activeGame.hostSocketId).emit('wager_phase', {
        question: safeQuestion,
        questionIdx,
        totalQuestions: game.questions.length,
        wagerEndTime: wagerEndTime,
        maxWager: 0,
      });

      console.log(`Game ${gameCode}: Wager phase for question ${questionIdx + 1}/${game.questions.length}`);
    } else {
      // ── Normal question flow ──
      const endTime = Date.now() + question.timeLimit * 1000;

      io.to(`game:${gameCode}`).emit('question', {
        question: safeQuestion,
        questionIdx,
        totalQuestions: game.questions.length,
        endTime,
      });

      const timer = setTimeout(async () => {
        await handleQuestionTimeout(io, gameCode, questionIdx, game.questions);
      }, question.timeLimit * 1000);
      activeGame.timers.set(questionIdx, timer);

      console.log(`Game ${gameCode}: Started question ${questionIdx + 1}/${game.questions.length}`);
    }
  });

  // Host manually ends the current question early
  socket.on('host:end_question', async () => {
    const gameCode = getGameCodeFromSocket(socket);
    if (!gameCode) return;

    const game = await db.getGame(gameCode);
    if (!game) return;

    const activeGame = getActiveGame(gameCode);
    if (activeGame) {
      const timer = activeGame.timers.get(game.currentQuestionIdx);
      if (timer) clearTimeout(timer);
    }

    await handleQuestionTimeout(io, gameCode, game.currentQuestionIdx, game.questions);
  });

  // Host triggers answer phase after wagers are done
  socket.on('host:start_answer_phase', async () => {
    const gameCode = getGameCodeFromSocket(socket);
    if (!gameCode) return;

    const game = await db.getGame(gameCode);
    if (!game) return;

    const questionIdx = game.currentQuestionIdx;
    const question = game.questions[questionIdx];
    if (!question) return;

    const plugin = getQuestionPlugin(question.type);
    const safeQuestion = (plugin ? plugin.stripCorrectAnswer(question) : question) as QuestionForPlayer;

    startAnswerPhase(io, gameCode, questionIdx, question, safeQuestion, game.questions);
  });

  // Host submits grades for the current question
  socket.on('host:grade_answers', async (data: { grades: GradeEntry[] }) => {
    const { grades } = data;
    const gameCode = getGameCodeFromSocket(socket);
    if (!gameCode) return;

    const game = await db.getGame(gameCode);
    if (!game) return;

    // Save grades and update scores
    const question = game.questions[game.currentQuestionIdx];
    await db.gradeAnswers(gameCode, game.currentQuestionIdx, grades);

    // Clamp scores to 0 for wager rounds (negative points possible)
    if (question?.wager) {
      const players = await db.getPlayers(gameCode);
      for (const p of players) {
        if (p.totalScore < 0) {
          await db.clampPlayerScore(gameCode, p.playerId);
        }
      }
    }

    // Get updated leaderboard
    const leaderboard = await db.getLeaderboard(gameCode);

    await db.updateGameStatus(gameCode, 'leaderboard');

    // Send leaderboard to everyone
    const activeGame = getActiveGame(gameCode);
    if (activeGame) {
      // Send personalized leaderboard to each player (with their rank)
      for (const [playerId, socketId] of activeGame.playerSockets.entries()) {
        const yourRank = leaderboard.find((e) => e.playerId === playerId)?.rank;
        io.to(socketId).emit('leaderboard', { rankings: leaderboard, yourRank });
      }
    }

    // Send to host
    socket.emit('leaderboard', { rankings: leaderboard });

    // Check if game is over
    const isLastQuestion = game.currentQuestionIdx >= game.questions.length - 1;
    if (isLastQuestion) {
      await db.updateGameStatus(gameCode, 'finished');
      io.to(`game:${gameCode}`).emit('game_over', { rankings: leaderboard });
    }

    console.log(`Game ${gameCode}: Graded question ${game.currentQuestionIdx + 1}`);
  });

  // Host approves a pending player
  socket.on('host:approve_player', async (data: { playerId: string }) => {
    const { playerId } = data;
    const gameCode = getGameCodeFromSocket(socket);
    if (!gameCode) return;

    const activeGame = getActiveGame(gameCode);
    if (!activeGame) return;

    const pending = activeGame.pendingPlayers.get(playerId);
    if (!pending) return;

    // Move from pending to approved
    activeGame.pendingPlayers.delete(playerId);

    const player = {
      playerId: pending.playerId,
      displayName: pending.displayName,
      totalScore: 0,
      joinedAt: Date.now(),
    };

    await db.addPlayer(gameCode, player);
    await db.incrementPlayerCount(gameCode);
    activeGame.playerSockets.set(playerId, pending.socketId);

    // Put the player's socket into the game room
    const playerSocket = io.sockets.sockets.get(pending.socketId);
    if (playerSocket) {
      playerSocket.join(`game:${gameCode}`);
      (playerSocket as any).playerId = playerId;
      (playerSocket as any).gameCode = gameCode;
      (playerSocket as any).displayName = pending.displayName;

      playerSocket.emit('join_success', {
        playerId,
        game: { gameCode, status: 'lobby' },
      });
    }

    // Notify everyone a player joined
    io.to(`game:${gameCode}`).emit('player_joined', { player });

    console.log(`Host approved player "${pending.displayName}" in game ${gameCode}`);
  });

  // Host rejects a pending player
  socket.on('host:reject_player', async (data: { playerId: string }) => {
    const { playerId } = data;
    const gameCode = getGameCodeFromSocket(socket);
    if (!gameCode) return;

    const activeGame = getActiveGame(gameCode);
    if (!activeGame) return;

    const pending = activeGame.pendingPlayers.get(playerId);
    if (!pending) return;

    activeGame.pendingPlayers.delete(playerId);

    // Notify the rejected player
    const playerSocket = io.sockets.sockets.get(pending.socketId);
    if (playerSocket) {
      playerSocket.emit('join_rejected', { message: 'The host declined your request to join.' });
    }

    console.log(`Host rejected player "${pending.displayName}" in game ${gameCode}`);
  });
}

// ─── Helpers ───────────────────────────────────────────────────────

function getGameCodeFromSocket(socket: TypedSocket): string | null {
  for (const room of socket.rooms) {
    if (room.startsWith('host:')) {
      return room.slice(5);
    }
  }
  return null;
}

function startAnswerPhase(
  io: TypedServer,
  gameCode: string,
  questionIdx: number,
  question: Question,
  safeQuestion: QuestionForPlayer,
  questions: Question[],
): void {
  const activeGame = getActiveGame(gameCode);
  if (!activeGame) return;

  // Clear wager timer
  const wagerTimer = activeGame.timers.get(questionIdx);
  if (wagerTimer) clearTimeout(wagerTimer);

  const endTime = Date.now() + question.timeLimit * 1000;

  // Tell players wager phase is over, start answering
  io.to(`game:${gameCode}`).emit('answer_phase', { endTime });
  io.to(`game:${gameCode}`).emit('question', {
    question: safeQuestion,
    questionIdx,
    totalQuestions: questions.length,
    endTime,
  });

  // Set answer timer
  const timer = setTimeout(async () => {
    await handleQuestionTimeout(io, gameCode, questionIdx, questions);
  }, question.timeLimit * 1000);
  activeGame.timers.set(questionIdx, timer);

  console.log(`Game ${gameCode}: Answer phase for question ${questionIdx + 1}`);
}

async function handleQuestionTimeout(
  io: TypedServer,
  gameCode: string,
  questionIdx: number,
  questions: Question[],
): Promise<void> {
  // Notify players that the question is closed
  io.to(`game:${gameCode}`).emit('question_closed');

  await db.updateGameStatus(gameCode, 'grading');

  // Get all answers and auto-grade
  const answers = await db.getAnswersForQuestion(gameCode, questionIdx);
  const question = questions[questionIdx];
  const plugin = getQuestionPlugin(question.type);
  const activeGame = getActiveGame(gameCode);
  const isWager = question.wager === true;

  const answersForHost = answers.map((a) => {
    let autoGradeResult = null;
    if (plugin) {
      try {
        autoGradeResult = plugin.autoGrade(question, a.answer);
        // For wager rounds, adjust score based on wager amount
        if (isWager && autoGradeResult && activeGame) {
          const wager = activeGame.wagers.get(a.playerId) ?? 0;
          const isCorrect = autoGradeResult.score > 0;
          autoGradeResult = {
            score: isCorrect ? wager : -wager,
            maxScore: wager,
          };
        }
      } catch {
        // Auto-grade failed — host will grade manually
      }
    }

    return {
      playerId: a.playerId,
      displayName: a.displayName,
      answer: a.answer,
      autoGradeResult,
      wager: isWager ? (activeGame?.wagers.get(a.playerId) ?? 0) : undefined,
    };
  });

  // Send answers to host for grading
  if (activeGame) {
    io.to(activeGame.hostSocketId).emit('all_answers', { answers: answersForHost });
  }
}
