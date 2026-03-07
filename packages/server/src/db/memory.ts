import type { Game, Player, PlayerAnswer, LeaderboardEntry, GradeEntry, Question, Answer } from '@live-trivia/shared';

// In-memory store for local development — no DynamoDB needed.
// Data is lost on server restart.

const games = new Map<string, Game>();
const players = new Map<string, Player[]>(); // gameCode → players
const answers = new Map<string, PlayerAnswer[]>(); // "gameCode#questionIdx" → answers

function answerKey(gameCode: string, questionIdx: number): string {
  return `${gameCode}#${questionIdx}`;
}

// ─── Game Operations ───────────────────────────────────────────────

export async function createGame(gameCode: string, hostId: string, questions: Question[], name: string, status: Game['status'] = 'lobby'): Promise<Game> {
  const game: Game = {
    gameCode,
    name,
    status,
    questions,
    currentQuestionIdx: -1,
    createdAt: Date.now(),
    hostId,
    playerCount: 0,
  };
  games.set(gameCode, game);
  players.set(gameCode, []);
  return game;
}

export async function getGame(gameCode: string): Promise<Game | null> {
  return games.get(gameCode) ?? null;
}

export async function updateGameStatus(gameCode: string, status: Game['status'], currentQuestionIdx?: number): Promise<void> {
  const game = games.get(gameCode);
  if (!game) return;
  game.status = status;
  if (currentQuestionIdx !== undefined) {
    game.currentQuestionIdx = currentQuestionIdx;
  }
}

// ─── Player Operations ─────────────────────────────────────────────

export async function addPlayer(gameCode: string, player: Player): Promise<void> {
  const list = players.get(gameCode) ?? [];
  list.push(player);
  players.set(gameCode, list);
}

export async function getPlayers(gameCode: string): Promise<Player[]> {
  return players.get(gameCode) ?? [];
}

export async function updatePlayerScore(gameCode: string, playerId: string, additionalPoints: number): Promise<void> {
  const list = players.get(gameCode) ?? [];
  const player = list.find((p) => p.playerId === playerId);
  if (player) {
    player.totalScore += additionalPoints;
  }
}

// ─── Answer Operations ─────────────────────────────────────────────

export async function submitAnswer(
  gameCode: string,
  playerId: string,
  displayName: string,
  questionIdx: number,
  answer: Answer,
  wager?: number,
): Promise<void> {
  const key = answerKey(gameCode, questionIdx);
  const list = answers.get(key) ?? [];
  list.push({
    playerId,
    displayName,
    questionIdx,
    answer,
    submittedAt: Date.now(),
    pointsAwarded: null,
    graded: false,
    wager,
  });
  answers.set(key, list);
}

export async function getAnswersForQuestion(gameCode: string, questionIdx: number): Promise<PlayerAnswer[]> {
  return answers.get(answerKey(gameCode, questionIdx)) ?? [];
}

export async function gradeAnswers(gameCode: string, questionIdx: number, grades: GradeEntry[]): Promise<void> {
  const key = answerKey(gameCode, questionIdx);
  const list = answers.get(key) ?? [];

  for (const grade of grades) {
    const ans = list.find((a) => a.playerId === grade.playerId);
    if (ans) {
      ans.pointsAwarded = grade.pointsAwarded;
      ans.graded = true;
    }
    await updatePlayerScore(gameCode, grade.playerId, grade.pointsAwarded);
  }
}

// ─── Leaderboard ───────────────────────────────────────────────────

export async function getLeaderboard(gameCode: string): Promise<LeaderboardEntry[]> {
  const list = await getPlayers(gameCode);
  const sorted = [...list].sort((a, b) => b.totalScore - a.totalScore);

  return sorted.map((p, idx) => ({
    playerId: p.playerId,
    displayName: p.displayName,
    totalScore: p.totalScore,
    rank: idx + 1,
  }));
}

export async function removePlayer(gameCode: string, playerId: string): Promise<void> {
  // No-op for in-memory store
}

// ─── Host Dashboard Operations ────────────────────────────────────

export async function getGamesByHost(
  hostId: string,
  limit: number = 20,
  cursor?: string,
): Promise<{ games: Array<{ gameCode: string; name: string; status: string; playerCount: number; createdAt: number }>; nextCursor?: string }> {
  const allGames = Array.from(games.values())
    .filter((g) => g.hostId === hostId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const startIdx = cursor ? parseInt(cursor, 10) : 0;
  const slice = allGames.slice(startIdx, startIdx + limit);

  return {
    games: slice.map((g) => ({
      gameCode: g.gameCode,
      name: g.name,
      status: g.status,
      playerCount: g.playerCount,
      createdAt: g.createdAt,
    })),
    nextCursor: startIdx + limit < allGames.length ? String(startIdx + limit) : undefined,
  };
}

export async function updateDraftGame(
  gameCode: string,
  name?: string,
  questions?: import('@live-trivia/shared').Question[],
): Promise<void> {
  const game = games.get(gameCode);
  if (!game) return;
  if (name !== undefined) game.name = name;
  if (questions !== undefined) game.questions = questions;
}

export async function deleteGame(gameCode: string): Promise<void> {
  games.delete(gameCode);
  players.delete(gameCode);
  // Delete all answer entries for this game
  for (const key of answers.keys()) {
    if (key.startsWith(`${gameCode}#`)) {
      answers.delete(key);
    }
  }
}

export async function incrementPlayerCount(gameCode: string): Promise<void> {
  const game = games.get(gameCode);
  if (game) game.playerCount++;
}

export async function clampPlayerScore(gameCode: string, playerId: string): Promise<void> {
  const list = players.get(gameCode) ?? [];
  const player = list.find((p) => p.playerId === playerId);
  if (player && player.totalScore < 0) {
    player.totalScore = 0;
  }
}
