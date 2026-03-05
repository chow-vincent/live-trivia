import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, type GameSummary } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.js';
import type { Question } from '@live-trivia/shared';

const DEMO_QUESTIONS: Question[] = [
  {
    id: 'demo-1',
    type: 'free_text',
    text: 'What year did the Berlin Wall fall?',
    correctAnswer: '1989',
    acceptableAnswers: ['89'],
    timeLimit: 30,
    points: 10,
  },
  {
    id: 'demo-2',
    type: 'multiple_choice',
    text: 'Which planet is closest to the Sun?',
    options: ['Venus', 'Mercury', 'Mars', 'Earth'],
    correctOptionIndex: 1,
    timeLimit: 20,
    points: 10,
  },
  {
    id: 'demo-3',
    type: 'ranking',
    text: 'Rank these countries by population (highest first)',
    items: ['Brazil', 'India', 'USA', 'China'],
    correctOrder: ['China', 'India', 'USA', 'Brazil'],
    timeLimit: 45,
    points: 10,
  },
];

export default function Dashboard() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const demoCreated = useRef(false);

  useEffect(() => {
    api.listGames(undefined, 5).then(async (res) => {
      if (res.games.length === 0 && !demoCreated.current) {
        demoCreated.current = true;
        try {
          await api.createGame({ name: 'Sample Trivia Game', questions: DEMO_QUESTIONS, launch: false });
          const refreshed = await api.listGames(undefined, 5);
          setGames(refreshed.games);
        } catch {
          // If demo creation fails, just show empty state
        }
      } else {
        setGames(res.games);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalGames = games.length;
  const totalPlayers = games.reduce((sum, g) => sum + g.playerCount, 0);
  const lastGame = games[0];

  return (
    <div className="space-y-8">
      {/* Quick actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/host/games/new"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-brand-300 text-slate-900 font-semibold hover:bg-brand-400 active:scale-[0.98] transition-all"
        >
          Create Game
        </Link>
        <Link
          to="/host/games/new?tab=import"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all"
        >
          Import CSV
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 font-medium">Games Created</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '–' : totalGames}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 font-medium">Total Players</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '–' : totalPlayers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 font-medium">Last Game</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {loading ? '–' : lastGame ? new Date(lastGame.createdAt).toLocaleDateString() : 'None'}
          </p>
        </div>
      </div>

      {/* Recent games */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Games</h2>
          {games.length > 0 && (
            <Link to="/host/games" className="text-sm font-medium text-brand-500 hover:text-brand-400">
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-300 border-t-transparent mx-auto" />
          </div>
        ) : games.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500 mb-4">No games yet. Create your first game to get started!</p>
            <Link
              to="/host/games/new"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-300 text-slate-900 text-sm font-semibold hover:bg-brand-400"
            >
              Create Game
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {games.map((game) => (
              <Link
                key={game.gameCode}
                to={`/host/games/${game.gameCode}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{game.name}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(game.createdAt).toLocaleDateString()} · {game.playerCount} players
                    </p>
                  </div>
                </div>
                <StatusBadge status={game.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
