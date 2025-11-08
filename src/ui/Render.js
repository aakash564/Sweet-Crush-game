export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.t = 0;
    this.messages = [];
    this.animQueue = [];
    this.cell = this.canvas.width / this.game.size;
  }

  reset() {
    this.animQueue = [];
    this.messages = [];
  }

  update(ts) {
    this.t = ts || performance.now();
  }

  flashMessage(text) {
    this.messages.push({ text, time: performance.now() });
  }

  async animateMatches(result) {
    for (const step of result.steps) {
      await this.animateRemoval(step.removed);
      this.draw(); // immediate update
      await this.animateFalls(step.falls);
      await this.animateSpawns(step.spawns);
    }
  }

  async animateRemoval(tiles) {
    const duration = 200;
    const start = performance.now();
    return new Promise(res => {
      const tick = () => {
        const now = performance.now();
        const p = Math.min(1, (now - start) / duration);
        this.draw(p, tiles);
        if (p < 1) requestAnimationFrame(tick);
        else res();
      };
      tick();
    });
  }

  async animateFalls(falls) {
    const duration = 220;
    const start = performance.now();
    return new Promise(res => {
      const tick = () => {
        const now = performance.now();
        const p = Math.min(1, (now - start) / duration);
        this.drawFall(p, falls);
        if (p < 1) requestAnimationFrame(tick);
        else res();
      };
      tick();
    });
  }

  async animateSpawns(spawns) {
    const duration = 180;
    const start = performance.now();
    return new Promise(res => {
      const tick = () => {
        const now = performance.now();
        const p = Math.min(1, (now - start) / duration);
        this.drawSpawn(p, spawns);
        if (p < 1) requestAnimationFrame(tick);
        else res();
      };
      tick();
    });
  }

  draw(removalProgress = 0, removingTiles = []) {
    const ctx = this.ctx;
    const { size, board } = this.game;
    const cell = this.cell = this.canvas.width / size;
    ctx.clearRect(0,0,this.canvas.width, this.canvas.height);

    // grid
    ctx.fillStyle = '#e8dbc5';
    for (let y=0;y<size;y++) {
      for (let x=0;x<size;x++) {
        ctx.fillRect(x*cell+2, y*cell+2, cell-4, cell-4);
      }
    }

    const removingIds = new Set(removingTiles.map(t => t.id));

    // tiles
    for (let y=0;y<size;y++) {
      for (let x=0;x<size;x++) {
        const t = board.get(x,y);
        if (!t) continue;
        const cx = x*cell + cell/2;
        const cy = y*cell + cell/2;

        let scale = 1;
        if (removingIds.has(t.id)) {
          scale = 1 - removalProgress;
        }

        this.drawCandy(cx, cy, cell*0.36*scale, t.color, t.special);
      }
    }

    // messages
    this.messages = this.messages.filter(m => performance.now() - m.time < 1200);
    for (const m of this.messages) {
      ctx.globalAlpha = 1 - Math.min(1,(performance.now()-m.time)/1200);
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.font = '16px system-ui';
      ctx.fillText(m.text, this.canvas.width/2, 20);
      ctx.globalAlpha = 1;
    }
  }

  drawFall(progress, falls) {
    const ctx = this.ctx;
    const { size, board } = this.game;
    const cell = this.cell;
    ctx.clearRect(0,0,this.canvas.width, this.canvas.height);

    // grid
    ctx.fillStyle = '#e8dbc5';
    for (let y=0;y<size;y++) for (let x=0;x<size;x++) ctx.fillRect(x*cell+2, y*cell+2, cell-4, cell-4);

    const movingIds = new Map();
    for (const f of falls) movingIds.set(f.tile.id, f);

    for (let y=0;y<size;y++) {
      for (let x=0;x<size;x++) {
        const t = board.get(x,y);
        if (!t) continue;
        const move = movingIds.get(t.id);
        let cx = x*cell + cell/2;
        let cy = y*cell + cell/2;
        if (move) {
          const fromCy = move.from.y*cell + cell/2;
          const toCy = move.to.y*cell + cell/2;
          cy = fromCy + (toCy - fromCy)*progress;
        }
        this.drawCandy(cx, cy, cell*0.36, t.color, t.special);
      }
    }
  }

  drawSpawn(progress, spawns) {
    const ctx = this.ctx;
    const { size, board } = this.game;
    const cell = this.cell;
    ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#e8dbc5';
    for (let y=0;y<size;y++) for (let x=0;x<size;x++) ctx.fillRect(x*cell+2, y*cell+2, cell-4, cell-4);

    const spawnIds = new Set(spawns.map(s => s.tile.id));

    for (let y=0;y<size;y++) {
      for (let x=0;x<size;x++) {
        const t = board.get(x,y);
        if (!t) continue;
        const cx = x*cell + cell/2;
        const cy = y*cell + cell/2;
        const scale = spawnIds.has(t.id) ? Math.min(1, progress) : 1;
        this.drawCandy(cx, cy, cell*0.36*scale, t.color, t.special);
      }
    }
  }

  drawCandy(cx, cy, r, color, special) {
    const ctx = this.ctx;

    // base candy shape (rounded pill)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    const grad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.2, cx, cy, r);
    grad.addColorStop(0, lighten(color, 0.25));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();

    // highlight
    ctx.beginPath();
    ctx.arc(cx - r*0.3, cy - r*0.35, r*0.35, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();

    // special marker
    if (special) {
      ctx.shadowBlur = 0;
      ctx.lineWidth = 3;
      if (special === 'striped-h') {
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx - r*0.8, cy);
        ctx.lineTo(cx + r*0.8, cy);
        ctx.stroke();
      } else if (special === 'striped-v') {
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - r*0.8);
        ctx.lineTo(cx, cy + r*0.8);
        ctx.stroke();
      } else if (special === 'wrapped') {
        ctx.strokeStyle = '#202020';
        ctx.strokeRect(cx - r*0.6, cy - r*0.6, r*1.2, r*1.2);
      } else if (special === 'bomb') {
        ctx.fillStyle = '#202020';
        ctx.beginPath();
        ctx.arc(cx, cy, r*0.35, 0, Math.PI*2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

function lighten(hex, amt) {
  const c = hex.replace('#',''); 
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  const lr = Math.min(255, Math.round(r + (255-r)*amt));
  const lg = Math.min(255, Math.round(g + (255-g)*amt));
  const lb = Math.min(255, Math.round(b + (255-b)*amt));
  return '#' + lr.toString(16).padStart(2,'0') + lg.toString(16).padStart(2,'0') + lb.toString(16).padStart(2,'0');
}
