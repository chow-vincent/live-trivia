import { useState } from 'react';
import type { QuestionForPlayer, Answer } from '@live-trivia/shared';

interface Props {
  question: QuestionForPlayer;
  onSubmit: (answer: Answer) => void;
  disabled?: boolean;
}

export default function FreeTextInput({ question, onSubmit, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({ type: 'free_text', text: text.trim() });
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Type your answer..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        disabled={disabled}
        autoFocus
        className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-slate-50 text-slate-900 text-lg placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="w-full py-3.5 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        Submit Answer
      </button>
    </div>
  );
}
