import { Board } from './Board.js';

export class Game {
  constructor(size, colors) {
    this.size = size;
    this.colors = colors;
    this.board = new Board(size, colors);
    this.score = 0;
    this.moves = 30;
    this.level = 1;
  }

  reset() {
    this.level = 1;
    this.score = 0;
    this.moves = 30;
    this.board = new Board(this.size, this.colors);
  }

  nextLevel(resetMoves = false) {
    this.level++;
    if (resetMoves) this.moves = 30;
    this.board = new Board(this.size, this.colors);
  }

  trySwap(a, b) {
    // returns { valid, effects, removedTiles, cascades } used by renderer to animate
    const result = this.board.trySwap(a, b);
    if (!result.valid) return result;
    const gained = this.scoreFor(result);
    this.score += gained;
    this.moves = Math.max(0, this.moves - 1);
    return { ...result, scoreGained: gained };
  }

  scoreFor(result) {
    // base scoring: 10 per tile, bonus per special and cascade depth
    let total = 0;
    for (const step of result.steps) {
      total += step.removed.length * 10;
      total += step.specialsActivated.length * 20;
    }
    total += (result.steps.length - 1) * 30; // cascade bonus
    return total;
  }
}
