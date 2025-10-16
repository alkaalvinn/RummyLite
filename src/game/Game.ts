import { Card, Deck, DiscardPile } from './Card';
import { Player, PlayerData } from './Player';
import { TurnManager } from './TurnManager';
import { ScoreManager } from './ScoreManager';
import { GameValidator } from './GameValidator';

export type GameStatus = 'lobby' | 'playing' | 'finished';
export type GameOverReason = 'memukul' | 'deck_empty';

export interface GameData {
  id: string;
  status: GameStatus;
  currentRound: number;
  players: PlayerData[];
  deck: Card[];
  discardPile: Card[];
  jokerCards: Card[];
  jokerReferenceCard?: Card;
  currentPlayerIndex: number;
  turnStartTime: number;
  winner?: string;
  gameOverReason?: GameOverReason;
  lastAction?: {
    type: 'draw' | 'discard' | 'meld';
    playerId: string;
    cardId?: string;
    meldId?: string;
    drawCount?: number;
  };
  discardedBy: Record<string, string>;
  firstPlayerDiscarded: boolean;
  lastDrawFromDiscard: boolean;
  direction: 1 | -1;
}

export class Game {
  private id: string;
  private status: GameStatus;
  private currentRound: number;
  private players: Player[];
  private deck: Deck;
  private discardPile: DiscardPile;
  private jokerCards: Card[];
  private jokerReferenceCard?: Card;
  private turnManager: TurnManager;
  private winner?: string;
  private gameOverReason?: GameOverReason;
  private lastAction?: {
    type: 'draw' | 'discard' | 'meld';
    playerId: string;
    cardId?: string;
    meldId?: string;
    drawCount?: number;
  };
  private startTime: number;

  constructor(playerIds: string[], displayNames: string[]) {
    // Validate game start
    const validation = GameValidator.validateGameStart(playerIds.length);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    this.id = this.generateGameId();
    this.status = 'lobby';
    this.currentRound = 1;
    this.startTime = Date.now();

    // Create players
    this.players = playerIds.map((id, index) =>
      new Player(id, displayNames[index])
    );

    // Initialize deck and discard pile
    this.deck = new Deck();
    this.discardPile = new DiscardPile();

    // Initialize turn manager
    this.turnManager = new TurnManager(this.players);

    // Initialize joker cards (will be set when game starts)
    this.jokerCards = [];
    this.jokerReferenceCard = undefined;
  }

  // Start the game
  start(): void {
    if (this.status !== 'lobby') {
      throw new Error('Game is already started');
    }

    this.status = 'playing';
    this.initializeGame();
  }

  // Initialize game state
  private initializeGame(): void {
    // Shuffle deck
    this.deck.shuffle();

    // Determine joker cards (GMS-003)
    this.determineJokerCards();

    // Deal cards to players (7 cards each, plus first player gets 1 extra)
    this.dealCards();

    // Create initial discard pile (GMS-002A)
    this.createInitialDiscardPile();

    // Reset turn manager for game start
    this.turnManager.reset();
  }

  // Determine joker cards
  private determineJokerCards(): void {
    const allCards = this.deck.getCards();
    const randomIndex = Math.floor(Math.random() * allCards.length);
    const referenceCard = allCards[randomIndex];

    // Find all 4 matching cards (same rank, different suits)
    const matchingCards = allCards.filter(card => card.rank === referenceCard.rank);

    // The reference card is set aside, the other 3 become jokers
    this.jokerReferenceCard = referenceCard;
    this.jokerCards = matchingCards.filter(card => card.id !== referenceCard.id)
      .map(card => Card.createJoker(card.suit, card.rank));

    // Remove all 4 cards from deck
    const remainingCards = allCards.filter(card =>
      !matchingCards.some(match => match.id === card.id)
    );

    // Add joker cards back to remaining deck
    remainingCards.push(...this.jokerCards);

    // Update deck
    this.deck = new Deck();
    this.deck.addCards(remainingCards);
    this.deck.shuffle();
  }

  // Deal cards to players
  private dealCards(): void {
    const cardsPerPlayer = 7;

    this.players.forEach((player, index) => {
      const cards = this.deck.draw(cardsPerPlayer);
      player.addCards(cards);
      player.sortHand();
    });
  }

  // Create initial discard pile (GMS-002A)
  private createInitialDiscardPile(): void {
    const initialCard = this.deck.draw(1)[0];
    this.discardPile.addCard(initialCard, 'system');

    // First player gets the initial discard card (GMS-002B)
    this.players[0].addCards([initialCard]);
    this.players[0].sortHand();
  }

  // Get game data as plain object
  getData(): GameData {
    const data: GameData = {
      id: this.id,
      status: this.status,
      currentRound: this.currentRound,
      players: this.players.map(player => player.getData()),
      deck: this.deck.getCards().map(card => this.serializeCard(card)),
      discardPile: this.discardPile.getAllCards().map(card => this.serializeCard(card)),
      jokerCards: this.jokerCards.map(card => this.serializeCard(card)),
      jokerReferenceCard: this.jokerReferenceCard ? this.serializeCard(this.jokerReferenceCard) : null,
      currentPlayerIndex: this.turnManager.getCurrentPlayerIndex(),
      turnStartTime: this.turnManager.getCurrentTurnActions().length > 0
        ? this.turnManager.getCurrentTurnActions()[0].timestamp
        : Date.now(),
      lastAction: this.lastAction || null,
      discardedBy: {},
      firstPlayerDiscarded: this.turnManager.hasFirstPlayerDiscarded(),
      lastDrawFromDiscard: this.turnManager.lastDrawWasFromDiscard(),
      direction: this.turnManager.getDirection()
    };

    // Only include winner and gameOverReason if they exist
    if (this.winner) {
      data.winner = this.winner;
    }
    if (this.gameOverReason) {
      data.gameOverReason = this.gameOverReason;
    }

    return data;
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

  // Deserialize plain data back to Card object
  deserializeCard(cardData: any): Card {
    return new Card(cardData.suit, cardData.rank, cardData.isJoker);
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getPlayers(): Player[] {
    return [...this.players];
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.find(player => player.id === playerId);
  }

  getDeck(): Deck {
    return this.deck;
  }

  getDiscardPile(): DiscardPile {
    return this.discardPile;
  }

  getJokerCards(): Card[] {
    return [...this.jokerCards];
  }

  getJokerReferenceCard(): Card | undefined {
    return this.jokerReferenceCard;
  }

  getTurnManager(): TurnManager {
    return this.turnManager;
  }

  getCurrentPlayer(): Player {
    return this.turnManager.getCurrentPlayer();
  }

  getCurrentPlayerIndex(): number {
    return this.turnManager.getCurrentPlayerIndex();
  }

  getWinner(): string | undefined {
    return this.winner;
  }

  getGameOverReason(): GameOverReason | undefined {
    return this.gameOverReason;
  }

  getLastAction(): GameData['lastAction'] {
    return this.lastAction;
  }

  // Game state checks
  isPlaying(): boolean {
    return this.status === 'playing';
  }

  isFinished(): boolean {
    return this.status === 'finished';
  }

  hasFirstPlayerDiscarded(): boolean {
    return this.turnManager.hasFirstPlayerDiscarded();
  }

  lastDrawFromDiscard(): boolean {
    return this.turnManager.lastDrawWasFromDiscard();
  }

  // Game actions
  async drawCard(playerId: string, fromDiscard: boolean = false, drawCount?: number): Promise<void> {
    const validation = GameValidator.validateAction(this, playerId, 'draw', undefined, undefined, drawCount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const player = this.getPlayer(playerId);
    if (!player) throw new Error('Player not found');

    let drawnCards: Card[] = [];

    if (fromDiscard && drawCount && drawCount > 0) {
      // Draw from discard pile
      drawnCards = this.discardPile.takeCards(drawCount);
      this.turnManager.setLastDrawFromDiscard(true);
    } else {
      // Draw from deck
      drawnCards = this.deck.draw(1);
      this.turnManager.setLastDrawFromDiscard(false);
    }

    player.addCards(drawnCards);

    // Record action
    this.turnManager.recordAction({
      type: 'draw',
      playerId,
      timestamp: Date.now(),
      details: { drawCount: drawnCards.length }
    });

    this.lastAction = {
      type: 'draw',
      playerId,
      drawCount: drawnCards.length
    };

    // Check game over condition
    this.checkGameOver();
  }

  async discardCard(playerId: string, cardId: string): Promise<void> {
    const validation = GameValidator.validateAction(this, playerId, 'discard', cardId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const player = this.getPlayer(playerId);
    if (!player) throw new Error('Player not found');

    const card = player.removeCard(cardId);
    if (!card) throw new Error('Card not found in hand');

    this.discardPile.addCard(card, playerId);

    // Check for winning condition (Memukul - Rul-004)
    if (player.canWin()) {
      this.winner = playerId;
      this.gameOverReason = 'memukul';
      this.status = 'finished';
      player.setScore(player.getScore() + ScoreManager.calculateWinningScore(card));
    }

    // Record action
    this.turnManager.recordAction({
      type: 'discard',
      playerId,
      timestamp: Date.now(),
      details: { cardId }
    });

    this.lastAction = {
      type: 'discard',
      playerId,
      cardId
    };

    // Move to next turn if game not finished
    if (!this.isFinished()) {
      this.turnManager.nextTurn();
    }

    // Check game over condition
    this.checkGameOver();
  }

  async createMeld(playerId: string, cardIds: string[]): Promise<void> {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error('Player not found');

    const meldCards = cardIds.map(id => player.getHand().find(c => c.id === id)).filter(Boolean) as Card[];
    const validation = GameValidator.validateAction(this, playerId, 'meld', undefined, meldCards);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Remove cards from hand
    player.removeCards(cardIds);

    // Determine meld type
    const meldValidation = GameValidator.isValidMeld(meldCards);
    if (!meldValidation.valid) {
      throw new Error('Invalid meld');
    }

    // Create meld
    const meld = new (await import('./Card')).Meld(meldValidation.type!, meldCards, playerId);
    player.addMeld(meld);

    // Record action
    this.turnManager.recordAction({
      type: 'meld',
      playerId,
      timestamp: Date.now(),
      details: { meldId: meld.id, cardIds }
    });

    this.lastAction = {
      type: 'meld',
      playerId,
      meldId: meld.id
    };

    // Check game over condition
    this.checkGameOver();
  }

  // Check if game is over
  private checkGameOver(): void {
    if (this.isFinished()) return;

    const gameOverStatus = GameValidator.isGameOver(this);
    if (gameOverStatus.gameOver) {
      this.status = 'finished';
      this.winner = gameOverStatus.winner;
      this.gameOverReason = gameOverStatus.reason;

      // Calculate final scores if game ended normally
      if (gameOverStatus.reason === 'deck_empty') {
        const { scores } = ScoreManager.calculateRoundScores(this);
        scores.forEach(score => {
          const player = this.getPlayer(score.playerId);
          if (player) {
            player.setScore(score.totalScore);
          }
        });
      }
    }
  }

  // Get game duration
  getGameDuration(): number {
    return Date.now() - this.startTime;
  }

  // Format game duration
  getFormattedDuration(): string {
    const duration = this.getGameDuration();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Create copy of game
  copy(): Game {
    const newGame = new Game(this.players.map(p => p.id), this.players.map(p => p.displayName));
    newGame.id = this.id;
    newGame.status = this.status;
    newGame.currentRound = this.currentRound;
    newGame.players = this.players.map(p => p.copy());
    newGame.deck = this.deck.copy();
    newGame.discardPile = this.discardPile;
    newGame.jokerCards = this.jokerCards.map(c => c.copy());
    newGame.jokerReferenceCard = this.jokerReferenceCard?.copy();
    newGame.turnManager = this.turnManager.copy();
    newGame.winner = this.winner;
    newGame.gameOverReason = this.gameOverReason;
    newGame.lastAction = this.lastAction;
    newGame.startTime = this.startTime;
    return newGame;
  }

  // Generate unique game ID
  private generateGameId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  // Create game from data
  static fromData(data: GameData): Game {
    const game = new Game(
      data.players.map(p => p.id),
      data.players.map(p => p.displayName)
    );

    game.id = data.id;
    game.status = data.status;
    game.currentRound = data.currentRound;
    game.players = data.players.map(Player.fromData);
    game.deck = new Deck();
    game.deck.addCards(data.deck.map(cardData => game.deserializeCard(cardData)));
    game.discardPile = new DiscardPile();
    data.discardPile.forEach(cardData => {
      const card = game.deserializeCard(cardData);
      game.discardPile.addCard(card, 'system');
    });
    game.jokerCards = data.jokerCards.map(cardData => game.deserializeCard(cardData));
    game.jokerReferenceCard = data.jokerReferenceCard ? game.deserializeCard(data.jokerReferenceCard) : null;
    game.winner = data.winner;
    game.gameOverReason = data.gameOverReason;
    game.lastAction = data.lastAction;

    // Reconstruct turn manager
    game.turnManager = new TurnManager(game.players, data.currentPlayerIndex);
    game.turnManager.setFirstPlayerDiscarded(data.firstPlayerDiscarded);
    game.turnManager.setLastDrawFromDiscard(data.lastDrawFromDiscard);

    return game;
  }
}