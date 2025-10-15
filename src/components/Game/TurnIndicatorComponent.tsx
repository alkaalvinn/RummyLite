import React from 'react';
import { TurnManager } from '../../game/TurnManager';
import { Player } from '../../game/Player';

interface TurnIndicatorComponentProps {
  turnManager: TurnManager;
  players: Player[];
  isMyTurn: boolean;
  myPlayer?: Player;
  className?: string;
}

export const TurnIndicatorComponent: React.FC<TurnIndicatorComponentProps> = ({
  turnManager,
  players,
  isMyTurn,
  myPlayer,
  className = ''
}) => {
  const currentPlayer = turnManager.getCurrentPlayer();
  const turnNumber = turnManager.getTurnNumber();
  const roundNumber = turnManager.getRoundNumber();
  const turnDuration = turnManager.getCurrentTurnDuration();
  const direction = turnManager.getDirection();

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get turn direction indicator
  const getDirectionIndicator = () => {
    return direction === 1 ? '↻' : '↺';
  };

  // Get turn urgency color
  const getUrgencyColor = () => {
    const seconds = turnDuration / 1000;
    if (seconds > 60) return 'text-green-600';
    if (seconds > 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get action hint
  const getActionHint = () => {
    if (!isMyTurn) return null;

    if (turnManager.lastDrawWasFromDiscard()) {
      return '⚠️ Wajib menurunkan kombinasi';
    }

    if (!turnManager.hasFirstPlayerDiscarded() && turnManager.getCurrentPlayerIndex() === 0) {
      return '🎯 Wajib membuang 1 kartu (8 → 7)';
    }

    if (myPlayer && !myPlayer.hasLaidRunMeld()) {
      return '💡 Wajib menurunkan Urutan (Run) terlebih dahulu';
    }

    if (myPlayer && myPlayer.canWin()) {
      return '🎯 Siap Memukul! Tinggal 1 kartu lagi';
    }

    return 'Pilih aksi Anda';
  };

  // Get turn order
  const getTurnOrder = () => {
    return turnManager.getTurnOrder();
  };

  return (
    <div className={`bg-white border border-black rounded-lg p-4 ${className}`}>
      {/* Main Turn Display */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <h3 className="text-black font-medium">
            {isMyTurn ? 'Giliran Anda' : `Giliran ${currentPlayer.displayName}`}
          </h3>
          <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Turn {turnNumber} • Round {roundNumber}
        </div>
      </div>

      {/* Turn Timer */}
      <div className="text-center mb-4">
        <div className={`text-2xl font-mono font-bold ${getUrgencyColor()}`}>
          {formatDuration(turnDuration)}
        </div>
        <div className="text-xs text-gray-500">
          Waktu giliran
        </div>
      </div>

      {/* Action Hint */}
      {getActionHint() && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 font-medium text-center">
            {getActionHint()}
          </p>
        </div>
      )}

      {/* Turn Direction */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-gray-600">Arah:</span>
          <span className="text-2xl text-black font-bold">
            {getDirectionIndicator()}
          </span>
          <span className="text-sm text-gray-600">
            {direction === 1 ? 'Searah jarum jam' : 'Berlawanan jarum jam'}
          </span>
        </div>
      </div>

      {/* Turn Order */}
      <div className="border-t border-gray-200 pt-3">
        <h4 className="text-sm font-medium text-black mb-2">Urutan Giliran:</h4>
        <div className="flex justify-center space-x-2">
          {getTurnOrder().map((player, index) => {
            const isCurrentPlayer = player.id === currentPlayer.id;
            const isMe = myPlayer && player.id === myPlayer.id;

            return (
              <div
                key={player.id}
                className={`relative flex flex-col items-center p-2 rounded-lg border ${
                  isCurrentPlayer
                    ? 'bg-black text-white border-black'
                    : isMe
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  isCurrentPlayer
                    ? 'bg-white text-black'
                    : isMe
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {player.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs mt-1 font-medium">
                  {player.displayName}
                </span>
                {index === 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    1
                  </span>
                )}
                {isCurrentPlayer && (
                  <div className="absolute -bottom-1 -right-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Turn Statistics */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="text-center">
            <div className="text-gray-600">Rata-rata waktu:</div>
            <div className="font-medium text-black">
              {formatDuration(turnManager.getAverageTurnDuration())}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Total giliran:</div>
            <div className="font-medium text-black">
              {turnManager.getTurnNumber()}
            </div>
          </div>
        </div>
      </div>

      {/* Special Status Indicators */}
      <div className="mt-3 space-y-2">
        {!turnManager.hasFirstPlayerDiscarded() && (
          <div className="text-center">
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded border border-orange-300">
              🎯 Menunggu buangan pertama
            </span>
          </div>
        )}
        {turnManager.lastDrawWasFromDiscard() && isMyTurn && (
          <div className="text-center">
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded border border-red-300">
              ⚠️ Wajib menurunkan kombinasi
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TurnIndicatorComponent;