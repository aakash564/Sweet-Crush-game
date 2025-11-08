export class Sound {
  constructor() {
    this.ctx = null;
  }
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  }
  blip(freq = 440, dur = 0.08) {
    const ctx = this.ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start();
    o.stop(t + dur + 0.01);
  }
  burst() {
    this.blip(300, 0.12);
    setTimeout(()=>this.blip(500, 0.12), 60);
    setTimeout(()=>this.blip(650, 0.12), 120);
  }
}

