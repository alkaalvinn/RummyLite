import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { subscribeToRoom, updatePlayerReady } from '../../services/firebase';
import { Game } from '../../game/Game';
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
      const game = new Game(playerIds, displayNames);
      game.start();

      // Update room with game state
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: 'playing',
        gameStarted: true,
        gameState: game.getDataForFirestore(),
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Loading room...</div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Room tidak ditemukan</div>
      </div>
    );
  }

  const isHost = roomData.hostId === user?.uid;
  const currentPlayer = roomData.players.find(p => p.id === user?.uid);
  const allReady = roomData.players.every(p => p.ready);
  const canStartGame = isHost && allReady && roomData.players.length === 4;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-black">Room: {roomId}</h1>
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
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
          <div className="bg-white border border-black rounded-lg p-6 text-center">
            <h2 className="text-lg text-black mb-2">Kode Room</h2>
            <div className="flex items-center justify-center space-x-4">
              <span className="text-3xl font-mono font-bold text-black">{roomId}</span>
              <button
                onClick={copyRoomCode}
                className="px-3 py-1 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm"
              >
                Salin
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Bagikan kode ini kepada teman untuk bergabung
            </p>
          </div>

          {/* Players List */}
          <div className="bg-white border border-black rounded-lg p-6">
            <h3 className="text-xl font-semibold text-black mb-4">
              Pemain ({roomData.players.length}/4)
            </h3>

            <div className="space-y-3">
              {roomData.players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    player.id === user?.uid
                      ? 'bg-black text-white border-black'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      player.id === user?.uid
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
                    }`}>
                      {player.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={`font-medium ${
                        player.id === user?.uid ? 'text-white' : 'text-black'
                      }`}>
                        {player.displayName}
                        {player.id === roomData.hostId && (
                          <span className={`ml-2 px-2 py-1 text-xs rounded border ${
                            player.id === user?.uid
                              ? 'bg-white text-black border-white'
                              : 'bg-black text-white border-black'
                          }`}>
                            Host
                          </span>
                        )}
                        {player.id === user?.uid && (
                          <span className={`ml-2 px-2 py-1 text-xs rounded border ${
                            player.id === user?.uid
                              ? 'bg-white text-black border-white'
                              : 'bg-gray-200 text-black border-gray-400'
                          }`}>
                            Anda
                          </span>
                        )}
                      </div>
                      <div className={`text-sm ${
                        player.id === user?.uid ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {player.connected ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {player.ready ? (
                      <span className={`px-3 py-1 rounded-full text-sm border ${
                        player.id === user?.uid
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-white border-black'
                      }`}>
                        Ready
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm border ${
                        player.id === user?.uid
                          ? 'bg-gray-600 text-white border-gray-600'
                          : 'bg-gray-200 text-black border-gray-400'
                      }`}>
                        Not Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {roomData.players.length < 4 && (
                <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 text-center text-gray-600">
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
              <div className="bg-black text-white px-4 py-3 rounded-lg text-sm border border-black">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              {currentPlayer && (
                <button
                  onClick={handleReadyToggle}
                  disabled={roomData.gameStarted}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors border ${
                    currentPlayer.ready
                      ? 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600'
                      : 'bg-black hover:bg-gray-800 text-white border-black'
                  } disabled:opacity-50`}
                >
                  {currentPlayer.ready ? 'Cancel Ready' : 'Ready'}
                </button>
              )}

              {canStartGame && (
                <button
                  onClick={handleStartGame}
                  disabled={startingGame}
                  className="flex-1 py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 transition-colors border border-black"
                >
                  {startingGame ? 'Memulai Game...' : 'Mulai Game'}
                </button>
              )}
            </div>

            {!isHost && (
              <div className="text-center text-sm text-gray-600">
                Menunggu host untuk memulai game...
              </div>
            )}

            {isHost && roomData.players.length < 4 && (
              <div className="text-center text-sm text-black font-medium">
                Game membutuhkan tepat 4 pemain untuk dimulai
              </div>
            )}
          </div>

          {/* Game Rules Preview */}
          <div className="bg-white border border-black rounded-lg p-6">
            <h4 className="text-lg font-semibold text-black mb-3">Aturan Game Rummy Spesial</h4>
            <ul className="text-sm text-gray-600 space-y-2">
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