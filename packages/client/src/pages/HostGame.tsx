import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import Leaderboard from '../components/Leaderboard.js';
import GradingPanel from '../components/grading/GradingPanel.js';
import type { PlayerAnswerForHost, LeaderboardEntry, GradeEntry } from '@live-trivia/shared';

type Phase = 'ready' | 'active' | 'grading' | 'leaderboard' | 'finished';

export default function HostGame() {
  const { socket } = useSocket();
  const { code: gameCode = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('ready');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answersReceived, setAnswersReceived] = useState(0);
  const [answers, setAnswers] = useState<PlayerAnswerForHost[]>([]);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('answer_received', () => {
      setAnswersReceived((prev) => prev + 1);
    });

    socket.on('all_answers', (data) => {
      setAnswers(data.answers);
      setPhase('grading');
    });

    socket.on('leaderboard', (data) => {
      setRankings(data.rankings);
      setPhase('leaderboard');
    });

    socket.on('game_over', (data) => {
      setRankings(data.rankings);
      setPhase('finished');
    });

    return () => {
      socket.off('answer_received');
      socket.off('all_answers');
      socket.off('leaderboard');
      socket.off('game_over');
    };
  }, [socket]);

  const startQuestion = (idx: number) => {
    if (!socket) return;
    socket.emit('host:start_question', { questionIdx: idx });
    setQuestionIdx(idx);
    setAnswersReceived(0);
    setPhase('active');
  };

  const endQuestionEarly = () => {
    if (!socket) return;
    socket.emit('host:end_question');
  };

  const submitGrades = (grades: GradeEntry[]) => {
    if (!socket) return;
    socket.emit('host:grade_answers', { grades });
  };

  const nextQuestion = () => {
    startQuestion(questionIdx + 1);
  };

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-dvh w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Game</h1>
        <span className="px-3 py-1 rounded-lg bg-brand-50 text-brand-500 font-mono font-bold text-sm border border-brand-100">
          {gameCode}
        </span>
      </div>

      {phase === 'ready' && (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-slate-500 mb-5">Ready to start the first question?</p>
          <button
            onClick={() => startQuestion(0)}
            className="px-8 py-3.5 rounded-xl bg-brand-300 text-slate-900 font-semibold hover:bg-brand-400 active:scale-[0.98] transition-all"
          >
            Start Question 1
          </button>
        </div>
      )}

      {phase === 'active' && (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-sm font-medium text-slate-400 mb-2">Question {questionIdx + 1}</p>
          <p className="text-xl font-semibold text-slate-800 mb-2">Question is live!</p>
          <p className="text-3xl font-bold text-brand-400 tabular-nums mb-6">
            {answersReceived} answer{answersReceived !== 1 ? 's' : ''} received
          </p>
          <button
            onClick={endQuestionEarly}
            className="px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 active:scale-[0.98] transition-all"
          >
            End Question Early
          </button>
        </div>
      )}

      {phase === 'grading' && (
        <div className="w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-5">
            Grade Answers — Question {questionIdx + 1}
          </h2>
          <GradingPanel answers={answers} onSubmitGrades={submitGrades} />
        </div>
      )}

      {phase === 'leaderboard' && (
        <div className="w-full">
          <h2 className="text-xl font-bold text-center text-slate-900 mb-5">
            Leaderboard after Q{questionIdx + 1}
          </h2>
          <Leaderboard rankings={rankings} />
          <div className="text-center mt-6">
            <button
              onClick={nextQuestion}
              className="px-8 py-3.5 rounded-xl bg-brand-300 text-slate-900 font-semibold hover:bg-brand-400 active:scale-[0.98] transition-all"
            >
              Next Question
            </button>
          </div>
        </div>
      )}

      {phase === 'finished' && (
        <div className="w-full">
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-1">Game Over!</h1>
          <p className="text-center text-slate-500 font-medium mb-6">Final Results</p>
          <Leaderboard rankings={rankings} />
          <div className="text-center mt-6">
            <button
              onClick={() => navigate(`/host/games/${gameCode}`)}
              className="px-8 py-3.5 rounded-xl bg-brand-300 text-slate-900 font-semibold hover:bg-brand-400 active:scale-[0.98] transition-all"
            >
              View Full Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
