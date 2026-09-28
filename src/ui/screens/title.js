// Menu principal, plein écran : nom du jeu orné sur une scène animée (clairière de nuit, feu
// de camp avec étincelles, les six classes autour, lucioles), menu façon JRPG (flèches + Entrée, ou souris) : Nouvelle partie,
// Charger (emplacements de sauvegarde, ui/screens/slots.js), Options, Quitter, Debug (partie de
// test, voir game/debug.js).

import { state, resetGame } from '../../state.js';
import { openSlots } from './slots.js';
import { openOptions } from '../pause.js';
import { isPaused } from '../pauseClock.js';
import { CLASS_ORDER, PARTY_ORDER } from '../../config.js';
import { CLASSES } from '../../data/classes.js';
import { setupDebugGame } from '../../game/debug.js';
import { goTo, showHub } from '../router.js';
import { sheet, drawFloorAuto } from '../mapThemes.js';
import { drawActor } from '../actors.js';
import { CLASS_LOOKS } from '../../data/appearance.js';
import { lookSprite } from '../heroSprite.js';
import { esc } from '../html.js';
import { VERSION } from '../../version.js';

const MENU = [
  { id: 'new', label: 'Nouvelle partie', hint: 'Choisir un emplacement de sauvegarde, puis créer son équipe.' },
  { id: 'load', label: 'Charger', hint: 'Reprendre une aventure sauvegardée (4 emplacements).' },
  { id: 'options', label: 'Options', hint: 'Vitesse des tours ennemis…' },
  { id: 'quit', label: 'Quitter' },
  { id: 'debug', label: 'Debug', hint: 'Niveau 50, or et matéria à volonté, tout débloqué, équipement à comparer ; classes au choix' },
];

let cursor = 0;
let quitting = false;
let debugPick = null; // classes choisies pour la partie Debug (panneau ouvert), ou null
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
  if (debugPick) {
    // Partie Debug : choix rapide des 4 classes (outil de test, sans fioritures).
    app.innerHTML = `
      <div class="title-screen">
        <div class="title-panel quit-panel debug-pick">
          <p><b>Partie Debug</b> : classes de l'équipe</p>
          ${debugPick.map((key, i) => `<label>Héros ${i + 1} <select data-debug-class="${i}">${CLASS_ORDER.map((k) => `<option value="${k}" ${k === key ? 'selected' : ''}>${esc(CLASSES[k].title)}</option>`).join('')}</select></label>`).join('')}
          <button id="debugStart" class="btn-primary">Lancer</button>
          <button id="debugBack">◂ Retour</button>
        </div>
      </div>`;
    app.querySelectorAll('[data-debug-class]').forEach((sel) => {
      sel.onchange = () => { debugPick[Number(sel.dataset.debugClass)] = sel.value; };
    });
    app.querySelector('#debugBack').onclick = () => { debugPick = null; renderTitle(app); };
    app.querySelector('#debugStart').onclick = () => {
      const classes = debugPick;
      debugPick = null;
      resetGame();
      setupDebugGame(state, [], classes);
      showHub('Partie Debug : héros niveau 50 (sorts de départ appris, points de talent à dépenser), 1 000 000 d\'or, 999 matéria de chaque sorte, sac de consommables plein, toutes les zones ouvertes. Dans le sac : chaque arme, armure, bouclier et bijou, dans chaque stat principale, en Divin, Épique, Rare et Peu commun, et tous les légendaires. Les autres classes attendent à l\'auberge.');
    };
    return;
  }
  app.innerHTML = `
    <div class="title-screen">
      <div class="title-scene"><canvas id="titleScene" width="${W}" height="${H}"></canvas></div>
      <div class="title-vignette" aria-hidden="true"></div>
      <span class="title-version" title="Version du jeu (voir CHANGELOG.md)">v${VERSION}${VERSION.startsWith('0.') ? ' bêta' : ''}</span>
      <div class="title-logo">
        <span class="title-orn top" aria-hidden="true"><i></i><b></b><i></i></span>
        <h1>Anyem</h1>
        <span class="title-orn" aria-hidden="true"><i></i><b></b><i></i></span>
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
  if (item.id === 'new') openSlots('new');
  if (item.id === 'load') openSlots('load');
  if (item.id === 'options') openOptions();
  if (item.id === 'debug') {
    debugPick = [...PARTY_ORDER];
    renderTitle(app);
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
    if (state.screen !== 'title' || quitting || debugPick || isPaused()) return;
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
// Clairière de nuit en plein écran (480 × 272 pixels de sprites, agrandie sans lissage et
// recadrée pour couvrir la fenêtre) : forêt dense, feu de camp avec étincelles et fumée, les six
// classes autour, tente, rondins, tas de bois, lucioles.

const TILE = 16;
const W = 480;
const H = 272;
const COLS = W / TILE;
const ROWS = Math.ceil(H / TILE);
const FIRE = { x: 12, y: 10 };                                // case du feu de camp
const FIRE_FRAMES = [2, 3, 4].map((i) => ['forest_obj', 144 + i * 16, 57, 16, 20]);
const TREES = [['forest_obj', 0, 80, 48, 64], ['forest2_obj', 1, 150, 46, 55], ['forest2_obj', 49, 150, 46, 55], ['forest_obj', 48, 80, 48, 64]];
const F = (x, y, w, h) => ['forest_obj', x, y, w, h];
// Décor posé : [image, x (case), bas (case)].
const DECOR = [
  [F(96, 96, 48, 64), 15, 8],        // tente
  [F(128, 32, 32, 16), 8, 12],       // rondin creux (banc)
  [F(144, 64, 32, 16), 16, 10],      // tas de bois
  [F(144, 144, 16, 16), 18, 8],      // sac
  [F(16, 16, 16, 16), 18, 9],        // coffre
  [F(112, 64, 16, 32), 7, 8],        // souche
  [F(96, 0, 32, 32), 19, 12],        // rocher
  [F(96, 32, 32, 32), 2, 8],         // rocher moussu
  [F(64, 16, 16, 16), 16, 13],       // cailloux
  [F(80, 160, 16, 32), 5, 12],       // massettes
  [F(80, 160, 16, 32), 7, 14],
  [F(96, 160, 16, 16), 9, 14],       // baies
  [F(192, 16, 16, 16), 14, 13],      // fleurs
  [F(192, 16, 16, 16), 6, 9],
  [F(208, 0, 16, 32), 10, 7],        // tournesol
];
// Héros autour du feu : [classe, x, y, direction].
const CAMP = [
  [CLASS_ORDER[0], 10, 9, 'right'], [CLASS_ORDER[1], 14, 9, 'left'], [CLASS_ORDER[2], 10, 11, 'right'],
  [CLASS_ORDER[3], 14, 11, 'left'], [CLASS_ORDER[4], 12, 8, 'down'], [CLASS_ORDER[5], 12, 12, 'up'],
];
const inClearing = (x, y) => ((x - FIRE.x) / 6.2) ** 2 + ((y - FIRE.y) / 3.8) ** 2 <= 1;
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// Arbres : une forêt dense tout autour de la clairière (placement fixe, pseudo-aléatoire).
const TREE_SPOTS = [];
for (let y = -1; y <= ROWS + 2; y += 2) {
  for (let x = -1; x <= COLS + 1; x += 3) {
    const tx = x + Math.floor(hash(x, y) * 3) - (y % 4 ? 1 : 0);
    const ty = y + Math.floor(hash(y, x) * 2);
    const d = ((tx - FIRE.x) / 7.8) ** 2 + ((ty - FIRE.y) / 5.4) ** 2;
    if (d > 1 && !(tx >= 13 && tx <= 19 && ty >= 4 && ty <= 13)) TREE_SPOTS.push([tx, ty, Math.floor(hash(tx + 7, ty) * TREES.length)]);
  }
}
const flies = Array.from({ length: 42 }, (_, i) => ({ x: hash(i, 3) * W, y: hash(3, i) * H, p: i * 1.7, s: 0.6 + hash(i, 9) * 0.8 }));
const sparks = [];
let lastSpark = 0;

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

// Sol : herbe et clairière de terre autour du feu (dessinés une fois).
function groundLayer() {
  if (ground) return ground;
  const grass = sheet('forest_A5');
  const dirt = sheet('forest_A2');
  if (!grass || !dirt) return null;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.drawImage(grass, hash(x, y) < 0.8 ? 0 : TILE, TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
      if (inClearing(x, y)) drawFloorAuto(g, dirt, [8, 0], x, y, (dx, dy) => inClearing(x + dx, y + dy));
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
  for (const [img, x, bottom] of DECOR) {
    const cols = Math.ceil(img[3] / TILE);
    items.push({ y: bottom, draw: () => blit(ctx, img, x * TILE + (cols * TILE - img[3]) / 2, (bottom + 1) * TILE - img[4]) });
  }
  const fire = FIRE_FRAMES[Math.floor(now / 140) % FIRE_FRAMES.length];
  items.push({ y: FIRE.y, draw: () => blit(ctx, fire, FIRE.x * TILE, (FIRE.y + 1) * TILE - fire[4]) });
  for (const [cls, x, y, dir] of CAMP) {
    items.push({ y: y + 0.1, draw: () => drawActor(ctx, { sx: x * TILE, sy: y * TILE, size: TILE, scale: 1, dir, now, sprite: lookSprite(CLASS_LOOKS[cls]) }) });
  }
  items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());

  // Nuit bleutée, plus sombre sur les bords.
  ctx.fillStyle = 'rgba(8,10,34,.6)';
  ctx.fillRect(0, 0, W, H);
  const cx = (FIRE.x + 0.5) * TILE;
  const cy = (FIRE.y + 0.6) * TILE;
  // Lueur du feu qui vacille.
  const r = 105 + Math.sin(now / 90) * 4 + Math.sin(now / 37) * 3;
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
  glow.addColorStop(0, 'rgba(255,170,80,.6)');
  glow.addColorStop(0.45, 'rgba(255,120,40,.2)');
  glow.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // Étincelles qui montent du feu.
  if (now - lastSpark > 90 && sparks.length < 36) {
    lastSpark = now;
    sparks.push({ x: cx + (Math.random() - 0.5) * 8, y: cy - 10, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 14, t0: now, life: 1200 + Math.random() * 1300 });
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    const t = (now - s.t0) / 1000;
    if (t * 1000 > s.life) { sparks.splice(i, 1); continue; }
    const k = 1 - (t * 1000) / s.life;
    ctx.fillStyle = `rgba(255,${Math.round(140 + 90 * k)},60,${0.9 * k})`;
    ctx.fillRect(Math.round(s.x + s.vx * t + Math.sin(t * 5 + i) * 2), Math.round(s.y + s.vy * t), 1, 1);
  }
  // Lucioles, avec leur halo.
  for (const f of flies) {
    const x = (f.x + Math.sin(now / 1900 * f.s + f.p) * 22 + W) % W;
    const y = (f.y + Math.cos(now / 1400 * f.s + f.p) * 10 + H) % H;
    const a = 0.25 + 0.35 * Math.sin(now / 320 + f.p * 3);
    if (a <= 0.05) continue;
    ctx.fillStyle = `rgba(160,255,90,${a * 0.25})`;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    ctx.fillStyle = `rgba(230,255,150,${a})`;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalCompositeOperation = 'source-over';
  // Fumée légère au-dessus du feu.
  for (let i = 0; i < 4; i++) {
    const t = ((now / 2600) + i / 4) % 1;
    ctx.fillStyle = `rgba(150,150,170,${0.12 * (1 - t)})`;
    const sx = cx + Math.sin(t * 6 + i) * 4 + t * 10;
    const sy = cy - 14 - t * 46;
    const rr = 2 + t * 5;
    ctx.beginPath();
    ctx.arc(sx, sy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
}
