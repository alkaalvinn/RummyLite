// Core game classes for Rummy game with OOP design

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type MeldType = 'set' | 'run';

// Card values for scoring (Rul-007 - basic values for cards in hand)
const CARD_VALUES: Record<Rank, number> = {
  'A': 15, '2': 5, '3': 5, '4': 5, '5': 5, '6': 5, '7': 5, '8': 5, '9': 5, '10': 5, 'J': 10, 'Q': 10, 'K': 10
};

// Winning card values (Rul-005 - when player "Memukul" with 1 card left)
const WINNING_CARD_VALUES: Record<Rank, number> = {
  'A': 150, '2': 50, '3': 50, '4': 50, '5': 50, '6': 50, '7': 50, '8': 50, '9': 50, '10': 50, 'J': 100, 'Q': 100, 'K': 100
};

export class Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;
  readonly value: number;
  readonly isJoker: boolean;

  constructor(suit: Suit, rank: Rank, isJoker: boolean = false) {
    this.id = `${suit}-${rank}`;
    this.suit = suit;
    this.rank = rank;
    this.value = CARD_VALUES[rank];
    this.isJoker = isJoker;
  }

  // Factory method to create a joker card
  static createJoker(suit: Suit, rank: Rank): Card {
    return new Card(suit, rank, true);
  }

  // Get display string for the card
  getDisplay(jokerValue?: string): string {
    if (this.isActiveJoker(jokerValue)) return `${this.rank}🃏`;

    const suitSymbols = {
      hearts: '♥️',
      diamonds: '♦️',
      clubs: '♣️',
      spades: '♠️'
    };

    return `${this.rank}${suitSymbols[this.suit]}`;
  }

  // Get color for display
  getColor(jokerValue?: string): string {
    if (this.isActiveJoker(jokerValue)) return 'text-purple-600 font-bold';
    return 'text-black'; // All cards black in this design
  }

  // Get winning score value
  getWinningValue(): number {
    if (this.isJoker) return 250;
    return WINNING_CARD_VALUES[this.rank];
  }

  // Check if card matches another card by rank
  matchesByRank(other: Card): boolean {
    return this.rank === other.rank && this.suit !== other.suit;
  }

  // Check if card forms sequence with another card
  formsSequenceWith(other: Card): boolean {
    return this.suit === other.suit && Math.abs(this.value - other.value) === 1;
  }

  // Check if card is an active joker based on the joker value
  isActiveJoker(jokerValue?: string): boolean {
    return jokerValue ? this.rank === jokerValue : false;
  }

  // Create a copy of the card
  copy(): Card {
    return new Card(this.suit, this.rank, this.isJoker);
  }
}

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.initialize();
  }

  // Initialize a standard 52-card deck
  private initialize(): void {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    this.cards = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        this.cards.push(new Card(suit, rank));
      });
    });
  }

  // Shuffle deck using Fisher-Yates algorithm
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  // Draw cards from deck
  draw(count: number = 1): Card[] {
    const drawnCards = this.cards.splice(0, count);
    return drawnCards;
  }

  // Get remaining cards count
  getRemainingCount(): number {
    return this.cards.length;
  }

  // Get all cards
  getCards(): Card[] {
    return [...this.cards];
  }

  // Check if deck is empty
  isEmpty(): boolean {
    return this.cards.length === 0;
  }

  // Add cards to deck
  addCards(cards: Card[]): void {
    this.cards.push(...cards);
  }

  // Get deck copy
  copy(): Deck {
    const newDeck = new Deck();
    newDeck.cards = this.cards.map(card => card.copy());
    return newDeck;
  }
}

export class Meld {
  readonly id: string;
  readonly type: MeldType;
  readonly cards: Card[];
  readonly playerId: string;

  constructor(type: MeldType, cards: Card[], playerId: string) {
    this.id = `meld-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.cards = cards;
    this.playerId = playerId;
  }

  // Check if this is a run meld
  isRun(): boolean {
    return this.type === 'run';
  }

  // Check if this is a set meld
  isSet(): boolean {
    return this.type === 'set';
  }

  // Get total value of meld
  getValue(): number {
    return this.cards.reduce((total, card) => total + card.value, 0);
  }

  // Check if card is in this meld
  containsCard(cardId: string): boolean {
    return this.cards.some(card => card.id === cardId);
  }

  // Get meld size
  getSize(): number {
    return this.cards.length;
  }
}

export class DiscardPile {
  private cards: Card[] = [];
  private discardedBy: Record<string, string> = {}; // cardId -> playerId

  // Add card to discard pile
  addCard(card: Card, playerId: string): void {
    this.cards.push(card);
    this.discardedBy[card.id] = playerId;
  }

  // Get top card (last discarded)
  getTopCard(): Card | undefined {
    return this.cards[this.cards.length - 1];
  }

  // Get last N cards
  getLastCards(count: number): Card[] {
    return this.cards.slice(-count);
  }

  // Take cards from pile
  takeCards(count: number): Card[] {
    const takenCards = this.cards.splice(-count);
    return takenCards;
  }

  // Get all cards
  getAllCards(): Card[] {
    return [...this.cards];
  }

  // Get card count
  getCount(): number {
    return this.cards.length;
  }

  // Check if empty
  isEmpty(): boolean {
    return this.cards.length === 0;
  }

  // Get who discarded a card
  getWhoDiscarded(cardId: string): string | undefined {
    return this.discardedBy[cardId];
  }

  // Get cards by player
  getCardsByPlayer(playerId: string): Card[] {
    return this.cards.filter(card => this.discardedBy[card.id] === playerId);
  }

  // Clear pile
  clear(): void {
    this.cards = [];
    this.discardedBy = {};
  }
}