import { nanoid } from 'nanoid';
import type { TypedServer, TypedSocket } from './index.js';
import { getActiveGame } from './index.js';
import * as db from '../db/index.js';
import { getQuestionPlugin, type Answer } from '@live-trivia/shared';

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
    const safeName = displayName.trim().slice(0, 30);

    // Place player in pending state — host must approve
    const activeGame = getActiveGame(gameCode);
    if (!activeGame) {
      socket.emit('join_error', { message: 'Game is not ready yet.' });
      return;
    }

    activeGame.pendingPlayers.set(playerId, {
      playerId,
      displayName: safeName,
      socketId: socket.id,
    });

    // Tell the player they're waiting for approval
    socket.emit('join_pending', { playerId });

    // Tell the host a player is waiting
    io.to(activeGame.hostSocketId).emit('player_pending', {
      playerId,
      displayName: safeName,
    });

    console.log(`Player "${safeName}" pending approval in game ${gameCode}`);
  });

  socket.on('player:submit_wager', async (data: { wager: number }) => {
    const playerId = (socket as any).playerId as string | undefined;
    const gameCode = (socket as any).gameCode as string | undefined;

    if (!playerId || !gameCode) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    const activeGame = getActiveGame(gameCode);
    if (!activeGame) return;

    // Cap wager to player's current score (server-side validation)
    const players = await db.getPlayers(gameCode);
    const player = players.find((p) => p.playerId === playerId);
    const maxWager = Math.max(0, player?.totalScore ?? 0);
    const safeWager = Math.max(0, Math.min(data.wager, maxWager));

    activeGame.wagers.set(playerId, safeWager);

    // Notify host
    io.to(activeGame.hostSocketId).emit('wager_locked', { playerId });

    // Check if all players have locked in — if so, notify host early
    const allLocked = Array.from(activeGame.playerSockets.keys()).every(
      (pid) => activeGame.wagers.has(pid),
    );
    if (allLocked) {
      // Clear the wager timer and tell host all wagers are in
      const game = await db.getGame(gameCode);
      if (game) {
        const wagerTimer = activeGame.timers.get(game.currentQuestionIdx);
        if (wagerTimer) clearTimeout(wagerTimer);
        activeGame.timers.delete(game.currentQuestionIdx);
      }
      io.to(activeGame.hostSocketId).emit('wagers_complete');
      console.log(`Game ${gameCode}: All wagers locked, waiting for host to start answer phase`);
    }

    console.log(`Player ${playerId} wagered ${safeWager} in game ${gameCode}`);
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
