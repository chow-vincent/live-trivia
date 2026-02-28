import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Game, Player, PlayerAnswer, LeaderboardEntry, GradeEntry, Question, Answer } from '@live-trivia/shared';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'LiveTrivia';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

const ddb = DynamoDBDocumentClient.from(client);

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

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `GAME#${gameCode}`,
        SK: 'META',
        ...game,
        ttl: Math.floor(Date.now() / 1000) + 86400, // 24h TTL
      },
    }),
  );

  return game;
}

export async function getGame(gameCode: string): Promise<Game | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `GAME#${gameCode}`, SK: 'META' },
    }),
  );

  if (!result.Item) return null;
  const { PK, SK, ttl, ...game } = result.Item;
  return game as Game;
}

export async function updateGameStatus(gameCode: string, status: Game['status'], currentQuestionIdx?: number): Promise<void> {
  const updateExpr = currentQuestionIdx !== undefined
    ? 'SET #status = :status, currentQuestionIdx = :idx'
    : 'SET #status = :status';

  const exprValues: Record<string, unknown> = { ':status': status };
  if (currentQuestionIdx !== undefined) {
    exprValues[':idx'] = currentQuestionIdx;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `GAME#${gameCode}`, SK: 'META' },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: exprValues,
    }),
  );
}

// ─── Player Operations ─────────────────────────────────────────────

export async function addPlayer(gameCode: string, player: Player): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `GAME#${gameCode}`,
        SK: `PLAYER#${player.playerId}`,
        ...player,
      },
    }),
  );
}

export async function getPlayers(gameCode: string): Promise<Player[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `GAME#${gameCode}`,
        ':prefix': 'PLAYER#',
      },
    }),
  );

  return (result.Items || []).map(({ PK, SK, ...player }) => player as Player);
}

export async function updatePlayerScore(gameCode: string, playerId: string, additionalPoints: number): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `GAME#${gameCode}`, SK: `PLAYER#${playerId}` },
      UpdateExpression: 'SET totalScore = totalScore + :pts',
      ExpressionAttributeValues: { ':pts': additionalPoints },
    }),
  );
}

// ─── Answer Operations ─────────────────────────────────────────────

export async function submitAnswer(
  gameCode: string,
  playerId: string,
  displayName: string,
  questionIdx: number,
  answer: Answer,
): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `GAME#${gameCode}`,
        SK: `ANSWER#${questionIdx}#${playerId}`,
        playerId,
        displayName,
        questionIdx,
        answer,
        submittedAt: Date.now(),
        pointsAwarded: null,
        graded: false,
      },
    }),
  );
}

export async function getAnswersForQuestion(gameCode: string, questionIdx: number): Promise<PlayerAnswer[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `GAME#${gameCode}`,
        ':prefix': `ANSWER#${questionIdx}#`,
      },
    }),
  );

  return (result.Items || []).map(({ PK, SK, ...answer }) => answer as PlayerAnswer);
}

export async function gradeAnswers(gameCode: string, questionIdx: number, grades: GradeEntry[]): Promise<void> {
  // Update answer records with grades
  for (const grade of grades) {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `GAME#${gameCode}`,
          SK: `ANSWER#${questionIdx}#${grade.playerId}`,
        },
        UpdateExpression: 'SET pointsAwarded = :pts, graded = :g',
        ExpressionAttributeValues: { ':pts': grade.pointsAwarded, ':g': true },
      }),
    );

    // Update player total score
    await updatePlayerScore(gameCode, grade.playerId, grade.pointsAwarded);
  }
}

// ─── Leaderboard ───────────────────────────────────────────────────

export async function getLeaderboard(gameCode: string): Promise<LeaderboardEntry[]> {
  const players = await getPlayers(gameCode);
  const sorted = players.sort((a, b) => b.totalScore - a.totalScore);

  return sorted.map((p, idx) => ({
    playerId: p.playerId,
    displayName: p.displayName,
    totalScore: p.totalScore,
    rank: idx + 1,
  }));
}

export async function removePlayer(gameCode: string, playerId: string): Promise<void> {
  // We just leave the record — it's cleaned up by TTL
}
