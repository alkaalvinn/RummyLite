import React, { useState } from 'react';
import { Card, DiscardPile } from '../../game/Card';
import { Player } from '../../game/Player';
import CardComponent from './CardComponent';

interface DiscardPileComponentProps {
  discardPile: DiscardPile;
  myPlayer?: Player;
  isMyTurn: boolean;
  canTakeFromDiscard: boolean;
  onTakeFromDiscard?: (count: number) => void;
  className?: string;
}

export const DiscardPileComponent: React.FC<DiscardPileComponentProps> = ({
  discardPile,
  myPlayer,
  isMyTurn,
  canTakeFromDiscard,
  onTakeFromDiscard,
  className = ''
}) => {
  const [showAllCards, setShowAllCards] = useState(false);
  const [groupByPlayer, setGroupByPlayer] = useState(false);

  const allCards = discardPile.getAllCards();
  const totalCards = discardPile.getCount();
  const lastThreeCards = discardPile.getLastCards(3).reverse();

  // Get matching cards for the current player
  const getMatchingCards = () => {
    if (!myPlayer) return [];
    return myPlayer.getMatchingCardsSequence(allCards);
  };

  const matchingCards = getMatchingCards();
  const topCard = discardPile.getTopCard();

  const handleTakeFromDiscard = (count: number) => {
    if (onTakeFromDiscard && isMyTurn && canTakeFromDiscard) {
      onTakeFromDiscard(count);
    }
  };

  const isCardMatching = (card: Card) => {
    if (!myPlayer) return false;
    return myPlayer.hasMatchingPair(card);
  };

  const getCardsToShow = () => {
    if (showAllCards) {
      return allCards.slice().reverse();
    }
    return groupByPlayer ? allCards.slice(-20).reverse() : lastThreeCards;
  };

  const getGroupedCards = () => {
    const cardsToShow = getCardsToShow();
    const grouped: Record<string, { card: Card; originalIndex: number }[]> = {};

    cardsToShow.forEach((card, index) => {
      const discardedBy = discardPile.getWhoDiscarded(card.id);
      const playerId = discardedBy || 'unknown';
      if (!grouped[playerId]) {
        grouped[playerId] = [];
      }
      grouped[playerId].push({
        card,
        originalIndex: allCards.length - cardsToShow.length + index
      });
    });

    return grouped;
  };

  return (
    <div className={`bg-white border border-black rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-black font-medium">Discard Pile</h3>
        {totalCards > 0 && (
          <span className="px-2 py-1 bg-black text-white text-xs rounded-full">
            {totalCards}
          </span>
        )}
      </div>

      {/* Top Cards Display */}
      <div className="mb-4">
        {totalCards > 0 ? (
          <div className="flex justify-center">
            <div className="relative">
              {lastThreeCards.map((card, index) => {
                const isMatching = isCardMatching(card);
                const isTopCard = index === 0;

                return (
                  <div
                    key={card.id}
                    className="relative"
                    style={{
                      zIndex: lastThreeCards.length - index,
                      transform: `translateX(${index * 8}px)`,
                      position: index > 0 ? 'absolute' : 'relative'
                    }}
                  >
                    <CardComponent
                      card={card}
                      size="medium"
                      isClickable={false}
                      isDisabled={true}
                      className={`transition-all duration-200 ${
                        isMatching ? 'ring-2 ring-green-400 ring-offset-2' : ''
                      } ${isTopCard && isMyTurn && canTakeFromDiscard ? 'cursor-pointer hover:scale-105' : ''}`}
                    />

                    {/* Top card indicator */}
                    {isTopCard && (
                      <div className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {totalCards}
                      </div>
                    )}

                    {/* Matching indicator */}
                    {isMatching && (
                      <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-16 h-24 bg-gray-200 border-2 border-black rounded-lg flex items-center justify-center text-gray-500">
              Kosong
            </div>
          </div>
        )}
      </div>

      {/* Matching Cards Info */}
      {myPlayer && isMyTurn && matchingCards.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-700 font-medium mb-2">
            ✅ {matchingCards.length} kartu cocok tersedia
          </div>
          <div className="flex justify-center">
            {matchingCards.slice(0, 3).map((card) => (
              <div key={card.id} className="mx-1">
                <CardComponent
                  card={card}
                  size="small"
                  isClickable={false}
                  isDisabled={true}
                />
              </div>
            ))}
            {matchingCards.length > 3 && (
              <div className="w-8 h-12 bg-green-500 border-2 border-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
                +{matchingCards.length - 3}
              </div>
            )}
          </div>
          {canTakeFromDiscard && (
            <button
              onClick={() => handleTakeFromDiscard(matchingCards.length)}
              className="mt-2 w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
            >
              📤 Ambil {matchingCards.length} dari Discard
            </button>
          )}
        </div>
      )}

      {/* No Matching Cards */}
      {myPlayer && isMyTurn && matchingCards.length === 0 && totalCards > 0 && (
        <div className="mb-4 text-center text-sm text-gray-600">
          Tidak ada kartu yang cocok
        </div>
      )}

      {/* Controls */}
      {totalCards > 3 && (
        <div className="flex justify-center space-x-2 mb-4">
          <button
            onClick={() => setShowAllCards(!showAllCards)}
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
          >
            {showAllCards ? 'Sembunyikan' : 'Tampilkan Semua'}
          </button>
          {showAllCards && (
            <button
              onClick={() => setGroupByPlayer(!groupByPlayer)}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
            >
              {groupByPlayer ? 'Urutkan Waktu' : 'Kelompokkan Pemain'}
            </button>
          )}
        </div>
      )}

      {/* Extended Cards Display */}
      {showAllCards && totalCards > 3 && (
        <div className="border-t border-gray-200 pt-3">
          <div className="text-sm text-gray-600 mb-2 text-center">
            {groupByPlayer ? 'Dikelompokkan per pemain' : 'Urutan terbaru'}
          </div>

          {groupByPlayer ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {Object.entries(getGroupedCards()).map(([playerId, cards]) => {
                const playerName = playerId === 'unknown' ? 'Unknown' : playerId;
                return (
                  <div key={playerId} className="border border-gray-300 rounded-lg p-2">
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      {playerName} ({cards.length} kartu)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cards.map(({ card, originalIndex }) => (
                        <div key={card.id} className="relative group">
                          <CardComponent
                            card={card}
                            size="small"
                            isClickable={false}
                            isDisabled={true}
                          />
                          <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            #{originalIndex}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center max-h-60 overflow-y-auto">
              {getCardsToShow().map((card, index) => (
                <div key={card.id} className="relative group">
                  <CardComponent
                    card={card}
                    size="small"
                    isClickable={false}
                    isDisabled={true}
                  />
                  <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    #{totalCards - index}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showAllCards && totalCards > (groupByPlayer ? 20 : 3) && (
            <div className="text-center text-xs text-gray-500 mt-2">
              Menampilkan {groupByPlayer ? '20' : '3'} kartu terakhir dari {totalCards} kartu total
            </div>
          )}
        </div>
      )}

      {/* Total Count */}
      <div className="text-center text-sm text-gray-600 mt-2">
        Total: {totalCards} kartu
      </div>
    </div>
  );
};

export default DiscardPileComponent;