import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@live-trivia/shared';
import { registerHostHandlers } from './host-handlers.js';
import { registerPlayerHandlers } from './player-handlers.js';

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type TypedSocket = Parameters<Parameters<TypedServer['on']>[1]>[0];

// Pending player awaiting host approval
export interface PendingPlayer {
  playerId: string;
  displayName: string;
  socketId: string;
}

// In-memory game state for active games (supplements DynamoDB)
export interface ActiveGame {
  gameCode: string;
  hostSocketId: string;
  timers: Map<number, NodeJS.Timeout>;       // questionIdx → timer
  playerSockets: Map<string, string>;        // playerId → socketId
  pendingPlayers: Map<string, PendingPlayer>; // playerId → pending info
}

const activeGames = new Map<string, ActiveGame>();

export function getActiveGame(gameCode: string): ActiveGame | undefined {
  return activeGames.get(gameCode);
}

export function setActiveGame(gameCode: string, game: ActiveGame): void {
  activeGames.set(gameCode, game);
}

export function setupSocketIO(httpServer: HttpServer): TypedServer {
  const io: TypedServer = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    registerHostHandlers(io, socket);
    registerPlayerHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Find and clean up the player from any active game
      for (const [, game] of activeGames.entries()) {
        // Clean up approved players
        for (const [playerId, socketId] of game.playerSockets.entries()) {
          if (socketId === socket.id) {
            game.playerSockets.delete(playerId);
            io.to(game.hostSocketId).emit('player_left', { playerId });
            break;
          }
        }
        // Clean up pending players
        for (const [playerId, pending] of game.pendingPlayers.entries()) {
          if (pending.socketId === socket.id) {
            game.pendingPlayers.delete(playerId);
            break;
          }
        }
      }
    });
  });

  return io;
}
