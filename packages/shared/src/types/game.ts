import type { Question, Answer } from './question.js';

// ─── Game Status ───────────────────────────────────────────────────

export type GameStatus = 'draft' | 'lobby' | 'active' | 'grading' | 'leaderboard' | 'finished';

// ─── Game ──────────────────────────────────────────────────────────

export interface Game {
  gameCode: string;
  name: string;
  status: GameStatus;
  questions: Question[];
  currentQuestionIdx: number;
  createdAt: number;
  hostId: string;
  playerCount: number;
}

// ─── Player ────────────────────────────────────────────────────────

export interface Player {
  playerId: string;
  displayName: string;
  totalScore: number;
  joinedAt: number;
}

// ─── Player Answer ─────────────────────────────────────────────────

export interface PlayerAnswer {
  playerId: string;
  displayName: string;
  questionIdx: number;
  answer: Answer;
  submittedAt: number;
  pointsAwarded: number | null; // null = not yet graded
  graded: boolean;
  wager?: number; // amount wagered (wager rounds only)
}

// ─── Leaderboard ───────────────────────────────────────────────────

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  totalScore: number;
  rank: number;
}

// ─── Grade Submission ──────────────────────────────────────────────

export interface GradeEntry {
  playerId: string;
  pointsAwarded: number;
}
