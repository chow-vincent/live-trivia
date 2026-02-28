import { Router } from 'express';
import { generateUniqueGameCode } from '../game-code.js';
import * as db from '../db/index.js';
import { getQuestionPlugin, type Question } from '@live-trivia/shared';
import { nanoid } from 'nanoid';

const router = Router();

// POST /api/games — Create a new game with questions
router.post('/games', async (req, res) => {
  try {
    const { questions: rawQuestions } = req.body as { questions: unknown[] };

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      res.status(400).json({ error: 'Questions array is required and must not be empty' });
      return;
    }

    // Validate each question
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

      questions.push({
        ...q,
        id: nanoid(8),
      } as Question);
    }

    const gameCode = await generateUniqueGameCode();
    const hostId = nanoid(12);
    const game = await db.createGame(gameCode, hostId, questions);

    res.status(201).json({
      gameCode: game.gameCode,
      hostId,
      questionCount: questions.length,
    });
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// GET /api/games/:code — Get game info (public, no answers)
router.get('/games/:code', async (req, res) => {
  try {
    const game = await db.getGame(req.params.code.toUpperCase());
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    res.json({
      gameCode: game.gameCode,
      status: game.status,
      questionCount: game.questions.length,
    });
  } catch (err) {
    console.error('Error getting game:', err);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

export default router;
