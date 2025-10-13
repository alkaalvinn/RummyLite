import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { subscribeToRoom } from '../../services/firebase';
import { GameState, Card, Player, getNextPlayerIndex, validateAction, canPlayerWin } from '../../lib/rummyEngine';
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

        // Take cards from discard pile
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

      const newGameState = {
        ...gameState,
        discardPile: newDiscardPile,
        players: updatedPlayers,
        currentPlayerIndex: getNextPlayerIndex(gameState.currentPlayerIndex, gameState.players.length),
        turnStartTime: Date.now(),
        status: gameStatus_final as 'playing' | 'finished',
        winner: gameWinner,
        lastDrawFromDiscard: false, // Reset discard draw flag
        lastAction: {
          type: 'discard',
          playerId: user.uid,
          cardId
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
    if (card.isJoker) return 'text-purple-400';
    if (card.suit === 'hearts' || card.suit === 'diamonds') return 'text-red-400';
    return 'text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Game tidak ditemukan</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === user?.uid;
  const myPlayer = gameState.players.find(p => p.id === user?.uid);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white">Room: {roomId}</h1>
              <span className="text-gray-300">Ronde {gameState.currentRound}</span>
            </div>
            <div className="text-white">
              Giliran: <span className="font-bold">{currentPlayer?.displayName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Game Board */}
      <main className="container mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        
        {/* Joker Reference Card Display */}
        {gameState.jokerReferenceCard && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 mb-6">
            <div className="text-center">
              <h3 className="text-white font-medium mb-2">Kartu Joker</h3>
              <div className="flex justify-center items-center space-x-4">
                <div className="text-center">
                  <p className="text-sm text-gray-300 mb-2">Referensi</p>
                  <div className="w-16 h-24 bg-yellow-500 rounded-lg flex items-center justify-center text-2xl font-bold shadow-lg">
                    <span className={getCardColor(gameState.jokerReferenceCard)}>
                      {getCardDisplay(gameState.jokerReferenceCard)}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-300 mb-2">Joker</p>
                  <div className="w-16 h-24 bg-purple-500 rounded-lg flex items-center justify-center text-3xl shadow-lg">
                    🃏
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-300">Semua kartu {gameState.jokerReferenceCard.rank} menjadi Joker</p>
                  <p className="text-xs text-gray-400">Kecuali kartu referensi di atas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Players */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {gameState.players.filter(p => p.id !== user?.uid).map(player => (
            <div key={player.id} className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-medium">{player.displayName}</h3>
                {currentPlayer?.id === player.id && (
                  <span className="px-2 py-1 bg-yellow-600/30 text-yellow-300 text-xs rounded">
                    Giliran
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-300">
                Kartu: {player.hand.length} | Melds: {player.melds.length}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {player.melds.map((meld, index) => (
                  <div key={meld.id} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded">
                    Meld {index + 1}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Play Area */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Deck */}
            <div className="text-center">
              <h3 className="text-white font-medium mb-2">Deck</h3>
              <div className="inline-block">
                <div className="w-16 h-24 bg-blue-800 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {gameState.deck.length}
                </div>
                <div className="text-sm text-gray-300 mt-1">Kartu tersisa</div>
              </div>
              {isMyTurn && (
                <div className="mt-2 flex flex-col space-y-2">
                  <button
                    onClick={() => handleDrawCard(false)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                  >
                    🎴 Ambil 1 dari Deck
                  </button>
                  {discardDrawCount > 0 && (
                    <button
                      onClick={() => handleDrawCard(true)}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm"
                    >
                      📤 Ambil {discardDrawCount} dari Discard
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Discard Pile */}
            <div className="text-center">
              <h3 className="text-white font-medium mb-2">Discard Pile (3 Terakhir)</h3>
              <div className="flex justify-center space-x-1">
                {gameState.discardPile.length > 0 ? (
                  <>
                    {gameState.discardPile.slice(-3).reverse().map((card, index) => (
                      <div key={card.id} className="relative">
                        <div
                          className="w-12 h-16 bg-white rounded-lg flex items-center justify-center text-lg font-bold shadow-lg"
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
                          <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {gameState.discardPile.length}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="w-16 h-24 bg-gray-600 rounded-lg flex items-center justify-center text-gray-400">
                    Kosong
                  </div>
                )}
              </div>
              {isMyTurn && gameState.discardPile.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-gray-300">Ambil dari discard pile:</p>
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3].filter(num => num <= gameState.discardPile.length).map(num => (
                      <button
                        key={num}
                        onClick={() => setDiscardDrawCount(num)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          discardDrawCount === num
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-sm text-gray-300 mt-2">
                Total: {gameState.discardPile.length} kartu
              </div>
            </div>

            {/* Game Info */}
            <div className="text-center">
              <h3 className="text-white font-medium mb-2">Info Game</h3>
              <div className="space-y-1 text-sm text-gray-300">
                <div>Status: {gameState.status}</div>
                <div>Pemain: {gameState.players.length}/4</div>
                {gameState.winner && (
                  <div className="text-green-300 font-bold">
                    🏆 Pemenang: {gameState.players.find(p => p.id === gameState.winner)?.displayName}
                  </div>
                )}
                {myPlayer && !myPlayer.hasLaidRun && (
                  <div className="text-yellow-300 text-xs">
                    💡 Belum menurunkan Urutan (Run) wajib
                  </div>
                )}
                {gameState.lastDrawFromDiscard && (
                  <div className="text-orange-300 text-xs">
                    ⚠️ Wajib menurunkan kombinasi
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* My Hand */}
        {myPlayer && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium">Kartu Saya ({myPlayer.hand.length})</h3>
              <div className="flex space-x-2">
                {selectedCards.length >= 3 && isMyTurn && (
                  <button
                    onClick={handleMeldCards}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Buat Meld ({selectedCards.length})
                  </button>
                )}
                {isMyTurn && (
                  <span className="text-yellow-300">Ini giliran Anda!</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {myPlayer.hand.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleCardSelect(card.id)}
                  disabled={!isMyTurn}
                  className={`w-12 h-16 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
                    selectedCards.includes(card.id)
                      ? 'bg-yellow-500 scale-110 shadow-lg'
                      : 'bg-white hover:scale-105'
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
                {!myPlayer.hasLaidRun && (
                  <p className="text-sm text-yellow-300 mb-2">
                    💡 Wajib menurunkan Urutan (Run) terlebih dahulu
                  </p>
                )}
                {gameState.lastDrawFromDiscard && (
                  <p className="text-sm text-orange-300 mb-2">
                    ⚠️ Wajib menurunkan kombinasi setelah ambil dari discard pile
                  </p>
                )}
                <p className="text-sm text-gray-300 mb-2">
                  Pilih kartu untuk dibuang atau buat meld (minimal 3 kartu)
                </p>
                <div className="flex justify-center space-x-2">
                  {selectedCards.length === 1 && !gameState.lastDrawFromDiscard && (
                    <button
                      onClick={() => handleDiscardCard(selectedCards[0])}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Buang Kartu
                    </button>
                  )}
                  {selectedCards.length >= 3 && (
                    <button
                      onClick={handleMeldCards}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Buat Meld ({selectedCards.length})
                    </button>
                  )}
                  {selectedCards.length > 0 && (
                    <button
                      onClick={() => setSelectedCards([])}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      Batal Pilih
                    </button>
                  )}
                </div>
                {canPlayerWin(myPlayer) && (
                  <div className="mt-2 text-green-300 text-sm font-bold">
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