import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type GameDetailResponse } from '../lib/api.js';
import type { Question } from '@live-trivia/shared';
import StatusBadge from '../components/StatusBadge.js';
import QuestionEditor from '../components/QuestionEditor.js';
import FileImport from '../components/FileImport.js';

export default function GameDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<GameDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Draft editing state
  const [editName, setEditName] = useState('');
  const [editQuestions, setEditQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'import'>('editor');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!code) return;
    api.getGame(code)
      .then((res) => {
        setData(res);
        setLoading(false);

        // Populate edit fields for drafts
        if (res.game.status === 'draft') {
          setEditName(res.game.name);
          setEditQuestions(res.game.questions);
        }

        // Smart routing by status
        if (res.game.status === 'lobby') {
          navigate(`/host/games/${code}/lobby`, { replace: true });
        } else if (['active', 'grading', 'leaderboard'].includes(res.game.status)) {
          navigate(`/host/games/${code}/live`, { replace: true });
        }
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  }, [code, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-300 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-red-500 font-medium">{error || 'Game not found'}</p>
      </div>
    );
  }

  const { game, leaderboard } = data;

  // Draft — inline editor
  if (game.status === 'draft') {
    const handleSave = async (launch = false) => {
      if (!editName.trim()) {
        setSaveError('Game name is required');
        return;
      }
      if (editQuestions.length === 0) {
        setSaveError('Add at least one question');
        return;
      }

      setSaveError('');
      setSaving(true);
      try {
        await api.updateGame(game.gameCode, { name: editName.trim(), questions: editQuestions });
        if (launch) {
          await api.launchGame(game.gameCode);
          navigate(`/host/games/${game.gameCode}/lobby`);
        } else {
          setDirty(false);
          setSaving(false);
        }
      } catch (e) {
        setSaveError((e as Error).message);
        setSaving(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Edit Game</h1>
            <StatusBadge status={game.status} />
          </div>
        </div>

        {/* Game name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Game Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setDirty(true); }}
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
          <QuestionEditor
            questions={editQuestions}
            onChange={(q) => { setEditQuestions(q); setDirty(true); }}
          />
        ) : (
          <FileImport
            onImport={(imported) => {
              setEditQuestions((prev) => [...prev, ...imported]);
              setDirty(true);
              setActiveTab('editor');
            }}
          />
        )}

        {/* Error */}
        {saveError && <p className="text-red-500 text-sm font-medium">{saveError}</p>}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !dirty}
            className="px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
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

  // Finished — show results view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{game.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={game.status} />
            <span className="text-sm text-slate-500">
              {new Date(game.createdAt).toLocaleDateString()} · {game.playerCount} players · {game.questions.length} questions
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const result = await api.duplicateGame(game.gameCode);
              navigate(`/host/games/${result.gameCode}`);
            }}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Duplicate
          </button>
          <a
            href={api.getExportUrl(game.gameCode)}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Leaderboard</h2>
        </div>
        {leaderboard.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-500">No players participated.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leaderboard.map((entry) => (
              <div key={entry.playerId} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-sm font-bold text-slate-400">#{entry.rank}</span>
                  <span className="font-medium text-slate-900">{entry.displayName}</span>
                </div>
                <span className="font-semibold text-slate-700">{entry.totalScore} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
