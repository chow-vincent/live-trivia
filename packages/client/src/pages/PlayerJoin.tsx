import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';

type JoinState = 'idle' | 'joining' | 'pending' | 'rejected';

export default function PlayerJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { socket, connected } = useSocket();
  const [gameCode, setGameCode] = useState(searchParams.get('code') ?? '');
  const [displayName, setDisplayName] = useState(searchParams.get('name') ?? '');
  const [error, setError] = useState('');
  const [joinState, setJoinState] = useState<JoinState>('idle');
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const onJoinSuccess = (data: { playerId: string; game: { gameCode: string; status: string } }) => {
      sessionStorage.setItem('playerId', data.playerId);
      sessionStorage.setItem('gameCode', data.game.gameCode);
      sessionStorage.setItem('displayName', displayName);
      navigate('/play');
    };

    const onJoinPending = () => {
      setJoinState('pending');
    };

    const onJoinRejected = (data: { message: string }) => {
      setJoinState('rejected');
      setError(data.message);
    };

    const onJoinError = (data: { message: string }) => {
      setError(data.message);
      setJoinState('idle');
    };

    socket.on('join_success', onJoinSuccess);
    socket.on('join_pending', onJoinPending);
    socket.on('join_rejected', onJoinRejected);
    socket.on('join_error', onJoinError);

    return () => {
      socket.off('join_success', onJoinSuccess);
      socket.off('join_pending', onJoinPending);
      socket.off('join_rejected', onJoinRejected);
      socket.off('join_error', onJoinError);
    };
  }, [socket, navigate, displayName]);

  // Auto-join when arriving with query params (from landing page redirect)
  useEffect(() => {
    if (autoJoinAttempted.current) return;
    if (!socket || !connected) return;
    if (!searchParams.get('code') || !searchParams.get('name')) return;

    autoJoinAttempted.current = true;
    setJoinState('joining');
    socket.emit('player:join', {
      gameCode: gameCode.trim().toUpperCase(),
      displayName: displayName.trim(),
    });
  }, [socket, connected, searchParams, gameCode, displayName]);

  const handleJoin = () => {
    if (!socket || !connected) return;
    if (!gameCode.trim() || !displayName.trim()) return;

    setJoinState('joining');
    setError('');

    socket.emit('player:join', {
      gameCode: gameCode.trim().toUpperCase(),
      displayName: displayName.trim(),
    });
  };

  const handleTryAgain = () => {
    setJoinState('idle');
    setError('');
  };

  // Pending state — waiting for host approval
  if (joinState === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 min-h-dvh w-full max-w-lg mx-auto">
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
          <div className="w-12 h-12 border-[3px] border-gray-200 border-t-brand-300 rounded-full animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Waiting for host</h2>
          <p className="text-slate-500">
            The host will approve your request to join. Hang tight!
          </p>
        </div>
      </div>
    );
  }

  // Rejected state
  if (joinState === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 min-h-dvh w-full max-w-lg mx-auto">
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-red-500 text-xl font-bold">&times;</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Request declined</h2>
          <p className="text-slate-500">{error}</p>
          <button
            onClick={handleTryAgain}
            className="px-6 py-2.5 rounded-xl bg-brand-300 text-slate-900 font-semibold hover:bg-brand-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-dvh w-full max-w-lg mx-auto">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Live Trivia</h1>
      <p className="text-slate-500 font-medium mb-8">Join a Game</p>

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1.5">Game Code</label>
          <input
            type="text"
            placeholder="e.g. X7K2"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            maxLength={5}
            autoFocus
            className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-slate-50 text-slate-900 text-center text-2xl font-bold tracking-[0.2em] placeholder:text-slate-300 placeholder:font-normal placeholder:text-lg placeholder:tracking-normal focus:outline-none focus:border-brand-300 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1.5">Your Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-slate-50 text-slate-900 text-lg placeholder:text-slate-300 focus:outline-none focus:border-brand-300 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={joinState === 'joining' || !connected || !gameCode.trim() || !displayName.trim()}
          className="w-full py-3.5 rounded-xl bg-brand-300 text-slate-900 font-semibold text-lg hover:bg-brand-400 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {joinState === 'joining' ? 'Joining...' : 'Join Game'}
        </button>
      </div>

      <p className="mt-8 text-sm text-slate-400">
        Are you the host?{' '}
        <a href="/host" className="text-brand-500 font-medium hover:text-brand-400">
          Create a game
        </a>
      </p>

      {!connected && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-500 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Connecting...
        </div>
      )}
    </div>
  );
}
