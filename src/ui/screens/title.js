// Menu principal : nom du jeu sur une scène animée (clairière de nuit, feu de camp, les
// six classes autour), menu façon JRPG (flèches + Entrée, ou souris) : Nouvelle partie,
// Charger et Options (à venir), Quitter, Debug (partie de test, voir game/debug.js).

import { state } from '../../state.js';
import { CLASS_ORDER } from '../../config.js';
import { setupDebugGame } from '../../game/debug.js';
import { goTo, showHub } from '../router.js';
import { sheet, drawFloorAuto } from '../mapThemes.js';
import { drawActor } from '../actors.js';
import { CLASS_SPRITES } from '../spriteCatalog.js';
import { esc } from '../html.js';

const MENU = [
  { id: 'new', label: 'Nouvelle partie' },
  { id: 'load', label: 'Charger', soon: 'Les sauvegardes arrivent bientôt.' },
  { id: 'options', label: 'Options', soon: 'Les options arrivent bientôt.' },
  { id: 'quit', label: 'Quitter' },
  { id: 'debug', label: 'Debug', hint: 'Niveau 50, or et matéria à volonté, tout débloqué, équipement à comparer' },
];

let cursor = 0;
let quitting = false;
let message = null;

export function renderTitle(app) {
  if (quitting) {
    app.innerHTML = `
      <div class="title-screen">
        <div class="title-panel quit-panel">
          <p>Merci d'avoir joué à <b>Anyem</b> !</p>
          <p class="hint">Le navigateur n'a pas laissé le jeu fermer son onglet : vous pouvez le fermer vous-même.</p>
          <button id="backTitle">Retour au menu</button>
        </div>
      </div>`;
    app.querySelector('#backTitle').onclick = () => { quitting = false; renderTitle(app); };
    return;
  }
  app.innerHTML = `
    <div class="title-screen">
      <div class="title-scene"><canvas id="titleScene" width="${W}" height="${H}"></canvas>
        <div class="title-logo">
          <h1>Anyem</h1>
          <p>Un RPG tour par tour</p>
        </div>
      </div>
      <nav class="title-panel" aria-label="Menu principal">
        ${MENU.map((m, i) => `
          <button class="title-item ${i === cursor ? 'current' : ''}" data-menu="${i}" ${m.soon ? 'aria-disabled="true"' : ''}>
            <span class="cursor" aria-hidden="true">▶</span>${esc(m.label)}${m.soon ? ' <small>bientôt</small>' : ''}
          </button>`).join('')}
        <p class="title-hint">${esc(message ?? MENU[cursor].hint ?? MENU[cursor].soon ?? 'Flèches ↑ ↓ puis Entrée, ou un clic.')}</p>
      </nav>
    </div>`;
  app.querySelectorAll('[data-menu]').forEach((btn) => {
    const i = Number(btn.dataset.menu);
    btn.onmouseenter = () => select(app, i);
    btn.onfocus = () => select(app, i);
    btn.onclick = () => choose(app, i);
  });
  startScene();
}

function select(app, i) {
  if (i === cursor) return;
  cursor = i;
  message = null;
  app.querySelectorAll('[data-menu]').forEach((b) => b.classList.toggle('current', Number(b.dataset.menu) === i));
  const hint = app.querySelector('.title-hint');
  if (hint) hint.textContent = MENU[i].hint ?? MENU[i].soon ?? 'Flèches ↑ ↓ puis Entrée, ou un clic.';
}

function choose(app, i) {
  const item = MENU[i];
  cursor = i;
  if (item.soon) {
    message = item.soon;
    renderTitle(app);
    return;
  }
  message = null;
  if (item.id === 'new') goTo('create');
  if (item.id === 'debug') {
    setupDebugGame(state);
    showHub('Partie Debug : héros niveau 50 (sorts de départ appris, points de talent à dépenser), 1 000 000 d\'or, 999 matéria de chaque sorte, sac de consommables plein, toutes les zones ouvertes. Dans le sac : chaque arme, armure, bouclier et bijou, dans chaque stat principale, en Divin, Épique, Rare et Peu commun, et tous les légendaires. Les deux autres classes attendent à l\'auberge.');
  }
  if (item.id === 'quit') {
    window.close();
    // Un onglet ouvert à la main ne se ferme pas toujours par script : on le dit.
    setTimeout(() => {
      if (state.screen !== 'title') return;
      quitting = true;
      renderTitle(app);
    }, 150);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (ev) => {
    if (state.screen !== 'title' || quitting) return;
    const app = document.getElementById('app');
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      select(app, (cursor + (ev.key === 'ArrowDown' ? 1 : MENU.length - 1)) % MENU.length);
      app.querySelector(`[data-menu="${cursor}"]`)?.focus();
    } else if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      if (!ev.repeat) choose(app, cursor);
    }
  });
}

// ---- Scène animée ----

const TILE = 16;
const W = 320;          // taille de la scène en pixels (affichée agrandie, nette)
const H = 176;
const COLS = W / TILE;
const ROWS = H / TILE;
const FIRE = { x: 10, y: 8 };                                 // case du feu de camp
const FIRE_FRAMES = [2, 3, 4].map((i) => ['forest_obj', 144 + i * 16, 57, 16, 20]);
const TREES = [['forest_obj', 0, 80, 48, 64], ['forest2_obj', 1, 150, 46, 55], ['forest2_obj', 49, 150, 46, 55], ['forest_obj', 48, 80, 48, 64]];
// Arbres autour de la clairière : [x (case du tronc), y, variante].
const TREE_SPOTS = [
  [1, 3, 0], [4, 2, 1], [7, 1, 2], [11, 1, 0], [15, 2, 1], [18, 3, 2], [0, 7, 1], [19, 7, 0],
  [1, 11, 2], [18, 11, 1], [3, 12, 0], [16, 12, 2], [5, 13, 1], [14, 13, 0], [-1, 5, 2], [20, 5, 1], [13, 1, 3], [9, 0, 1],
];
// Héros autour du feu : [classe, x, y, direction].
const CAMP = [
  [CLASS_ORDER[0], 8, 7, 'right'], [CLASS_ORDER[1], 12, 7, 'left'], [CLASS_ORDER[2], 8, 9, 'right'],
  [CLASS_ORDER[3], 12, 9, 'left'], [CLASS_ORDER[4], 10, 6, 'down'], [CLASS_ORDER[5], 10, 10, 'up'],
];
const flies = Array.from({ length: 14 }, (_, i) => ({ x: (i * 97) % W, y: 20 + ((i * 53) % (H - 40)), p: i * 1.7 }));

let running = false;
let ground = null;

function startScene() {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}

function frame(now) {
  const canvas = document.getElementById('titleScene');
  if (!canvas || state.screen !== 'title') {
    running = false;
    return;
  }
  drawScene(canvas.getContext('2d'), now);
  requestAnimationFrame(frame);
}

// Clairière : herbe, cercle de terre autour du feu (dessiné une fois).
function groundLayer() {
  if (ground) return ground;
  const grass = sheet('forest_A5');
  const dirt = sheet('forest_A2');
  if (!grass || !dirt) return null;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const clearing = (x, y) => ((x - FIRE.x) / 4.2) ** 2 + ((y - FIRE.y) / 3) ** 2 <= 1;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.drawImage(grass, (x + y) % 5 ? 0 : TILE, TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
      if (clearing(x, y)) drawFloorAuto(g, dirt, [8, 0], x, y, (dx, dy) => clearing(x + dx, y + dy));
    }
  }
  ground = c;
  return c;
}

function blit(ctx, [name, sx, sy, w, h], dx, dy) {
  const img = sheet(name);
  if (img) ctx.drawImage(img, sx, sy, w, h, Math.round(dx), Math.round(dy), w, h);
}

function drawScene(ctx, now) {
  ctx.imageSmoothingEnabled = false;
  const layer = groundLayer();
  if (!layer) {
    ctx.fillStyle = '#10140e';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ctx.drawImage(layer, 0, 0);
  const items = [];
  for (const [x, y, v] of TREE_SPOTS) {
    const t = TREES[v];
    items.push({ y, draw: () => blit(ctx, t, (x + 0.5) * TILE - t[3] / 2, (y + 1) * TILE - t[4]) });
  }
  const fire = FIRE_FRAMES[Math.floor(now / 140) % FIRE_FRAMES.length];
  items.push({ y: FIRE.y, draw: () => blit(ctx, fire, FIRE.x * TILE, (FIRE.y + 1) * TILE - fire[4]) });
  for (const [cls, x, y, dir] of CAMP) {
    items.push({ y, draw: () => drawActor(ctx, { sx: x * TILE, sy: y * TILE, size: TILE, scale: 1, dir, now, sprite: CLASS_SPRITES[cls] }) });
  }
  items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());

  // Nuit, puis lueur du feu qui vacille.
  ctx.fillStyle = 'rgba(8,10,34,.58)';
  ctx.fillRect(0, 0, W, H);
  const cx = (FIRE.x + 0.5) * TILE;
  const cy = (FIRE.y + 0.6) * TILE;
  const r = 70 + Math.sin(now / 90) * 3 + Math.sin(now / 37) * 2;
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
  glow.addColorStop(0, 'rgba(255,170,80,.55)');
  glow.addColorStop(0.5, 'rgba(255,120,40,.18)');
  glow.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // Lucioles.
  for (const f of flies) {
    const x = (f.x + Math.sin(now / 1900 + f.p) * 18 + W) % W;
    const y = f.y + Math.cos(now / 1400 + f.p) * 8;
    const a = 0.35 + 0.35 * Math.sin(now / 300 + f.p * 3);
    ctx.fillStyle = `rgba(220,255,140,${a})`;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalCompositeOperation = 'source-over';
}
