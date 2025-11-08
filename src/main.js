import { Game } from './game/Game.js';
import { Renderer } from './ui/Renderer.js';
import { Controls } from './ui/Controls.js';
import { Sound } from './ui/Sound.js';
import * as api from './net/api.js';

const canvas = document.getElementById('gameCanvas');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const levelEl = document.getElementById('level');
const newGameBtn = document.getElementById('newGameBtn');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const scoresList = document.getElementById('scoresList');

const size = 8;       // 8x8 board
const colors = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4D96FF', '#B28DFF', '#FFA07A']; // soft, readable palette

const game = new Game(size, colors);
const renderer = new Renderer(canvas, game);
const controls = new Controls(canvas, game, renderer);
const sound = new Sound();

function updateHUD() {
  scoreEl.textContent = game.score.toString();
  movesEl.textContent = game.moves.toString();
  levelEl.textContent = game.level.toString();
}

function tick(ts) {
  renderer.update(ts);
  renderer.draw();
  requestAnimationFrame(tick);
}

controls.onSwap = async (swapResult) => {
  if (!swapResult.valid) {
    sound.blip(200);
    return;
  }
  sound.blip(420);
  await renderer.animateMatches(swapResult);
  updateHUD();

  if (game.moves <= 0) {
    renderer.flashMessage('Out of moves! New board...');
    sound.burst();
    setTimeout(() => {
      game.nextLevel(true);
      updateHUD();
    }, 800);
  }
};

newGameBtn.addEventListener('click', () => {
  game.reset();
  renderer.reset();
  updateHUD();
  sound.blip(300);
});

submitScoreBtn.addEventListener('click', async () => {
  const name = prompt('Enter your name for the leaderboard:', '');
  if (!name) return;
  try {
    await api.submitScore({ name, score: game.score, level: game.level });
    await refreshScores();
    sound.blip(600);
  } catch {
    alert('Score submit failed (server might be offline).');
  }
});

async function refreshScores() {
  scoresList.innerHTML = '';
  try {
    const scores = await api.fetchScores();
    scores.sort((a,b) => b.score - a.score);
    for (const s of scores.slice(0, 10)) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${s.name}</span><span>${s.score} (Lv ${s.level})</span>`;
      scoresList.appendChild(li);
    }
  } catch {
    const li = document.createElement('li');
    li.textContent = 'Leaderboard server not available.';
    scoresList.appendChild(li);
  }
}

updateHUD();
refreshScores();
requestAnimationFrame(tick);

