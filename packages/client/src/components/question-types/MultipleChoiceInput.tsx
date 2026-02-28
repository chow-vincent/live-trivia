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
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-slate-700 hover:border-indigo-300'
            } disabled:opacity-50`}
          >
            <span className="inline-flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                selected === i
                  ? 'border-indigo-500 bg-indigo-500 text-white'
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
        className="w-full py-3.5 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        Submit Answer
      </button>
    </div>
  );
}
