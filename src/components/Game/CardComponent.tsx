import React from 'react';
import { Card } from '../../game/Card';

interface CardComponentProps {
  card: Card;
  isSelected?: boolean;
  isClickable?: boolean;
  isDisabled?: boolean;
  isHoverable?: boolean;
  showTooltip?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: (card: Card) => void;
  className?: string;
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isSelected = false,
  isClickable = false,
  isDisabled = false,
  isHoverable = false,
  showTooltip = false,
  size = 'medium',
  onClick,
  className = ''
}) => {
  const handleClick = () => {
    if (isClickable && !isDisabled && onClick) {
      onClick(card);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-8 h-12 text-xs';
      case 'medium':
        return 'w-12 h-16 text-lg';
      case 'large':
        return 'w-16 h-24 text-2xl';
      default:
        return 'w-12 h-16 text-lg';
    }
  };

  const getCardClasses = () => {
    const baseClasses = `
      ${getSizeClasses()}
      border-2 rounded-lg flex items-center justify-center font-bold
      transition-all duration-200 shadow-lg
      ${isSelected
        ? 'bg-black text-white border-black scale-110 shadow-xl'
        : 'bg-white text-black border-gray-400 hover:scale-105'
      }
      ${isClickable && !isDisabled ? 'cursor-pointer' : 'cursor-default'}
      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${isHoverable && !isDisabled ? 'hover:shadow-xl' : ''}
      ${card.isJoker ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' : ''}
    `;

    return baseClasses;
  };

  const getTooltipContent = () => {
    if (!showTooltip) return null;

    return (
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
        <div className="flex flex-col space-y-1">
          <span>{card.rank} of {card.suit}</span>
          <span>Value: {card.value}</span>
          {card.isJoker && <span>Joker Card</span>}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative group ${className}`}>
      <div
        className={getCardClasses()}
        onClick={handleClick}
        role={isClickable ? 'button' : 'presentation'}
        aria-label={`${card.rank} of ${card.suit}${card.isJoker ? ' (Joker)' : ''}`}
        aria-pressed={isSelected}
        aria-disabled={isDisabled}
      >
        <span className={card.getColor()}>
          {card.getDisplay()}
        </span>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
          <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
            <div className="flex flex-col space-y-1">
              <span>{card.rank} of {card.suit}</span>
              <span>Value: {card.value}</span>
              {card.isJoker && <span>Joker Card</span>}
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardComponent;