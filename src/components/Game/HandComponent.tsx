import React from 'react';
import { Card } from '../../game/Card';
import { Player } from '../../game/Player';
import CardComponent from './CardComponent';

interface HandComponentProps {
  player: Player;
  selectedCards: string[];
  isMyTurn: boolean;
  showCards: boolean;
  onCardSelect?: (cardId: string) => void;
  onCardClick?: (card: Card) => void;
  className?: string;
  showControls?: boolean;
  onMeld?: () => void;
  onDiscard?: (cardId: string) => void;
  canMeld?: boolean;
  canDiscard?: boolean;
  requiredAction?: 'discard' | 'meld' | 'none';
}

export const HandComponent: React.FC<HandComponentProps> = ({
  player,
  selectedCards,
  isMyTurn,
  showCards,
  onCardSelect,
  onCardClick,
  className = '',
  showControls = true,
  onMeld,
  onDiscard,
  canMeld = false,
  canDiscard = false,
  requiredAction = 'none'
}) => {
  const handleCardClick = (card: Card) => {
    if (onCardSelect) {
      onCardSelect(card.id);
    }
    if (onCardClick) {
      onCardClick(card);
    }
  };

  const handleMeld = () => {
    if (onMeld && selectedCards.length >= 3) {
      onMeld();
    }
  };

  const handleDiscard = () => {
    if (onDiscard && selectedCards.length === 1) {
      onDiscard(selectedCards[0]);
    }
  };

  const handleClearSelection = () => {
    if (onCardSelect) {
      selectedCards.forEach(cardId => onCardSelect(cardId));
    }
  };

  const getHandStats = () => {
    const stats = player.getHandStats();
    return {
      totalCards: stats.totalCards,
      jokerCount: stats.jokerCount,
      hasJokers: stats.jokerCount > 0,
      isFull: stats.totalCards > 7
    };
  };

  const stats = getHandStats();

  const getRequiredActionMessage = () => {
    switch (requiredAction) {
      case 'discard':
        return '🎯 Wajib membuang 1 kartu (8 → 7)';
      case 'meld':
        return '⚠️ Wajib menurunkan kombinasi setelah ambil dari discard pile';
      default:
        return null;
    }
  };

  const getActionHint = () => {
    if (!isMyTurn) return null;

    if (!player.hasLaidRunMeld()) {
      return '💡 Wajib menurunkan Urutan (Run) terlebih dahulu';
    }

    if (player.canWin()) {
      return '🎯 Siap Memukul! Tinggal 1 kartu lagi';
    }

    return 'Pilih kartu untuk dibuang atau buat meld (minimal 3 kartu)';
  };

  return (
    <div className={`bg-white border border-black rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-black font-medium">
            {showCards ? 'Kartu Saya' : 'Kartu Lawan'} ({stats.totalCards})
          </h3>
          {stats.hasJokers && (
            <div className="text-sm text-yellow-600">
              🃏 {stats.jokerCount} Joker{stats.jokerCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
        {isMyTurn && (
          <div className="flex items-center space-x-2">
            <span className="text-black font-medium">Giliran Anda!</span>
            {stats.isFull && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                8 Kartu
              </span>
            )}
          </div>
        )}
      </div>

      {/* Required Action Indicator */}
      {requiredAction !== 'none' && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700 font-medium">
            {getRequiredActionMessage()}
          </p>
        </div>
      )}

      {/* Cards Display */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {showCards ? (
          player.getHand().map(card => (
            <CardComponent
              key={card.id}
              card={card}
              isSelected={selectedCards.includes(card.id)}
              isClickable={isMyTurn}
              isDisabled={!isMyTurn}
              isHoverable={isMyTurn}
              showTooltip={isMyTurn}
              onClick={handleCardClick}
            />
          ))
        ) : (
          // Hidden cards for opponents
          Array.from({ length: stats.totalCards }).map((_, index) => (
            <div
              key={index}
              className="w-12 h-16 bg-black border-2 border-black rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg"
            >
              🎴
            </div>
          ))
        )}
      </div>

      {/* Controls and Hints */}
      {showCards && showControls && isMyTurn && (
        <div className="space-y-3">
          {/* Action Hint */}
          {getActionHint() && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                {getActionHint()}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-2">
            {/* Discard Button */}
            {canDiscard && selectedCards.length === 1 && (
              <button
                onClick={handleDiscard}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border border-black font-medium"
              >
                {stats.isFull ? 'Buang Kartu Pertama' : 'Buang Kartu'}
              </button>
            )}

            {/* Meld Button */}
            {canMeld && selectedCards.length >= 3 && (
              <button
                onClick={handleMeld}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border border-black font-medium"
              >
                Buat Meld ({selectedCards.length})
              </button>
            )}

            {/* Clear Selection Button */}
            {selectedCards.length > 0 && (
              <button
                onClick={handleClearSelection}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors border border-gray-600 font-medium"
              >
                Batal Pilih
              </button>
            )}
          </div>

          {/* Selection Counter */}
          {selectedCards.length > 0 && (
            <div className="text-center text-sm text-gray-600">
              {selectedCards.length} kartu dipilih
            </div>
          )}
        </div>
      )}

      {/* Winning Indicator */}
      {showCards && player.canWin() && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-medium text-center">
            🎯 Anda bisa menang! Tinggal 1 kartu lagi
          </p>
        </div>
      )}
    </div>
  );
};

export default HandComponent;