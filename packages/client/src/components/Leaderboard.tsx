import type { LeaderboardEntry } from '@live-trivia/shared';

interface LeaderboardProps {
  rankings: LeaderboardEntry[];
  yourPlayerId?: string;
}

const rankColors: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-slate-400',
  3: 'text-orange-600',
};

export default function Leaderboard({ rankings, yourPlayerId }: LeaderboardProps) {
  return (
    <div className="w-full space-y-1.5">
      {rankings.map((entry) => {
        const isYou = entry.playerId === yourPlayerId;
        return (
          <div
            key={entry.playerId}
            className={`flex items-center px-5 py-3.5 rounded-xl transition-colors ${
              isYou
                ? 'bg-indigo-50 border border-indigo-200'
                : 'bg-white border border-gray-100'
            }`}
          >
            <span className={`font-bold text-lg min-w-[36px] ${rankColors[entry.rank] ?? 'text-slate-400'}`}>
              #{entry.rank}
            </span>
            <span className="flex-1 font-medium text-slate-800">
              {entry.displayName}
              {isYou && <span className="text-indigo-500 ml-1.5 text-sm font-semibold">(You)</span>}
            </span>
            <span className="font-bold text-indigo-600 tabular-nums">
              {entry.totalScore} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}
