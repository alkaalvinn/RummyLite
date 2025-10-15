import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { subscribeToRoom, updatePlayerReady } from '../../services/firebase';
import { Game } from '../../game/Game';
import { Player } from '../../game/Player';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Import components
import CardComponent from '../Game/CardComponent';
import HandComponent from '../Game/HandComponent';
import MeldAreaComponent from '../Game/MeldAreaComponent';
import DeckComponent from '../Game/DeckComponent';
import DiscardPileComponent from '../Game/DiscardPileComponent';
import PlayerInfoComponent from '../Game/PlayerInfoComponent';
import JokerDisplayComponent from '../Game/JokerDisplayComponent';
import TurnIndicatorComponent from '../Game/TurnIndicatorComponent';
import GameControlsComponent from '../Game/GameControlsComponent';

const GameBoardNew: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId || !user) {
      navigate('/');
      return;
    }

    const unsubscribe = subscribeToRoom(roomId, (data) => {
      if (data.gameState) {
        try {
          const gameData = typeof data.gameState === 'string'
            ? JSON.parse(data.gameState)
            : data.gameState;

          const gameInstance = Game.fromData(gameData);
          setGame(gameInstance);
        } catch (err) {
          console.error('Error parsing game state:', err);
          setError('Error loading game state');
        }
      }
      setLoading(false);

      // Redirect if game is finished
      if (data.status === 'finished') {
        // Handle game finished state - can navigate to results page or show modal
        console.log('Game finished');
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

  const handleClearSelection = () => {
    setSelectedCards([]);
  };

  const handleDrawFromDeck = async () => {
    if (!game || !user || !roomId) return;

    try {
      const myPlayer = game.getPlayer(user.uid);
      if (!myPlayer || !game.getTurnManager().isPlayerTurn(user.uid)) return;

      await game.drawCard(user.uid, false, 1);
      await updateGameState();
      handleClearSelection();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDrawFromDiscard = async (count: number) => {
    if (!game || !user || !roomId) return;

    try {
      const myPlayer = game.getPlayer(user.uid);
      if (!myPlayer || !game.getTurnManager().isPlayerTurn(user.uid)) return;

      await game.drawCard(user.uid, true, count);
      await updateGameState();
      handleClearSelection();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMeld = async () => {
    if (!game || !user || !roomId || selectedCards.length < 3) return;

    try {
      await game.createMeld(user.uid, selectedCards);
      await updateGameState();
      handleClearSelection();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDiscard = async (cardId: string) => {
    if (!game || !user || !roomId) return;

    try {
      await game.discardCard(user.uid, cardId);
      await updateGameState();
      handleClearSelection();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateGameState = async () => {
    if (!game || !roomId) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const gameData = game.getData();

      await updateDoc(roomRef, {
        'gameState': gameData,
        lastUpdate: serverTimestamp()
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLeaveGame = () => {
    navigate('/');
  };

  const handleEndGame = async () => {
    if (!game || !roomId) return;

    try {
      // Mark game as finished
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        'status': 'finished',
        'gameState': {
          ...game.getData(),
          status: 'finished' as const
        },
        lastUpdate: serverTimestamp()
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRestartGame = async () => {
    if (!game || !roomId) return;

    try {
      // Create new game with same players
      const playerIds = game.getPlayers().map(p => p.id);
      const displayNames = game.getPlayers().map(p => p.displayName);
      const newGame = new Game(playerIds, displayNames);
      newGame.start();

      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        'gameState': newGame.getData(),
        'status': 'playing',
        lastUpdate: serverTimestamp()
      });

      setGame(newGame);
      handleClearSelection();
    } catch (err: any) {
      setError(err.message);
    }
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

  const myPlayer = game.getPlayer(user?.uid || '');
  const isMyTurn = game.getTurnManager().isPlayerTurn(user?.uid || '');
  const currentPlayer = game.getCurrentPlayer();
  const otherPlayers = game.getPlayers().filter(p => p.id !== user?.uid);

  // Get required action for hand component
  const getRequiredAction = () => {
    if (!isMyTurn) return 'none';

    if (!game.hasFirstPlayerDiscarded() && game.getCurrentPlayerIndex() === 0) {
      return 'discard';
    }

    if (game.lastDrawFromDiscard()) {
      return 'meld';
    }

    return 'none';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-black">Room: {roomId}</h1>
              <span className="text-gray-600">Ronde {game.getCurrentRound()}</span>
            </div>
            <button
              onClick={handleLeaveGame}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-black text-white px-4 py-3 rounded-lg text-sm text-center border border-black">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Game Info and Controls */}
          <div className="space-y-6">
            {/* Turn Indicator */}
            <TurnIndicatorComponent
              turnManager={game.getTurnManager()}
              players={game.getPlayers()}
              isMyTurn={isMyTurn}
              myPlayer={myPlayer}
            />

            {/* Joker Display */}
            <JokerDisplayComponent
              jokerReferenceCard={game.getJokerReferenceCard()}
              jokerCards={game.getJokerCards()}
            />

            {/* Game Controls */}
            <GameControlsComponent
              game={game}
              myPlayer={myPlayer}
              isMyTurn={isMyTurn}
              selectedCards={selectedCards}
              onDrawFromDeck={handleDrawFromDeck}
              onDrawFromDiscard={handleDrawFromDiscard}
              onMeld={handleMeld}
              onDiscard={handleDiscard}
              onClearSelection={handleClearSelection}
              onEndGame={handleEndGame}
              onRestartGame={handleRestartGame}
              onLeaveGame={handleLeaveGame}
            />
          </div>

          {/* Middle Column - Main Game Area */}
          <div className="space-y-6">
            {/* Other Players */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otherPlayers.map(player => (
                <PlayerInfoComponent
                  key={player.id}
                  player={player}
                  isCurrentPlayer={currentPlayer.id === player.id}
                  isMyPlayer={false}
                  showDetailedInfo={false}
                />
              ))}
            </div>

            {/* Play Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deck */}
              <DeckComponent
                deck={game.getDeck()}
                isMyTurn={isMyTurn}
                canDrawFromDeck={isMyTurn && myPlayer?.getMatchingCardsSequence(game.getDiscardPile().getAllCards()).length === 0}
                onDrawFromDeck={handleDrawFromDeck}
                matchingCardsCount={myPlayer?.getMatchingCardsSequence(game.getDiscardPile().getAllCards()).length || 0}
              />

              {/* Discard Pile */}
              <DiscardPileComponent
                discardPile={game.getDiscardPile()}
                myPlayer={myPlayer}
                isMyTurn={isMyTurn}
                canTakeFromDiscard={isMyTurn && myPlayer?.getMatchingCardsSequence(game.getDiscardPile().getAllCards()).length > 0}
                onTakeFromDiscard={handleDrawFromDiscard}
              />
            </div>

            {/* My Melds */}
            {myPlayer && myPlayer.getMeldCount() > 0 && (
              <MeldAreaComponent
                player={myPlayer}
                showPlayerName={false}
                compact={true}
              />
            )}
          </div>

          {/* Right Column - My Hand */}
          <div>
            {myPlayer && (
              <HandComponent
                player={myPlayer}
                selectedCards={selectedCards}
                isMyTurn={isMyTurn}
                showCards={true}
                onCardSelect={handleCardSelect}
                showControls={false}
                requiredAction={getRequiredAction()}
              />
            )}
          </div>
        </div>

        {/* Game Rules Reminder */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">📋 Aturan Penting:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Kombinasi pertama yang wajib diturunkan adalah Urutan (Run)</li>
            <li>• Jika ambil dari discard pile, WAJIB langsung menurunkan kombinasi</li>
            <li>• Pemain pertama mulai dengan 8 kartu, wajib membuang 1 kartu</li>
            <li>• Menang dengan "Memukul" - tersisa 1 kartu di tangan</li>
            <li>• Joker bisa mengganti kartu apa pun untuk kombinasi</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default GameBoardNew;