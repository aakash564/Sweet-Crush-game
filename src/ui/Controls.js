export class Controls {
  constructor(canvas, game, renderer) {
    this.canvas = canvas;
    this.game = game;
    this.renderer = renderer;
    this.dragStart = null;
    this.onSwap = null;

    this.bind();
  }

  bind() {
    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const tile = this.game.board.tileAtPixel(x, y, this.canvas.width);
      if (tile) this.dragStart = { x: tile.x, y: tile.y };
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.dragStart) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const tile = this.game.board.tileAtPixel(x, y, this.canvas.width);
      if (!tile) return;
      const dx = Math.abs(tile.x - this.dragStart.x);
      const dy = Math.abs(tile.y - this.dragStart.y);
      if (dx + dy === 1) {
        // perform swap attempt
        const a = { x: this.dragStart.x, y: this.dragStart.y };
        const b = { x: tile.x, y: tile.y };
        const result = this.game.trySwap(a, b);
        if (!result.valid) {
          // revert immediately in renderer draw
          this.dragStart = null;
          if (this.onSwap) this.onSwap(result);
        } else {
          this.dragStart = null;
          if (this.onSwap) this.onSwap(result);
        }
      }
    });

    this.canvas.addEventListener('pointerup', () => {
      this.dragStart = null;
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.dragStart = null;
    });
  }
}
