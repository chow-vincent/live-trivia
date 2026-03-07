// Types
export type {
  BaseQuestion,
  FreeTextQuestion,
  MultipleChoiceQuestion,
  RankingQuestion,
  TrueFalseQuestion,
  Question,
  FreeTextAnswer,
  MultipleChoiceAnswer,
  RankingAnswer,
  TrueFalseAnswer,
  Answer,
  QuestionType,
} from './types/question.js';
export { QUESTION_TYPES } from './types/question.js';

export type {
  GameStatus,
  Game,
  Player,
  PlayerAnswer,
  LeaderboardEntry,
  GradeEntry,
} from './types/game.js';

export type {
  ClientToServerEvents,
  ServerToClientEvents,
  QuestionForPlayer,
  PlayerAnswerForHost,
} from './types/socket-events.js';

// Question registry
export type { QuestionTypePlugin } from './question-registry.js';
export {
  registerQuestionType,
  getQuestionPlugin,
  getAllQuestionTypes,
} from './question-registry.js';
