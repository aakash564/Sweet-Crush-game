import { Tile } from './Tile.js';

export class Board {
  constructor(size, colors) {
    this.size = size;
    this.colors = colors;
    this.grid = this.makeInitialGrid();
  }

  index(x, y) { return y * this.size + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
  get(x, y) { return this.grid[this.index(x,y)]; }
  set(x, y, v) { this.grid[this.index(x,y)] = v; }

  randomColor() { return this.colors[Math.floor(Math.random()*this.colors.length)]; }

  makeInitialGrid() {
    const g = new Array(this.size * this.size);
    for (let y=0;y<this.size;y++) {
      for (let x=0;x<this.size;x++) {
        let t;
        do {
          t = new Tile(x,y,this.randomColor());
          g[this.index(x,y)] = t;
        } while (this.causesImmediateMatch(g, x, y));
      }
    }
    return g;
  }

  causesImmediateMatch(g, x, y) {
    const size = this.size;
    const idx = y*size+x;
    const t = g[idx];
    // check left two
    if (x>=2) {
      const a = g[y*size + (x-1)];
      const b = g[y*size + (x-2)];
      if (a && b && a.color === t.color && b.color === t.color) return true;
    }
    // check up two
    if (y>=2) {
      const a = g[(y-1)*size + x];
      const b = g[(y-2)*size + x];
      if (a && b && a.color === t.color && b.color === t.color) return true;
    }
    return false;
  }

  neighbors4(x,y) {
    return [
      [x+1,y],[x-1,y],[x,y+1],[x,y-1]
    ].filter(([nx,ny]) => this.inBounds(nx,ny));
  }

  canSwap(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (dx + dy !== 1) return false;
    // simulate
    this.swap(a, b);
    const matches = this.findAllMatches();
    this.swap(a, b); // revert
    return matches.length > 0;
  }

  swap(a, b) {
    const A = this.get(a.x, a.y);
    const B = this.get(b.x, b.y);
    this.set(a.x, a.y, B);
    this.set(b.x, b.y, A);
    // update coords
    A.x = b.x; A.y = b.y;
    B.x = a.x; B.y = a.y;
  }

  trySwap(a, b) {
    if (!this.canSwap(a, b)) return { valid: false };
    const steps = [];
    let specialsActivated = [];

    this.swap(a,b);

    while (true) {
      const matches = this.findAllMatches();
      if (matches.length === 0) break;

      // create specials from long matches (before removal)
      const specialCreations = this.createSpecials(matches);

      // remove matched tiles
      const removed = new Set();
      for (const group of matches) {
        for (const t of group.tiles) {
          removed.add(this.get(t.x, t.y));
        }
      }

      // activate specials within removed set (striped, wrapped, bomb)
      const extraRemovals = this.activateSpecials(Array.from(removed));
      specialsActivated = specialsActivated.concat(extraRemovals.activated);

      for (const t of extraRemovals.removed) removed.add(t);

      // clear removed tiles to null
      for (const t of removed) {
        this.set(t.x, t.y, null);
      }

      // gravity
      const falls = this.applyGravity();

      // refill
      const spawns = this.refill();

      steps.push({
        removed: Array.from(removed), 
        falls, spawns,
        specialsActivated,
        specialCreations
      });
    }

    return { valid: true, steps };
  }

  findAllMatches() {
    const size = this.size;
    const matches = [];
    const visited = new Set();

    // horizontal
    for (let y=0;y<size;y++) {
      let x=0;
      while (x<size) {
        const start = x;
        const t = this.get(x,y);
        if (!t) { x++; continue; }
        while (x+1<size && this.get(x+1,y)?.color === t.color) x++;
        const len = x-start+1;
        if (len>=3) {
          const tiles = [];
          for (let xi=start; xi<=x; xi++) tiles.push(this.get(xi,y));
          matches.push({ tiles, orientation:'h', len });
          tiles.forEach(ti => visited.add(ti));
        }
        x++;
      }
    }

    // vertical
    for (let x=0;x<size;x++) {
      let y=0;
      while (y<size) {
        const start = y;
        const t = this.get(x,y);
        if (!t) { y++; continue; }
        while (y+1<size && this.get(x,y+1)?.color === t.color) y++;
        const len = y-start+1;
        if (len>=3) {
          const tiles = [];
          for (let yi=start; yi<=y; yi++) tiles.push(this.get(x,yi));
          matches.push({ tiles, orientation:'v', len });
          tiles.forEach(ti => visited.add(ti));
        }
        y++;
      }
    }

    // merge overlaps to detect T/L for wrapped
    return matches;
  }

  createSpecials(matches) {
    const specials = [];
    for (const group of matches) {
      const { tiles, len, orientation } = group;
      if (len === 4) {
        // striped candy: place at the last tile
        const t = tiles[tiles.length-1];
        t.special = orientation === 'h' ? 'striped-h' : 'striped-v';
        specials.push({ type: t.special, at: { x: t.x, y: t.y }});
      } else if (len >= 5) {
        // color bomb: place at center
        const mid = tiles[Math.floor(tiles.length/2)];
        mid.special = 'bomb';
        specials.push({ type: 'bomb', at: { x: mid.x, y: mid.y }});
      }
    }

    // detect T/L shapes for wrapped
    // simple heuristic: tiles appearing in both orientations (overlap)
    const counts = new Map();
    for (const group of matches) {
      for (const t of group.tiles) {
        const key = `${t.x},${t.y}`;
        counts.set(key, (counts.get(key)||0)+1);
      }
    }
    for (const [key, c] of counts.entries()) {
      if (c >= 2) {
        const [xStr, yStr] = key.split(',');
        const x = +xStr, y = +yStr;
        const t = this.get(x,y);
        if (t) {
          t.special = 'wrapped';
          specials.push({ type: 'wrapped', at: { x, y }});
        }
      }
    }
    return specials;
  }

  activateSpecials(removedArray) {
    const removed = new Set(removedArray);
    const activated = [];

    const queue = [...removedArray];
    while (queue.length) {
      const t = queue.pop();
      if (!t?.special) continue;

      activated.push({ type: t.special, at: { x: t.x, y: t.y }});

      if (t.special === 'striped-h') {
        for (let x=0;x<this.size;x++) {
          const tt = this.get(x, t.y);
          if (tt && !removed.has(tt)) { removed.add(tt); queue.push(tt); }
        }
      } else if (t.special === 'striped-v') {
        for (let y=0;y<this.size;y++) {
          const tt = this.get(t.x, y);
          if (tt && !removed.has(tt)) { removed.add(tt); queue.push(tt); }
        }
      } else if (t.special === 'wrapped') {
        for (let yy=t.y-1; yy<=t.y+1; yy++) {
          for (let xx=t.x-1; xx<=t.x+1; xx++) {
            if (!this.inBounds(xx,yy)) continue;
            const tt = this.get(xx,yy);
            if (tt && !removed.has(tt)) { removed.add(tt); queue.push(tt); }
          }
        }
      } else if (t.special === 'bomb') {
        // bomb removes all tiles of a random color among neighbors
        const color = t.color;
        for (let yy=0; yy<this.size; yy++) {
          for (let xx=0; xx<this.size; xx++) {
            const tt = this.get(xx,yy);
            if (tt && tt.color === color && !removed.has(tt)) {
              removed.add(tt);
              queue.push(tt);
            }
          }
        }
      }
    }

    return { removed: Array.from(removed), activated };
  }

  applyGravity() {
    const falls = [];
    for (let x=0; x<this.size; x++) {
      let writeY = this.size - 1;
      for (let y=this.size-1; y>=0; y--) {
        const t = this.get(x,y);
        if (t) {
          if (y !== writeY) {
            this.set(x, writeY, t);
            t.y = writeY;
            this.set(x, y, null);
            falls.push({ from: {x,y}, to: {x, y: writeY}, tile: t });
          }
          writeY--;
        }
      }
    }
    return falls;
  }

  refill() {
    const spawns = [];
    for (let x=0;x<this.size;x++) {
      for (let y=0;y<this.size;y++) {
        if (!this.get(x,y)) {
          const t = new Tile(x,y,this.randomColor());
          this.set(x,y,t);
          spawns.push({ at: {x,y}, tile: t });
        }
      }
    }
    return spawns;
  }

  tileAtPixel(px, py, canvasSize) {
    const cell = canvasSize / this.size;
    const x = Math.floor(px / cell);
    const y = Math.floor(py / cell);
    if (!this.inBounds(x,y)) return null;
    return this.get(x,y);
  }
}
