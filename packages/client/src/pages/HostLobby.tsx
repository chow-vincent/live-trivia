import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import { QRCodeSVG } from 'qrcode.react';
import type { Player } from '@live-trivia/shared';

interface PendingPlayer {
  playerId: string;
  displayName: string;
}

export default function HostLobby() {
  const navigate = useNavigate();
  const { code: gameCode = '' } = useParams<{ code: string }>();
  const { socket, connected } = useSocket();

  const [players, setPlayers] = useState<Player[]>([]);
  const [pending, setPending] = useState<PendingPlayer[]>([]);
  const [copied, setCopied] = useState(false);
  const hasJoined = useRef(false);

  const joinUrl = `https://hostedtrivia.com/play?code=${gameCode}`;

  useEffect(() => {
    if (!socket || !connected || !gameCode || hasJoined.current) return;
    socket.emit('host:create', { gameCode });
    hasJoined.current = true;
  }, [socket, connected, gameCode]);

  useEffect(() => {
    if (!socket) return;

    const onPlayerJoined = (data: { player: Player }) => {
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
    navigate(`/host/games/${gameCode}/live`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center px-4 py-6 min-h-[70vh] w-full max-w-3xl mx-auto">
      <Link to="/host/games" className="self-start text-sm text-slate-500 hover:text-slate-700 mb-4">
        &larr; Back to Games
      </Link>

      <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Game Lobby</h1>
      <p className="text-slate-500 font-medium mb-6">Share this code with your players</p>

      {/* Game code + QR */}
      <div className="w-full flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 bg-brand-50 border border-brand-100 rounded-2xl py-6 px-4 flex flex-col items-center justify-center">
          <p className="text-5xl font-extrabold tracking-[0.3em] text-brand-500 font-mono">
            {gameCode}
          </p>
          <button
            onClick={handleCopyLink}
            className="mt-3 px-4 py-1.5 rounded-lg bg-brand-100 text-brand-500 text-sm font-medium hover:bg-brand-200 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy join link'}
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-center">
          <QRCodeSVG value={joinUrl} size={140} />
        </div>
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
            <div className="w-5 h-5 border-2 border-gray-200 border-t-brand-300 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Waiting for players to join...</p>
          </div>
        ) : players.length === 0 ? (
          <p className="text-slate-400 text-sm py-2">No approved players yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <span
                key={p.playerId}
                className="px-4 py-2 rounded-full bg-brand-50 text-brand-500 text-sm font-medium border border-brand-100"
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
