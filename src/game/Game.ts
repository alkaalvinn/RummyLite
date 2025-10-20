import { Card, Deck, DiscardPile } from './Card';
import { Player, PlayerData } from './Player';
import { TurnManager } from './TurnManager';
import { ScoreManager } from './ScoreManager';
import { GameValidator } from './GameValidator';

export type GameStatus = 'lobby' | 'playing' | 'finished';
export type GameOverReason = 'memukul' | 'deck_empty';
export type TurnPhase = 'drawPhase' | 'meldPhase' | 'discardPhase';

export interface GameData {
  id: string;
  status: GameStatus;
  currentRound: number;
  players: PlayerData[];
  deck: Card[];
  discardPile: Card[];
  jokerCards: Card[];
  jokerReferenceCard?: Card;
  activeJokerValue?: string;
  currentPlayerIndex: number;
  currentTurnPhase: TurnPhase;
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
  private activeJokerValue?: string;
  private currentTurnPhase: TurnPhase;
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
    this.currentTurnPhase = 'drawPhase';
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

    // Setup joker system according to PRD
    this.setupJokerSystem();

    // Deal cards to players
    this.dealCards();

    // Reset turn manager for game start
    this.turnManager.reset();

    // First player with 8 cards starts in discard phase (must discard first)
    // Other players start in draw phase
    const firstPlayerIndex = this.getCurrentPlayerIndex();
    const firstPlayer = this.players[firstPlayerIndex];
    if (firstPlayer.getHandSize() === 8) {
      this.currentTurnPhase = 'discardPhase'; // First player must discard first
    } else {
      this.currentTurnPhase = 'drawPhase'; // Other players can draw
    }

    // Debug game state after initialization
    this.debugGameState();
  }

  // Setup joker system according to PRD
  private setupJokerSystem(): void {
    const allCards = this.deck.getCards();

    // Step 1: draw 1 random card as 'jokerDeterminer'
    const randomIndex = Math.floor(Math.random() * allCards.length);
    const jokerDeterminer = allCards[randomIndex];

    // Step 2: mark all same-value cards as 'activeJoker'
    const activeJokerCards = allCards.filter(card => card.rank === jokerDeterminer.rank);

    // Step 3: remove jokerDeterminer from deck
    const remainingCards = allCards.filter(card => card.id !== jokerDeterminer.id);

    // Step 4: shuffle remaining 51 cards
    this.deck = new Deck();
    this.deck.addCards(remainingCards);
    this.deck.shuffle();

    // Store joker reference card and active joker value for display
    this.jokerReferenceCard = jokerDeterminer;
    this.activeJokerValue = jokerDeterminer.rank;
    this.jokerCards = activeJokerCards.filter(card => card.id !== jokerDeterminer.id);
  }

  // Deal cards to players according to PRD
  private dealCards(): void {
    // Select random first player
    const firstPlayerIndex = Math.floor(Math.random() * this.players.length);
    this.turnManager.setCurrentPlayerIndex(firstPlayerIndex);

    this.players.forEach((player) => {
      const isStartingPlayer = this.players.indexOf(player) === firstPlayerIndex;
      const cardsCount = isStartingPlayer ? 8 : 7;
      const cards = this.deck.draw(cardsCount);
      player.addCards(cards);
      player.sortHand();
    });
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
      jokerReferenceCard: this.jokerReferenceCard ? this.serializeCard(this.jokerReferenceCard) : undefined,
      activeJokerValue: this.activeJokerValue,
      currentPlayerIndex: this.turnManager.getCurrentPlayerIndex(),
      currentTurnPhase: this.currentTurnPhase,
      turnStartTime: this.turnManager.getCurrentTurnActions().length > 0
        ? this.turnManager.getCurrentTurnActions()[0].timestamp
        : Date.now(),
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

    // Only include lastAction if it exists (to avoid undefined in Firestore)
    if (this.lastAction) {
      data.lastAction = this.lastAction;
    }

    return data;
  }

  // Get game data cleaned for Firestore (removes undefined values)
  getDataForFirestore(): any {
    const data = this.getData();
    return this.removeUndefinedValues(data);
  }

  // Helper method to remove undefined values recursively
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item));
    }

    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = this.removeUndefinedValues(obj[key]);
      }
    }

    return cleaned;
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

  getActiveJokerValue(): string | undefined {
    return this.activeJokerValue;
  }

  getCurrentTurnPhase(): TurnPhase {
    return this.currentTurnPhase;
  }

  // Check if current player must discard (first player with 8 cards)
  mustDiscardFirst(): boolean {
    const currentPlayer = this.getCurrentPlayer();
    return currentPlayer.getHandSize() === 8 && !this.turnManager.hasFirstPlayerDiscarded();
  }

  // Debug methods for checking game state
  getDeckCount(): number {
    return this.deck.getRemainingCount();
  }

  getDiscardPileCount(): number {
    return this.discardPile.getCount();
  }

  getTotalCardsInPlay(): number {
    const playerCards = this.players.reduce((total, player) => total + player.getHandSize(), 0);
    const meldCards = this.players.reduce((total, player) => {
      return total + player.getMelds().reduce((meldTotal, meld) => meldTotal + meld.cards.length, 0);
    }, 0);
    return playerCards + meldCards + this.getDeckCount() + this.getDiscardPileCount();
  }

  // For debugging: print game state
  debugGameState(): void {
    console.log('=== GAME STATE DEBUG ===');
    console.log('Deck size:', this.getDeckCount());
    console.log('Discard pile size:', this.getDiscardPileCount());
    console.log('Active joker value:', this.activeJokerValue);
    console.log('Current turn phase:', this.currentTurnPhase);
    console.log('Current player index:', this.getCurrentPlayerIndex());
    console.log('Total cards in play:', this.getTotalCardsInPlay());
    console.log('Expected total: 51 (52 - 1 jokerDeterminer)');
    console.log('First player discarded:', this.turnManager.hasFirstPlayerDiscarded());
    console.log('Current player must discard:', this.mustDiscardFirst());

    this.players.forEach((player, index) => {
      console.log(`Player ${index} (${player.displayName}): ${player.getHandSize()} cards, ${player.getMeldCount()} melds`);
    });
    console.log('======================');
  }

  // Move to next turn phase
  private nextTurnPhase(): void {
    switch (this.currentTurnPhase) {
      case 'drawPhase':
        this.currentTurnPhase = 'meldPhase';
        break;
      case 'meldPhase':
        this.currentTurnPhase = 'discardPhase';
        break;
      case 'discardPhase':
        // Will be handled by nextTurn() method
        break;
    }
  }

  // Start new turn
  private startNewTurn(): void {
    this.currentTurnPhase = 'drawPhase';
  }

  // Skip meld phase (optional)
  skipMeldPhase(): void {
    if (this.currentTurnPhase === 'meldPhase') {
      this.nextTurnPhase();
    }
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
    // Validate turn phase
    if (this.currentTurnPhase !== 'drawPhase') {
      throw new Error('Can only draw cards during draw phase');
    }

    const validation = GameValidator.validateAction(this, playerId, 'draw', undefined, undefined, drawCount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const player = this.getPlayer(playerId);
    if (!player) throw new Error('Player not found');

    let drawnCards: Card[] = [];

    if (fromDiscard && drawCount && drawCount > 0) {
      // Validate discard pile draw rules (1-3 cards)
      if (drawCount < 1 || drawCount > 3) {
        throw new Error('Can only take 1-3 cards from discard pile');
      }

      // Check if enough cards available in discard pile
      if (this.discardPile.getCount() < drawCount) {
        throw new Error('Not enough cards in discard pile');
      }

      // If taking more than 1 card, must meld immediately (PRD requirement)
      if (drawCount > 1) {
        // Get the cards that would be taken
        const cardsToTake = this.discardPile.getLastCards(drawCount);

        // Validate that these cards can form a valid meld
        const meldValidation = GameValidator.isValidMeld(cardsToTake, this.activeJokerValue);
        if (!meldValidation.valid) {
          throw new Error('Must be able to form a valid meld when taking multiple cards from discard pile');
        }
      }

      // Draw from discard pile
      drawnCards = this.discardPile.takeCards(drawCount);
      this.turnManager.setLastDrawFromDiscard(true);

      // If taking more than 1 card, only top card goes to hand, others must be melded
      if (drawCount > 1) {
        // Extra cards must be able to form valid meld with top card or existing cards
        // For simplicity, we'll add them to hand and require meld in meld phase
        player.addCards(drawnCards);

        // Mark that this player has pending meld requirement
        // This will be enforced in meld phase
        this.turnManager.setLastDrawFromDiscard(true);
      } else {
        player.addCards(drawnCards);
      }
    } else {
      // Draw from deck
      drawnCards = this.deck.draw(1);
      this.turnManager.setLastDrawFromDiscard(false);
      player.addCards(drawnCards);
    }

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

    // Move to next phase
    this.nextTurnPhase();

    // Check game over condition
    this.checkGameOver();
  }

  async discardCard(playerId: string, cardId: string): Promise<void> {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error('Player not found');

    // Special handling for first player with 8 cards - they can discard immediately
    const isFirstPlayerWithEightCards = player.getHandSize() === 8 && !this.turnManager.hasFirstPlayerDiscarded();

    if (!isFirstPlayerWithEightCards) {
      // For all other cases, validate turn phase
      if (this.currentTurnPhase !== 'discardPhase') {
        throw new Error('Can only discard cards during discard phase');
      }
    }

    const validation = GameValidator.validateAction(this, playerId, 'discard', cardId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const card = player.removeCard(cardId);
    if (!card) throw new Error('Card not found in hand');

    this.discardPile.addCard(card, playerId);

    // Mark first player discard if this is the first discard by player with 8 cards
    if (isFirstPlayerWithEightCards) {
      this.turnManager.setFirstPlayerDiscarded(true);
    }

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

    // For first player with 8 cards, move to draw phase after discard
    // For others, move to next turn
    if (!this.isFinished()) {
      if (isFirstPlayerWithEightCards) {
        // First player goes to draw phase after discarding from 8 to 7 cards
        this.currentTurnPhase = 'drawPhase';
      } else {
        // Normal turn progression
        this.turnManager.nextTurn();
        this.startNewTurn();
      }
    }

    // Check game over condition
    this.checkGameOver();
  }

  async createMeld(playerId: string, cardIds: string[]): Promise<void> {
    // Validate turn phase
    if (this.currentTurnPhase !== 'meldPhase') {
      throw new Error('Can only create melds during meld phase');
    }

    const player = this.getPlayer(playerId);
    if (!player) throw new Error('Player not found');

    const meldCards = cardIds.map(id => player.getHand().find(c => c.id === id)).filter(Boolean) as Card[];
    const validation = GameValidator.validateAction(this, playerId, 'meld', undefined, meldCards);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check meld requirement if player drew multiple cards from discard pile
    if (this.turnManager.lastDrawWasFromDiscard() && this.lastAction?.drawCount && this.lastAction.drawCount > 1) {
      // Player must create a meld that includes at least some of the drawn cards
      // This is a simplified implementation - a full implementation would track which cards were drawn
      console.log('Player must meld after drawing multiple cards from discard pile');
    }

    // Remove cards from hand
    player.removeCards(cardIds);

    // Determine meld type
    const meldValidation = GameValidator.isValidMeld(meldCards, this.activeJokerValue);
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
    newGame.activeJokerValue = this.activeJokerValue;
    newGame.currentTurnPhase = this.currentTurnPhase;
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
    game.jokerReferenceCard = data.jokerReferenceCard ? game.deserializeCard(data.jokerReferenceCard) : undefined;
    game.activeJokerValue = data.activeJokerValue;
    game.currentTurnPhase = data.currentTurnPhase;
    game.winner = data.winner;
    game.gameOverReason = data.gameOverReason;
    game.lastAction = data.lastAction || undefined;

    // Reconstruct turn manager
    game.turnManager = new TurnManager(game.players, data.currentPlayerIndex);
    game.turnManager.setFirstPlayerDiscarded(data.firstPlayerDiscarded);
    game.turnManager.setLastDrawFromDiscard(data.lastDrawFromDiscard);

    return game;
  }
}