import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import * as db from '../db/index.js';

// Initialize Clerk middleware — reads CLERK_SECRET_KEY from env
export const clerk = clerkMiddleware();

// Require authenticated user — returns 401 if no valid session
export const authenticated = requireAuth();

// Verify the authenticated user owns the game specified by :code param
export async function verifyGameOwnership(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  const gameCode = (req.params.code as string)?.toUpperCase();

  if (!gameCode) {
    res.status(400).json({ error: 'Game code is required' });
    return;
  }

  const game = await db.getGame(gameCode);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  if (game.hostId !== userId) {
    res.status(403).json({ error: 'Not authorized to access this game' });
    return;
  }

  // Attach game to request for downstream handlers
  (req as any).game = game;
  next();
}
