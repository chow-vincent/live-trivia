import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type GameSummary } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.js';

const FILTERS = ['all', 'draft', 'active', 'finished'] as const;

export default function GamesList() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadGames = () => {
    setLoading(true);
    api.listGames(undefined, 50).then((res) => {
      setGames(res.games);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(loadGames, []);

  const filtered = filter === 'all'
    ? games
    : filter === 'active'
      ? games.filter((g) => ['lobby', 'active', 'grading', 'leaderboard'].includes(g.status))
      : games.filter((g) => g.status === filter);

  const handleDelete = async (code: string) => {
    if (!confirm('Delete this game?')) return;
    await api.deleteGame(code);
    loadGames();
  };

  const handleDuplicate = async (code: string) => {
    const result = await api.duplicateGame(code);
    navigate(`/host/games/${result.gameCode}`);
  };

  const handleLaunch = async (code: string) => {
    await api.launchGame(code);
    navigate(`/host/games/${code}/lobby`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Games</h1>
        <Link
          to="/host/games/new"
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-brand-300 text-slate-900 text-sm font-semibold hover:bg-brand-400 active:scale-[0.98] transition-all"
        >
          Create Game
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-300 border-t-transparent mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500 mb-4">
            {games.length === 0 ? 'No games yet.' : `No ${filter} games.`}
          </p>
          {games.length === 0 && (
            <Link
              to="/host/games/new"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-300 text-slate-900 text-sm font-semibold hover:bg-brand-400"
            >
              Create your first game
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filtered.map((game) => (
            <div
              key={game.gameCode}
              className="flex items-center justify-between px-5 py-4"
            >
              <Link
                to={`/host/games/${game.gameCode}`}
                className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
              >
                <p className="font-medium text-slate-900 truncate">{game.name}</p>
                <p className="text-sm text-slate-500">
                  {new Date(game.createdAt).toLocaleDateString()} · {game.playerCount} players
                </p>
              </Link>

              <div className="flex items-center gap-3 ml-4">
                <StatusBadge status={game.status} />

                {game.status === 'draft' && (
                  <button
                    onClick={() => handleLaunch(game.gameCode)}
                    className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors"
                  >
                    Launch
                  </button>
                )}

                <button
                  onClick={() => handleDuplicate(game.gameCode)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  Duplicate
                </button>

                {(game.status === 'draft' || game.status === 'finished') && (
                  <button
                    onClick={() => handleDelete(game.gameCode)}
                    className="px-3 py-1.5 rounded-lg text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
