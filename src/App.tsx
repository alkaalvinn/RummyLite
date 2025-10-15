import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuthStore';
import Auth from './components/Auth/Auth';
import Home from './pages/Home';
import Room from './components/Room/Room';
import GameBoard from './components/GameBoard/GameBoardNew';

function App() {
  const { user, loading, error, initializeAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initializeAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-black text-xl mb-4">Memuat Rummy Lite...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="bg-black border border-black text-white px-6 py-4 rounded-lg mb-4 max-w-md text-center">
          <div className="font-bold mb-2">Error</div>
          <div>{error}</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Routes>
          <Route
            path="/auth"
            element={user ? <Navigate to="/" replace /> : <Auth />}
          />
          <Route
            path="/"
            element={user ? <Home /> : <Navigate to="/auth" replace />}
          />
          <Route
            path="/room/:roomId"
            element={user ? <Room /> : <Navigate to="/auth" replace />}
          />
          <Route
            path="/game/:roomId"
            element={user ? <GameBoard /> : <Navigate to="/auth" replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;