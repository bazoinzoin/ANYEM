// Village à parcourir (écran du village) : le groupe se promène, chaque service est un
// habitant ; lui parler (Espace / Entrée / E face à lui, ou clic dessus) ouvre son écran.
// Carte : data/village.js ; règles de marche : game/village.js. Graphismes : pack Fan-tasy.

import { state } from '../state.js';
import { VILLAGE, VILLAGE_SERVICES } from '../data/village.js';
import { villageGrid, villageStep, talkTarget, spotsNextTo, npcAt, canWalk } from '../game/village.js';
import { stepToward } from '../game/floorMap.js';
import { blobTile } from './autotile.js';
import { image, isReady } from './sprites.js';
import { drawActor, PLAYER } from './actors.js';

const TILE = 16;
const SCALE = 3;
const VIEW_W = 21;
const VIEW_H = 13;
const STEP_MS = 150;
const WALK_MS = 150;
const GROUND = 'fantasy/Tileset_Ground';
const GROUND_COL = 6; // herbe sur terre battue
const GRASS_VARIANTS = [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [5, 9]];
const TREES = ['fantasy/Tree_Emerald_1', 'fantasy/Tree_Emerald_2', 'fantasy/Tree_Emerald_3', 'fantasy/Tree_Emerald_4'];

// Position du groupe au village (conservée entre deux menus) : state.village = { x, y, dir }.
function pos() {
  state.village ??= { ...VILLAGE.spawn, dir: 'down' };
  return state.village;
}

// Remet le groupe à l'entrée du village (retour d'expédition).
export function arriveAtVillage() {
  state.village = { ...VILLAGE.spawn, dir: 'up' };
}

let onTalk = () => {};
let walk = null;
let frameRequested = false;
const anim = { from: null, to: null, t0: 0 };
let groundLayer = null;

export function villageCard() {
  return `
    <div class="card map-card village-card">
      <canvas id="villageMap" width="${VIEW_W * TILE * SCALE}" height="${VIEW_H * TILE * SCALE}"></canvas>
      <div class="map-controls">
        <div class="dpad">
          <button data-vstep="0,-1" aria-label="Haut">▲</button>
          <button data-vstep="-1,0" aria-label="Gauche">◀</button>
          <button data-vstep="1,0" aria-label="Droite">▶</button>
          <button data-vstep="0,1" aria-label="Bas">▼</button>
        </div>
        <div class="map-help">
          <p class="hint">Promenez-vous (flèches, ZQSD, clic ou croix) et parlez aux habitants : <b>Espace</b> face à eux, ou un clic sur eux. Chacun tient un service du village ; le garde de la porte (en bas) ouvre les portails vers les zones.</p>
          <button id="talkBtn" class="btn-primary">💬 Parler</button>
        </div>
      </div>
    </div>`;
}

// `talk(service)` : ouvre l'écran du service d'un habitant.
export function bindVillage(app, talk) {
  onTalk = talk;
  const canvas = app.querySelector('#villageMap');
  if (!canvas) return;
  const p = pos();
  anim.from = { x: p.x, y: p.y };
  anim.to = { x: p.x, y: p.y };
  requestFrame();
  app.querySelectorAll('[data-vstep]').forEach((btn) => {
    btn.onclick = () => {
      stopWalk();
      const [dx, dy] = btn.dataset.vstep.split(',').map(Number);
      step(dx, dy);
    };
  });
  app.querySelector('#talkBtn').onclick = () => talk_();
  canvas.onclick = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const cam = camera(canvas);
    const x = Math.floor((((ev.clientX - rect.left) / rect.width) * canvas.width + cam.x) / (TILE * SCALE));
    const y = Math.floor((((ev.clientY - rect.top) / rect.height) * canvas.height + cam.y) / (TILE * SCALE));
    const npc = npcAt(x, y) ?? npcAt(x, y + 1); // clic sur la tête d'un habitant
    if (npc) walkTo(npc);
    else walkTo({ x, y });
  };
}

// ---- Déplacement ----

const DIRS = { '1,0': 'right', '-1,0': 'left', '0,1': 'down', '0,-1': 'up' };
const FACING = { right: { dx: 1, dy: 0 }, left: { dx: -1, dy: 0 }, down: { dx: 0, dy: 1 }, up: { dx: 0, dy: -1 } };

function step(dx, dy) {
  if (state.screen !== 'hub') return false;
  const p = pos();
  p.dir = DIRS[`${dx},${dy}`] ?? p.dir;
  if (dx) p.facing = dx > 0 ? 'right' : 'left';
  const r = villageStep(p, dx, dy);
  if (!r.moved) {
    requestFrame();
    return false;
  }
  anim.from = currentPos(performance.now());
  anim.to = { ...r.pos };
  anim.t0 = performance.now();
  p.x = r.pos.x;
  p.y = r.pos.y;
  requestFrame();
  if (r.exit) {
    stopWalk();
    setTimeout(() => onTalk('portals'), STEP_MS);
    return false;
  }
  return true;
}

function talk_() {
  const p = pos();
  const npc = talkTarget(p, FACING[p.dir]);
  if (npc) {
    stopWalk();
    face(npc);
    onTalk(npc.service);
  }
}

function face(npc) {
  const p = pos();
  const key = `${Math.sign(npc.x - p.x)},${Math.sign(npc.y - p.y)}`;
  if (DIRS[key]) p.dir = DIRS[key];
}

function stopWalk() {
  if (walk) clearTimeout(walk.timer);
  walk = null;
}

// Marche vers une case, ou vers un habitant (puis lui parle).
function walkTo(target) {
  stopWalk();
  const grid = villageGrid();
  const map = { w: grid.w, h: grid.h, tiles: grid.tiles.map((t, i) => (t && !npcAt(i % grid.w, Math.floor(i / grid.w)) ? 1 : 0)) };
  const npc = target.service ? target : null;
  const goals = npc ? spotsNextTo(npc) : canWalk(target.x, target.y) ? [target] : [];
  if (!goals.length) return;
  walk = { timer: null };
  const tick = () => {
    if (!walk) return;
    const p = pos();
    if (goals.some((g) => g.x === p.x && g.y === p.y)) {
      stopWalk();
      if (npc) {
        face(npc);
        requestFrame();
        onTalk(npc.service);
      }
      return;
    }
    // Case d'arrivée la plus proche.
    let next = null;
    for (const g of goals) {
      const n = stepToward(map, p, g);
      if (n) { next = n; break; }
    }
    if (!next || !step(next.x - p.x, next.y - p.y)) return stopWalk();
    walk.timer = setTimeout(tick, WALK_MS);
  };
  tick();
}

const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  z: [0, -1], s: [0, 1], q: [-1, 0], d: [1, 0], w: [0, -1], a: [-1, 0],
};
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (ev) => {
    if (state.screen !== 'hub' || !document.querySelector('#villageMap') || ev.target.closest?.('input, textarea, select')) return;
    if ([' ', 'Enter', 'e', 'E'].includes(ev.key)) {
      ev.preventDefault();
      talk_();
      return;
    }
    const dir = KEYS[ev.key] ?? KEYS[ev.key.toLowerCase()];
    if (!dir) return;
    ev.preventDefault();
    stopWalk();
    step(...dir);
  });
}

// ---- Affichage ----

function currentPos(now) {
  const k = Math.min(1, (now - anim.t0) / STEP_MS);
  return { x: anim.from.x + (anim.to.x - anim.from.x) * k, y: anim.from.y + (anim.to.y - anim.from.y) * k, moving: k < 1 };
}

function requestFrame() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(frame);
}

function frame(now) {
  frameRequested = false;
  const canvas = document.querySelector('#villageMap');
  if (!canvas || state.screen !== 'hub') return;
  draw(canvas, now);
  requestFrame();
}

function camera(canvas, now = performance.now()) {
  const p = currentPos(now);
  const size = TILE * SCALE;
  const clamp = (v, max) => Math.max(0, Math.min(v, max));
  return {
    x: Math.round(clamp((p.x + 0.5) * size - canvas.width / 2, VILLAGE.w * size - canvas.width)),
    y: Math.round(clamp((p.y + 0.5) * size - canvas.height / 2, VILLAGE.h * size - canvas.height)),
  };
}

function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Sol : herbe, chemins de terre battue (bords « blob »). Dessiné une fois.
function ground() {
  if (groundLayer) return groundLayer;
  const img = image(GROUND);
  if (!isReady(img)) return null;
  const grid = villageGrid();
  const canvas = document.createElement('canvas');
  canvas.width = VILLAGE.w * TILE;
  canvas.height = VILLAGE.h * TILE;
  const ctx = canvas.getContext('2d');
  const grass = (x, y) => x < 0 || y < 0 || x >= grid.w || y >= grid.h || !grid.path[y * grid.w + x];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      let [tx, ty] = blobTile((dx, dy) => grass(x + dx, y + dy));
      tx += GROUND_COL;
      if (tx === GROUND_COL + 2 && ty === 1 && hash(x, y) < 0.35) [tx, ty] = GRASS_VARIANTS[Math.floor(hash(x, y, 1) * GRASS_VARIANTS.length)];
      ctx.drawImage(img, tx * TILE, ty * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
    }
  }
  groundLayer = canvas;
  return canvas;
}

function draw(canvas, now) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const size = TILE * SCALE;
  const cam = camera(canvas, now);
  ctx.fillStyle = '#2e4a24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const layer = ground();
  if (layer) ctx.drawImage(layer, cam.x / SCALE, cam.y / SCALE, canvas.width / SCALE, canvas.height / SCALE, 0, 0, canvas.width, canvas.height);

  // Tout ce qui a de la hauteur est trié par la ligne de ses pieds (les plus bas devant).
  const items = [];
  const sprite = (key, x, bottom, w, h, frames = 1) => {
    const img = image(key);
    if (!isReady(img)) return;
    const fw = img.width / frames;
    const f = frames > 1 ? Math.floor(now / 120) % frames : 0;
    const sx = x * size - cam.x;
    const sy = (bottom + 1) * size - h * SCALE - cam.y;
    items.push({ y: bottom, draw: () => ctx.drawImage(img, f * fw, 0, fw, img.height, sx, sy, w * SCALE, h * SCALE) });
  };
  for (const b of [...VILLAGE.buildings, ...VILLAGE.props]) sprite(b.key, b.x, b.bottom, b.w, b.h, b.frames);
  for (const [x, y] of VILLAGE.trees) {
    const key = TREES[Math.floor(hash(x, y, 3) * TREES.length)];
    const img = image(key);
    if (!isReady(img)) continue;
    const sx = Math.round((x + 0.5) * size - (img.width * SCALE) / 2 - cam.x);
    const sy = (y + 1) * size - img.height * SCALE - cam.y;
    items.push({ y, draw: () => ctx.drawImage(img, sx, sy, img.width * SCALE, img.height * SCALE) });
  }
  const p = pos();
  const hp = currentPos(now);
  const near = VILLAGE.npcs.filter((n) => Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 3);
  for (const npc of VILLAGE.npcs) {
    const dir = near.includes(npc) ? faceTowards(npc, p) : 'down';
    items.push({ y: npc.y + 0.01, draw: () => drawActor(ctx, { sx: npc.x * size - cam.x, sy: npc.y * size - cam.y, size, scale: SCALE, dir, now: now + npc.x * 97, look: npc.look }) });
  }
  items.push({ y: hp.y + 0.02, draw: () => drawActor(ctx, { sx: hp.x * size - cam.x, sy: hp.y * size - cam.y, size, scale: SCALE, dir: p.dir, facing: p.facing, moving: hp.moving, now, sprite: PLAYER }) });
  items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());

  // Nom et rôle des habitants proches, au-dessus de leur tête.
  const target = talkTarget(p, FACING[p.dir]);
  for (const npc of near) label(ctx, npc, npc === target, cam, size);
}

function faceTowards(npc, p) {
  const dx = p.x - npc.x;
  const dy = p.y - npc.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy < 0 ? 'up' : 'down';
}

function label(ctx, npc, active, cam, size) {
  const cx = (npc.x + 0.5) * size - cam.x;
  const top = npc.y * size - cam.y - size * 1.9;
  const lines = [npc.name, VILLAGE_SERVICES[npc.service] + (active ? ' — Espace pour parler' : '')];
  ctx.font = `bold ${Math.round(size * 0.3)}px sans-serif`;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 0.4;
  const h = size * 0.85;
  ctx.fillStyle = active ? 'rgba(40,28,12,.9)' : 'rgba(20,14,8,.72)';
  ctx.strokeStyle = active ? '#f0c060' : 'rgba(240,192,96,.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, top - h, w, h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5d98a';
  ctx.fillText(lines[0], cx, top - h * 0.68);
  ctx.font = `${Math.round(size * 0.26)}px sans-serif`;
  ctx.fillStyle = '#e8dcc4';
  ctx.fillText(lines[1], cx, top - h * 0.28);
}
