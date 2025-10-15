import { Card, Meld, MeldType } from './Card';
import { Player } from './Player';
import { Game } from './Game';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export class GameValidator {
  // Check if cards form a valid run (Rul-001 - sequence of same suit, max 4 cards)
  static isValidRun(cards: Card[]): boolean {
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
  }

  // Check if cards form a valid set (same rank, different suits)
  static isValidSet(cards: Card[]): boolean {
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
  }

  // Check if cards form a valid meld
  static isValidMeld(cards: Card[]): { valid: boolean; type?: MeldType } {
    if (this.isValidRun(cards)) return { valid: true, type: 'run' };
    if (this.isValidSet(cards)) return { valid: true, type: 'set' };
    return { valid: false };
  }

  // Validate player action
  static validateAction(
    game: Game,
    playerId: string,
    action: 'draw' | 'discard' | 'meld',
    cardId?: string,
    meldCards?: Card[],
    drawFromDiscardCount?: number
  ): ValidationResult {
    // Check if it's player's turn
    if (game.getCurrentPlayer().id !== playerId) {
      return { valid: false, error: 'Bukan giliran Anda' };
    }

    // Check if game is in playing state
    if (!game.isPlaying()) {
      return { valid: false, error: 'Game belum dimulai' };
    }

    const currentPlayer = game.getCurrentPlayer();

    switch (action) {
      case 'draw':
        return this.validateDrawAction(game, currentPlayer, drawFromDiscardCount);

      case 'discard':
        return this.validateDiscardAction(game, currentPlayer, cardId);

      case 'meld':
        return this.validateMeldAction(game, currentPlayer, meldCards);

      default:
        return { valid: false, error: 'Aksi tidak valid' };
    }
  }

  // Validate draw action
  private static validateDrawAction(
    game: Game,
    player: Player,
    drawFromDiscardCount?: number
  ): ValidationResult {
    // Check if first player needs to discard first
    if (!game.hasFirstPlayerDiscarded() &&
        game.getCurrentPlayerIndex() === 0 &&
        player.getHandSize() === 8) {
      return { valid: false, error: 'Pemain pertama wajib membuang 1 kartu terlebih dahulu' };
    }

    if (drawFromDiscardCount !== undefined) {
      // Drawing from discard pile
      const { matchingCards } = player.getMatchingCardsSequence(game.getDiscardPile().getAllCards());

      if (matchingCards.length === 0) {
        return { valid: false, error: 'Tidak ada pasangan kartu yang cocok di discard pile. Ambil dari deck.' };
      }

      if (drawFromDiscardCount !== matchingCards.length) {
        return { valid: false, error: `Harus mengambil semua kartu yang cocok (${matchingCards.length} kartu)` };
      }

      if (game.getDiscardPile().getCount() < drawFromDiscardCount) {
        return { valid: false, error: 'Tidak cukup kartu di discard pile' };
      }
    } else {
      // Drawing from deck - check if player has matching pairs in discard pile
      const { matchingCards } = player.getMatchingCardsSequence(game.getDiscardPile().getAllCards());

      if (matchingCards.length > 0) {
        return { valid: false, error: `Ada ${matchingCards.length} kartu di discard pile yang cocok. Ambil dari discard pile terlebih dahulu.` };
      }

      if (game.getDeck().isEmpty()) {
        return { valid: false, error: 'Deck kosong' };
      }
    }

    return { valid: true };
  }

  // Validate discard action
  private static validateDiscardAction(
    game: Game,
    player: Player,
    cardId?: string
  ): ValidationResult {
    if (!cardId) {
      return { valid: false, error: 'Pilih kartu untuk dibuang' };
    }

    if (!player.hasCard(cardId)) {
      return { valid: false, error: 'Kartu tidak ada di tangan' };
    }

    // Check if it's the first player's first turn (must discard from 8 to 7 cards)
    if (!game.hasFirstPlayerDiscarded() &&
        game.getCurrentPlayerIndex() === 0 &&
        player.getHandSize() === 8) {
      // This is the mandatory first discard, allow any card
      return { valid: true };
    }

    // Additional validation for regular discard
    if (game.lastDrawFromDiscard()) {
      return { valid: false, error: 'Anda harus menurunkan kombinasi terlebih dahulu setelah mengambil dari discard pile' };
    }

    return { valid: true };
  }

  // Validate meld action
  private static validateMeldAction(
    game: Game,
    player: Player,
    meldCards?: Card[]
  ): ValidationResult {
    if (!meldCards || meldCards.length === 0) {
      return { valid: false, error: 'Pilih kartu untuk meld' };
    }

    // Check if all cards are in player's hand
    const allCardsInHand = meldCards.every(card =>
      player.hasCard(card.id)
    );
    if (!allCardsInHand) {
      return { valid: false, error: 'Semua kartu harus ada di tangan' };
    }

    // Check if meld is valid
    const meldValidation = this.isValidMeld(meldCards);
    if (!meldValidation.valid) {
      return { valid: false, error: 'Kombinasi tidak valid' };
    }

    // Rul-001: First meld must be a run (sequence)
    if (!player.hasLaidRunMeld() && meldValidation.type !== 'run') {
      return { valid: false, error: 'Kombinasi pertama yang wajib diturunkan adalah Urutan (Run)' };
    }

    return { valid: true };
  }

  // Validate game start
  static validateGameStart(playerCount: number): ValidationResult {
    if (playerCount !== 4) {
      return { valid: false, error: 'Game membutuhkan tepat 4 pemain' };
    }
    return { valid: true };
  }

  // Validate player can win
  static canPlayerWin(player: Player): ValidationResult {
    if (player.getHandSize() !== 1) {
      return { valid: false, error: 'Pemain harus memiliki tepat 1 kartu untuk menang' };
    }

    if (player.getMeldCount() === 0) {
      return { valid: false, error: 'Pemain harus menurunkan minimal 1 kombinasi untuk menang' };
    }

    if (!player.hasLaidRunMeld()) {
      return { valid: false, error: 'Pemain harus menurunkan minimal 1 Urutan (Run) untuk menang' };
    }

    return { valid: true };
  }

  // Check if game is over
  static isGameOver(game: Game): {
    gameOver: boolean;
    winner?: string;
    reason?: 'memukul' | 'deck_empty';
  } {
    // Check if any player has won (0 cards left)
    const winningPlayer = game.getPlayers().find(player => player.hasWon());
    if (winningPlayer) {
      return { gameOver: true, winner: winningPlayer.id, reason: 'memukul' };
    }

    // Check if deck is empty
    if (game.getDeck().isEmpty()) {
      return { gameOver: true, reason: 'deck_empty' };
    }

    return { gameOver: false };
  }

  // Get meld suggestions for player
  static getMeldSuggestions(player: Player): Card[][] {
    const hand = player.getHand();
    const suggestions: Card[][] = [];
    const usedCardIds = new Set<string>();

    // Check for possible runs
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        for (let k = j + 1; k < hand.length; k++) {
          const cards = [hand[i], hand[j], hand[k]];
          if (this.isValidRun(cards)) {
            const cardIds = cards.map(c => c.id);
            if (!cardIds.some(id => usedCardIds.has(id))) {
              suggestions.push(cards);
              cardIds.forEach(id => usedCardIds.add(id));
            }
          }
        }
      }
    }

    // Check for possible sets
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        for (let k = j + 1; k < hand.length; k++) {
          const cards = [hand[i], hand[j], hand[k]];
          if (this.isValidSet(cards)) {
            const cardIds = cards.map(c => c.id);
            if (!cardIds.some(id => usedCardIds.has(id))) {
              suggestions.push(cards);
              cardIds.forEach(id => usedCardIds.add(id));
            }
          }
        }
      }
    }

    return suggestions;
  }
}