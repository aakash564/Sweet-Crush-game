export class Tile {
  constructor(x,y,color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.special = null; // 'striped-h' | 'striped-v' | 'wrapped' | 'bomb' | null
    this.id = `${x}:${y}:${Math.random().toString(36).slice(2,7)}`;
  }
}

