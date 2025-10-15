import React from 'react';
import { Meld } from '../../game/Card';
import { Player } from '../../game/Player';
import CardComponent from './CardComponent';

interface MeldAreaComponentProps {
  player: Player;
  showPlayerName?: boolean;
  compact?: boolean;
  className?: string;
  onMeldClick?: (meld: Meld) => void;
}

export const MeldAreaComponent: React.FC<MeldAreaComponentProps> = ({
  player,
  showPlayerName = false,
  compact = false,
  className = '',
  onMeldClick
}) => {
  const melds = player.getMelds();

  const handleMeldClick = (meld: Meld) => {
    if (onMeldClick) {
      onMeldClick(meld);
    }
  };

  const getMeldTypeLabel = (meld: Meld) => {
    if (meld.isRun()) {
      return 'Run (Urutan)';
    } else if (meld.isSet()) {
      return 'Set (Grup)';
    }
    return 'Meld';
  };

  const getMeldTypeColor = (meld: Meld) => {
    if (meld.isRun()) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (meld.isSet()) {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getMeldValue = (meld: Meld) => {
    return meld.cards.reduce((total, card) => total + card.value, 0);
  };

  if (melds.length === 0) {
    return (
      <div className={`bg-white border border-black rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-sm">Belum ada kombinasi</p>
          {!player.hasLaidRunMeld() && (
            <p className="text-xs mt-1">Wajib menurunkan Urutan (Run) terlebih dahulu</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-black rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-black font-medium">
            {showPlayerName ? `${player.displayName}'s ` : ''}Melds
          </h3>
          <span className="px-2 py-1 bg-black text-white text-xs rounded-full">
            {melds.length}
          </span>
        </div>
        {!player.hasLaidRunMeld() && (
          <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            Belum ada Run wajib
          </div>
        )}
      </div>

      {/* Melds Display */}
      <div className={`${compact ? 'space-y-2' : 'space-y-4'}`}>
        {melds.map((meld, index) => (
          <div
            key={meld.id}
            className={`border rounded-lg p-3 transition-all duration-200 ${
              onMeldClick ? 'cursor-pointer hover:shadow-md' : ''
            } ${compact ? 'border-gray-300' : 'border-black'}`}
            onClick={() => handleMeldClick(meld)}
          >
            {/* Meld Header */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded border font-medium ${getMeldTypeColor(meld)}`}>
                  {getMeldTypeLabel(meld)}
                </span>
                <span className="text-sm text-gray-600">
                  Meld {index + 1}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {meld.getSize()} kartu
                </span>
                <span className="text-sm font-medium text-black">
                  {getMeldValue(meld)} poin
                </span>
              </div>
            </div>

            {/* Cards in Meld */}
            <div className={`flex ${compact ? 'gap-1' : 'gap-2'} justify-center`}>
              {meld.cards.map((card, cardIndex) => (
                <CardComponent
                  key={card.id}
                  card={card}
                  size={compact ? 'small' : 'medium'}
                  isClickable={false}
                  isDisabled={true}
                  showTooltip={!compact}
                  className={`${compact ? '' : 'transform transition-transform hover:scale-105'}`}
                />
              ))}
            </div>

            {/* Meld Details (non-compact) */}
            {!compact && (
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">
                  {meld.isRun()
                    ? 'Urutan kartu dengan jenis yang sama'
                    : 'Grup kartu dengan rank yang sama'
                  }
                </p>
                {meld.cards.some(card => card.isJoker) && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Mengandung Joker 🃏
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total melds:</span>
          <span className="font-medium text-black">
            {melds.reduce((total, meld) => total + getMeldValue(meld), 0)} poin
          </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-1">
          <span className="text-gray-600">Meld bonus:</span>
          <span className="font-medium text-black">
            +{melds.reduce((total, meld) => total + 10 + (meld.getSize() === 4 ? 5 : 0), 0)} poin
          </span>
        </div>
      </div>
    </div>
  );
};

export default MeldAreaComponent;