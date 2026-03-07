import { useState, useEffect, useRef } from 'react';
import type { QuestionForPlayer } from '@live-trivia/shared';

interface WagerSelectorProps {
  question: QuestionForPlayer;
  maxWager: number;
  endTime: number;
  onLockIn: (wager: number) => void;
}

export default function WagerSelector({ question, maxWager, endTime, onLockIn }: WagerSelectorProps) {
  const [wager, setWager] = useState(0);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);

  const handleLockIn = () => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    onLockIn(wager);
  };

  // Auto-lock wager 0 when timer expires (if player hasn't locked in)
  useEffect(() => {
    const ms = endTime - Date.now();
    if (ms <= 0) return;
    const timer = setTimeout(() => {
      if (!lockedRef.current) {
        lockedRef.current = true;
        setLocked(true);
        onLockIn(0);
      }
    }, ms);
    return () => clearTimeout(timer);
  }, [endTime, onLockIn]);

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-xl font-semibold text-center text-slate-800 mb-4 leading-relaxed">
          {question.text}
        </p>

        {question.imageUrl && (
          <img src={question.imageUrl} alt="" className="w-full max-h-64 object-contain rounded-xl mb-4" />
        )}

        {locked ? (
          <div className="text-center py-6">
            <p className="text-2xl font-bold text-brand-500 mb-2">
              Wagered {wager} point{wager !== 1 ? 's' : ''}
            </p>
            <p className="text-slate-400 text-sm">Waiting for the host to start the question...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm font-medium text-slate-500">
              How many points will you wager?
            </p>

            <div className="text-center">
              <span className="text-4xl font-bold text-brand-500 tabular-nums">{wager}</span>
              <span className="text-slate-400 text-lg ml-1">/ {maxWager}</span>
            </div>

            <input
              type="range"
              min={0}
              max={maxWager}
              step={1}
              value={wager}
              onChange={(e) => setWager(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-slate-200 accent-brand-400"
            />

            <div className="flex justify-between text-xs text-slate-400">
              <span>0</span>
              <span>{maxWager}</span>
            </div>

            <button
              onClick={handleLockIn}
              className="w-full py-3.5 rounded-xl bg-brand-300 text-slate-900 font-semibold text-lg hover:bg-brand-400 active:scale-[0.98] transition-all"
            >
              Lock In Wager
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
