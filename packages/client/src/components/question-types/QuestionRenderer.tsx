import type { QuestionForPlayer, Answer } from '@live-trivia/shared';
import FreeTextInput from './FreeTextInput.js';
import MultipleChoiceInput from './MultipleChoiceInput.js';
import RankingInput from './RankingInput.js';

interface QuestionRendererProps {
  question: QuestionForPlayer;
  onSubmit: (answer: Answer) => void;
  disabled?: boolean;
}

const renderers: Record<string, React.FC<QuestionRendererProps>> = {
  free_text: FreeTextInput,
  multiple_choice: MultipleChoiceInput,
  ranking: RankingInput,
};

export default function QuestionRenderer({ question, onSubmit, disabled }: QuestionRendererProps) {
  const Component = renderers[question.type];

  if (!Component) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-slate-500">
        Unknown question type: {question.type}
      </div>
    );
  }

  return <Component question={question} onSubmit={onSubmit} disabled={disabled} />;
}
