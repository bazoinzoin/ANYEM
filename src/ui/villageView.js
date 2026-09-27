// Village à parcourir (écran du village) : le groupe se promène, chaque service est un
// habitant ; lui parler (Espace / Entrée / E face à lui, ou clic dessus) ouvre son écran.
// Carte : data/village.js ; règles de marche : game/village.js. Graphismes : pack Fan-tasy.

import { state } from '../state.js';
import { VILLAGE, VILLAGE_SERVICES } from '../data/village.js';
import { villageGrid, villageStep, talkTarget, spotsNextTo, npcAt, canWalk } from '../game/village.js';
import { stepToward } from '../game/floorMap.js';
import { rmQuarter } from './autotile.js';
import { chipImage } from './mapThemes.js';
import { drawActor, dirBetween } from './actors.js';
import { CLASS_SPRITES, NPC_SPRITES } from './spriteCatalog.js';

const TILE = 16;
const SCALE = 3;
const VIEW_W = 21;
const VIEW_H = 13;
const STEP_MS = 150;
const WALK_MS = 150;
// Chipsets RPG Maker 2003 du village (voir data/village.js).
const CHIPS = { village: 'rm2k3/chip_village', town: 'rm2k3/chip_town', dungeon: 'rm2k3/chip_dungeon' };
const GRASS = [1, 10];          // herbe (chip_village)
const PAVING = [9, 8];          // autotile de pavés (chip_village)
const TREES = [[22, 8, 2, 2], [20, 8, 1, 2]]; // arbres (chip_village)
// Toits (chip_town) : tuiles de la rangée du haut et du reste, en alternance par colonne.
const ROOFS = {
  red: { top: [[14, 3], [15, 3]], body: [[14, 4], [15, 4]] },
  teal: { top: [[16, 3]], body: [[16, 4]] },
  green: { top: [[14, 5], [15, 5]], body: [[14, 11], [15, 11]] },
  brown: { top: [[12, 3], [13, 3]], body: [[12, 4], [13, 4]] },
};
// Murs (chip_town) : lignes haut, milieu, bas ; colonnes gauche, milieu, droite.
const WALLS = {
  plaster: [[[12, 0], [13, 0], [14, 0]], [[12, 1], [13, 1], [14, 1]], [[12, 2], [13, 2], [14, 2]]],
  stone: [[[15, 0], [16, 0], [17, 0]], [[15, 1], [16, 1], [17, 1]], [[15, 2], [16, 2], [17, 2]]],
  brick: [[[14, 9], [15, 9], [16, 9]], [[14, 9], [15, 9], [16, 9]], [[14, 9], [15, 9], [16, 9]]],
};
const DOOR = [21, 6, 1, 2];     // porte (chip_town)
const WINDOW = [25, 2];         // fenêtre (chip_town)

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
// followers : compagnons en file indienne derrière le meneur ({ from, to, t0, dir }).
const anim = { from: null, to: null, t0: 0, followers: [] };
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
  anim.followers = state.party.slice(1).map(() => ({ from: { x: p.x, y: p.y }, to: { x: p.x, y: p.y }, t0: 0, dir: p.dir }));
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
  const now = performance.now();
  // Chaque compagnon prend la case que quitte celui qui le précède.
  const targets = [anim.to, ...anim.followers.map((f) => f.to)];
  anim.followers = anim.followers.map((f, i) => {
    const target = targets[i];
    if (f.to.x === target.x && f.to.y === target.y) return f;
    return { from: tweenPos(f, now), to: { ...target }, t0: now, dir: dirBetween(f.to, target) ?? f.dir };
  });
  anim.from = currentPos(now);
  anim.to = { ...r.pos };
  anim.t0 = now;
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

function tweenPos(t, now) {
  const k = Math.min(1, (now - t.t0) / STEP_MS);
  return { x: t.from.x + (t.to.x - t.from.x) * k, y: t.from.y + (t.to.y - t.from.y) * k, moving: k < 1 };
}

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

// Sol : herbe et rues pavées (autotile RPG Maker). Dessiné une fois.
function ground() {
  if (groundLayer) return groundLayer;
  const chip = chipImage(CHIPS.village);
  if (!chip) return null;
  const grid = villageGrid();
  const canvas = document.createElement('canvas');
  canvas.width = VILLAGE.w * TILE;
  canvas.height = VILLAGE.h * TILE;
  const ctx = canvas.getContext('2d');
  const paved = (x, y) => x >= 0 && y >= 0 && x < grid.w && y < grid.h && !!grid.path[y * grid.w + x];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      if (!paved(x, y)) {
        ctx.drawImage(chip, GRASS[0] * TILE, GRASS[1] * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
        continue;
      }
      for (let q = 0; q < 4; q++) {
        const [col, row] = rmQuarter((dx, dy) => paved(x + dx, y + dy), q);
        const qx = (q % 2) * 8;
        const qy = (q >> 1) * 8;
        ctx.drawImage(chip, (PAVING[0] + col) * TILE + qx, (PAVING[1] + row) * TILE + qy, 8, 8, x * TILE + qx, y * TILE + qy, 8, 8);
      }
    }
  }
  groundLayer = canvas;
  return canvas;
}

// Maison construite tuile par tuile (toit, murs, fenêtres, porte, enseigne), mise en cache.
const houses = new Map();
function house(b) {
  if (houses.has(b.id)) return houses.get(b.id);
  const town = chipImage(CHIPS.town);
  const signChip = b.sign ? chipImage(CHIPS[b.sign.chip]) : null;
  if (!town || (b.sign && !signChip)) return null;
  const rows = b.roofRows + b.wallRows;
  const canvas = document.createElement('canvas');
  canvas.width = b.cols * TILE;
  canvas.height = rows * TILE;
  const ctx = canvas.getContext('2d');
  const put = (chip, [c, r], x, y, w = 1, h = 1) => ctx.drawImage(chip, c * TILE, r * TILE, w * TILE, h * TILE, x * TILE, y * TILE, w * TILE, h * TILE);
  const roof = ROOFS[b.roof];
  for (let y = 0; y < b.roofRows; y++) {
    const set = y === 0 ? roof.top : roof.body;
    for (let x = 0; x < b.cols; x++) put(town, set[x % set.length], x, y);
  }
  const wall = WALLS[b.wall];
  const wallRows = b.wallRows === 2 ? [wall[1], wall[2]] : [wall[0], ...Array(b.wallRows - 2).fill(wall[1]), wall[2]];
  wallRows.forEach((row, i) => {
    for (let x = 0; x < b.cols; x++) put(town, row[x === 0 ? 0 : x === b.cols - 1 ? 2 : 1], x, b.roofRows + i);
  });
  // Ombre du toit sur le haut des murs.
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(0, b.roofRows * TILE, b.cols * TILE, 3);
  const windowRow = b.roofRows + (b.wallRows >= 3 ? 1 : 0);
  for (const dx of b.windows ?? []) put(town, WINDOW, dx, windowRow);
  put(town, DOOR, b.door, rows - 2, DOOR[2], DOOR[3]);
  if (b.sign) put(signChip, b.sign.tile, b.sign.dx, b.roofRows);
  houses.set(b.id, canvas);
  return canvas;
}

function draw(canvas, now) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const size = TILE * SCALE;
  const cam = camera(canvas, now);
  ctx.fillStyle = '#3b6d2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const layer = ground();
  if (layer) ctx.drawImage(layer, cam.x / SCALE, cam.y / SCALE, canvas.width / SCALE, canvas.height / SCALE, 0, 0, canvas.width, canvas.height);

  // Tout ce qui a de la hauteur est trié par la ligne de ses pieds (les plus bas devant).
  const items = [];
  // Objet du chipset `chip` (rect en tuiles), coin bas-gauche en (x, bottom).
  const object = (chipKey, [c, r, w, h], x, bottom) => {
    const chip = chipImage(CHIPS[chipKey]);
    if (!chip) return;
    const sx = x * size - cam.x;
    const sy = (bottom - h + 1) * size - cam.y;
    items.push({ y: bottom, draw: () => ctx.drawImage(chip, c * TILE, r * TILE, w * TILE, h * TILE, sx, sy, w * size, h * size) });
  };
  for (const b of VILLAGE.buildings) {
    const img = house(b);
    if (!img) continue;
    const sx = b.x * size - cam.x;
    const sy = (b.bottom + 1) * size - img.height * SCALE - cam.y;
    items.push({ y: b.bottom, draw: () => ctx.drawImage(img, sx, sy, img.width * SCALE, img.height * SCALE) });
  }
  for (const o of VILLAGE.props) object(o.chip, o.rect, o.x, o.bottom);
  for (const [x, y] of VILLAGE.trees) {
    const tree = TREES[Math.floor(hash(x, y, 3) * TREES.length)];
    object('village', tree, x - Math.floor((tree[2] - 1) / 2), y);
  }
  const p = pos();
  const hp = currentPos(now);
  const near = VILLAGE.npcs.filter((n) => Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 3);
  for (const npc of VILLAGE.npcs) {
    const dir = near.includes(npc) ? faceTowards(npc, p) : 'down';
    items.push({ y: npc.y + 0.01, draw: () => drawActor(ctx, { sx: npc.x * size - cam.x, sy: npc.y * size - cam.y, size, scale: SCALE, dir, now: now + npc.x * 97, look: npc.look, sprite: NPC_SPRITES[npc.id] }) });
  }
  const heroSprite = (hero) => CLASS_SPRITES[hero?.classKey] ?? CLASS_SPRITES.paladin;
  items.push({ y: hp.y + 0.02, draw: () => drawActor(ctx, { sx: hp.x * size - cam.x, sy: hp.y * size - cam.y, size, scale: SCALE, dir: p.dir, facing: p.facing, moving: hp.moving, now, sprite: heroSprite(state.party[0]) }) });
  anim.followers.forEach((f, i) => {
    const hero = state.party[i + 1];
    if (!hero) return;
    const fp = tweenPos(f, now);
    items.push({ y: fp.y + 0.015 - i * 0.001, draw: () => drawActor(ctx, { sx: fp.x * size - cam.x, sy: fp.y * size - cam.y, size, scale: SCALE, dir: f.dir, facing: p.facing, moving: fp.moving, now, sprite: heroSprite(hero) }) });
  });
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
