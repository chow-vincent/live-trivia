import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import type { Question } from '@live-trivia/shared';
import QuestionEditor from '../components/QuestionEditor.js';
import FileImport from '../components/FileImport.js';

export default function GameCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'import'>(
    searchParams.get('tab') === 'import' ? 'import' : 'editor',
  );

  const handleSave = async (launch = false) => {
    if (!name.trim()) {
      setError('Game name is required');
      return;
    }
    if (questions.length === 0) {
      setError('Add at least one question');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const result = await api.createGame({ name: name.trim(), questions, launch });
      if (launch) {
        navigate(`/host/games/${result.gameCode}/lobby`);
      } else {
        navigate(`/host/games/${result.gameCode}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Create Game</h1>

      {/* Game name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Game Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Thursday Night Trivia Week 12"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'editor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Question Editor
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Import CSV
        </button>
      </div>

      {/* Content */}
      {activeTab === 'editor' ? (
        <QuestionEditor questions={questions} onChange={setQuestions} />
      ) : (
        <FileImport
          onImport={(imported) => {
            setQuestions((prev) => [...prev, ...imported]);
            setActiveTab('editor');
          }}
        />
      )}

      {/* Error */}
      {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-brand-300 text-slate-900 font-semibold hover:bg-brand-400 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save & Launch'}
        </button>
      </div>
    </div>
  );
}
