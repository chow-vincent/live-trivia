import { useState, useEffect } from 'react';

interface TimerProps {
  endTime: number;
  onTimeout?: () => void;
}

export default function Timer({ endTime, onTimeout }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((endTime - Date.now()) / 1000)),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onTimeout?.();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [endTime, onTimeout]);

  const color =
    secondsLeft <= 5
      ? 'text-red-500 animate-pulse'
      : secondsLeft <= 10
        ? 'text-amber-500'
        : 'text-slate-800';

  return (
    <div className={`text-5xl font-bold text-center my-4 tabular-nums ${color}`}>
      {secondsLeft}s
    </div>
  );
}
