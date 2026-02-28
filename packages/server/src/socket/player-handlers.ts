import { nanoid } from 'nanoid';
import type { TypedServer, TypedSocket } from './index.js';
import { getActiveGame } from './index.js';
import * as db from '../db/index.js';
import { getQuestionPlugin, type Player, type Answer } from '@live-trivia/shared';

export function registerPlayerHandlers(io: TypedServer, socket: TypedSocket): void {

  socket.on('player:join', async (data: { gameCode: string; displayName: string }) => {
    const { gameCode, displayName } = data;
    const game = await db.getGame(gameCode);
    if (!game) {
      socket.emit('join_error', { message: 'Game not found. Check your code and try again.' });
      return;
    }

    if (game.status !== 'lobby') {
      socket.emit('join_error', { message: 'This game has already started.' });
      return;
    }

    const playerId = nanoid(10);
    const player: Player = {
      playerId,
      displayName: displayName.trim().slice(0, 30), // Sanitize length
      totalScore: 0,
      joinedAt: Date.now(),
    };

    // Save to DynamoDB
    await db.addPlayer(gameCode, player);

    // Track socket mapping
    const activeGame = getActiveGame(gameCode);
    if (activeGame) {
      activeGame.playerSockets.set(playerId, socket.id);
    }

    // Join the game room
    socket.join(`game:${gameCode}`);

    // Store player info on socket for later use
    (socket as any).playerId = playerId;
    (socket as any).gameCode = gameCode;
    (socket as any).displayName = player.displayName;

    // Confirm join to the player
    socket.emit('join_success', {
      playerId,
      game: { gameCode: game.gameCode, status: game.status },
    });

    // Notify everyone (including host) that a player joined
    io.to(`game:${gameCode}`).emit('player_joined', { player });

    console.log(`Player "${player.displayName}" joined game ${gameCode}`);
  });

  socket.on('player:submit_answer', async (data: { answer: Answer }) => {
    const { answer } = data;
    const playerId = (socket as any).playerId as string | undefined;
    const gameCode = (socket as any).gameCode as string | undefined;
    const displayName = (socket as any).displayName as string | undefined;

    if (!playerId || !gameCode || !displayName) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    const game = await db.getGame(gameCode);
    if (!game || game.status !== 'active') {
      socket.emit('error', { message: 'No active question' });
      return;
    }

    // Validate answer format
    const plugin = getQuestionPlugin(answer.type);
    if (!plugin || !plugin.validateAnswer(answer)) {
      socket.emit('error', { message: 'Invalid answer format' });
      return;
    }

    // Save answer
    await db.submitAnswer(gameCode, playerId, displayName, game.currentQuestionIdx, answer);

    // Notify host that an answer was received
    const activeGame = getActiveGame(gameCode);
    if (activeGame) {
      io.to(activeGame.hostSocketId).emit('answer_received', { playerId, displayName });
    }

    console.log(`Player "${displayName}" submitted answer for Q${game.currentQuestionIdx + 1} in game ${gameCode}`);
  });
}
