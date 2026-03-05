import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { authenticated, verifyGameOwnership } from '../middleware/auth.js';
import { generateUniqueGameCode } from '../game-code.js';
import * as db from '../db/index.js';
import { getQuestionPlugin, type Question, type Game } from '@live-trivia/shared';
import { nanoid } from 'nanoid';

const router = Router();

// All host routes require authentication
router.use(authenticated);

// ─── Test endpoint ────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const { userId } = getAuth(req);
  res.json({ userId });
});

// ─── Game CRUD ────────────────────────────────────────────────────

// POST /api/host/games — Create a new game (draft or launched)
router.post('/games', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { name, questions: rawQuestions, launch } = req.body as {
      name?: string;
      questions: unknown[];
      launch?: boolean;
    };

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      res.status(400).json({ error: 'Questions array is required and must not be empty' });
      return;
    }

    // Validate questions
    const questions: Question[] = [];
    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i] as any;
      if (!q.type || !q.text || !q.timeLimit || !q.points) {
        res.status(400).json({ error: `Question ${i + 1}: missing required fields (type, text, timeLimit, points)` });
        return;
      }
      const plugin = getQuestionPlugin(q.type);
      if (!plugin) {
        res.status(400).json({ error: `Question ${i + 1}: unknown type "${q.type}"` });
        return;
      }
      questions.push({ ...q, id: nanoid(8) } as Question);
    }

    const gameCode = await generateUniqueGameCode();
    const status = launch ? 'lobby' : 'draft';
    const game = await db.createGame(gameCode, userId!, questions, name || 'Untitled Game', status);

    res.status(201).json({
      gameCode: game.gameCode,
      name: game.name,
      status: game.status,
      questionCount: questions.length,
    });
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// GET /api/host/games — List host's games
router.get('/games', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await db.getGamesByHost(userId!, limit, cursor);
    res.json(result);
  } catch (err) {
    console.error('Error listing games:', err);
    res.status(500).json({ error: 'Failed to list games' });
  }
});

// GET /api/host/games/:code — Full game detail (owner only)
router.get('/games/:code', verifyGameOwnership, async (req, res) => {
  try {
    const game = (req as any).game as Game;
    const players = await db.getPlayers(game.gameCode);
    const leaderboard = await db.getLeaderboard(game.gameCode);

    res.json({ game, players, leaderboard });
  } catch (err) {
    console.error('Error getting game detail:', err);
    res.status(500).json({ error: 'Failed to get game detail' });
  }
});

// PUT /api/host/games/:code — Update draft game (owner only)
router.put('/games/:code', verifyGameOwnership, async (req, res) => {
  try {
    const game = (req as any).game as Game;
    if (game.status !== 'draft') {
      res.status(400).json({ error: 'Can only edit draft games' });
      return;
    }

    const { name, questions: rawQuestions } = req.body as {
      name?: string;
      questions?: unknown[];
    };

    let questions: Question[] | undefined;
    if (rawQuestions) {
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        res.status(400).json({ error: 'Questions array must not be empty' });
        return;
      }
      questions = [];
      for (let i = 0; i < rawQuestions.length; i++) {
        const q = rawQuestions[i] as any;
        if (!q.type || !q.text || !q.timeLimit || !q.points) {
          res.status(400).json({ error: `Question ${i + 1}: missing required fields` });
          return;
        }
        const plugin = getQuestionPlugin(q.type);
        if (!plugin) {
          res.status(400).json({ error: `Question ${i + 1}: unknown type "${q.type}"` });
          return;
        }
        questions.push({ ...q, id: q.id || nanoid(8) } as Question);
      }
    }

    await db.updateDraftGame(game.gameCode, name, questions);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating game:', err);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// DELETE /api/host/games/:code — Delete draft or finished game (owner only)
router.delete('/games/:code', verifyGameOwnership, async (req, res) => {
  try {
    const game = (req as any).game as Game;
    if (game.status !== 'draft' && game.status !== 'finished') {
      res.status(400).json({ error: 'Can only delete draft or finished games' });
      return;
    }

    await db.deleteGame(game.gameCode);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting game:', err);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// POST /api/host/games/:code/launch — Move draft to lobby (owner only)
router.post('/games/:code/launch', verifyGameOwnership, async (req, res) => {
  try {
    const game = (req as any).game as Game;
    if (game.status !== 'draft') {
      res.status(400).json({ error: 'Can only launch draft games' });
      return;
    }

    await db.updateGameStatus(game.gameCode, 'lobby');
    res.json({ gameCode: game.gameCode, status: 'lobby' });
  } catch (err) {
    console.error('Error launching game:', err);
    res.status(500).json({ error: 'Failed to launch game' });
  }
});

// POST /api/host/games/:code/duplicate — Clone into a new draft (owner only)
router.post('/games/:code/duplicate', verifyGameOwnership, async (req, res) => {
  try {
    const game = (req as any).game as Game;
    const { userId } = getAuth(req);

    const newCode = await generateUniqueGameCode();
    const newGame = await db.createGame(
      newCode,
      userId!,
      game.questions,
      `${game.name} (copy)`,
      'draft',
    );

    res.status(201).json({
      gameCode: newGame.gameCode,
      name: newGame.name,
      status: newGame.status,
      questionCount: newGame.questions.length,
    });
  } catch (err) {
    console.error('Error duplicating game:', err);
    res.status(500).json({ error: 'Failed to duplicate game' });
  }
});

// GET /api/host/games/:code/results — Leaderboard + per-question stats (owner only)
router.get('/games/:code/results', verifyGameOwnership, async (req, res) => {
  try {
    const game = (req as any).game as Game;
    const leaderboard = await db.getLeaderboard(game.gameCode);

    // Per-question stats
    const questionStats = [];
    for (let i = 0; i < game.questions.length; i++) {
      const answers = await db.getAnswersForQuestion(game.gameCode, i);
      const correctCount = answers.filter((a) => a.pointsAwarded && a.pointsAwarded > 0).length;
      questionStats.push({
        questionIdx: i,
        text: game.questions[i].text,
        type: game.questions[i].type,
        totalAnswers: answers.length,
        correctCount,
        correctPercent: answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0,
      });
    }

    res.json({ leaderboard, questionStats });
  } catch (err) {
    console.error('Error getting results:', err);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// GET /api/host/games/:code/export — CSV download of results (owner only)
router.get('/games/:code/export', verifyGameOwnership, async (req, res) => {
  try {
    const game = (req as any).game as Game;
    const leaderboard = await db.getLeaderboard(game.gameCode);

    // Build CSV
    const headers = ['Rank', 'Player', 'Score'];
    const rows = leaderboard.map((entry) => [entry.rank, entry.displayName, entry.totalScore]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${game.gameCode}-results.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Error exporting results:', err);
    res.status(500).json({ error: 'Failed to export results' });
  }
});

export default router;
