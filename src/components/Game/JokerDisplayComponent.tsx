import React from 'react';
import { Card } from '../../game/Card';
import CardComponent from './CardComponent';

interface JokerDisplayComponentProps {
  jokerReferenceCard?: Card;
  jokerCards: Card[];
  compact?: boolean;
  className?: string;
}

export const JokerDisplayComponent: React.FC<JokerDisplayComponentProps> = ({
  jokerReferenceCard,
  jokerCards,
  compact = false,
  className = ''
}) => {
  const getSizeClasses = () => {
    return compact ? 'w-12 h-16 text-lg' : 'w-16 h-24 text-2xl';
  };

  const getJokerSuitDisplay = (card: Card) => {
    const suitSymbols = {
      hearts: '♥️',
      diamonds: '♦️',
      clubs: '♣️',
      spades: '♠️'
    };

    return `${card.rank}${suitSymbols[card.suit]}`;
  };

  if (!jokerReferenceCard || jokerCards.length === 0) {
    return (
      <div className={`bg-white border border-black rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-sm">Joker belum ditentukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-black rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-black font-medium">Kartu Joker</h3>
        <p className="text-sm text-gray-600 mt-1">
          Semua kartu {jokerReferenceCard.rank} menjadi Joker
        </p>
      </div>

      {/* Cards Display */}
      <div className="flex justify-center items-center space-x-4">
        {/* Reference Card */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Referensi</p>
          <div className={`${getSizeClasses()} bg-white border-2 border-black rounded-lg flex items-center justify-center font-bold shadow-lg`}>
            <span className={jokerReferenceCard.getColor()}>
              {getJokerSuitDisplay(jokerReferenceCard)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Tidak digunakan
          </p>
        </div>

        {/* Arrow */}
        <div className="text-2xl text-gray-400">
          →
        </div>

        {/* Joker Cards */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Joker</p>
          <div className="flex space-x-1">
            {jokerCards.map((jokerCard, index) => (
              <div key={jokerCard.id} className="relative">
                <div className={`${getSizeClasses()} bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-black rounded-lg flex items-center justify-center font-bold shadow-lg`}>
                  <span className="text-3xl">🃏</span>
                </div>
                {/* Card label */}
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                  {getJokerSuitDisplay(jokerCard)}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            {jokerCards.length} kartu pengganti
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-sm text-yellow-800">
          <p className="font-medium mb-1">🎯 Cara Kerja Joker:</p>
          <ul className="text-xs space-y-1 ml-4">
            <li>• Joker bisa mengganti kartu apa pun</li>
            <li>• Bisa digunakan untuk Run (urutan) atau Set (grup)</li>
            <li>• Nilai Joker: +10 poin jika digunakan, -25 poin jika tidak</li>
            <li>• Nilai kemenangan: 250 poin jika menang dengan Joker</li>
          </ul>
        </div>
      </div>

      {/* Legend */}
      {!compact && (
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500">
            <p>Kartu referensi ditampilkan untuk informasi</p>
            <p>Hanya {jokerCards.length} kartu kembar yang menjadi Joker</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default JokerDisplayComponent;