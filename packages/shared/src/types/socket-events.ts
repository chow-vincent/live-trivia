import type { Question, Answer } from './question.js';
import type { GradeEntry, LeaderboardEntry, Player } from './game.js';

// ─── Client → Server Events ───────────────────────────────────────

export interface ClientToServerEvents {
  // Player events
  'player:join': (data: { gameCode: string; displayName: string }) => void;
  'player:submit_answer': (data: { answer: Answer }) => void;
  'player:submit_wager': (data: { wager: number }) => void;

  // Host events
  'host:create': (data: { gameCode: string }) => void;
  'host:approve_player': (data: { playerId: string }) => void;
  'host:reject_player': (data: { playerId: string }) => void;
  'host:start_question': (data: { questionIdx: number }) => void;
  'host:end_question': () => void;
  'host:start_answer_phase': () => void;
  'host:grade_answers': (data: { grades: GradeEntry[] }) => void;
  'host:next_question': () => void;
}

// ─── Server → Client Events ───────────────────────────────────────

export interface ServerToClientEvents {
  // Lobby events
  'player_joined': (data: { player: Player }) => void;
  'player_left': (data: { playerId: string }) => void;
  'join_pending': (data: { playerId: string }) => void;
  'join_success': (data: { playerId: string; game: { gameCode: string; status: string } }) => void;
  'join_rejected': (data: { message: string }) => void;
  'join_error': (data: { message: string }) => void;
  'player_pending': (data: { playerId: string; displayName: string }) => void;
  'lobby_state': (data: { players: Player[]; pending: Array<{ playerId: string; displayName: string }> }) => void;

  // Game flow events
  'question': (data: { question: QuestionForPlayer; questionIdx: number; totalQuestions: number; endTime: number }) => void;
  'question_closed': () => void;
  'answer_received': (data: { playerId: string; displayName: string }) => void;
  'all_answers': (data: { answers: PlayerAnswerForHost[] }) => void;

  // Wager events
  'wager_phase': (data: { question: QuestionForPlayer; questionIdx: number; totalQuestions: number; wagerEndTime: number; maxWager: number }) => void;
  'wager_locked': (data: { playerId: string }) => void;
  'wagers_complete': () => void;
  'answer_phase': (data: { endTime: number }) => void;

  // Scoring events
  'leaderboard': (data: { rankings: LeaderboardEntry[]; yourRank?: number }) => void;
  'game_over': (data: { rankings: LeaderboardEntry[] }) => void;

  // Error events
  'error': (data: { message: string }) => void;
}

// ─── Derived Types ─────────────────────────────────────────────────

// Question as sent to players — strips out correct answers.
export interface QuestionForPlayer {
  id: string;
  type: string;
  text: string;
  timeLimit: number;
  points: number;
  options?: string[];    // multiple choice
  items?: string[];      // ranking
  imageUrl?: string;     // optional image
}

// Answer data as shown to host for grading
export interface PlayerAnswerForHost {
  playerId: string;
  displayName: string;
  answer: Answer;
  autoGradeResult: { score: number; maxScore: number } | null;
  wager?: number; // amount wagered (wager rounds only)
}
