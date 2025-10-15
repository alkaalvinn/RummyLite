import { Card } from './Card';
import { Player } from './Player';
import { Game } from './Game';

export interface RoundScore {
  playerId: string;
  handScore: number;
  meldBonus: number;
  totalScore: number;
  isWinner?: boolean;
  winningCard?: Card;
}

export interface GameScore {
  playerId: string;
  displayName: string;
  rounds: RoundScore[];
  totalScore: number;
  wins: number;
}

export class ScoreManager {
  // Calculate score for a hand (Rul-007 and Rul-007B)
  static calculateHandScore(hand: Card[], usedInMelds: Card[] = []): number {
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
  }

  // Calculate winning score (Rul-005 - Memukul)
  static calculateWinningScore(finalCard: Card): number {
    return finalCard.getWinningValue();
  }

  // Calculate round scores and determine joker grant
  static calculateRoundScores(game: Game, winnerId?: string): {
    scores: RoundScore[];
    jokerGrant?: string;
  } {
    const players = game.getPlayers();
    const scores: RoundScore[] = [];
    let highestScore = -1;
    let jokerGrant: string | undefined;

    players.forEach(player => {
      // Get all cards used in melds
      const usedInMelds: Card[] = [];
      player.getMelds().forEach(meld => {
        usedInMelds.push(...meld.cards);
      });

      const handScore = this.calculateHandScore(player.getHand(), usedInMelds);
      const meldBonus = this.calculateMeldBonus(player.getMelds());

      let totalScore = handScore + meldBonus;
      let isWinner = false;
      let winningCard: Card | undefined;

      // Check if this player is the winner
      if (winnerId === player.id) {
        isWinner = true;
        // Winner gets bonus based on their last card
        if (player.getHandSize() === 1) {
          winningCard = player.getHand()[0];
          totalScore += this.calculateWinningScore(winningCard);
        }
      }

      const roundScore: RoundScore = {
        playerId: player.id,
        handScore,
        meldBonus,
        totalScore,
        isWinner,
        winningCard
      };

      scores.push(roundScore);

      // Track highest score for joker grant
      if (totalScore > highestScore) {
        highestScore = totalScore;
        jokerGrant = player.id;
      }
    });

    return { scores, jokerGrant };
  }

  // Calculate meld bonus points
  static calculateMeldBonus(melds: any[]): number {
    let bonus = 0;

    melds.forEach(meld => {
      // Bonus for each meld
      bonus += 10;

      // Additional bonus for larger melds
      if (meld.getSize() === 4) {
        bonus += 5; // Extra bonus for 4-card melds
      }
    });

    return bonus;
  }

  // Calculate game scores across multiple rounds
  static calculateGameScores(gameHistory: any[]): GameScore[] {
    const gameScores: Record<string, GameScore> = {};

    gameHistory.forEach(round => {
      const { scores } = this.calculateRoundScores(round);

      scores.forEach(roundScore => {
        if (!gameScores[roundScore.playerId]) {
          const player = round.getPlayers().find(p => p.id === roundScore.playerId);
          gameScores[roundScore.playerId] = {
            playerId: roundScore.playerId,
            displayName: player?.displayName || 'Unknown',
            rounds: [],
            totalScore: 0,
            wins: 0
          };
        }

        gameScores[roundScore.playerId].rounds.push(roundScore);
        gameScores[roundScore.playerId].totalScore += roundScore.totalScore;

        if (roundScore.isWinner) {
          gameScores[roundScore.playerId].wins++;
        }
      });
    });

    return Object.values(gameScores).sort((a, b) => b.totalScore - a.totalScore);
  }

  // Get score breakdown for display
  static getScoreBreakdown(player: Player): {
    handCards: Array<{ card: Card; inMeld: boolean; value: number }>;
    melds: Array<{ type: string; cards: Card[]; bonus: number }>;
    totalHandValue: number;
    totalMeldBonus: number;
  } {
    const handCards: Array<{ card: Card; inMeld: boolean; value: number }> = [];
    const melds: Array<{ type: string; cards: Card[]; bonus: number }> = [];

    // Get all cards used in melds
    const usedInMelds: Card[] = [];
    player.getMelds().forEach(meld => {
      usedInMelds.push(...meld.cards);
      melds.push({
        type: meld.type,
        cards: meld.cards,
        bonus: 10 + (meld.getSize() === 4 ? 5 : 0)
      });
    });

    // Calculate hand card values
    player.getHand().forEach(card => {
      let value = card.value;

      if (card.isJoker) {
        const jokerUsedInMeld = usedInMelds.some(meldCard => meldCard.id === card.id);
        if (jokerUsedInMeld) {
          value = 10; // Used joker
        } else {
          value = -25; // Unused joker
        }
      }

      handCards.push({
        card,
        inMeld: false, // Cards in hand are not in melds
        value
      });
    });

    const totalHandValue = handCards.reduce((sum, item) => sum + item.value, 0);
    const totalMeldBonus = melds.reduce((sum, meld) => sum + meld.bonus, 0);

    return {
      handCards,
      melds,
      totalHandValue,
      totalMeldBonus
    };
  }

  // Format score for display
  static formatScore(score: number): string {
    return score.toString();
  }

  // Format score with sign
  static formatSignedScore(score: number): string {
    return score >= 0 ? `+${score}` : `${score}`;
  }

  // Get score color based on value
  static getScoreColor(score: number): string {
    if (score > 0) return 'text-green-600';
    if (score < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  // Check if player has negative score
  static hasNegativeScore(player: Player): boolean {
    const hand = player.getHand();
    return hand.some(card => card.isJoker && !this.isJokerUsedInMeld(card, player.getMelds()));
  }

  // Check if joker is used in meld
  private static isJokerUsedInMeld(joker: Card, melds: any[]): boolean {
    return melds.some(meld =>
      meld.cards.some((card: Card) => card.id === joker.id)
    );
  }

  // Calculate potential score for current hand
  static calculatePotentialScore(player: Player): {
    currentScore: number;
    potentialScore: number;
    potentialReduction: number;
  } {
    const currentScore = this.calculateHandScore(player.getHand(), player.getMelds());
    let potentialReduction = 0;

    // Check for unused jokers that could be used in potential melds
    player.getHand().forEach(card => {
      if (card.isJoker) {
        const usedInMeld = player.getMelds().some(meld =>
          meld.cards.some(meldCard => meldCard.id === card.id)
        );
        if (!usedInMeld) {
          // Unused joker could potentially be used to reduce score
          potentialReduction += 35; // From -25 to +10 (or average value)
        }
      }
    });

    return {
      currentScore,
      potentialScore: currentScore + potentialReduction,
      potentialReduction
    };
  }

  // Get score advice for player
  static getScoreAdvice(player: Player): string[] {
    const advice: string[] = [];
    const hand = player.getHand();

    // Check for unused jokers
    const unusedJokers = hand.filter(card =>
      card.isJoker && !player.getMelds().some(meld =>
        meld.cards.some(meldCard => meldCard.id === card.id)
      )
    );

    if (unusedJokers.length > 0) {
      advice.push(`You have ${unusedJokers.length} unused joker(s) worth -25 points each. Try to use them in melds.`);
    }

    // Check for high-value cards
    const highValueCards = hand.filter(card => card.value >= 10 && !card.isJoker);
    if (highValueCards.length > 0) {
      advice.push(`You have ${highValueCards.length} high-value cards (10+ points). Consider using them in melds or discarding them.`);
    }

    // Check if player can win
    if (player.canWin()) {
      advice.push('You can win! You have exactly 1 card left and have laid down the required run.');
    }

    return advice;
  }
}