import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuthStore';
import Auth from './components/Auth/Auth';
import Home from './pages/Home';
import Room from './components/Room/Room';
import GameBoard from './components/GameBoard/GameBoard';

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-900">
        <div className="text-white text-xl mb-4">Memuat Rummy Lite...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-900 px-4">
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-4 max-w-md text-center">
          <div className="font-bold mb-2">Error</div>
          <div>{error}</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
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