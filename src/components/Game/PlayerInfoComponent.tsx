import React from 'react';
import { Player } from '../../game/Card';

interface PlayerInfoComponentProps {
  player: Player;
  isCurrentPlayer: boolean;
  isMyPlayer: boolean;
  showDetailedInfo?: boolean;
  className?: string;
}

export const PlayerInfoComponent: React.FC<PlayerInfoComponentProps> = ({
  player,
  isCurrentPlayer,
  isMyPlayer,
  showDetailedInfo = false,
  className = ''
}) => {
  const getConnectionStatusColor = () => {
    return player.isConnected()
      ? 'text-green-600 bg-green-50 border-green-200'
      : 'text-red-600 bg-red-50 border-red-200';
  };

  const getReadyStatusColor = () => {
    return player.isReady()
      ? 'text-green-600 bg-green-50 border-green-200'
      : 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getHandStats = () => {
    const stats = player.getHandStats();
    return {
      totalCards: stats.totalCards,
      jokerCount: stats.jokerCount,
      meldCount: player.getMeldCount(),
      hasLaidRun: player.hasLaidRunMeld(),
      canWin: player.canWin(),
      hasWon: player.hasWon()
    };
  };

  const stats = getHandStats();

  const getPlayerInitial = () => {
    return player.displayName.charAt(0).toUpperCase();
  };

  const getPlayerStatusColor = () => {
    if (isMyPlayer) return 'bg-black text-white';
    if (isCurrentPlayer) return 'bg-blue-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const getBorderColor = () => {
    if (isMyPlayer) return 'border-black';
    if (isCurrentPlayer) return 'border-blue-500';
    return 'border-gray-300';
  };

  const getBgColor = () => {
    if (isMyPlayer) return 'bg-black';
    if (isCurrentPlayer) return 'bg-blue-500';
    return 'bg-white';
  };

  const getTextColor = () => {
    if (isMyPlayer) return 'text-white';
    if (isCurrentPlayer) return 'text-white';
    return 'text-black';
  };

  return (
    <div className={`border-2 ${getBorderColor()} rounded-lg p-4 ${className}`}>
      {/* Player Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${getPlayerStatusColor()}`}>
            {getPlayerInitial()}
          </div>

          {/* Name and Status */}
          <div>
            <div className={`font-medium ${getTextColor()}`}>
              {player.displayName}
              {isMyPlayer && (
                <span className={`ml-2 px-2 py-1 text-xs rounded border ${
                  isMyPlayer
                    ? 'bg-white text-black border-white'
                    : 'bg-gray-200 text-black border-gray-400'
                }`}>
                  Anda
                </span>
              )}
            </div>
            <div className={`text-sm ${isMyPlayer ? 'text-gray-300' : 'text-gray-600'}`}>
              {player.isConnected() ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Turn Indicator */}
        {isCurrentPlayer && (
          <span className="px-3 py-1 bg-black text-white text-xs rounded-full font-medium">
            Giliran
          </span>
        )}
      </div>

      {/* Basic Info */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className={isMyPlayer ? 'text-gray-300' : 'text-gray-600'}>Kartu:</span>
          <span className={`font-medium ${isMyPlayer ? 'text-white' : 'text-black'}`}>
            {stats.totalCards}
          </span>
        </div>
        <div className="flex justify-between">
          <span className={isMyPlayer ? 'text-gray-300' : 'text-gray-600'}>Melds:</span>
          <span className={`font-medium ${isMyPlayer ? 'text-white' : 'text-black'}`}>
            {stats.meldCount}
          </span>
        </div>
        <div className="flex justify-between">
          <span className={isMyPlayer ? 'text-gray-300' : 'text-gray-600'}>Score:</span>
          <span className={`font-medium ${isMyPlayer ? 'text-white' : 'text-black'}`}>
            {player.getScore()}
          </span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex flex-wrap gap-2 mt-3">
        {stats.jokerCount > 0 && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded border border-yellow-300">
            🃏 {stats.jokerCount}
          </span>
        )}
        {stats.hasLaidRun && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-300">
            ✓ Run
          </span>
        )}
        {stats.canWin && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded border border-green-300">
            🎯 Siap Menang
          </span>
        )}
        {stats.hasWon && (
          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded border border-green-600">
            🏆 Menang!
          </span>
        )}
      </div>

      {/* Detailed Info */}
      {showDetailedInfo && (
        <div className="mt-4 pt-3 border-t border-gray-200 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className={isMyPlayer ? 'text-gray-300' : 'text-gray-600'}>Connection:</span>
            <span className={`px-2 py-1 rounded ${getConnectionStatusColor()}`}>
              {player.isConnected() ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isMyPlayer ? 'text-gray-300' : 'text-gray-600'}>Ready:</span>
            <span className={`px-2 py-1 rounded ${getReadyStatusColor()}`}>
              {player.isReady() ? 'Ready' : 'Not Ready'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isMyPlayer ? 'text-gray-300' : 'text-gray-600'}>Run Requirement:</span>
            <span className={stats.hasLaidRun ? 'text-green-600' : 'text-orange-600'}>
              {stats.hasLaidRun ? 'Completed' : 'Required'}
            </span>
          </div>
        </div>
      )}

      {/* Warnings */}
      {!stats.hasLaidRun && (
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
          <p className="text-xs text-orange-700">
            💡 Belum menurunkan Urutan (Run) wajib
          </p>
        </div>
      )}

      {/* Winner Highlight */}
      {stats.hasWon && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-xs text-green-700 font-medium">
            🏆 Pemain ini menang dengan "Memukul"!
          </p>
        </div>
      )}
    </div>
  );
};

export default PlayerInfoComponent;