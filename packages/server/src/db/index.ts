// Auto-select database backend based on environment.
// USE_DYNAMODB=true → DynamoDB (requires AWS credentials + table)
// Default (local dev) → in-memory store

const useDynamo = process.env.USE_DYNAMODB === 'true';

const db = useDynamo
  ? await import('./dynamo.js')
  : await import('./memory.js');

if (!useDynamo) {
  console.log('Using in-memory store (local dev). Set USE_DYNAMODB=true for DynamoDB.');
}

export const createGame = db.createGame;
export const getGame = db.getGame;
export const updateGameStatus = db.updateGameStatus;
export const addPlayer = db.addPlayer;
export const getPlayers = db.getPlayers;
export const updatePlayerScore = db.updatePlayerScore;
export const submitAnswer = db.submitAnswer;
export const getAnswersForQuestion = db.getAnswersForQuestion;
export const gradeAnswers = db.gradeAnswers;
export const getLeaderboard = db.getLeaderboard;
export const removePlayer = db.removePlayer;
