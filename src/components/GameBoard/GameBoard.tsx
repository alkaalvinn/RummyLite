import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { subscribeToRoom } from '../../services/firebase';
import { Game } from '../../game/Game';
import { Card } from '../../game/Card';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const GameBoard: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showAllDiscarded, setShowAllDiscarded] = useState<boolean>(false);
  const [groupByPlayer, setGroupByPlayer] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'rank' | 'suit' | 'both' | 'none'>('none');

  useEffect(() => {
    if (!roomId || !user) {
      navigate('/');
      return;
    }

    const unsubscribe = subscribeToRoom(roomId, (data) => {
      if (data.gameData) {
        // Reconstruct Game object from saved data
        const gameObj = Game.fromData(data.gameData);
        setGame(gameObj);
      }
      setLoading(false);

      // Redirect if game is finished
      if (data.status === 'finished') {
        // Handle game finished state
      }
    });

    return () => unsubscribe();
  }, [roomId, user, navigate]);

  
  const handleCardSelect = (cardId: string) => {
    setSelectedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  // Helper functions
  const getCardDisplay = (card: Card): string => {
    if (card.isJoker) return '🃏';
    const suitSymbols = {
      hearts: '♥️',
      diamonds: '♦️',
      clubs: '♣️',
      spades: '♠️'
    };
    return `${card.rank}${suitSymbols[card.suit]}`;
  };

  const getCardColor = (card: Card): string => {
    if (card.isJoker) return 'text-black';
    if (card.suit === 'hearts' || card.suit === 'diamonds') return 'text-black';
    return 'text-black';
  };

  // Sorting functions for cards
  const sortCards = (cards: Card[], sortBy: 'rank' | 'suit' | 'both'): Card[] => {
    const sorted = [...cards];

    switch (sortBy) {
      case 'rank':
        return sorted.sort((a, b) => {
          // Define rank order
          const rankOrder = {'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13};
          return rankOrder[a.rank] - rankOrder[b.rank];
        });
      case 'suit':
        return sorted.sort((a, b) => {
          const suitOrder = {'hearts': 1, 'diamonds': 2, 'clubs': 3, 'spades': 4};
          if (suitOrder[a.suit] !== suitOrder[b.suit]) {
            return suitOrder[a.suit] - suitOrder[b.suit];
          }
          // If same suit, sort by rank
          const rankOrder = {'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13};
          return rankOrder[a.rank] - rankOrder[b.rank];
        });
      case 'both':
        return sorted.sort((a, b) => {
          // Sort by rank first, then by suit
          const rankOrder = {'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13};
          if (rankOrder[a.rank] !== rankOrder[b.rank]) {
            return rankOrder[a.rank] - rankOrder[b.rank];
          }
          const suitOrder = {'hearts': 1, 'diamonds': 2, 'clubs': 3, 'spades': 4};
          return suitOrder[a.suit] - suitOrder[b.suit];
        });
      default:
        return sorted;
    }
  };

  const getSortedHand = (hand: Card[]): Card[] => {
    if (sortBy === 'none') return hand;
    return sortCards(hand, sortBy);
  };

  const handleDrawCard = async (fromDiscard: boolean = false, drawCount?: number) => {
    if (!game || !user || !roomId) return;

    const currentPlayer = game.getCurrentPlayer();
    if (currentPlayer.id !== user.uid) return;

    try {
      // Draw card using Game class
      if (fromDiscard && drawCount) {
        await game.drawCard(user.uid, true, drawCount);
      } else {
        await game.drawCard(user.uid, false);
      }

      // Update Firebase with new game state
      if (roomId) {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
          'gameData': game.getDataForFirestore(),
          lastUpdate: serverTimestamp()
        });
      }

      setSelectedCards([]);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDiscardCard = async (cardId: string) => {
    if (!game || !user || !roomId) return;

    const currentPlayer = game.getCurrentPlayer();
    if (currentPlayer.id !== user.uid) return;

    try {
      // Discard card using Game class
      await game.discardCard(user.uid, cardId);

      // Update Firebase with new game state
      if (roomId) {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
          'gameData': game.getDataForFirestore(),
          lastUpdate: serverTimestamp()
        });
      }

      setSelectedCards([]);
      setError('');

      // Check if game is finished
      if (game.isFinished()) {
        // Handle game finished state
        const winner = game.getWinner();
        if (winner === user.uid) {
          setError('🎉 Selamat! Anda menang dengan Memukul!');
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMeldCards = async () => {
    if (!game || !user || !roomId || selectedCards.length < 3) return;

    const currentPlayer = game.getCurrentPlayer();
    if (currentPlayer.id !== user.uid) return;

    try {
      // Create meld using Game class
      await game.createMeld(user.uid, selectedCards);

      // Update Firebase with new game state
      if (roomId) {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
          'gameData': game.getDataForFirestore(),
          lastUpdate: serverTimestamp()
        });
      }

      setSelectedCards([]);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  
  
  const getPlayerColor = (playerId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-yellow-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-gray-500'
    ];
    const playerIndex = gameData?.players.findIndex((p: any) => p.id === playerId) ?? 0;
    return colors[playerIndex % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Game tidak ditemukan</div>
      </div>
    );
  }

  const currentPlayer = game.getCurrentPlayer();
  const isMyTurn = currentPlayer?.id === user?.uid;
  const myPlayer = game.getPlayer(user?.uid || '');
  const gameData = game.getData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-black shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-6">
              <div>
                <h1 className="text-2xl font-bold text-black">Room: {roomId}</h1>
                <span className="text-sm text-gray-600">Ronde {gameData.currentRound}</span>
              </div>
              <div className="hidden sm:block">
                <span className="px-3 py-1 bg-black text-white text-sm rounded-full">
                  Status: {gameData.status === 'playing' ? 'Bermain' : gameData.status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-black">
                {currentPlayer?.displayName}
              </div>
              <div className="text-sm text-gray-600">Sedang Bermain ({gameData.currentTurnPhase})</div>
            </div>
          </div>
        </div>
      </header>

      {/* Game Board */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-black text-white px-4 py-3 rounded-lg text-sm text-center border border-black">
            {error}
          </div>
        )}


        {/* Joker Reference Card Display */}
        {gameData.jokerReferenceCard && (
          <div className="bg-white border-2 border-black rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center">
              <h3 className="text-black font-medium mb-2">Kartu Joker</h3>
              <div className="flex justify-center items-center space-x-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Referensi</p>
                  <div className="w-16 h-24 bg-white border-2 border-black rounded-lg flex items-center justify-center text-2xl font-bold shadow-lg">
                    <span className={getCardColor(gameData.jokerReferenceCard)}>
                      {getCardDisplay(gameData.jokerReferenceCard)}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Joker</p>
                  <div className="w-16 h-24 bg-black border-2 border-black rounded-lg flex items-center justify-center text-3xl text-white shadow-lg">
                    🃏
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-600">Semua kartu {gameData.jokerReferenceCard.rank} menjadi Joker</p>
                  <p className="text-xs text-gray-500">Kecuali kartu referensi di atas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Players */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {gameData.players.filter(p => p.id !== user?.uid).map(player => (
            <div key={player.id} className="bg-white border-2 border-black rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-black font-medium">{player.displayName}</h3>
                {currentPlayer?.id === player.id && (
                  <span className="px-2 py-1 bg-black text-white text-xs rounded">
                    Giliran
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                Kartu: {player.hand.length} | Melds: {player.melds.length}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {player.melds.map((meld, index) => (
                  <div key={meld.id} className="px-2 py-1 bg-black text-white text-xs rounded">
                    Meld {index + 1}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Play Area */}
        <div className="bg-white border-2 border-black rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Deck */}
            <div className="text-center">
              <div className="bg-gray-50 border-2 border-black rounded-lg p-4">
                <h3 className="text-black font-bold mb-3">Deck</h3>
                <div className="inline-block">
                  <div className="relative">
                    <div className={`w-20 h-28 ${gameData.deck.length === 0 ? 'bg-red-100 border-red-300' : 'bg-black'} border-2 border-black rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg transition-all duration-200 ${
                      isMyTurn && gameData.deck.length > 0 ? 'hover:scale-105 cursor-pointer' : ''
                    }`}
                         onClick={() => isMyTurn && gameData.deck.length > 0 && handleDrawCard(false)}>
                      {gameData.deck.length === 0 ? (
                        <span className="text-red-500 text-3xl">🚫</span>
                      ) : (
                        <span className="text-2xl">{gameData.deck.length}</span>
                      )}
                    </div>
                    {/* Stacked cards effect */}
                    {gameData.deck.length > 0 && (
                      <>
                        <div className="w-20 h-28 bg-black border-2 border-black rounded-lg absolute -left-1 -top-1 opacity-30"></div>
                        <div className="w-20 h-28 bg-black border-2 border-black rounded-lg absolute -left-2 -top-2 opacity-20"></div>
                        <div className="w-20 h-28 bg-black border-2 border-black rounded-lg absolute -left-3 -top-3 opacity-10"></div>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-2 font-medium">
                    {gameData.deck.length === 0 ? 'Deck Kosong' : `${gameData.deck.length} kartu tersisa`}
                  </div>
                </div>
              {isMyTurn && (
                <div className="mt-2 flex flex-col space-y-2">
                  {gameData.currentTurnPhase === 'drawPhase' ? (
                    // Draw phase - show draw options
                    (() => {
                      // Check if must discard first (first player with 8 cards)
                      if (game.mustDiscardFirst()) {
                        return (
                          <div className="space-y-2">
                            <p className="text-sm text-orange-600 font-medium">
                              ⚠️ Pemain pertama wajib membuang 1 kartu
                            </p>
                            <p className="text-xs text-gray-600">
                              Tidak bisa mengambil kartu sampai membuang kartu
                            </p>
                          </div>
                        );
                      }

                      // Check if can draw from discard pile (need matching cards)
                      const discardPile = game.getDiscardPile();
                      const topCards = discardPile.getLastCards(3);
                      const canDrawFromDiscard = topCards.some(card =>
                        myPlayer?.getHand().some(handCard =>
                          handCard.rank === card.rank && handCard.suit !== card.suit ||
                          handCard.suit === card.suit && Math.abs(handCard.value - card.value) === 1
                        )
                      );

                      if (canDrawFromDiscard && discardPile.getCount() > 0) {
                        return (
                          <div className="space-y-2">
                            <p className="text-sm text-green-600 font-medium">
                              ✅ Ada kartu yang cocok di discard pile
                            </p>
                            <button
                              onClick={() => handleDrawCard(true, 1)}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm border border-green-600 w-full"
                            >
                              📤 Ambil dari Discard
                            </button>
                            <p className="text-xs text-orange-600">
                              ⚠️ Wajib ambil dari discard pile
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <button
                            onClick={() => handleDrawCard(false)}
                            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm border border-black w-full"
                            disabled={game.getDeck().isEmpty()}
                          >
                            🎴 Ambil 1 dari Deck
                          </button>
                        );
                      }
                    })()
                  ) : (
                    // Not draw phase
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Fase: {gameData.currentTurnPhase === 'meldPhase' ? 'Menurunkan Kartu' : 'Membuang Kartu'}
                      </p>
                      {gameData.currentTurnPhase === 'meldPhase' && (
                        <p className="text-xs text-gray-500">
                          {game.lastDrawFromDiscard()
                            ? 'Wajib menurunkan kombinasi'
                            : 'Boleh menurunkan kombinasi'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>

            {/* Discard Pile */}
            <div className="text-center">
              <div className="bg-gray-50 border-2 border-black rounded-lg p-4">
                <h3 className="text-black font-bold mb-3">Discard Pile</h3>
                <div className="flex justify-center space-x-1">
                {gameData.discardPile.length > 0 ? (
                  <>
                    {gameData.discardPile.slice(-3).reverse().map((card, index) => {
                      const discardPile = game.getDiscardPile();
                      const topCards = discardPile.getLastCards(3);
                      const isMatching = topCards.some(topCard =>
                        myPlayer?.getHand().some(handCard =>
                          handCard.rank === topCard.rank && handCard.suit !== topCard.suit ||
                          handCard.suit === topCard.suit && Math.abs(handCard.value - topCard.value) === 1
                        )
                      );
                      return (
                        <div key={card.id} className="relative">
                          <div
                            className={`w-14 h-20 border-2 rounded-lg flex items-center justify-center text-lg font-bold shadow-lg transition-all hover:scale-105 ${
                              isMatching && index === 0 ? 'bg-green-50 border-green-500 hover:bg-green-100' : 'bg-white border-black hover:bg-gray-50'
                            }`}
                            style={{
                              zIndex: index,
                              transform: `translateX(${index * 10}px)`,
                              position: index > 0 ? 'absolute' : 'relative'
                            }}
                          >
                            <span className={getCardColor(card)}>
                              {getCardDisplay(card)}
                            </span>
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                              {gameData.discardPile.length}
                            </div>
                          )}
                          {isMatching && index === 0 && (
                            <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="w-16 h-24 bg-gray-200 border-2 border-black rounded-lg flex items-center justify-center text-gray-600">
                    Kosong
                  </div>
                )}
              </div>
              {isMyTurn && gameData.discardPile.length > 0 && myPlayer && (
                <div className="mt-3">
                  {(() => {
                    const discardPile = game.getDiscardPile();
                    const topCards = discardPile.getLastCards(3);
                    const matchingCards = topCards.filter(card =>
                      myPlayer?.getHand().some(handCard =>
                        handCard.rank === card.rank && handCard.suit !== card.suit ||
                        handCard.suit === card.suit && Math.abs(handCard.value - card.value) === 1
                      )
                    );

                    if (matchingCards.length > 0) {
                      return (
                        <div className="space-y-1">
                          <p className="text-sm text-green-600 font-medium">
                            Pasangan tersedia: {matchingCards.length} kartu
                          </p>
                          <div className="flex justify-center">
                            {matchingCards.slice(0, 3).map((card) => (
                              <div
                                key={card.id}
                                className="w-8 h-12 bg-green-50 border border-green-500 rounded flex items-center justify-center text-xs font-bold mx-0.5"
                              >
                                <span className={getCardColor(card)}>
                                  {getCardDisplay(card)}
                                </span>
                              </div>
                            ))}
                            {matchingCards.length > 3 && (
                              <div className="w-8 h-12 bg-green-500 border border-green-500 rounded flex items-center justify-center text-xs text-white font-bold mx-0.5">
                                +{matchingCards.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-sm text-gray-600">
                          Tidak ada kartu yang cocok
                        </p>
                      );
                    }
                  })()}
                </div>
              )}
              <div className="text-sm text-gray-600 mt-2 font-medium">
                Total: {gameData.discardPile.length} kartu
              </div>
              </div>
            </div>

            {/* Game Info */}
            <div className="text-center">
              <div className="bg-gray-50 border-2 border-black rounded-lg p-4">
                <h3 className="text-black font-bold mb-3">Info Game</h3>
                <div className="space-y-2 text-sm">
                <div>Status: {gameData.status}</div>
                <div>Pemain: {gameData.players.length}/4</div>
                <div>Fase: {gameData.currentTurnPhase}</div>
                {gameData.winner && (
                  <div className="text-black font-bold">
                    🏆 Pemenang: {gameData.players.find(p => p.id === gameData.winner)?.displayName}
                  </div>
                )}
                {myPlayer && !myPlayer.hasLaidRunMeld() && (
                  <div className="text-black text-xs">
                    💡 Belum menurunkan Urutan (Run) wajib
                  </div>
                )}
                {game.lastDrawFromDiscard() && (
                  <div className="text-black text-xs">
                    ⚠️ Wajib menurunkan kombinasi
                  </div>
                )}
                {game.mustDiscardFirst() && (
                  <div className="text-orange-600 text-xs">
                    ⚠️ Wajib membuang kartu terlebih dahulu
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Discarded Cards Display */}
        {gameData.discardPile.length > 0 && (
          <div className="bg-white border-2 border-black rounded-xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-black font-medium">Kartu yang Dibuang ({gameData.discardPile.length})</h3>
              <div className="flex space-x-2">
                {gameData.discardPile.length > 0 && (
                  <button
                    onClick={() => setGroupByPlayer(!groupByPlayer)}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm border border-gray-600"
                  >
                    {groupByPlayer ? 'Urutkan Waktu' : 'Kelompokkan Pemain'}
                  </button>
                )}
                <button
                  onClick={() => setShowAllDiscarded(!showAllDiscarded)}
                  className="px-3 py-1 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm border border-black"
                >
                  {showAllDiscarded ? 'Sembunyikan' : 'Tampilkan Semua'}
                </button>
              </div>
            </div>
            {groupByPlayer ? (
              // Group by player view
              (() => {
                const cardsToShow = showAllDiscarded
                  ? gameData.discardPile.slice()
                  : gameData.discardPile.slice(-20);

                // Group cards by player
                const cardsByPlayer: Record<string, { card: Card; originalIndex: number }[]> = {};
                cardsToShow.forEach((card, index) => {
                  const discardedByPlayer = gameData.discardedBy?.[card.id];
                  const playerId = discardedByPlayer || 'unknown';
                  if (!cardsByPlayer[playerId]) {
                    cardsByPlayer[playerId] = [];
                  }
                  cardsByPlayer[playerId].push({ card, originalIndex: gameData.discardPile.length - cardsToShow.length + index });
                });

                return (
                  <div className="space-y-4">
                    {Object.entries(cardsByPlayer).map(([playerId, cards]) => {
                      const player = gameData.players.find(p => p.id === playerId);
                      const playerName = player?.displayName || 'Unknown';
                      const playerColor = player ? getPlayerColor(playerId) : 'bg-gray-200';

                      return (
                        <div key={playerId} className="border border-black rounded-lg p-3">
                          <div className={`inline-block px-3 py-1 rounded text-sm font-medium text-white mb-2 ${playerColor}`}>
                            {playerName} ({cards.length} kartu)
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {cards.reverse().map(({ card, originalIndex }, index) => (
                              <div key={card.id} className="relative group">
                                <div
                                  className="w-12 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center text-lg font-bold shadow-lg transition-all hover:scale-105"
                                  style={{
                                    opacity: showAllDiscarded ? 1 - (index * 0.02) : 1 - (index * 0.05),
                                  }}
                                >
                                  <span className={getCardColor(card)}>
                                    {getCardDisplay(card)}
                                  </span>
                                </div>
                                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  #{originalIndex}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              // Chronological view
              <div className="flex flex-wrap gap-2 justify-center">
                {showAllDiscarded
                  ? gameData.discardPile.slice().reverse().map((card, index) => {
                      const discardedByPlayer = gameData.discardedBy?.[card.id];
                      const playerName = discardedByPlayer
                        ? gameData.players.find(p => p.id === discardedByPlayer)?.displayName || 'Unknown'
                        : null;

                      return (
                        <div key={card.id} className="relative group">
                          <div
                            className="w-12 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center text-lg font-bold shadow-lg transition-all hover:scale-105"
                            style={{
                              opacity: 1 - (index * 0.03), // Gradually fade older cards
                            }}
                          >
                            <span className={getCardColor(card)}>
                              {getCardDisplay(card)}
                            </span>
                          </div>
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            #{gameData.discardPile.length - index}
                          </div>
                          {playerName && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {playerName}
                            </div>
                          )}
                        </div>
                      );
                    })
                  : gameData.discardPile.slice(-10).reverse().map((card, index) => {
                      const discardedByPlayer = gameData.discardedBy?.[card.id];
                      const playerName = discardedByPlayer
                        ? gameData.players.find(p => p.id === discardedByPlayer)?.displayName || 'Unknown'
                        : null;

                      return (
                        <div key={card.id} className="relative group">
                          <div
                            className="w-12 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center text-lg font-bold shadow-lg transition-all hover:scale-105"
                            style={{
                              opacity: 1 - (index * 0.05), // Gradually fade older cards
                            }}
                          >
                            <span className={getCardColor(card)}>
                              {getCardDisplay(card)}
                            </span>
                          </div>
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            #{gameData.discardPile.length - index}
                          </div>
                          {playerName && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {playerName}
                            </div>
                          )}
                        </div>
                      );
                    })
                }
              </div>
            )}
            {gameData.discardPile.length > (groupByPlayer ? 20 : 10) && !showAllDiscarded && (
              <div className="text-center mt-2 text-sm text-gray-600">
                Menampilkan {groupByPlayer ? '20' : '10'} kartu terakhir dari {gameData.discardPile.length} kartu total
              </div>
            )}
          </div>
        )}

        {/* My Hand */}
        {myPlayer && (
          <div className="bg-white border-2 border-black rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-black font-medium">Kartu Saya ({myPlayer.getHandSize()})</h3>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => setSortBy('none')}
                    className={`px-3 py-1 text-xs rounded transition-colors border ${
                      sortBy === 'none'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    Acak
                  </button>
                  <button
                    onClick={() => setSortBy('rank')}
                    className={`px-3 py-1 text-xs rounded transition-colors border ${
                      sortBy === 'rank'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    Urut Angka
                  </button>
                  <button
                    onClick={() => setSortBy('suit')}
                    className={`px-3 py-1 text-xs rounded transition-colors border ${
                      sortBy === 'suit'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    Urut Jenis
                  </button>
                  <button
                    onClick={() => setSortBy('both')}
                    className={`px-3 py-1 text-xs rounded transition-colors border ${
                      sortBy === 'both'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    Urut Lengkap
                  </button>
                </div>
              </div>
              <div className="flex space-x-2">
                {selectedCards.length >= 3 && isMyTurn && gameData.currentTurnPhase === 'meldPhase' && (
                  <button
                    onClick={handleMeldCards}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors border border-black"
                  >
                    Buat Meld ({selectedCards.length})
                  </button>
                )}
                {isMyTurn && (
                  <span className="text-black font-medium">Ini giliran Anda! ({gameData.currentTurnPhase})</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              {getSortedHand(myPlayer.getHand()).map(card => (
                <button
                  key={card.id}
                  onClick={() => handleCardSelect(card.id)}
                  disabled={!isMyTurn}
                  className={`w-16 h-24 rounded-lg flex items-center justify-center text-lg font-bold transition-all border-2 shadow-md ${
                    selectedCards.includes(card.id)
                      ? 'bg-black text-white border-black scale-110 shadow-xl'
                      : 'bg-white text-black border-gray-400 hover:scale-105 hover:shadow-lg'
                  } ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={getCardColor(card)}>
                    {getCardDisplay(card)}
                  </span>
                </button>
              ))}
            </div>

            {myPlayer.getHandSize() > 0 && isMyTurn && (
              <div className="mt-4 text-center">
                {/* Show different actions based on turn phase */}
                {gameData.currentTurnPhase === 'drawPhase' && (
                  <div>
                    {game.mustDiscardFirst() ? (
                      <p className="text-sm text-orange-600 mb-2">
                        ⚠️ Pemain pertama wajib membuang 1 kartu terlebih dahulu
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 mb-2">
                        🎴 Ambil kartu dari deck atau discard pile untuk memulai giliran
                      </p>
                    )}
                  </div>
                )}

                {gameData.currentTurnPhase === 'meldPhase' && (
                  <div>
                    {!myPlayer.hasLaidRunMeld() && (
                      <p className="text-sm text-black mb-2">
                        💡 Wajib menurunkan Urutan (Run) terlebih dahulu
                      </p>
                    )}
                    {game.lastDrawFromDiscard() && (
                      <p className="text-sm text-black mb-2">
                        ⚠️ Wajib menurunkan kombinasi setelah ambil dari discard pile
                      </p>
                    )}

                    <p className="text-sm text-gray-600 mb-2">
                      Pilih kartu untuk dibuat meld (minimal 3 kartu) atau lewati
                    </p>

                    <div className="flex justify-center space-x-2">
                      {selectedCards.length >= 3 && (
                        <button
                          onClick={handleMeldCards}
                          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors border border-black"
                        >
                          Buat Meld ({selectedCards.length})
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          // Skip meld phase (only if not required)
                          if (!game.lastDrawFromDiscard()) {
                            try {
                              game.skipMeldPhase();

                              // Update Firebase with new game state
                              if (roomId) {
                                const roomRef = doc(db, 'rooms', roomId);
                                await updateDoc(roomRef, {
                                  'gameData': game.getDataForFirestore(),
                                  lastUpdate: serverTimestamp()
                                });
                              }

                              setError('');
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors border border-gray-600"
                        disabled={game.lastDrawFromDiscard()}
                      >
                        Lewati
                      </button>
                      {selectedCards.length > 0 && (
                        <button
                          onClick={() => setSelectedCards([])}
                          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors border border-gray-600"
                        >
                          Batal Pilih
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {gameData.currentTurnPhase === 'discardPhase' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Pilih 1 kartu untuk dibuang
                    </p>

                    <div className="flex justify-center space-x-2">
                      {selectedCards.length === 1 && (
                        <button
                          onClick={() => handleDiscardCard(selectedCards[0])}
                          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors border border-black"
                        >
                          Buang Kartu
                        </button>
                      )}
                      {selectedCards.length > 0 && (
                        <button
                          onClick={() => setSelectedCards([])}
                          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors border border-gray-600"
                        >
                          Batal Pilih
                        </button>
                      )}
                    </div>

                    {myPlayer.canWin() && (
                      <div className="mt-2 text-black text-sm font-bold">
                        🎯 Siap Memukul! Tinggal 1 kartu lagi
                      </div>
                    )}
                  </div>
                )}

                {selectedCards.length > 0 && gameData.currentTurnPhase !== 'discardPhase' && (
                  <button
                    onClick={() => setSelectedCards([])}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors border border-gray-600"
                  >
                    Batal Pilih
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default GameBoard;