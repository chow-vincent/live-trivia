import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SAMPLE_QUESTIONS = JSON.stringify(
  [
    {
      type: 'free_text',
      text: 'What year did the Berlin Wall fall?',
      correctAnswer: '1989',
      acceptableAnswers: ['89'],
      timeLimit: 30,
      points: 10,
    },
    {
      type: 'multiple_choice',
      text: 'Which planet is closest to the Sun?',
      options: ['Venus', 'Mercury', 'Mars', 'Earth'],
      correctOptionIndex: 1,
      timeLimit: 20,
      points: 10,
    },
    {
      type: 'ranking',
      text: 'Rank these countries by population (highest first)',
      items: ['Brazil', 'India', 'USA', 'China'],
      correctOrder: ['China', 'India', 'USA', 'Brazil'],
      timeLimit: 45,
      points: 10,
    },
  ],
  null,
  2,
);

export default function HostCreate() {
  const navigate = useNavigate();
  const [questionsJson, setQuestionsJson] = useState(SAMPLE_QUESTIONS);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setError('');
    setCreating(true);

    let questions;
    try {
      questions = JSON.parse(questionsJson);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Questions must be a non-empty array');
      }
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      setCreating(false);
      return;
    }

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create game');
      }

      const data = await res.json();
      sessionStorage.setItem('hostId', data.hostId);
      sessionStorage.setItem('gameCode', data.gameCode);
      navigate('/host/lobby');
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-dvh w-full max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Create a Game</h1>
      <p className="text-slate-500 font-medium mb-8">Import your questions as JSON</p>

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1.5">
            Questions (JSON format)
          </label>
          <textarea
            value={questionsJson}
            onChange={(e) => setQuestionsJson(e.target.value)}
            rows={18}
            className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-slate-50 text-slate-800 text-sm font-mono resize-y min-h-[250px] placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-3.5 rounded-xl bg-indigo-500 text-white font-semibold text-lg hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'Create Game'}
        </button>
      </div>
    </div>
  );
}
