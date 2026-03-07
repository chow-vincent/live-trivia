import type { QuestionForPlayer, Answer } from '@live-trivia/shared';
import FreeTextInput from './FreeTextInput.js';
import MultipleChoiceInput from './MultipleChoiceInput.js';
import RankingInput from './RankingInput.js';
import TrueFalseInput from './TrueFalseInput.js';

interface QuestionRendererProps {
  question: QuestionForPlayer;
  onSubmit: (answer: Answer) => void;
  disabled?: boolean;
}

const renderers: Record<string, React.FC<QuestionRendererProps>> = {
  free_text: FreeTextInput,
  multiple_choice: MultipleChoiceInput,
  ranking: RankingInput,
  true_false: TrueFalseInput,
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

  return (
    <div>
      {question.imageUrl && (
        <img src={question.imageUrl} alt="" className="w-full max-h-64 object-contain rounded-xl mb-4" />
      )}
      <Component question={question} onSubmit={onSubmit} disabled={disabled} />
    </div>
  );
}
