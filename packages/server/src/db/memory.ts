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

export async function createGame(gameCode: string, hostId: string, questions: Question[]): Promise<Game> {
  const game: Game = {
    gameCode,
    status: 'lobby',
    questions,
    currentQuestionIdx: -1,
    createdAt: Date.now(),
    hostId,
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
