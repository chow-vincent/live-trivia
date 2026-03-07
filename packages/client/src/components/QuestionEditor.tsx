import { useState } from 'react';
import type { Question, QuestionType } from '@live-trivia/shared';
import { nanoid } from 'nanoid';

interface Props {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

function makeDefaultQuestion(type: QuestionType): Question {
  const base = { id: nanoid(8), text: '', timeLimit: 30, points: 10 };
  switch (type) {
    case 'multiple_choice':
      return { ...base, type: 'multiple_choice', options: ['', '', '', ''], correctOptionIndex: 0 };
    case 'free_text':
      return { ...base, type: 'free_text', correctAnswer: '' };
    case 'ranking':
      return { ...base, type: 'ranking', items: ['', '', '', ''], correctOrder: ['', '', '', ''] };
    case 'true_false':
      return { ...base, type: 'true_false', correctAnswer: true };
  }
}

export default function QuestionEditor({ questions, onChange }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const addQuestion = () => {
    const q = makeDefaultQuestion('multiple_choice');
    onChange([...questions, q]);
    setSelectedIdx(questions.length);
  };

  const removeQuestion = (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx);
    onChange(updated);
    if (selectedIdx >= updated.length) setSelectedIdx(Math.max(0, updated.length - 1));
  };

  const updateQuestion = (idx: number, partial: Partial<Question>) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], ...partial } as Question;
    onChange(updated);
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const updated = [...questions];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    onChange(updated);
    setSelectedIdx(newIdx);
  };

  const changeType = (idx: number, type: QuestionType) => {
    const old = questions[idx];
    const q = makeDefaultQuestion(type);
    q.text = old.text;
    q.timeLimit = old.timeLimit;
    q.points = old.points;
    q.id = old.id;
    const updated = [...questions];
    updated[idx] = q;
    onChange(updated);
  };

  const current = questions[selectedIdx];

  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* Sidebar */}
      <div className="w-56 shrink-0 bg-white rounded-xl border border-slate-200 p-3 flex flex-col">
        <div className="flex-1 space-y-1 overflow-y-auto">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-center gap-1">
              <button
                onClick={() => moveQuestion(i, -1)}
                disabled={i === 0}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs"
              >
                ▲
              </button>
              <button
                onClick={() => moveQuestion(i, 1)}
                disabled={i === questions.length - 1}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs"
              >
                ▼
              </button>
              <button
                onClick={() => setSelectedIdx(i)}
                className={`flex-1 text-left px-2 py-1.5 rounded-lg text-sm truncate transition-colors ${
                  i === selectedIdx ? 'bg-brand-50 text-brand-500 font-medium' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {i + 1}. {q.text || 'New question'}
              </button>
              <button
                onClick={() => removeQuestion(i)}
                className="p-0.5 text-slate-400 hover:text-red-500 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addQuestion}
          className="mt-3 w-full py-2 rounded-lg bg-brand-50 text-brand-500 text-sm font-semibold hover:bg-brand-100 transition-colors"
        >
          + Add Question
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6">
        {!current ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>Add a question to get started</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={current.type}
                onChange={(e) => changeType(selectedIdx, e.target.value as QuestionType)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="free_text">Free Text</option>
                <option value="ranking">Ranking</option>
                <option value="true_false">True / False</option>
              </select>
            </div>

            {/* Question text */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
              <textarea
                value={current.text}
                onChange={(e) => updateQuestion(selectedIdx, { text: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                placeholder="Enter your question..."
              />
            </div>

            {/* Type-specific fields */}
            {current.type === 'multiple_choice' && (
              <MultipleChoiceFields
                question={current}
                onChange={(partial) => updateQuestion(selectedIdx, partial)}
              />
            )}
            {current.type === 'free_text' && (
              <FreeTextField
                question={current}
                onChange={(partial) => updateQuestion(selectedIdx, partial)}
              />
            )}
            {current.type === 'ranking' && (
              <RankingFields
                question={current}
                onChange={(partial) => updateQuestion(selectedIdx, partial)}
              />
            )}
            {current.type === 'true_false' && (
              <TrueFalseFields
                question={current}
                onChange={(partial) => updateQuestion(selectedIdx, partial)}
              />
            )}

            {/* Time + Points */}
            <div className="flex gap-4">
              <div className="w-32">
                <label className="block text-sm font-medium text-slate-700 mb-1">Time (sec)</label>
                <input
                  type="number"
                  value={current.timeLimit || ''}
                  onChange={(e) => updateQuestion(selectedIdx, { timeLimit: e.target.value === '' ? 0 : Math.min(parseInt(e.target.value), 7200) })}
                  onBlur={() => { if (!current.timeLimit || current.timeLimit < 5) updateQuestion(selectedIdx, { timeLimit: 5 }); }}
                  min={5}
                  max={7200}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-slate-700 mb-1">Points</label>
                <input
                  type="number"
                  value={current.points || ''}
                  onChange={(e) => updateQuestion(selectedIdx, { points: e.target.value === '' ? 0 : Math.min(parseInt(e.target.value), 9999) })}
                  onBlur={() => { if (!current.points || current.points < 1) updateQuestion(selectedIdx, { points: 1 }); }}
                  min={1}
                  max={9999}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Type-specific field components ─────────────────────────────

function MultipleChoiceFields({
  question,
  onChange,
}: {
  question: Extract<Question, { type: 'multiple_choice' }>;
  onChange: (partial: Partial<Question>) => void;
}) {
  const letters = ['A', 'B', 'C', 'D'];

  const updateOption = (idx: number, value: string) => {
    const options = [...question.options];
    options[idx] = value;
    onChange({ options } as any);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Options</label>
      {question.options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ correctOptionIndex: i } as any)}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
              question.correctOptionIndex === i
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-slate-200 text-slate-400 hover:border-slate-300'
            }`}
          >
            {letters[i]}
          </button>
          <input
            type="text"
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`Option ${letters[i]}`}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      ))}
      <p className="text-xs text-slate-400">Click a letter to mark it as the correct answer</p>
    </div>
  );
}

function FreeTextField({
  question,
  onChange,
}: {
  question: Extract<Question, { type: 'free_text' }>;
  onChange: (partial: Partial<Question>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer</label>
        <input
          type="text"
          value={question.correctAnswer}
          onChange={(e) => onChange({ correctAnswer: e.target.value } as any)}
          placeholder="The exact correct answer"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Acceptable Alternatives <span className="text-slate-400 font-normal">(optional, comma-separated)</span>
        </label>
        <input
          type="text"
          value={question.acceptableAnswers?.join(', ') || ''}
          onChange={(e) =>
            onChange({
              acceptableAnswers: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined,
            } as any)
          }
          placeholder="e.g. NYC, New York"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
    </div>
  );
}

function RankingFields({
  question,
  onChange,
}: {
  question: Extract<Question, { type: 'ranking' }>;
  onChange: (partial: Partial<Question>) => void;
}) {
  const updateItem = (idx: number, value: string) => {
    const items = [...question.items];
    const correctOrder = [...question.correctOrder];
    // Keep correctOrder in sync — use items order as the correct order
    const oldValue = items[idx];
    items[idx] = value;
    const orderIdx = correctOrder.indexOf(oldValue);
    if (orderIdx !== -1) correctOrder[orderIdx] = value;
    onChange({ items, correctOrder } as any);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        Items <span className="text-slate-400 font-normal">(enter in correct order, top to bottom)</span>
      </label>
      {question.items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-6 text-center text-sm font-bold text-slate-400">{i + 1}</span>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={`Item ${i + 1}`}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      ))}
      <p className="text-xs text-slate-400">Items will be shuffled when shown to players</p>
    </div>
  );
}

function TrueFalseFields({
  question,
  onChange,
}: {
  question: Extract<Question, { type: 'true_false' }>;
  onChange: (partial: Partial<Question>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Correct Answer</label>
      <div className="flex gap-2">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => onChange({ correctAnswer: value } as any)}
            className={`px-5 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
              question.correctAnswer === value
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-slate-200 text-slate-400 hover:border-slate-300'
            }`}
          >
            {value ? 'True' : 'False'}
          </button>
        ))}
      </div>
    </div>
  );
}
