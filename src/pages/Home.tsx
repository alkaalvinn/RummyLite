import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { createRoom, joinRoom } from '../services/firebase';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await createRoom(newRoomCode, user.uid, user.displayName || 'Player');
      navigate(`/room/${newRoomCode}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !roomCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      await joinRoom(roomCode.trim().toUpperCase(), user.uid, user.displayName || 'Player');
      navigate(`/room/${roomCode.trim().toUpperCase()}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-black">Rummy Lite</h1>
            <div className="flex items-center space-x-4">
              <span className="text-black">Selamat datang, {user?.displayName}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-black mb-4">
              Game Kartu Rummy Online
            </h2>
            <p className="text-gray-600 mb-8">
              Mainkan Rummy dengan teman-teman Anda secara real-time!
            </p>
          </div>

          <div className="bg-white border border-black rounded-lg p-8 space-y-6">
            {error && (
              <div className="bg-black text-white px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 transition-colors"
              >
                {loading ? 'Membuat Room...' : 'Buat Room Baru'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-black">atau</span>
                </div>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Masukkan kode room"
                    className="w-full px-4 py-3 bg-white border border-black rounded-lg text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    maxLength={6}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !roomCode.trim()}
                  className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Menggabungkan...' : 'Gabung ke Room'}
                </button>
              </form>
            </div>
          </div>

          {/* Game Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white border border-black rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🎮</div>
              <h3 className="text-black font-semibold mb-1">Real-time Multiplayer</h3>
              <p className="text-gray-600 text-sm">Mainkan dengan 2-4 pemain secara bersamaan</p>
            </div>
            <div className="bg-white border border-black rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🃏</div>
              <h3 className="text-black font-semibold mb-1">Mekanik Joker</h3>
              <p className="text-gray-600 text-sm">Pemenang poin tertinggi dapat mengambil Joker</p>
            </div>
            <div className="bg-white border border-black rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="text-black font-semibold mb-1">Mobile Friendly</h3>
              <p className="text-gray-600 text-sm">Main di desktop atau handphone</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;