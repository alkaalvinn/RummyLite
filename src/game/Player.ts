import { Card, Meld } from './Card';

export interface PlayerData {
  id: string;
  displayName: string;
  hand: Card[];
  melds: Meld[];
  score: number;
  ready: boolean;
  connected: boolean;
  hasLaidRun: boolean;
}

export class Player {
  readonly id: string;
  readonly displayName: string;
  private hand: Card[] = [];
  private melds: Meld[] = [];
  private score: number = 0;
  private ready: boolean = false;
  private connected: boolean = true;
  private hasLaidRun: boolean = false;

  constructor(id: string, displayName: string) {
    this.id = id;
    this.displayName = displayName;
  }

  // Get player data as plain object
  getData(): PlayerData {
    return {
      id: this.id,
      displayName: this.displayName,
      hand: this.hand.map(card => this.serializeCard(card)),
      melds: this.melds.map(meld => this.serializeMeld(meld)),
      score: this.score,
      ready: this.ready,
      connected: this.connected,
      hasLaidRun: this.hasLaidRun
    };
  }

  // Serialize Card object to plain data for Firestore
  private serializeCard(card: Card): any {
    return {
      id: card.id,
      suit: card.suit,
      rank: card.rank,
      value: card.value,
      isJoker: card.isJoker
    };
  }

  // Serialize Meld object to plain data for Firestore
  private serializeMeld(meld: Meld): any {
    return {
      id: meld.id,
      type: meld.type,
      cards: meld.cards.map(card => this.serializeCard(card)),
      playerId: meld.playerId
    };
  }

  // Deserialize plain data back to Card object
  deserializeCard(cardData: any): Card {
    return new Card(cardData.suit, cardData.rank, cardData.isJoker);
  }

  // Deserialize plain data back to Meld object
  deserializeMeld(meldData: any): Meld {
    const cards = meldData.cards.map((cardData: any) => this.deserializeCard(cardData));
    return new Meld(meldData.type, cards, meldData.playerId);
  }

  // Hand management
  getHand(): Card[] {
    return [...this.hand];
  }

  getHandSize(): number {
    return this.hand.length;
  }

  addCards(cards: Card[]): void {
    this.hand.push(...cards);
  }

  removeCard(cardId: string): Card | undefined {
    const index = this.hand.findIndex(card => card.id === cardId);
    if (index !== -1) {
      return this.hand.splice(index, 1)[0];
    }
    return undefined;
  }

  removeCards(cardIds: string[]): Card[] {
    const removedCards: Card[] = [];
    cardIds.forEach(cardId => {
      const card = this.removeCard(cardId);
      if (card) removedCards.push(card);
    });
    return removedCards;
  }

  hasCard(cardId: string): boolean {
    return this.hand.some(card => card.id === cardId);
  }

  hasCards(cardIds: string[]): boolean {
    return cardIds.every(cardId => this.hasCard(cardId));
  }

  // Meld management
  getMelds(): Meld[] {
    return [...this.melds];
  }

  getMeldCount(): number {
    return this.melds.length;
  }

  addMeld(meld: Meld): void {
    this.melds.push(meld);

    // Mark hasLaidRun if this is a run meld
    if (meld.isRun()) {
      this.hasLaidRun = true;
    }
  }

  // Ready state management
  isReady(): boolean {
    return this.ready;
  }

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  toggleReady(): void {
    this.ready = !this.ready;
  }

  // Connection state management
  isConnected(): boolean {
    return this.connected;
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  // Score management
  getScore(): number {
    return this.score;
  }

  setScore(score: number): void {
    this.score = score;
  }

  addScore(points: number): void {
    this.score += points;
  }

  // Run requirement tracking
  hasLaidRunMeld(): boolean {
    return this.hasLaidRun;
  }

  // Winning condition checks
  canWin(): boolean {
    return this.hand.length === 1 && this.melds.length > 0 && this.hasLaidRun;
  }

  hasWon(): boolean {
    return this.hand.length === 0 && this.melds.length > 0;
  }

  // Card matching logic for discard pile interaction
  hasMatchingPair(topCard: Card): boolean {
    if (!topCard) return false;

    return this.hand.some(card => {
      // Check for same rank (different suits for pairs)
      if (card.matchesByRank(topCard)) {
        return true;
      }

      // Check for same suit (sequence)
      if (card.formsSequenceWith(topCard)) {
        return true;
      }

      return false;
    });
  }

  getMatchingCards(topCard: Card): Card[] {
    if (!topCard) return [];

    return this.hand.filter(card =>
      card.matchesByRank(topCard) || card.formsSequenceWith(topCard)
    );
  }

  // Get matching cards sequence from discard pile
  getMatchingCardsSequence(discardPile: Card[]): Card[] {
    if (discardPile.length === 0) return [];

    const matchingCards: Card[] = [];

    // Check from top to bottom until we find a non-matching card
    for (let i = discardPile.length - 1; i >= 0; i--) {
      const card = discardPile[i];

      if (this.hasMatchingPair(card)) {
        matchingCards.unshift(card); // Add to beginning to maintain order
      } else {
        break; // Stop at first non-matching card
      }
    }

    return matchingCards;
  }

  // Sort hand by rank and suit
  sortHand(): void {
    this.hand.sort((a, b) => {
      // First sort by value
      if (a.value !== b.value) {
        return a.value - b.value;
      }
      // Then by suit
      const suitOrder = ['hearts', 'diamonds', 'clubs', 'spades'];
      return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    });
  }

  // Get hand statistics
  getHandStats(): {
    totalCards: number;
    jokerCount: number;
    suits: Record<string, number>;
    ranks: Record<string, number>;
  } {
    const stats = {
      totalCards: this.hand.length,
      jokerCount: this.hand.filter(card => card.isJoker).length,
      suits: {} as Record<string, number>,
      ranks: {} as Record<string, number>
    };

    this.hand.forEach(card => {
      // Count suits
      stats.suits[card.suit] = (stats.suits[card.suit] || 0) + 1;
      // Count ranks
      stats.ranks[card.rank] = (stats.ranks[card.rank] || 0) + 1;
    });

    return stats;
  }

  // Create copy of player
  copy(): Player {
    const newPlayer = new Player(this.id, this.displayName);
    newPlayer.hand = this.hand.map(card => card.copy());
    newPlayer.melds = this.melds.map(meld =>
      new Meld(meld.type, meld.cards.map(card => card.copy()), meld.playerId)
    );
    newPlayer.score = this.score;
    newPlayer.ready = this.ready;
    newPlayer.connected = this.connected;
    newPlayer.hasLaidRun = this.hasLaidRun;
    return newPlayer;
  }

  // Create player from data
  static fromData(data: PlayerData): Player {
    const player = new Player(data.id, data.displayName);
    player.hand = data.hand.map(cardData => player.deserializeCard(cardData));
    player.melds = data.melds.map(meldData => player.deserializeMeld(meldData));
    player.score = data.score;
    player.ready = data.ready;
    player.connected = data.connected;
    player.hasLaidRun = data.hasLaidRun;
    return player;
  }
}