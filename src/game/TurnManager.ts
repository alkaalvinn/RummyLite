import { Player } from './Player';

export interface TurnData {
  playerIndex: number;
  startTime: number;
  endTime?: number;
  actions: TurnAction[];
}

export interface TurnAction {
  type: 'draw' | 'discard' | 'meld';
  playerId: string;
  timestamp: number;
  details: {
    cardId?: string;
    cardIds?: string[];
    drawCount?: number;
    meldId?: string;
  };
}

export class TurnManager {
  private players: Player[] = [];
  private currentPlayerIndex: number = 0;
  private direction: 1 | -1 = 1; // Clockwise by default
  private turnHistory: TurnData[] = [];
  private currentTurn: TurnData;
  private firstPlayerDiscarded: boolean = false;
  private lastDrawFromDiscard: boolean = false;

  constructor(players: Player[], startingPlayerIndex: number = 0) {
    this.players = players;
    this.currentPlayerIndex = startingPlayerIndex;
    this.currentTurn = {
      playerIndex: startingPlayerIndex,
      startTime: Date.now(),
      actions: []
    };
  }

  // Get current player
  getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  // Get current player index
  getCurrentPlayerIndex(): number {
    return this.currentPlayerIndex;
  }

  // Set current player index
  setCurrentPlayerIndex(index: number): void {
    if (index >= 0 && index < this.players.length) {
      this.currentPlayerIndex = index;
      this.currentTurn = {
        playerIndex: index,
        startTime: Date.now(),
        actions: []
      };
    }
  }

  // Get all players
  getPlayers(): Player[] {
    return [...this.players];
  }

  // Check if it's a player's turn
  isPlayerTurn(playerId: string): boolean {
    return this.getCurrentPlayer().id === playerId;
  }

  // Move to next player
  nextTurn(): Player {
    // End current turn
    this.currentTurn.endTime = Date.now();
    this.turnHistory.push({ ...this.currentTurn });

    // Move to next player
    this.currentPlayerIndex = this.getNextPlayerIndex();
    this.lastDrawFromDiscard = false; // Reset discard draw flag

    // Start new turn
    this.currentTurn = {
      playerIndex: this.currentPlayerIndex,
      startTime: Date.now(),
      actions: []
    };

    return this.getCurrentPlayer();
  }

  // Get next player index
  private getNextPlayerIndex(): number {
    const nextIndex = this.currentPlayerIndex + this.direction;
    const playerCount = this.players.length;

    // Handle wraparound
    if (nextIndex >= playerCount) {
      return 0;
    } else if (nextIndex < 0) {
      return playerCount - 1;
    }

    return nextIndex;
  }

  // Get previous player index
  getPreviousPlayerIndex(): number {
    const prevIndex = this.currentPlayerIndex - this.direction;
    const playerCount = this.players.length;

    // Handle wraparound
    if (prevIndex >= playerCount) {
      return 0;
    } else if (prevIndex < 0) {
      return playerCount - 1;
    }

    return prevIndex;
  }

  // Get previous player
  getPreviousPlayer(): Player {
    const prevIndex = this.getPreviousPlayerIndex();
    return this.players[prevIndex];
  }

  // Reverse turn direction
  reverseDirection(): void {
    this.direction = this.direction === 1 ? -1 : 1;
  }

  // Get turn direction
  getDirection(): 1 | -1 {
    return this.direction;
  }

  // Record an action in current turn
  recordAction(action: TurnAction): void {
    this.currentTurn.actions.push(action);

    // Update flags based on action type
    if (action.type === 'draw' && action.details.drawCount && action.details.drawCount > 1) {
      this.lastDrawFromDiscard = true;
    }

    if (action.type === 'discard' && !this.firstPlayerDiscarded) {
      this.firstPlayerDiscarded = true;
    }
  }

  // Get current turn actions
  getCurrentTurnActions(): TurnAction[] {
    return [...this.currentTurn.actions];
  }

  // Get turn history
  getTurnHistory(): TurnData[] {
    return [...this.turnHistory];
  }

  // Check if first player has discarded
  hasFirstPlayerDiscarded(): boolean {
    return this.firstPlayerDiscarded;
  }

  // Force set first player discarded flag
  setFirstPlayerDiscarded(discarded: boolean): void {
    this.firstPlayerDiscarded = discarded;
  }

  // Check if last draw was from discard pile
  lastDrawWasFromDiscard(): boolean {
    return this.lastDrawFromDiscard;
  }

  // Set last draw from discard flag
  setLastDrawFromDiscard(fromDiscard: boolean): void {
    this.lastDrawFromDiscard = fromDiscard;
  }

  // Get current turn duration
  getCurrentTurnDuration(): number {
    return Date.now() - this.currentTurn.startTime;
  }

  // Get turn number
  getTurnNumber(): number {
    return this.turnHistory.length + 1;
  }

  // Get round number (assuming 4 turns per round)
  getRoundNumber(): number {
    return Math.floor(this.turnHistory.length / this.players.length) + 1;
  }

  // Get player turn order
  getTurnOrder(): Player[] {
    const order: Player[] = [];
    const startIndex = this.currentPlayerIndex;

    for (let i = 0; i < this.players.length; i++) {
      const index = (startIndex + i * this.direction + this.players.length) % this.players.length;
      order.push(this.players[index]);
    }

    return order;
  }

  // Get how many turns a player has had
  getPlayerTurnCount(playerId: string): number {
    return this.turnHistory.filter(turn => this.players[turn.playerIndex].id === playerId).length;
  }

  // Get average turn duration
  getAverageTurnDuration(): number {
    if (this.turnHistory.length === 0) return 0;

    const totalDuration = this.turnHistory.reduce((total, turn) => {
      return total + (turn.endTime || Date.now()) - turn.startTime;
    }, 0);

    return totalDuration / this.turnHistory.length;
  }

  // Check if player can make an action
  canPlayerAct(playerId: string): boolean {
    return this.isPlayerTurn(playerId) && this.getCurrentPlayer().isConnected();
  }

  // Get time since last action
  getTimeSinceLastAction(): number {
    if (this.currentTurn.actions.length === 0) {
      return this.getCurrentTurnDuration();
    }

    const lastAction = this.currentTurn.actions[this.currentTurn.actions.length - 1];
    return Date.now() - lastAction.timestamp;
  }

  // Check if turn is idle (no action for too long)
  isTurnIdle(maxIdleTime: number = 60000): boolean { // 60 seconds default
    return this.getTimeSinceLastAction() > maxIdleTime;
  }

  // Get turn summary for display
  getTurnSummary(): string {
    const player = this.getCurrentPlayer();
    const duration = this.getCurrentTurnDuration();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return `${player.displayName}'s turn (${minutes}:${seconds.toString().padStart(2, '0')})`;
  }

  // Create copy of turn manager
  copy(): TurnManager {
    const newManager = new TurnManager(this.players.map(p => p.copy()), this.currentPlayerIndex);
    newManager.direction = this.direction;
    newManager.turnHistory = this.turnHistory.map(turn => ({ ...turn }));
    newManager.currentTurn = { ...this.currentTurn };
    newManager.firstPlayerDiscarded = this.firstPlayerDiscarded;
    newManager.lastDrawFromDiscard = this.lastDrawFromDiscard;
    return newManager;
  }

  // Reset turn manager
  reset(): void {
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.turnHistory = [];
    this.currentTurn = {
      playerIndex: 0,
      startTime: Date.now(),
      actions: []
    };
    this.firstPlayerDiscarded = false;
    this.lastDrawFromDiscard = false;
  }
}