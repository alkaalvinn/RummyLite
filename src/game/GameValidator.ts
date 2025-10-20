import { Card, Meld, MeldType } from './Card';
import { Player } from './Player';
import { Game } from './Game';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export class GameValidator {
  // Check if cards form a valid run (sequence of same suit, 3+ cards)
  static isValidRun(cards: Card[], jokerValue?: string): boolean {
    if (cards.length < 3) return false;

    // Check if any card is an active joker
    const activeJokerCards = cards.filter(card => jokerValue && card.isActiveJoker(jokerValue));
    const nonJokerCards = cards.filter(card => !(jokerValue && card.isActiveJoker(jokerValue)));

    // Special case: 4 Ace cards are considered a valid run
    const allAces = nonJokerCards.every(card => card.rank === 'A');
    const aceCount = nonJokerCards.filter(card => card.rank === 'A').length;
    if (allAces && aceCount === 4) return true;

    const sortedCards = [...nonJokerCards].sort((a, b) => a.value - b.value);
    if (sortedCards.length === 0) return false; // All jokers not allowed

    const suit = sortedCards[0].suit;

    // Check if all non-joker cards have same suit
    if (!sortedCards.every(card => card.suit === suit)) return false;

    // Check if cards form consecutive sequence (allowing jokers to fill gaps)
    let expectedValue = sortedCards[0].value;
    let jokersAvailable = activeJokerCards.length;

    for (let i = 0; i < sortedCards.length; i++) {
      const currCard = sortedCards[i];

      if (currCard.value === expectedValue) {
        expectedValue++;
      } else if (jokersAvailable > 0) {
        // Use a joker to fill the gap
        jokersAvailable--;
        expectedValue++;
        i--; // Check this card again with new expected value
      } else {
        return false;
      }
    }

    return true;
  }

  // Check if cards form a valid set (same rank, different suits)
  static isValidSet(cards: Card[], jokerValue?: string): boolean {
    if (cards.length < 3 || cards.length > 4) return false;

    // Check if any card is an active joker
    const activeJokerCards = cards.filter(card => jokerValue && card.isActiveJoker(jokerValue));
    const nonJokerCards = cards.filter(card => !(jokerValue && card.isActiveJoker(jokerValue)));

    if (nonJokerCards.length === 0) return false; // All jokers not allowed

    // All non-joker cards must have same rank
    const firstRank = nonJokerCards[0].rank;
    if (!nonJokerCards.every(card => card.rank === firstRank)) return false;

    // Check for duplicate suits (except jokers)
    const suits = nonJokerCards.map(card => card.suit);
    const uniqueSuits = new Set(suits);
    if (uniqueSuits.size !== suits.length) return false;

    return true;
  }

  // Check if cards form a valid meld
  static isValidMeld(cards: Card[], jokerValue?: string): { valid: boolean; type?: MeldType } {
    if (this.isValidRun(cards, jokerValue)) return { valid: true, type: 'run' };
    if (this.isValidSet(cards, jokerValue)) return { valid: true, type: 'set' };
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
    // Check if first player needs to discard first (8 cards and hasn't discarded yet)
    const isFirstPlayerTurn = player.getHandSize() === 8 && !game.hasFirstPlayerDiscarded();

    if (isFirstPlayerTurn) {
      return { valid: false, error: 'Pemain pertama wajib membuang 1 kartu terlebih dahulu sebelum mengambil kartu' };
    }

    if (drawFromDiscardCount !== undefined) {
      // Drawing from discard pile
      if (drawFromDiscardCount < 1 || drawFromDiscardCount > 3) {
        return { valid: false, error: 'Hanya dapat mengambil 1-3 kartu dari discard pile' };
      }

      if (game.getDiscardPile().getCount() < drawFromDiscardCount) {
        return { valid: false, error: 'Tidak cukup kartu di discard pile' };
      }

      // Additional check: if no cards have been discarded yet, can't draw from discard pile
      if (game.getDiscardPile().getCount() === 0) {
        return { valid: false, error: 'Belum ada kartu yang dibuang, tidak bisa mengambil dari discard pile' };
      }

      // If taking more than 1 card, must be able to form valid meld
      if (drawFromDiscardCount > 1) {
        const cardsToTake = game.getDiscardPile().getLastCards(drawFromDiscardCount);
        const meldValidation = this.isValidMeld(cardsToTake, game.getActiveJokerValue());
        if (!meldValidation.valid) {
          return { valid: false, error: 'Harus dapat membentuk kombinasi valid saat mengambil >1 kartu' };
        }
      }
    } else {
      // Drawing from deck
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
    const isFirstPlayerTurn = player.getHandSize() === 8 && !game.hasFirstPlayerDiscarded();

    if (isFirstPlayerTurn) {
      // This is the mandatory first discard, allow any card
      return { valid: true };
    }

    // Additional validation for regular discard
    if (game.lastDrawFromDiscard() && game.getLastAction()?.drawCount && game.getLastAction()!.drawCount! > 1) {
      return { valid: false, error: 'Anda harus menurunkan kombinasi terlebih dahulu setelah mengambil >1 kartu dari discard pile' };
    }

    // Check if player can discard joker that was used in meld
    const card = player.getHand().find(c => c.id === cardId);
    if (card && game.getActiveJokerValue() && card.isActiveJoker(game.getActiveJokerValue())) {
      // Check if this joker is part of a meld
      const melds = player.getMelds();
      const jokerUsedInMeld = melds.some(meld => meld.cards.some(c => c.id === cardId));
      if (jokerUsedInMeld) {
        return { valid: false, error: 'Tidak dapat membuang joker yang sudah digunakan dalam kombinasi' };
      }
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
    const meldValidation = this.isValidMeld(meldCards, game.getActiveJokerValue());
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
  static getMeldSuggestions(player: Player, jokerValue?: string): Card[][] {
    const hand = player.getHand();
    const suggestions: Card[][] = [];
    const usedCardIds = new Set<string>();

    // Check for possible runs
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        for (let k = j + 1; k < hand.length; k++) {
          const cards = [hand[i], hand[j], hand[k]];
          if (this.isValidRun(cards, jokerValue)) {
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
          if (this.isValidSet(cards, jokerValue)) {
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