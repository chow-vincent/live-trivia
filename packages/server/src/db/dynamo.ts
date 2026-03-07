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
  region: process.env.AWS_REGION || 'us-west-2',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

const ddb = DynamoDBDocumentClient.from(client);

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

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `GAME#${gameCode}`,
        SK: 'META',
        ...game,
        ttl: Math.floor(Date.now() / 1000) + 7776000, // 90-day TTL
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
  wager?: number,
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
        ...(wager !== undefined && { wager }),
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

// ─── Host Dashboard Operations ────────────────────────────────────

export async function getGamesByHost(
  hostId: string,
  limit: number = 20,
  cursor?: string,
): Promise<{ games: Array<{ gameCode: string; name: string; status: string; playerCount: number; createdAt: number }>; nextCursor?: string }> {
  const params: Record<string, unknown> = {
    TableName: TABLE_NAME,
    IndexName: 'hostId-createdAt-index',
    KeyConditionExpression: 'hostId = :hostId',
    ExpressionAttributeValues: { ':hostId': hostId },
    ScanIndexForward: false, // newest first
    Limit: limit,
  };

  if (cursor) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64url').toString());
  }

  const result = await ddb.send(new QueryCommand(params as any));

  const games = (result.Items || []).map(({ PK, SK, hostId: _, ...item }) => ({
    gameCode: item.gameCode as string,
    name: (item.name as string) || 'Untitled Game',
    status: item.status as string,
    playerCount: (item.playerCount as number) || 0,
    createdAt: item.createdAt as number,
  }));

  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url')
    : undefined;

  return { games, nextCursor };
}

export async function updateDraftGame(
  gameCode: string,
  name?: string,
  questions?: Question[],
): Promise<void> {
  const updates: string[] = [];
  const values: Record<string, unknown> = {};
  const names: Record<string, string> = {};

  if (name !== undefined) {
    updates.push('#name = :name');
    values[':name'] = name;
    names['#name'] = 'name';
  }

  if (questions !== undefined) {
    updates.push('questions = :questions');
    values[':questions'] = questions;
  }

  if (updates.length === 0) return;

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `GAME#${gameCode}`, SK: 'META' },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeValues: values,
      ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
    }),
  );
}

export async function deleteGame(gameCode: string): Promise<void> {
  // Query all items for this game (META, PLAYERs, ANSWERs)
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `GAME#${gameCode}` },
      ProjectionExpression: 'PK, SK',
    }),
  );

  const items = result.Items || [];
  if (items.length === 0) return;

  // Batch delete in chunks of 25
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((item) => ({
            DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
          })),
        },
      }),
    );
  }
}

export async function incrementPlayerCount(gameCode: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `GAME#${gameCode}`, SK: 'META' },
      UpdateExpression: 'SET playerCount = if_not_exists(playerCount, :zero) + :one',
      ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
    }),
  );
}

export async function clampPlayerScore(gameCode: string, playerId: string): Promise<void> {
  const players = await getPlayers(gameCode);
  const player = players.find((p) => p.playerId === playerId);
  if (player && player.totalScore < 0) {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `GAME#${gameCode}`, SK: `PLAYER#${playerId}` },
        UpdateExpression: 'SET totalScore = :zero',
        ExpressionAttributeValues: { ':zero': 0 },
      }),
    );
  }
}
