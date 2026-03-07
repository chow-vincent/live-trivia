import { useState } from 'react';
import type { PlayerAnswerForHost, GradeEntry } from '@live-trivia/shared';
import FreeTextGrading from './FreeTextGrading.js';
import MultipleChoiceGrading from './MultipleChoiceGrading.js';
import RankingGrading from './RankingGrading.js';
import TrueFalseGrading from './TrueFalseGrading.js';

interface GradingPanelProps {
  answers: PlayerAnswerForHost[];
  onSubmitGrades: (grades: GradeEntry[]) => void;
}

interface GradingRowProps {
  answer: PlayerAnswerForHost;
  points: number;
  onPointsChange: (points: number) => void;
}

const gradingRenderers: Record<string, React.FC<GradingRowProps>> = {
  free_text: FreeTextGrading,
  multiple_choice: MultipleChoiceGrading,
  ranking: RankingGrading,
  true_false: TrueFalseGrading,
};

export default function GradingPanel({ answers, onSubmitGrades }: GradingPanelProps) {
  const [grades, setGrades] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const a of answers) {
      initial[a.playerId] = a.autoGradeResult?.score ?? 0;
    }
    return initial;
  });

  const handlePointsChange = (playerId: string, points: number) => {
    setGrades((prev) => ({ ...prev, [playerId]: points }));
  };

  const handleSubmit = () => {
    const gradeEntries: GradeEntry[] = answers.map((a) => ({
      playerId: a.playerId,
      pointsAwarded: grades[a.playerId] ?? 0,
    }));
    onSubmitGrades(gradeEntries);
  };

  if (answers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-slate-400 mb-4">No answers received for this question.</p>
        <button
          onClick={handleSubmit}
          className="px-6 py-3 rounded-xl bg-brand-300 text-slate-900 font-semibold hover:bg-brand-400 transition-colors"
        >
          Continue (No Answers)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {answers.map((a) => {
        const GradingComponent = gradingRenderers[a.answer.type];
        if (!GradingComponent) {
          return (
            <div key={a.playerId} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <span className="font-semibold text-slate-800">{a.displayName}</span>
              <span className="text-slate-400">Unknown answer type</span>
            </div>
          );
        }

        return (
          <GradingComponent
            key={a.playerId}
            answer={a}
            points={grades[a.playerId] ?? 0}
            onPointsChange={(pts) => handlePointsChange(a.playerId, pts)}
          />
        );
      })}

      <button
        onClick={handleSubmit}
        className="w-full py-3.5 rounded-xl bg-green-500 text-white font-semibold text-lg hover:bg-green-600 active:scale-[0.98] transition-all mt-4"
      >
        Submit Grades & Show Leaderboard
      </button>
    </div>
  );
}

export type { GradingRowProps };
