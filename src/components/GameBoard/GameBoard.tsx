import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { subscribeToRoom } from '../../services/firebase';
import { GameState, Card, getNextPlayerIndex, validateAction, canPlayerWin, hasMultipleMatchingCards } from '../../lib/rummyEngine';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const GameBoard: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [discardDrawCount, setDiscardDrawCount] = useState<number>(0);
    const [showAllDiscarded, setShowAllDiscarded] = useState<boolean>(false);
  const [groupByPlayer, setGroupByPlayer] = useState<boolean>(false);

  useEffect(() => {
    if (!roomId || !user) {
      navigate('/');
      return;
    }

    const unsubscribe = subscribeToRoom(roomId, (data) => {
      if (data.gameState) {
        setGameState(data.gameState);
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

  const handleDrawCard = async (fromDiscard: boolean = false) => {
    if (!gameState || !user || !roomId) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== user.uid) return;

    try {
      // Check for matching cards in discard pile
      const { matchingCards } = hasMultipleMatchingCards(currentPlayer, gameState.discardPile);

      // Auto-determine draw source based on matching cards
      if (!fromDiscard && matchingCards.length > 0) {
        // Player must take from discard pile if there are matching cards
        fromDiscard = true;
        // Set discard draw count to match all available cards
        setDiscardDrawCount(matchingCards.length);
      }

      let newHand: Card[];
      let newDeck = [...gameState.deck];
      let newDiscardPile = [...gameState.discardPile];
      let lastDrawFromDiscard = false;
      let drawnCards: Card[] = [];

      if (fromDiscard && discardDrawCount > 0) {
        // Draw from discard pile
        const validation = validateAction(
          gameState,
          user.uid,
          'draw',
          undefined,
          undefined,
          discardDrawCount
        );
        if (!validation.valid) {
          setError(validation.error || 'Invalid action');
          return;
        }

        // Take matching cards from discard pile
        drawnCards = gameState.discardPile.slice(-discardDrawCount);
        newDiscardPile = gameState.discardPile.slice(0, -discardDrawCount);
        newHand = [...currentPlayer.hand, ...drawnCards];
        lastDrawFromDiscard = true;

        // Clear discard draw count after use
        setDiscardDrawCount(0);
      } else {
        // Draw from deck
        const validation = validateAction(gameState, user.uid, 'draw');
        if (!validation.valid) {
          setError(validation.error || 'Invalid action');
          return;
        }

        const drawnCard = gameState.deck[0];
        drawnCards = [drawnCard];
        newDeck = gameState.deck.slice(1);
        newHand = [...currentPlayer.hand, drawnCard];
      }

      // Update game state
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex] = {
        ...currentPlayer,
        hand: newHand
      };

      const newGameState = {
        ...gameState,
        deck: newDeck,
        discardPile: newDiscardPile,
        players: updatedPlayers,
        currentPlayerIndex: getNextPlayerIndex(gameState.currentPlayerIndex, gameState.players.length),
        turnStartTime: Date.now(),
        lastDrawFromDiscard,
        lastAction: {
          type: 'draw',
          playerId: user.uid,
          drawCount: drawnCards.length
        }
      };

      // Save to Firebase
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        'gameState': newGameState,
        lastUpdate: serverTimestamp()
      });

      setSelectedCards([]);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDiscardCard = async (cardId: string) => {
    if (!gameState || !user || !roomId) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== user.uid) return;

    // Validate action
    const validation = validateAction(gameState, user.uid, 'discard', cardId);
    if (!validation.valid) {
      setError(validation.error || 'Invalid action');
      return;
    }

    try {
      // Remove card from hand and add to discard pile
      const cardToDiscard = currentPlayer.hand.find(c => c.id === cardId);
      if (!cardToDiscard) return;

      const newHand = currentPlayer.hand.filter(c => c.id !== cardId);
      const newDiscardPile = [...gameState.discardPile, cardToDiscard];

      // Check for winning condition (Memukul - Rul-004)
      const { isGameOver } = await import('../../lib/rummyEngine');
      const gameStatus = isGameOver({
        ...gameState,
        discardPile: newDiscardPile,
        players: gameState.players.map((p, index) =>
          index === gameState.currentPlayerIndex
            ? { ...p, hand: newHand }
            : p
        )
      });

      let gameWinner = gameStatus.winner;
      let gameStatus_final = 'playing';

      if (gameStatus.gameOver) {
        gameStatus_final = 'finished';
        if (gameStatus.winner === user.uid) {
          // Player wins with Memukul!
          const { calculateWinningScore } = await import('../../lib/rummyEngine');
          const winScore = calculateWinningScore(cardToDiscard);

          // Update winner's score
          const updatedPlayers = gameState.players.map(p =>
            p.id === user.uid ? { ...p, score: winScore } : p
          );

          // Update game state with winner
          const newGameState = {
            ...gameState,
            discardPile: newDiscardPile,
            players: updatedPlayers,
            status: 'finished' as const,
            winner: user.uid,
            lastAction: {
              type: 'discard' as const,
              playerId: user.uid,
              cardId
            },
            discardedBy: {
              ...gameState.discardedBy,
              [cardId]: user.uid
            }
          };

          const roomRef = doc(db, 'rooms', roomId);
          await updateDoc(roomRef, {
            'gameState': newGameState,
            lastUpdate: serverTimestamp()
          });

          setError('');
          return;
        }
      }

      // Update game state
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex] = {
        ...currentPlayer,
        hand: newHand
      };

      const isFirstPlayerDiscard = !gameState.firstPlayerDiscarded && gameState.currentPlayerIndex === 0 && currentPlayer.hand.length === 8;

      const newGameState = {
        ...gameState,
        discardPile: newDiscardPile,
        players: updatedPlayers,
        currentPlayerIndex: getNextPlayerIndex(gameState.currentPlayerIndex, gameState.players.length),
        turnStartTime: Date.now(),
        status: gameStatus_final as 'playing' | 'finished',
        winner: gameWinner,
        lastDrawFromDiscard: false, // Reset discard draw flag
        firstPlayerDiscarded: gameState.firstPlayerDiscarded || isFirstPlayerDiscard,
        lastAction: {
          type: 'discard',
          playerId: user.uid,
          cardId
        },
        discardedBy: {
          ...gameState.discardedBy,
          [cardId]: user.uid
        }
      };

      // Save to Firebase
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        'gameState': newGameState,
        lastUpdate: serverTimestamp()
      });

      setSelectedCards([]);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMeldCards = async () => {
    if (!gameState || !user || !roomId || selectedCards.length < 3) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== user.uid) return;

    // Get selected cards
    const cardsToMeld = selectedCards.map(id =>
      currentPlayer.hand.find(c => c.id === id)
    ).filter(Boolean) as Card[];

    // Validate meld
    const validation = validateAction(gameState, user.uid, 'meld', undefined, cardsToMeld);
    if (!validation.valid) {
      setError(validation.error || 'Invalid meld');
      return;
    }

    // Determine meld type
    const { isValidMeld } = await import('../../lib/rummyEngine');
    const meldResult = isValidMeld(cardsToMeld);
    const meldType = meldResult.type || 'run';

    try {
      // Remove cards from hand and add to melds
      const newHand = currentPlayer.hand.filter(c => !selectedCards.includes(c.id));
      const newMeld = {
        id: `meld-${Date.now()}`,
        type: meldType as 'run' | 'set',
        cards: cardsToMeld,
        playerId: user.uid
      };

      // Update game state
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex] = {
        ...currentPlayer,
        hand: newHand,
        melds: [...currentPlayer.melds, newMeld],
        hasLaidRun: currentPlayer.hasLaidRun || meldType === 'run' // Mark run as laid
      };

      const newGameState = {
        ...gameState,
        players: updatedPlayers,
        lastAction: {
          type: 'meld',
          playerId: user.uid,
          meldId: newMeld.id
        }
      };

      // Save to Firebase
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        'gameState': newGameState,
        lastUpdate: serverTimestamp()
      });

      setSelectedCards([]);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  
  const getCardDisplay = (card: Card) => {
    if (card.isJoker) return '🃏';

    const suitSymbols = {
      hearts: '♥️',
      diamonds: '♦️',
      clubs: '♣️',
      spades: '♠️'
    };

    return `${card.rank}${suitSymbols[card.suit]}`;
  };

  const getCardColor = (card: Card) => {
    if (card.isJoker) return 'text-black';
    if (card.suit === 'hearts' || card.suit === 'diamonds') return 'text-black';
    return 'text-black';
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
    const playerIndex = gameState?.players.findIndex(p => p.id === playerId) ?? 0;
    return colors[playerIndex % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Loading game...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Game tidak ditemukan</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === user?.uid;
  const myPlayer = gameState.players.find(p => p.id === user?.uid);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-black">Room: {roomId}</h1>
              <span className="text-gray-600">Ronde {gameState.currentRound}</span>
            </div>
            <div className="text-black">
              Giliran: <span className="font-bold">{currentPlayer?.displayName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Game Board */}
      <main className="container mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-black text-white px-4 py-3 rounded-lg text-sm text-center border border-black">
            {error}
          </div>
        )}


        {/* Joker Reference Card Display */}
        {gameState.jokerReferenceCard && (
          <div className="bg-white border border-black rounded-lg p-4 mb-6">
            <div className="text-center">
              <h3 className="text-black font-medium mb-2">Kartu Joker</h3>
              <div className="flex justify-center items-center space-x-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Referensi</p>
                  <div className="w-16 h-24 bg-white border-2 border-black rounded-lg flex items-center justify-center text-2xl font-bold shadow-lg">
                    <span className={getCardColor(gameState.jokerReferenceCard)}>
                      {getCardDisplay(gameState.jokerReferenceCard)}
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
                  <p className="text-sm text-gray-600">Semua kartu {gameState.jokerReferenceCard.rank} menjadi Joker</p>
                  <p className="text-xs text-gray-500">Kecuali kartu referensi di atas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Players */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {gameState.players.filter(p => p.id !== user?.uid).map(player => (
            <div key={player.id} className="bg-white border border-black rounded-lg p-4">
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
        <div className="bg-white border border-black rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Deck */}
            <div className="text-center">
              <h3 className="text-black font-medium mb-2">Deck</h3>
              <div className="inline-block">
                <div className="w-16 h-24 bg-black border-2 border-black rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {gameState.deck.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Kartu tersisa</div>
              </div>
              {isMyTurn && (
                <div className="mt-2 flex flex-col space-y-2">
                  {/* Check if player has matching cards in discard pile */}
                  {(() => {
                    const { matchingCards } = hasMultipleMatchingCards(myPlayer!, gameState.discardPile);
                    if (matchingCards.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-sm text-green-600 font-medium">
                            ✅ {matchingCards.length} kartu cocok di discard pile
                          </p>
                          <button
                            onClick={() => handleDrawCard(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm border border-green-600"
                          >
                            📤 Ambil {matchingCards.length} dari Discard
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <button
                          onClick={() => handleDrawCard(false)}
                          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm border border-black"
                        >
                          🎴 Ambil 1 dari Deck
                        </button>
                      );
                    }
                  })()}
                </div>
              )}
            </div>

            {/* Discard Pile */}
            <div className="text-center">
              <h3 className="text-black font-medium mb-2">Discard Pile (3 Terakhir)</h3>
              <div className="flex justify-center space-x-1">
                {gameState.discardPile.length > 0 ? (
                  <>
                    {gameState.discardPile.slice(-3).reverse().map((card, index) => {
                      const isMatching = myPlayer ? hasMultipleMatchingCards(myPlayer, [card]).matchingCards.length > 0 : false;
                      return (
                        <div key={card.id} className="relative">
                          <div
                            className={`w-12 h-16 border-2 rounded-lg flex items-center justify-center text-lg font-bold shadow-lg transition-all ${
                              isMatching ? 'bg-green-50 border-green-500' : 'bg-white border-black'
                            }`}
                            style={{
                              zIndex: index,
                              transform: `translateX(${index * 8}px)`,
                              position: index > 0 ? 'absolute' : 'relative'
                            }}
                          >
                            <span className={getCardColor(card)}>
                              {getCardDisplay(card)}
                            </span>
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                              {gameState.discardPile.length}
                            </div>
                          )}
                          {isMatching && (
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
              {isMyTurn && gameState.discardPile.length > 0 && myPlayer && (
                <div className="mt-3">
                  {(() => {
                    const { matchingCards } = hasMultipleMatchingCards(myPlayer, gameState.discardPile);
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
              <div className="text-sm text-gray-600 mt-2">
                Total: {gameState.discardPile.length} kartu
              </div>
            </div>

            {/* Game Info */}
            <div className="text-center">
              <h3 className="text-black font-medium mb-2">Info Game</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Status: {gameState.status}</div>
                <div>Pemain: {gameState.players.length}/4</div>
                {gameState.winner && (
                  <div className="text-black font-bold">
                    🏆 Pemenang: {gameState.players.find(p => p.id === gameState.winner)?.displayName}
                  </div>
                )}
                {!gameState.firstPlayerDiscarded && gameState.currentPlayerIndex === 0 && (
                  <div className="text-orange-600 text-xs font-medium bg-orange-50 px-2 py-1 rounded">
                    🎯 Pemain pertama wajib membuang 1 kartu (8 → 7)
                  </div>
                )}
                {myPlayer && !myPlayer.hasLaidRun && (
                  <div className="text-black text-xs">
                    💡 Belum menurunkan Urutan (Run) wajib
                  </div>
                )}
                {gameState.lastDrawFromDiscard && (
                  <div className="text-black text-xs">
                    ⚠️ Wajib menurunkan kombinasi
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Discarded Cards Display */}
        {gameState.discardPile.length > 0 && (
          <div className="bg-white border border-black rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-black font-medium">Kartu yang Dibuang ({gameState.discardPile.length})</h3>
              <div className="flex space-x-2">
                {gameState.discardPile.length > 0 && (
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
                  ? gameState.discardPile.slice()
                  : gameState.discardPile.slice(-20);

                // Group cards by player
                const cardsByPlayer: Record<string, { card: Card; originalIndex: number }[]> = {};
                cardsToShow.forEach((card, index) => {
                  const discardedByPlayer = gameState.discardedBy?.[card.id];
                  const playerId = discardedByPlayer || 'unknown';
                  if (!cardsByPlayer[playerId]) {
                    cardsByPlayer[playerId] = [];
                  }
                  cardsByPlayer[playerId].push({ card, originalIndex: gameState.discardPile.length - cardsToShow.length + index });
                });

                return (
                  <div className="space-y-4">
                    {Object.entries(cardsByPlayer).map(([playerId, cards]) => {
                      const player = gameState.players.find(p => p.id === playerId);
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
                  ? gameState.discardPile.slice().reverse().map((card, index) => {
                      const discardedByPlayer = gameState.discardedBy?.[card.id];
                      const playerName = discardedByPlayer
                        ? gameState.players.find(p => p.id === discardedByPlayer)?.displayName || 'Unknown'
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
                            #{gameState.discardPile.length - index}
                          </div>
                          {playerName && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {playerName}
                            </div>
                          )}
                        </div>
                      );
                    })
                  : gameState.discardPile.slice(-10).reverse().map((card, index) => {
                      const discardedByPlayer = gameState.discardedBy?.[card.id];
                      const playerName = discardedByPlayer
                        ? gameState.players.find(p => p.id === discardedByPlayer)?.displayName || 'Unknown'
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
                            #{gameState.discardPile.length - index}
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
            {gameState.discardPile.length > (groupByPlayer ? 20 : 10) && !showAllDiscarded && (
              <div className="text-center mt-2 text-sm text-gray-600">
                Menampilkan {groupByPlayer ? '20' : '10'} kartu terakhir dari {gameState.discardPile.length} kartu total
              </div>
            )}
          </div>
        )}

        {/* My Hand */}
        {myPlayer && (
          <div className="bg-white border border-black rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-black font-medium">Kartu Saya ({myPlayer.hand.length})</h3>
              <div className="flex space-x-2">
                {selectedCards.length >= 3 && isMyTurn && (
                  <button
                    onClick={handleMeldCards}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors border border-black"
                  >
                    Buat Meld ({selectedCards.length})
                  </button>
                )}
                {isMyTurn && (
                  <span className="text-black font-medium">Ini giliran Anda!</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {myPlayer.hand.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleCardSelect(card.id)}
                  disabled={!isMyTurn}
                  className={`w-12 h-16 rounded-lg flex items-center justify-center text-lg font-bold transition-all border ${
                    selectedCards.includes(card.id)
                      ? 'bg-black text-white border-black scale-110 shadow-lg'
                      : 'bg-white text-black border-gray-400 hover:scale-105'
                  } ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={getCardColor(card)}>
                    {getCardDisplay(card)}
                  </span>
                </button>
              ))}
            </div>

            {myPlayer.hand.length > 0 && isMyTurn && (
              <div className="mt-4 text-center">
                {/* Special rules for first player */}
                {!gameState.firstPlayerDiscarded && gameState.currentPlayerIndex === 0 && myPlayer.hand.length === 8 && (
                  <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm text-orange-700 font-medium">
                      🎯 Langkah pertama: Wajib membuang 1 kartu
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Pilih 1 kartu untuk dibuang (8 → 7 kartu)
                    </p>
                  </div>
                )}

                {/* Regular game rules */}
                {!gameState.firstPlayerDiscarded && gameState.currentPlayerIndex !== 0 && (
                  <p className="text-sm text-gray-600 mb-2">
                    Menunggu pemain pertama membuang kartu...
                  </p>
                )}

                {gameState.firstPlayerDiscarded && !myPlayer.hasLaidRun && (
                  <p className="text-sm text-black mb-2">
                    💡 Wajib menurunkan Urutan (Run) terlebih dahulu
                  </p>
                )}
                {gameState.lastDrawFromDiscard && (
                  <p className="text-sm text-black mb-2">
                    ⚠️ Wajib menurunkan kombinasi setelah ambil dari discard pile
                  </p>
                )}

                {gameState.firstPlayerDiscarded && (
                  <p className="text-sm text-gray-600 mb-2">
                    Pilih kartu untuk dibuang atau buat meld (minimal 3 kartu)
                  </p>
                )}

                <div className="flex justify-center space-x-2">
                  {/* Only show discard button if it's allowed */}
                  {selectedCards.length === 1 && !gameState.lastDrawFromDiscard &&
                   (gameState.firstPlayerDiscarded ||
                    (!gameState.firstPlayerDiscarded && gameState.currentPlayerIndex === 0 && myPlayer.hand.length === 8)) && (
                    <button
                      onClick={() => handleDiscardCard(selectedCards[0])}
                      className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors border border-black"
                    >
                      {gameState.currentPlayerIndex === 0 && myPlayer.hand.length === 8 ? 'Buang Kartu Pertama' : 'Buang Kartu'}
                    </button>
                  )}
                  {selectedCards.length >= 3 && gameState.firstPlayerDiscarded && (
                    <button
                      onClick={handleMeldCards}
                      className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors border border-black"
                    >
                      Buat Meld ({selectedCards.length})
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
                {canPlayerWin(myPlayer) && (
                  <div className="mt-2 text-black text-sm font-bold">
                    🎯 Siap Memukul! Tinggal 1 kartu lagi
                  </div>
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