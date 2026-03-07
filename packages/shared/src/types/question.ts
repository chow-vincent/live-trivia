// ─── Base Question Interface ───────────────────────────────────────
// All question types share these fields. The `type` field is the discriminator.

export interface BaseQuestion {
  id: string;
  type: string;
  text: string;
  timeLimit: number; // seconds
  points: number;
}

// ─── Question Types ────────────────────────────────────────────────

export interface FreeTextQuestion extends BaseQuestion {
  type: 'free_text';
  correctAnswer: string;
  acceptableAnswers?: string[]; // alternative accepted spellings/phrasings
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[];
  correctOptionIndex: number;
}

export interface RankingQuestion extends BaseQuestion {
  type: 'ranking';
  items: string[];        // items to rank (displayed shuffled to player)
  correctOrder: string[]; // the correct ranking order
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  correctAnswer: boolean;
}

// Discriminated union — extend this when adding new question types
export type Question = FreeTextQuestion | MultipleChoiceQuestion | RankingQuestion | TrueFalseQuestion;

// ─── Answer Types ──────────────────────────────────────────────────
// Each question type has a corresponding answer shape.

export interface FreeTextAnswer {
  type: 'free_text';
  text: string;
}

export interface MultipleChoiceAnswer {
  type: 'multiple_choice';
  selectedIndex: number;
}

export interface RankingAnswer {
  type: 'ranking';
  orderedItems: string[];
}

export interface TrueFalseAnswer {
  type: 'true_false';
  selected: boolean;
}

export type Answer = FreeTextAnswer | MultipleChoiceAnswer | RankingAnswer | TrueFalseAnswer;

// ─── Question Type Identifiers ─────────────────────────────────────

export const QUESTION_TYPES = {
  FREE_TEXT: 'free_text',
  MULTIPLE_CHOICE: 'multiple_choice',
  RANKING: 'ranking',
  TRUE_FALSE: 'true_false',
} as const;

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];
