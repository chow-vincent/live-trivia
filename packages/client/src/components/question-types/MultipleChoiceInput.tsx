import { useState } from 'react';
import type { QuestionForPlayer, Answer } from '@live-trivia/shared';

interface Props {
  question: QuestionForPlayer;
  onSubmit: (answer: Answer) => void;
  disabled?: boolean;
}

export default function MultipleChoiceInput({ question, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = question.options || [];

  const handleSelect = (index: number) => {
    if (disabled) return;
    setSelected(index);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    onSubmit({ type: 'multiple_choice', selectedIndex: selected });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={disabled}
            className={`w-full text-left px-5 py-4 rounded-xl border-2 text-base font-medium transition-all min-h-[48px] ${
              selected === i
                ? 'border-brand-300 bg-brand-50 text-brand-500'
                : 'border-gray-200 bg-white text-slate-700 hover:border-brand-200'
            } disabled:opacity-50`}
          >
            <span className="inline-flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                selected === i
                  ? 'border-brand-300 bg-brand-300 text-slate-900'
                  : 'border-gray-300 text-gray-400'
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={disabled || selected === null}
        className="w-full py-3.5 rounded-xl bg-brand-300 text-slate-900 font-semibold hover:bg-brand-400 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        Submit Answer
      </button>
    </div>
  );
}
