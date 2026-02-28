import type { BaseQuestion, Answer, FreeTextQuestion, FreeTextAnswer, MultipleChoiceQuestion, MultipleChoiceAnswer, RankingQuestion, RankingAnswer } from './types/question.js';

// ─── Plugin Interface ──────────────────────────────────────────────
// Each question type implements this interface. Adding a new question
// type means creating a new plugin and registering it — nothing else
// in the system needs to change.

export interface QuestionTypePlugin<Q extends BaseQuestion = BaseQuestion, A extends Answer = Answer> {
  type: string;
  autoGrade: (question: Q, answer: A) => { score: number; maxScore: number };
  validateAnswer: (answer: unknown) => answer is A;
  stripCorrectAnswer: (question: Q) => Record<string, unknown>;
}

// ─── Registry ──────────────────────────────────────────────────────

const registry = new Map<string, QuestionTypePlugin>();

export function registerQuestionType<Q extends BaseQuestion, A extends Answer>(
  plugin: QuestionTypePlugin<Q, A>,
): void {
  registry.set(plugin.type, plugin as unknown as QuestionTypePlugin);
}

export function getQuestionPlugin(type: string): QuestionTypePlugin | undefined {
  return registry.get(type);
}

export function getAllQuestionTypes(): string[] {
  return Array.from(registry.keys());
}

// ─── Built-in: Free Text ───────────────────────────────────────────

registerQuestionType<FreeTextQuestion, FreeTextAnswer>({
  type: 'free_text',

  autoGrade(question, answer) {
    const normalize = (s: string) => s.trim().toLowerCase();
    const playerAnswer = normalize(answer.text);
    const correct = normalize(question.correctAnswer);

    if (playerAnswer === correct) {
      return { score: question.points, maxScore: question.points };
    }

    // Check acceptable alternatives
    const alternatives = question.acceptableAnswers?.map(normalize) ?? [];
    if (alternatives.includes(playerAnswer)) {
      return { score: question.points, maxScore: question.points };
    }

    return { score: 0, maxScore: question.points };
  },

  validateAnswer(answer): answer is FreeTextAnswer {
    return (
      typeof answer === 'object' &&
      answer !== null &&
      'type' in answer &&
      (answer as FreeTextAnswer).type === 'free_text' &&
      'text' in answer &&
      typeof (answer as FreeTextAnswer).text === 'string'
    );
  },

  stripCorrectAnswer(question) {
    const { correctAnswer, acceptableAnswers, ...safe } = question;
    return safe;
  },
});

// ─── Built-in: Multiple Choice ─────────────────────────────────────

registerQuestionType<MultipleChoiceQuestion, MultipleChoiceAnswer>({
  type: 'multiple_choice',

  autoGrade(question, answer) {
    const correct = answer.selectedIndex === question.correctOptionIndex;
    return {
      score: correct ? question.points : 0,
      maxScore: question.points,
    };
  },

  validateAnswer(answer): answer is MultipleChoiceAnswer {
    return (
      typeof answer === 'object' &&
      answer !== null &&
      'type' in answer &&
      (answer as MultipleChoiceAnswer).type === 'multiple_choice' &&
      'selectedIndex' in answer &&
      typeof (answer as MultipleChoiceAnswer).selectedIndex === 'number'
    );
  },

  stripCorrectAnswer(question) {
    const { correctOptionIndex, ...safe } = question;
    return safe;
  },
});

// ─── Built-in: Ranking ─────────────────────────────────────────────

registerQuestionType<RankingQuestion, RankingAnswer>({
  type: 'ranking',

  autoGrade(question, answer) {
    const correct = question.correctOrder;
    const player = answer.orderedItems;
    let correctPositions = 0;

    for (let i = 0; i < correct.length; i++) {
      if (player[i] === correct[i]) {
        correctPositions++;
      }
    }

    // Proportional scoring: 7/10 correct positions → 70% of points
    const score = Math.round((correctPositions / correct.length) * question.points);
    return { score, maxScore: question.points };
  },

  validateAnswer(answer): answer is RankingAnswer {
    return (
      typeof answer === 'object' &&
      answer !== null &&
      'type' in answer &&
      (answer as RankingAnswer).type === 'ranking' &&
      'orderedItems' in answer &&
      Array.isArray((answer as RankingAnswer).orderedItems)
    );
  },

  stripCorrectAnswer(question) {
    const { correctOrder, ...safe } = question;
    return safe;
  },
});
