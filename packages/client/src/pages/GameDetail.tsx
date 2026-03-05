import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type GameDetailResponse } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.js';

export default function GameDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<GameDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    api.getGame(code)
      .then((res) => {
        setData(res);
        setLoading(false);

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

  // Draft — show edit view (placeholder for now, will use GameCreate component)
  if (game.status === 'draft') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{game.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={game.status} />
              <span className="text-sm text-slate-500">{game.questions.length} questions</span>
            </div>
          </div>
          <button
            onClick={async () => {
              await api.launchGame(game.gameCode);
              navigate(`/host/games/${game.gameCode}/lobby`);
            }}
            className="px-5 py-2.5 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 active:scale-[0.98] transition-all"
          >
            Launch Game
          </button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-slate-500">Draft game with {game.questions.length} questions. Launch when ready.</p>
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
