import React from 'react';
import { Game } from '../../game/Game';
import { Player } from '../../game/Player';

interface GameControlsComponentProps {
  game: Game;
  myPlayer?: Player;
  isMyTurn: boolean;
  selectedCards: string[];
  onDrawFromDeck?: () => void;
  onDrawFromDiscard?: (count: number) => void;
  onMeld?: () => void;
  onDiscard?: (cardId: string) => void;
  onClearSelection?: () => void;
  onEndGame?: () => void;
  onRestartGame?: () => void;
  onLeaveGame?: () => void;
  className?: string;
}

export const GameControlsComponent: React.FC<GameControlsComponentProps> = ({
  game,
  myPlayer,
  isMyTurn,
  selectedCards,
  onDrawFromDeck,
  onDrawFromDiscard,
  onMeld,
  onDiscard,
  onClearSelection,
  onEndGame,
  onRestartGame,
  onLeaveGame,
  className = ''
}) => {
  const currentPlayer = game.getCurrentPlayer();
  const isFinished = game.isFinished();
  const winner = game.getWinner() ? game.getPlayer(game.getWinner()!) : undefined;

  // Get matching cards count for discard pile
  const getMatchingCardsCount = () => {
    if (!myPlayer) return 0;
    const matchingCards = myPlayer.getMatchingCardsSequence(game.getDiscardPile().getAllCards());
    return matchingCards.length;
  };

  // Check if player can draw from deck
  const canDrawFromDeck = () => {
    if (!isMyTurn || !myPlayer) return false;
    const matchingCardsCount = getMatchingCardsCount();
    return matchingCardsCount === 0 && !game.getDeck().isEmpty();
  };

  // Check if player can draw from discard
  const canDrawFromDiscard = () => {
    if (!isMyTurn || !myPlayer) return false;
    const matchingCardsCount = getMatchingCardsCount();
    return matchingCardsCount > 0 && !game.getDiscardPile().isEmpty();
  };

  // Check if player can meld
  const canMeld = () => {
    if (!isMyTurn || !myPlayer || selectedCards.length < 3) return false;

    // Check if player must meld (after drawing from discard)
    if (game.lastDrawFromDiscard()) return true;

    // Optional meld if player has cards and has laid run
    return myPlayer.hasLaidRunMeld() || selectedCards.length >= 3;
  };

  // Check if player can discard
  const canDiscard = () => {
    if (!isMyTurn || !myPlayer || selectedCards.length !== 1) return false;

    // Special case: first player must discard from 8 to 7 cards
    if (!game.hasFirstPlayerDiscarded() &&
        game.getCurrentPlayerIndex() === 0 &&
        myPlayer.getHandSize() === 8) {
      return true;
    }

    // Regular discard - not allowed if just drew from discard
    return !game.lastDrawFromDiscard();
  };

  const handleDrawFromDeck = () => {
    if (onDrawFromDeck && canDrawFromDeck()) {
      onDrawFromDeck();
    }
  };

  const handleDrawFromDiscard = () => {
    const matchingCount = getMatchingCardsCount();
    if (onDrawFromDiscard && canDrawFromDiscard() && matchingCount > 0) {
      onDrawFromDiscard(matchingCount);
    }
  };

  const handleMeld = () => {
    if (onMeld && canMeld()) {
      onMeld();
    }
  };

  const handleDiscard = () => {
    if (onDiscard && canDiscard() && selectedCards.length === 1) {
      onDiscard(selectedCards[0]);
    }
  };

  const handleClearSelection = () => {
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const handleLeaveGame = () => {
    if (onLeaveGame) {
      onLeaveGame();
    }
  };

  const handleEndGame = () => {
    if (onEndGame) {
      onEndGame();
    }
  };

  const handleRestartGame = () => {
    if (onRestartGame) {
      onRestartGame();
    }
  };

  // Get required action message
  const getRequiredAction = () => {
    if (!isMyTurn) return null;

    if (!game.hasFirstPlayerDiscarded() && game.getCurrentPlayerIndex() === 0) {
      return 'Wajib membuang 1 kartu (8 → 7)';
    }

    if (game.lastDrawFromDiscard()) {
      return 'Wajib menurunkan kombinasi';
    }

    return null;
  };

  const requiredAction = getRequiredAction();
  const matchingCardsCount = getMatchingCardsCount();

  // Game Over State
  if (isFinished) {
    return (
      <div className={`bg-white border border-black rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-4">
            Game Selesai! 🎮
          </h2>

          {winner && (
            <div className="mb-6">
              <div className="text-lg font-medium text-black mb-2">
                🏆 Pemenang: {winner.displayName}
              </div>
              <div className="text-sm text-gray-600">
                {game.getGameOverReason() === 'memukul'
                  ? 'Menang dengan "Memukul"!'
                  : 'Deck habis'}
              </div>
            </div>
          )}

          {/* Final Scores */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-black mb-3">Skor Akhir:</h3>
            <div className="space-y-2">
              {game.getPlayers().map(player => (
                <div key={player.id} className={`flex justify-between items-center p-2 rounded ${
                  player.id === winner?.id ? 'bg-green-50 border border-green-300' : 'bg-gray-50'
                }`}>
                  <span className="font-medium">{player.displayName}</span>
                  <span className="font-bold">{player.getScore()} poin</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            {onRestartGame && (
              <button
                onClick={handleRestartGame}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Main Lagi
              </button>
            )}
            {onLeaveGame && (
              <button
                onClick={handleLeaveGame}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Keluar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Game State
  return (
    <div className={`bg-white border border-black rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-black font-medium">Kontrol Game</h3>
        {isMyTurn ? (
          <div className="flex items-center justify-center space-x-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600">Giliran Anda</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 mt-1">
            Giliran: {currentPlayer.displayName}
          </div>
        )}
      </div>

      {/* Required Action Indicator */}
      {requiredAction && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium text-center">
            🎯 {requiredAction}
          </p>
        </div>
      )}

      {/* Selection Counter */}
      {selectedCards.length > 0 && (
        <div className="mb-4 text-center">
          <span className="px-3 py-1 bg-black text-white text-sm rounded-full">
            {selectedCards.length} kartu dipilih
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {isMyTurn && (
        <div className="space-y-3">
          {/* Draw Actions */}
          <div className="space-y-2">
            {matchingCardsCount > 0 ? (
              <button
                onClick={handleDrawFromDiscard}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium border border-green-600"
              >
                📤 Ambil {matchingCardsCount} dari Discard
              </button>
            ) : (
              <button
                onClick={handleDrawFromDeck}
                disabled={game.getDeck().isEmpty()}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-colors border ${
                  game.getDeck().isEmpty()
                    ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800 border-black'
                }`}
              >
                🎴 Ambil 1 dari Deck
              </button>
            )}
          </div>

          {/* Meld Action */}
          {canMeld() && (
            <button
              onClick={handleMeld}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium border border-blue-600"
            >
              🎯 Buat Meld ({selectedCards.length})
            </button>
          )}

          {/* Discard Action */}
          {canDiscard() && (
            <button
              onClick={handleDiscard}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium border border-orange-600"
            >
              {game.getCurrentPlayerIndex() === 0 && myPlayer?.getHandSize() === 8
                ? 'Buang Kartu Pertama'
                : 'Buang Kartu'}
            </button>
          )}

          {/* Clear Selection */}
          {selectedCards.length > 0 && (
            <button
              onClick={handleClearSelection}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium border border-gray-600"
            >
              Batal Pilih
            </button>
          )}
        </div>
      )}

      {/* Game Info */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div>Deck: {game.getDeck().getRemainingCount()} kartu</div>
          <div>Discard: {game.getDiscardPile().getCount()} kartu</div>
          <div>Round: {game.getCurrentRound()}</div>
          <div>Status: {game.getStatus()}</div>
        </div>
      </div>

      {/* Leave Game Button */}
      {onLeaveGame && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={handleLeaveGame}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium border border-red-600"
          >
            Keluar Game
          </button>
        </div>
      )}
    </div>
  );
};

export default GameControlsComponent;