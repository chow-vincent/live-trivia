import type { GradingRowProps } from './GradingPanel.js';
import type { RankingAnswer } from '@live-trivia/shared';

export default function RankingGrading({ answer, points, onPointsChange }: GradingRowProps) {
  const rankingAnswer = answer.answer as RankingAnswer;
  const maxPoints = answer.autoGradeResult?.maxScore ?? 10;
  const autoScore = answer.autoGradeResult?.score ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-semibold text-slate-800 min-w-[100px]">{answer.displayName}</span>
        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={() => onPointsChange(0)}
            className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold min-h-[36px] transition-colors ${
              points === 0
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-slate-600 border-gray-200 hover:border-red-300'
            }`}
          >
            0
          </button>
          <button
            onClick={() => onPointsChange(autoScore)}
            className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold min-h-[36px] transition-colors ${
              points === autoScore
                ? 'bg-brand-300 text-white border-brand-300'
                : 'bg-white text-slate-600 border-gray-200 hover:border-brand-200'
            }`}
          >
            {autoScore} (auto)
          </button>
          <button
            onClick={() => onPointsChange(maxPoints)}
            className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold min-h-[36px] transition-colors ${
              points === maxPoints
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-slate-600 border-gray-200 hover:border-green-300'
            }`}
          >
            {maxPoints}
          </button>
        </div>
        <input
          type="number"
          min={0}
          max={maxPoints}
          value={points}
          onChange={(e) => onPointsChange(Math.max(0, Math.min(maxPoints, parseInt(e.target.value) || 0)))}
          className="w-14 px-2 py-1.5 rounded-lg border-2 border-gray-200 bg-slate-50 text-slate-800 text-center text-sm font-semibold focus:outline-none focus:border-brand-300"
        />
      </div>
      <p className="text-sm text-slate-400">
        Order: {rankingAnswer.orderedItems.join(' \u2192 ')}
      </p>
    </div>
  );
}
