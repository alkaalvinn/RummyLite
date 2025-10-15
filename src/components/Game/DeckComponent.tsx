import React from 'react';
import { Deck } from '../../game/Card';
import { Player } from '../../game/Player';

interface DeckComponentProps {
  deck: Deck;
  isMyTurn: boolean;
  canDrawFromDeck: boolean;
  onDrawFromDeck?: () => void;
  matchingCardsCount?: number;
  className?: string;
}

export const DeckComponent: React.FC<DeckComponentProps> = ({
  deck,
  isMyTurn,
  canDrawFromDeck,
  onDrawFromDeck,
  matchingCardsCount = 0,
  className = ''
}) => {
  const handleDrawFromDeck = () => {
    if (onDrawFromDeck && isMyTurn && canDrawFromDeck) {
      onDrawFromDeck();
    }
  };

  const getDeckStatusColor = () => {
    const remainingCards = deck.getRemainingCount();

    if (remainingCards === 0) {
      return 'bg-red-100 border-red-300 text-red-700';
    } else if (remainingCards < 10) {
      return 'bg-yellow-100 border-yellow-300 text-yellow-700';
    } else {
      return 'bg-white border-black text-black';
    }
  };

  const getDeckMessage = () => {
    const remainingCards = deck.getRemainingCount();

    if (remainingCards === 0) {
      return 'Deck Kosong';
    } else if (remainingCards < 10) {
      return 'Hampir Habis!';
    } else {
      return 'Kartu Tersedia';
    }
  };

  const remainingCards = deck.getRemainingCount();
  const isEmpty = deck.isEmpty();

  return (
    <div className={`bg-white border border-black rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="text-center mb-3">
        <h3 className="text-black font-medium">Deck</h3>
        <div className={`text-sm px-2 py-1 rounded inline-block mt-1 ${getDeckStatusColor()}`}>
          {getDeckMessage()}
        </div>
      </div>

      {/* Deck Visual */}
      <div className="flex justify-center mb-3">
        <div className="relative">
          {/* Card Stack Visual */}
          <div className="flex">
            <div className={`w-16 h-24 ${isEmpty ? 'bg-gray-200' : 'bg-black'} border-2 border-black rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg transition-all duration-200 ${
              isMyTurn && canDrawFromDeck && !isEmpty ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
            }`}
               onClick={handleDrawFromDeck}
               role={isMyTurn && canDrawFromDeck && !isEmpty ? 'button' : 'presentation'}
               aria-label="Draw card from deck">
              {isEmpty ? (
                <span className="text-gray-500 text-4xl">🚫</span>
              ) : (
                <span className="text-2xl font-bold">{remainingCards}</span>
              )}
            </div>

            {/* Stacked cards effect */}
            {!isEmpty && (
              <>
                <div className="w-16 h-24 bg-black border-2 border-black rounded-lg absolute -left-1 -top-1 opacity-30"></div>
                <div className="w-16 h-24 bg-black border-2 border-black rounded-lg absolute -left-2 -top-2 opacity-20"></div>
                <div className="w-16 h-24 bg-black border-2 border-black rounded-lg absolute -left-3 -top-3 opacity-10"></div>
              </>
            )}
          </div>

          {/* Card count indicator */}
          <div className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
            {remainingCards}
          </div>
        </div>
      </div>

      {/* Card Count Info */}
      <div className="text-center text-sm text-gray-600 mb-3">
        <div>Kartu tersisa: {remainingCards}</div>
        {matchingCardsCount > 0 && (
          <div className="text-orange-600 font-medium mt-1">
            ⚠️ {matchingCardsCount} kartu cocok di discard pile
          </div>
        )}
      </div>

      {/* Action Button */}
      {isMyTurn && (
        <div className="text-center">
          {matchingCardsCount > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-green-600 font-medium">
                ✅ Ada {matchingCardsCount} kartu yang cocok
              </div>
              <div className="text-xs text-gray-500">
                Ambil dari discard pile terlebih dahulu
              </div>
            </div>
          ) : (
            <button
              onClick={handleDrawFromDeck}
              disabled={!canDrawFromDeck || isEmpty}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border ${
                canDrawFromDeck && !isEmpty
                  ? 'bg-black text-white hover:bg-gray-800 border-black hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
              }`}
              aria-label={isEmpty ? "Deck is empty" : "Draw 1 card from deck"}>
              {isEmpty ? 'Deck Kosong' : '🎴 Ambil 1 dari Deck'}
            </button>
          )}
        </div>
      )}

      {/* Warning for low cards */}
      {remainingCards > 0 && remainingCards < 10 && (
        <div className="mt-3 text-center">
          <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
            ⚠️ Deck akan segera habis!
          </div>
        </div>
      )}

      {/* Game end warning */}
      {isEmpty && (
        <div className="mt-3 text-center">
          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            Game berakhir saat deck habis
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckComponent;