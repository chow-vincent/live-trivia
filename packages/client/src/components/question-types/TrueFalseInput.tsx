import { useState } from 'react';
import type { QuestionForPlayer, Answer } from '@live-trivia/shared';

interface Props {
  question: QuestionForPlayer;
  onSubmit: (answer: Answer) => void;
  disabled?: boolean;
}

export default function TrueFalseInput({ onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<boolean | null>(null);

  const handleSelect = (value: boolean) => {
    if (disabled) return;
    setSelected(value);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    onSubmit({ type: 'true_false', selected });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            onClick={() => handleSelect(value)}
            disabled={disabled}
            className={`px-5 py-5 rounded-xl border-2 text-lg font-semibold transition-all ${
              selected === value
                ? 'border-brand-300 bg-brand-50 text-brand-500'
                : 'border-gray-200 bg-white text-slate-700 hover:border-brand-200'
            } disabled:opacity-50`}
          >
            {value ? 'True' : 'False'}
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
