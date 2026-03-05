import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import QuestionRenderer from '../components/question-types/QuestionRenderer.js';
import Timer from '../components/Timer.js';
import Leaderboard from '../components/Leaderboard.js';
import type { QuestionForPlayer, LeaderboardEntry, Answer } from '@live-trivia/shared';

type Phase = 'waiting' | 'question' | 'submitted' | 'closed' | 'leaderboard' | 'game_over';

export default function PlayerGame() {
  const { socket, connected } = useSocket();
  const playerId = sessionStorage.getItem('playerId') || '';

  const [phase, setPhase] = useState<Phase>('waiting');
  const [question, setQuestion] = useState<QuestionForPlayer | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [yourRank, setYourRank] = useState<number | undefined>();

  useEffect(() => {
    if (!socket) return;

    socket.on('question', (data) => {
      setQuestion(data.question);
      setQuestionIdx(data.questionIdx);
      setTotalQuestions(data.totalQuestions);
      setEndTime(data.endTime);
      setPhase('question');
    });

    socket.on('question_closed', () => {
      setPhase('closed');
    });

    socket.on('leaderboard', (data) => {
      setRankings(data.rankings);
      setYourRank(data.yourRank);
      setPhase('leaderboard');
    });

    socket.on('game_over', (data) => {
      setRankings(data.rankings);
      setPhase('game_over');
    });

    socket.on('error', (data) => {
      console.error('Server error:', data.message);
    });

    return () => {
      socket.off('question');
      socket.off('question_closed');
      socket.off('leaderboard');
      socket.off('game_over');
      socket.off('error');
    };
  }, [socket]);

  const handleSubmitAnswer = useCallback(
    (answer: Answer) => {
      if (!socket) return;
      socket.emit('player:submit_answer', { answer });
      setPhase('submitted');
    },
    [socket],
  );

  return (
    <div className="flex flex-col items-center px-4 py-8 min-h-dvh w-full max-w-lg mx-auto">
      {!connected && (
        <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-500 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Reconnecting...
        </div>
      )}

      {phase === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
          <div className="w-8 h-8 border-[3px] border-gray-200 border-t-brand-300 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium">Waiting for the host to start...</p>
        </div>
      )}

      {phase === 'question' && question && (
        <div className="w-full">
          <p className="text-sm font-medium text-slate-400 text-center mb-2">
            Question {questionIdx + 1} of {totalQuestions}
          </p>
          <Timer endTime={endTime} />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xl font-semibold text-center text-slate-800 mb-6 leading-relaxed">
              {question.text}
            </p>
            <QuestionRenderer question={question} onSubmit={handleSubmitAnswer} />
          </div>
        </div>
      )}

      {phase === 'submitted' && (
        <div className="w-full text-center">
          <Timer endTime={endTime} />
          <div className="py-8">
            <div className="text-green-500 text-xl font-semibold mb-2">Answer submitted!</div>
            <p className="text-slate-400 text-sm">Waiting for time to expire...</p>
          </div>
        </div>
      )}

      {phase === 'closed' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
          <div className="w-8 h-8 border-[3px] border-gray-200 border-t-brand-300 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium">Host is grading answers...</p>
        </div>
      )}

      {phase === 'leaderboard' && (
        <div className="w-full">
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-1">Leaderboard</h1>
          {yourRank && (
            <p className="text-center text-brand-400 font-semibold mb-5">
              You're #{yourRank}!
            </p>
          )}
          <Leaderboard rankings={rankings} yourPlayerId={playerId} />
          <p className="text-center text-slate-400 text-sm mt-6">Next question coming up...</p>
        </div>
      )}

      {phase === 'game_over' && (
        <div className="w-full">
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-1">Game Over!</h1>
          <p className="text-center text-slate-500 font-medium mb-6">Final Standings</p>
          <Leaderboard rankings={rankings} yourPlayerId={playerId} />
        </div>
      )}
    </div>
  );
}
