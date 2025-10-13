import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { subscribeToRoom, updatePlayerReady } from '../../services/firebase';
import { initializeGame } from '../../lib/rummyEngine';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface RoomData {
  id: string;
  hostId: string;
  status: string;
  players: Array<{
    id: string;
    displayName: string;
    ready: boolean;
    connected: boolean;
  }>;
  maxPlayers: number;
  gameStarted: boolean;
}

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingGame, setStartingGame] = useState(false);

  useEffect(() => {
    if (!roomId || !user) {
      navigate('/');
      return;
    }

    const unsubscribe = subscribeToRoom(roomId, (data) => {
      setRoomData(data);
      setLoading(false);

      // Redirect to game if game has started
      if (data.gameStarted && data.status === 'playing') {
        navigate(`/game/${roomId}`);
      }
    });

    return () => unsubscribe();
  }, [roomId, user, navigate]);

  const handleReadyToggle = async () => {
    if (!roomData || !user) return;

    const currentPlayer = roomData.players.find(p => p.id === user.uid);
    if (!currentPlayer) return;

    try {
      await updatePlayerReady(roomId, user.uid, !currentPlayer.ready);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStartGame = async () => {
    if (!roomData || !user) return;

    // Check if current user is host
    if (roomData.hostId !== user.uid) {
      setError('Hanya host yang bisa memulai game');
      return;
    }

    // Check if all players are ready
    const allReady = roomData.players.every(p => p.ready);
    if (!allReady) {
      setError('Semua pemain harus ready terlebih dahulu');
      return;
    }

    // Check if exactly 4 players (GMS-001)
    if (roomData.players.length !== 4) {
      setError('Game membutuhkan tepat 4 pemain untuk dimulai');
      return;
    }

    setStartingGame(true);
    setError('');

    try {
      // Initialize game state
      const playerIds = roomData.players.map(p => p.id);
      const displayNames = roomData.players.map(p => p.displayName);
      const gameState = initializeGame(playerIds, displayNames);

      // Update room with game state
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: 'playing',
        gameStarted: true,
        gameState: gameState,
        startedAt: new Date().toISOString()
      });

      // Navigate to game page
      navigate(`/game/${roomId}`);
    } catch (err: any) {
      setError(err.message);
      setStartingGame(false);
    }
  };

  const handleLeaveRoom = async () => {
    navigate('/');
  };

  const copyRoomCode = async () => {
    if (!roomId) return;

    try {
      await navigator.clipboard.writeText(roomId);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading room...</div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Room tidak ditemukan</div>
      </div>
    );
  }

  const isHost = roomData.hostId === user?.uid;
  const currentPlayer = roomData.players.find(p => p.id === user?.uid);
  const allReady = roomData.players.every(p => p.ready);
  const canStartGame = isHost && allReady && roomData.players.length === 4;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-white">Room: {roomId}</h1>
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Keluar Room
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full space-y-6">
          {/* Room Code Display */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center">
            <h2 className="text-lg text-gray-300 mb-2">Kode Room</h2>
            <div className="flex items-center justify-center space-x-4">
              <span className="text-3xl font-mono font-bold text-white">{roomId}</span>
              <button
                onClick={copyRoomCode}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Salin
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Bagikan kode ini kepada teman untuk bergabung
            </p>
          </div>

          {/* Players List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Pemain ({roomData.players.length}/4)
            </h3>

            <div className="space-y-3">
              {roomData.players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.id === user?.uid
                      ? 'bg-green-600/20 border border-green-500'
                      : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {player.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {player.displayName}
                        {player.id === roomData.hostId && (
                          <span className="ml-2 px-2 py-1 bg-yellow-600/30 text-yellow-300 text-xs rounded">
                            Host
                          </span>
                        )}
                        {player.id === user?.uid && (
                          <span className="ml-2 px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded">
                            Anda
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {player.connected ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {player.ready ? (
                      <span className="px-3 py-1 bg-green-600/30 text-green-300 rounded-full text-sm">
                        Ready
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-600/30 text-gray-300 rounded-full text-sm">
                        Not Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {roomData.players.length < 4 && (
                <div className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center text-gray-400">
                  <div className="text-sm">
                    Menunggu {4 - roomData.players.length} pemain lagi...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              {currentPlayer && (
                <button
                  onClick={handleReadyToggle}
                  disabled={roomData.gameStarted}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    currentPlayer.ready
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  } disabled:opacity-50`}
                >
                  {currentPlayer.ready ? 'Cancel Ready' : 'Ready'}
                </button>
              )}

              {canStartGame && (
                <button
                  onClick={handleStartGame}
                  disabled={startingGame}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {startingGame ? 'Memulai Game...' : 'Mulai Game'}
                </button>
              )}
            </div>

            {!isHost && (
              <div className="text-center text-sm text-gray-400">
                Menunggu host untuk memulai game...
              </div>
            )}

            {isHost && roomData.players.length < 4 && (
              <div className="text-center text-sm text-yellow-400">
                Game membutuhkan tepat 4 pemain untuk dimulai
              </div>
            )}
          </div>

          {/* Game Rules Preview */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-3">Aturan Game Rummy Spesial</h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Game dimainkan oleh tepat 4 pemain</li>
              <li>• Setiap pemain mendapat 7 kartu di awal</li>
              <li>• 1 kartu acak menjadi referensi, 3 kartu kembarannya menjadi Joker</li>
              <li>• Kombinasi pertama yang wajib diturunkan adalah Urutan (Run)</li>
              <li>• Bisa ambil 1-3 kartu terakhir dari discard pile WAJIB langsung menurunkan kombinasi</li>
              <li>• Atau ambil 1 kartu dari deck</li>
              <li>• Menang dengan "Memukul" - tersisa 1 kartu di tangan</li>
              <li>• Poin kemenangan: 2-10=50, J/Q/K=100, A=150, Joker=250</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Room;