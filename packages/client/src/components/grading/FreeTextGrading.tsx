import type { GradingRowProps } from './GradingPanel.js';
import type { FreeTextAnswer } from '@live-trivia/shared';

function ScoreButton({ label, active, variant, onClick }: { label: string | number; active: boolean; variant: 'danger' | 'primary' | 'success'; onClick: () => void }) {
  const styles = {
    danger: active ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-gray-200 hover:border-red-300',
    primary: active ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-300',
    success: active ? 'bg-green-500 text-white border-green-500' : 'bg-white text-slate-600 border-gray-200 hover:border-green-300',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold min-h-[36px] min-w-[36px] transition-colors ${styles[variant]}`}
    >
      {label}
    </button>
  );
}

export default function FreeTextGrading({ answer, points, onPointsChange }: GradingRowProps) {
  const textAnswer = answer.answer as FreeTextAnswer;
  const maxPoints = answer.autoGradeResult?.maxScore ?? 10;
  const isAutoGraded = answer.autoGradeResult !== null && answer.autoGradeResult.score > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
      <span className="font-semibold text-slate-800 min-w-[100px]">{answer.displayName}</span>
      <span className="flex-1 text-slate-500 min-w-[120px] italic">"{textAnswer.text}"</span>
      <div className="flex gap-1.5">
        <ScoreButton label={0} active={points === 0} variant="danger" onClick={() => onPointsChange(0)} />
        <ScoreButton label={Math.floor(maxPoints / 2)} active={points === Math.floor(maxPoints / 2)} variant="primary" onClick={() => onPointsChange(Math.floor(maxPoints / 2))} />
        <ScoreButton label={maxPoints} active={points === maxPoints} variant="success" onClick={() => onPointsChange(maxPoints)} />
      </div>
      <input
        type="number"
        min={0}
        max={maxPoints}
        value={points}
        onChange={(e) => onPointsChange(Math.max(0, Math.min(maxPoints, parseInt(e.target.value) || 0)))}
        className="w-14 px-2 py-1.5 rounded-lg border-2 border-gray-200 bg-slate-50 text-slate-800 text-center text-sm font-semibold focus:outline-none focus:border-indigo-500"
      />
      {isAutoGraded && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">Auto</span>
      )}
    </div>
  );
}
