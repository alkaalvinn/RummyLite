// Game types and interfaces
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
  isJoker?: boolean;
}

export interface Meld {
  id: string;
  type: 'set' | 'run';
  cards: Card[];
  playerId: string;
}

export interface Player {
  id: string;
  displayName: string;
  hand: Card[];
  melds: Meld[];
  score: number;
  ready: boolean;
  connected: boolean;
  hasLaidRun: boolean; // Track if player has laid mandatory run (Rul-001)
}

export interface GameState {
  id: string;
  status: 'lobby' | 'playing' | 'finished';
  currentRound: number;
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  players: Player[];
  turnStartTime: number;
  jokerCards: Card[]; // The 4 joker cards (3 matching cards + 1 reference card)
  jokerReferenceCard?: Card; // The card used to determine jokers (shown but not in deck)
  direction: 1 | -1; // For multiplayer turn order
  winner?: string;
  lastDrawFromDiscard?: boolean; // Track if last draw was from discard pile
  firstPlayerDiscarded?: boolean; // Track if first player has made their mandatory discard
  lastAction?: {
    type: 'draw' | 'discard' | 'meld';
    playerId: string;
    cardId?: string;
    meldId?: string;
    drawCount?: number; // Number of cards drawn from discard pile
  };
  discardedBy?: Record<string, string>; // Track who discarded each card (cardId -> playerId)
}

// Card values for scoring (Rul-007 - basic values for cards in hand)
const CARD_VALUES: Record<Rank, number> = {
  'A': 15, '2': 5, '3': 5, '4': 5, '5': 5, '6': 5, '7': 5, '8': 5, '9': 5, '10': 5, 'J': 10, 'Q': 10, 'K': 10
};

// Winning card values (Rul-005 - when player "Memukul" with 1 card left)
const WINNING_CARD_VALUES: Record<Rank, number> = {
  'A': 150, '2': 50, '3': 50, '4': 50, '5': 50, '6': 50, '7': 50, '8': 50, '9': 50, '10': 50, 'J': 100, 'Q': 100, 'K': 100
};

// Create a standard deck of 52 cards (no built-in jokers)
export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const deck: Card[] = [];

  // Create standard cards
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        value: CARD_VALUES[rank],
        isJoker: false
      });
    });
  });

  return deck;
};

// Shuffle deck using Fisher-Yates algorithm
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Determine Joker cards (GMS-003)
export const determineJokerCards = (deck: Card[]): {
  jokerReferenceCard: Card;
  jokerCards: Card[];
  remainingDeck: Card[];
} => {
  // Select a random card as reference
  const randomIndex = Math.floor(Math.random() * deck.length);
  const referenceCard = deck[randomIndex];

  // Find all 4 matching cards (same rank, different suits)
  const matchingCards = deck.filter(card => card.rank === referenceCard.rank);

  // The reference card is set aside, the other 3 become jokers
  const jokerCards = matchingCards.filter(card => card.id !== referenceCard.id);
  const remainingDeck = deck.filter(card =>
    !matchingCards.some(match => match.id === card.id)
  );

  // Mark the 3 cards as jokers
  const markedJokerCards = jokerCards.map(card => ({
    ...card,
    isJoker: true
  }));

  return {
    jokerReferenceCard: referenceCard,
    jokerCards: markedJokerCards,
    remainingDeck
  };
};

// Deal cards to players
export const dealCards = (deck: Card[], playerCount: number, cardsPerPlayer: number = 8): {
  deck: Card[];
  playersHands: Card[][];
} => {
  const playersHands: Card[][] = [];
  let remainingDeck = [...deck];

  for (let i = 0; i < playerCount; i++) {
    const hand: Card[] = [];
    for (let j = 0; j < cardsPerPlayer; j++) {
      if (remainingDeck.length > 0) {
        hand.push(remainingDeck.pop()!);
      }
    }
    playersHands.push(hand);
  }

  return { deck: remainingDeck, playersHands };
};

// Check if cards form a valid run (Rul-001 - sequence of same suit, max 4 cards)
export const isValidRun = (cards: Card[]): boolean => {
  if (cards.length < 3 || cards.length > 4) return false;

  // Special case: 4 Ace cards are considered a valid run
  const allAces = cards.every(card => card.rank === 'A' || card.isJoker);
  const aceCount = cards.filter(card => card.rank === 'A').length;
  if (allAces && aceCount === 4) return true;

  const sortedCards = [...cards].sort((a, b) => a.value - b.value);
  const suit = sortedCards[0].suit;

  // Check if all cards have same suit
  if (!sortedCards.every(card => card.suit === suit || card.isJoker)) return false;

  // Check if cards form consecutive sequence
  for (let i = 1; i < sortedCards.length; i++) {
    const prevCard = sortedCards[i - 1];
    const currCard = sortedCards[i];

    if (currCard.isJoker) continue; // Jokers are wild
    if (prevCard.isJoker) {
      // Check if current card fits the sequence
      const prevNonJoker = sortedCards.slice(0, i).reverse().find(c => !c.isJoker);
      if (prevNonJoker && currCard.value !== prevNonJoker.value + 1) return false;
    } else {
      if (currCard.value !== prevCard.value + 1) return false;
    }
  }

  return true;
};

// Check if cards form a valid set (same rank, different suits)
export const isValidSet = (cards: Card[]): boolean => {
  if (cards.length < 3 || cards.length > 4) return false;

  const ranks = cards.filter(c => !c.isJoker).map(card => card.rank);
  if (ranks.length === 0) return false; // All jokers not allowed

  // All non-joker cards must have same rank
  const firstRank = ranks[0];
  if (!ranks.every(rank => rank === firstRank)) return false;

  // Check for duplicate suits (except jokers)
  const suits = cards.filter(c => !c.isJoker).map(card => card.suit);
  const uniqueSuits = new Set(suits);
  if (uniqueSuits.size !== suits.length) return false;

  return true;
};

// Check if cards form a valid meld
export const isValidMeld = (cards: Card[]): { valid: boolean; type?: 'set' | 'run' } => {
  if (isValidRun(cards)) return { valid: true, type: 'run' };
  if (isValidSet(cards)) return { valid: true, type: 'set' };
  return { valid: false };
};

// Calculate score for a hand (Rul-007 and Rul-007B)
export const calculateHandScore = (hand: Card[], usedInMelds: Card[] = []): number => {
  return hand.reduce((total, card) => {
    if (card.isJoker) {
      // Check if joker is used in a meld
      const jokerUsedInMeld = usedInMelds.some(meldCard => meldCard.id === card.id);
      if (jokerUsedInMeld) {
        // Joker takes value of card it replaces (Rul-007A)
        return total + 10; // Default average value
      } else {
        // Unused joker worth MINUS 25 points (Rul-007B)
        return total - 25;
      }
    }
    return total + card.value;
  }, 0);
};

// Calculate winning score (Rul-005 - Memukul)
export const calculateWinningScore = (finalCard: Card): number => {
  if (finalCard.isJoker) return 250; // Joker worth 250 points when winning
  return WINNING_CARD_VALUES[finalCard.rank];
};

// Calculate round scores and determine joker grant
export const calculateRoundScores = (players: Player[]): {
  scores: Record<string, number>;
  jokerGrant?: string;
} => {
  const scores: Record<string, number> = {};
  let highestScore = -1;
  let jokerGrant: string | undefined;

  players.forEach(player => {
    const score = calculateHandScore(player.hand);
    scores[player.id] = score;

    if (score > highestScore) {
      highestScore = score;
      jokerGrant = player.id;
    }
  });

  return { scores, jokerGrant };
};

// Validate player action
export const validateAction = (
  gameState: GameState,
  playerId: string,
  action: 'draw' | 'discard' | 'meld',
  cardId?: string,
  meldCards?: Card[],
  drawFromDiscardCount?: number
): { valid: boolean; error?: string } => {
  // Check if it's player's turn
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { valid: false, error: 'Bukan giliran Anda' };
  }

  // Check if game is in playing state
  if (gameState.status !== 'playing') {
    return { valid: false, error: 'Game belum dimulai' };
  }

  switch (action) {
    case 'draw':
      // Check if first player needs to discard first (rule: first player starts with 8 cards, must discard to 7)
      if (!gameState.firstPlayerDiscarded && gameState.currentPlayerIndex === 0 && currentPlayer.hand.length === 8) {
        return { valid: false, error: 'Pemain pertama wajib membuang 1 kartu terlebih dahulu' };
      }

      if (drawFromDiscardCount) {
        // Drawing from discard pile - check if player has matching pairs
        const { matchingCards } = hasMultipleMatchingCards(currentPlayer, gameState.discardPile);

        if (matchingCards.length === 0) {
          return { valid: false, error: 'Tidak ada pasangan kartu yang cocok di discard pile. Ambil dari deck.' };
        }

        if (drawFromDiscardCount !== matchingCards.length) {
          return { valid: false, error: `Harus mengambil semua kartu yang cocok (${matchingCards.length} kartu)` };
        }

        if (gameState.discardPile.length < drawFromDiscardCount) {
          return { valid: false, error: 'Tidak cukup kartu di discard pile' };
        }
      } else {
        // Drawing from deck - check if player has matching pairs in discard pile
        const { matchingCards } = hasMultipleMatchingCards(currentPlayer, gameState.discardPile);

        if (matchingCards.length > 0) {
          return { valid: false, error: `Ada ${matchingCards.length} kartu di discard pile yang cocok. Ambil dari discard pile terlebih dahulu.` };
        }

        if (gameState.deck.length === 0) {
          return { valid: false, error: 'Deck kosong' };
        }
      }
      break;

    case 'discard':
      // Check if card exists in player's hand
      if (!cardId) {
        return { valid: false, error: 'Pilih kartu untuk dibuang' };
      }
      const cardInHand = currentPlayer.hand.find(card => card.id === cardId);
      if (!cardInHand) {
        return { valid: false, error: 'Kartu tidak ada di tangan' };
      }

      // Check if it's the first player's first turn (must discard from 8 to 7 cards)
      if (!gameState.firstPlayerDiscarded && gameState.currentPlayerIndex === 0 && currentPlayer.hand.length === 8) {
        // This is the mandatory first discard, allow any card
        break;
      }
      break;

    case 'meld':
      // Check if meld cards are valid
      if (!meldCards || meldCards.length === 0) {
        return { valid: false, error: 'Pilih kartu untuk meld' };
      }

      // Check if all cards are in player's hand
      const allCardsInHand = meldCards.every(card =>
        currentPlayer.hand.some(handCard => handCard.id === card.id)
      );
      if (!allCardsInHand) {
        return { valid: false, error: 'Semua kartu harus ada di tangan' };
      }

      // Check if meld is valid
      const meldValidation = isValidMeld(meldCards);
      if (!meldValidation.valid) {
        return { valid: false, error: 'Meld tidak valid' };
      }

      // Rul-001: First meld must be a run (sequence)
      if (!currentPlayer.hasLaidRun && meldValidation.type !== 'run') {
        return { valid: false, error: 'Kombinasi pertama yang wajib diturunkan adalah Urutan (Run)' };
      }
      break;
  }

  return { valid: true };
};

// Get next player index
export const getNextPlayerIndex = (
  currentIndex: number,
  playerCount: number,
  direction: 1 | -1 = 1
): number => {
  return (currentIndex + direction + playerCount) % playerCount;
};

// Check if player can win (Rul-004 - Memukul: 1 card left)
export const canPlayerWin = (player: Player): boolean => {
  return player.hand.length === 1 && player.melds.length > 0 && player.hasLaidRun;
};

// Check if player has a matching pair with the top card of discard pile
export const hasMatchingPair = (player: Player, topCard: Card): boolean => {
  if (!topCard) return false;

  return player.hand.some(card => {
    // Check for same rank (different suits for pairs)
    if (card.rank === topCard.rank && card.suit !== topCard.suit) {
      return true;
    }

    // Check for same suit (sequence)
    if (card.suit === topCard.suit) {
      const cardValue = card.value;
      const topCardValue = topCard.value;
      // Check if they are consecutive
      return Math.abs(cardValue - topCardValue) === 1;
    }

    return false;
  });
};

// Check if player has multiple matching cards in discard pile
export const hasMultipleMatchingCards = (player: Player, discardPile: Card[]): { matchingCards: Card[], canTakeAll: boolean } => {
  if (discardPile.length === 0) return { matchingCards: [], canTakeAll: false };

  const matchingCards: Card[] = [];

  // Check from top to bottom until we find a non-matching card
  for (let i = discardPile.length - 1; i >= 0; i--) {
    const card = discardPile[i];

    if (hasMatchingPair(player, card)) {
      matchingCards.unshift(card); // Add to beginning to maintain order
    } else {
      break; // Stop at first non-matching card
    }
  }

  // Can take all if we have matching pairs for all cards in the sequence
  const canTakeAll = matchingCards.length > 0;

  return { matchingCards, canTakeAll };
};

// Check if player has won (0 cards left after discard)
export const hasPlayerWon = (player: Player): boolean => {
  return player.hand.length === 0 && player.melds.length > 0;
};

// Check if game is over (either player wins or deck is empty)
export const isGameOver = (gameState: GameState): {
  gameOver: boolean;
  winner?: string;
  reason?: 'memukul' | 'deck_empty';
} => {
  // Check if any player has 0 cards (won)
  const winningPlayer = gameState.players.find(hasPlayerWon);
  if (winningPlayer) {
    return { gameOver: true, winner: winningPlayer.id, reason: 'memukul' };
  }

  // Check if deck is empty
  if (gameState.deck.length === 0) {
    return { gameOver: true, reason: 'deck_empty' };
  }

  return { gameOver: false };
};

// Initialize game state
export const initializeGame = (playerIds: string[], displayNames: string[]): GameState => {
  // Ensure exactly 4 players (GMS-001)
  if (playerIds.length !== 4) {
    throw new Error('Game requires exactly 4 players');
  }

  // Create and shuffle deck
  const shuffledDeck = shuffleDeck(createDeck());

  // Determine joker cards (GMS-003)
  const { jokerReferenceCard, jokerCards, remainingDeck } = determineJokerCards(shuffledDeck);

  // Add joker cards back to the remaining deck for dealing
  const fullDeck = [...remainingDeck, ...jokerCards];
  const { deck: finalDeck, playersHands } = dealCards(fullDeck, 4, 8);

  const players: Player[] = playerIds.map((id, index) => ({
    id,
    displayName: displayNames[index],
    hand: playersHands[index],
    melds: [],
    score: 0,
    ready: true,
    connected: true,
    hasLaidRun: false
  }));

  return {
    id: Math.random().toString(36).substring(2, 9),
    status: 'playing',
    currentRound: 1,
    currentPlayerIndex: 0,
    deck: finalDeck,
    discardPile: [],
    players,
    turnStartTime: Date.now(),
    jokerCards,
    jokerReferenceCard,
    direction: 1,
    lastDrawFromDiscard: false,
    firstPlayerDiscarded: false,
    discardedBy: {}
  };
};