import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import type { Player } from '@live-trivia/shared';

interface PendingPlayer {
  playerId: string;
  displayName: string;
}

export default function HostLobby() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const gameCode = sessionStorage.getItem('gameCode') || '';

  const [players, setPlayers] = useState<Player[]>([]);
  const [pending, setPending] = useState<PendingPlayer[]>([]);
  const hasJoined = useRef(false);

  useEffect(() => {
    if (!socket || !connected || !gameCode || hasJoined.current) return;
    socket.emit('host:create', { gameCode });
    hasJoined.current = true;
  }, [socket, connected, gameCode]);

  useEffect(() => {
    if (!socket) return;

    const onPlayerJoined = (data: { player: Player }) => {
      // Remove from pending when approved and joined
      setPending((prev) => prev.filter((p) => p.playerId !== data.player.playerId));
      setPlayers((prev) => [...prev, data.player]);
    };

    const onPlayerLeft = (data: { playerId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.playerId !== data.playerId));
    };

    const onPlayerPending = (data: { playerId: string; displayName: string }) => {
      setPending((prev) => [...prev, data]);
    };

    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('player_pending', onPlayerPending);

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('player_pending', onPlayerPending);
    };
  }, [socket]);

  const approvePlayer = (playerId: string) => {
    socket?.emit('host:approve_player', { playerId });
  };

  const rejectPlayer = (playerId: string) => {
    setPending((prev) => prev.filter((p) => p.playerId !== playerId));
    socket?.emit('host:reject_player', { playerId });
  };

  const handleStart = () => {
    navigate('/host/game');
  };

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-dvh w-full max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Game Lobby</h1>
      <p className="text-slate-500 font-medium mb-8">Share this code with your players</p>

      <div className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl py-6 px-4 mb-6">
        <p className="text-5xl font-extrabold tracking-[0.3em] text-indigo-600 text-center font-mono">
          {gameCode}
        </p>
      </div>

      {/* Pending players */}
      {pending.length > 0 && (
        <div className="w-full bg-amber-50 rounded-2xl border border-amber-200 p-5 mb-4">
          <h3 className="font-semibold text-amber-800 text-sm mb-3">
            Waiting for approval ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((p) => (
              <div
                key={p.playerId}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-amber-100"
              >
                <span className="flex-1 font-medium text-slate-700">{p.displayName}</span>
                <button
                  onClick={() => approvePlayer(p.playerId)}
                  className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => rejectPlayer(p.playerId)}
                  className="px-3 py-1.5 rounded-lg bg-white text-red-500 text-sm font-semibold border border-red-200 hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved players */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-slate-700 mb-3">
          Players ({players.length})
        </h3>

        {players.length === 0 && pending.length === 0 ? (
          <div className="flex items-center gap-3 py-4">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Waiting for players to join...</p>
          </div>
        ) : players.length === 0 ? (
          <p className="text-slate-400 text-sm py-2">No approved players yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <span
                key={p.playerId}
                className="px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100"
              >
                {p.displayName}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={players.length === 0}
        className="w-full max-w-md py-3.5 rounded-xl bg-green-500 text-white font-semibold text-lg hover:bg-green-600 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
      </button>
    </div>
  );
}
