// Village à parcourir (écran du village) : le groupe se promène, chaque service est un
// habitant ; lui parler (Espace / Entrée / E face à lui, ou clic dessus) ouvre son écran.
// Carte : data/village.js ; règles de marche : game/village.js. Graphismes : packs Raven
// Fantasy (assets/raven/).

import { state } from '../state.js';
import { VILLAGE, VILLAGE_ART, VILLAGE_SERVICES } from '../data/village.js';
import { villageGrid, villageStep, talkTarget, spotsNextTo, npcAt, canWalk, sizeOf } from '../game/village.js';
import { stepToward } from '../game/floorMap.js';
import { sheet, drawFloorAuto } from './mapThemes.js';
import { drawActor, dirBetween } from './actors.js';
import { holdToWalk } from './heldKeys.js';
import { CLASS_SPRITES, NPC_SPRITES } from './spriteCatalog.js';
import { clampView, fitCanvas } from './viewport.js';

const TILE = 16;
const SCALE = 3;
const STEP_MS = 180; // durée d'un pas, aussi le rythme de marche
const WALK_MS = STEP_MS;

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
const anim = { from: null, to: null, t0: 0, n: 0, followers: [] };
let groundLayer = null;

// Carte plein écran (le canvas prend la taille de son conteneur, voir fitCanvas).
export function villageCanvas() {
  return '<canvas id="villageMap" class="map-full" width="960" height="540"></canvas>';
}

// Croix directionnelle, bouton Parler et aide, pour le HUD.
export function villageControls() {
  return `
    <div class="dpad">
      <button data-vstep="0,-1" aria-label="Haut">▲</button>
      <button data-vstep="-1,0" aria-label="Gauche">◀</button>
      <button data-vstep="1,0" aria-label="Droite">▶</button>
      <button data-vstep="0,1" aria-label="Bas">▼</button>
    </div>
    <p class="hint map-help">Flèches / ZQSD, clic ou croix pour marcher ; <b>Espace</b> face à un habitant (ou clic sur lui) pour lui parler. Le garde de la porte, en bas, ouvre les portails.</p>
    <button id="talkBtn" class="btn-primary">Parler</button>`;
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
  // Un pas à la fois : le précédent doit être (presque) fini.
  if (performance.now() - anim.t0 < STEP_MS - 20) return false;
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
    return { from: tweenPos(f, now), to: { ...target }, t0: now, n: (f.n ?? 0) + 1, dir: dirBetween(f.to, target) ?? f.dir };
  });
  anim.from = currentPos(now);
  anim.to = { ...r.pos };
  anim.t0 = now;
  anim.n += 1;
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

// Clavier : un pas par appui, puis au rythme de la marche tant que la touche est enfoncée.
holdToWalk({
  active: () => state.screen === 'hub' && !!document.querySelector('#villageMap'),
  onMove: (dx, dy) => {
    stopWalk();
    step(dx, dy);
  },
  onAction: () => talk_(),
  interval: STEP_MS,
});

// ---- Affichage ----

function tweenPos(t, now) {
  const k = Math.min(1, (now - t.t0) / STEP_MS);
  return { x: t.from.x + (t.to.x - t.from.x) * k, y: t.from.y + (t.to.y - t.from.y) * k, moving: k < 1, k, n: t.n ?? 0 };
}

function currentPos(now) {
  const k = Math.min(1, (now - anim.t0) / STEP_MS);
  return { x: anim.from.x + (anim.to.x - anim.from.x) * k, y: anim.from.y + (anim.to.y - anim.from.y) * k, moving: k < 1, k, n: anim.n };
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
  fitCanvas(canvas);
  draw(canvas, now);
  requestFrame();
}

function camera(canvas, now = performance.now()) {
  const p = currentPos(now);
  const size = TILE * SCALE;
  return {
    x: Math.round(clampView((p.x + 0.5) * size - canvas.width / 2, VILLAGE.w * size - canvas.width)),
    y: Math.round(clampView((p.y + 0.5) * size - canvas.height / 2, VILLAGE.h * size - canvas.height)),
  };
}

function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Image d'une planche Raven Fantasy ([planche, x, y, l, h]) dessinée à l'échelle, coin
// haut-gauche en (sx, sy) pixels d'écran ; rien tant que la planche charge.
function blit(ctx, [name, x, y, w, h], sx, sy) {
  const img = sheet(name);
  if (img) ctx.drawImage(img, x, y, w, h, Math.round(sx), Math.round(sy), w * SCALE, h * SCALE);
}

// Sol : herbe et chemins de terre (autotile). Dessiné une fois.
function ground() {
  if (groundLayer) return groundLayer;
  const { grass, path } = VILLAGE_ART;
  const grassImg = sheet(grass.sheet);
  const pathImg = sheet(path.sheet);
  if (!grassImg || !pathImg) return null;
  const grid = villageGrid();
  const canvas = document.createElement('canvas');
  canvas.width = VILLAGE.w * TILE;
  canvas.height = VILLAGE.h * TILE;
  const ctx = canvas.getContext('2d');
  const onPath = (x, y) => x >= 0 && y >= 0 && x < grid.w && y < grid.h && !!grid.path[y * grid.w + x];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const [c, r] = grass.tiles[Math.floor(hash(x, y, 1) * grass.tiles.length)];
      ctx.drawImage(grassImg, c * TILE, r * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
      if (onPath(x, y)) drawFloorAuto(ctx, pathImg, path.auto, x, y, (dx, dy) => onPath(x + dx, y + dy));
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
  ctx.fillStyle = '#4f7a4a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const layer = ground();
  if (layer) ctx.drawImage(layer, cam.x / SCALE, cam.y / SCALE, canvas.width / SCALE, canvas.height / SCALE, 0, 0, canvas.width, canvas.height);

  // Tout ce qui a de la hauteur est trié par la ligne de ses pieds (les plus bas devant).
  const items = [];
  // Objet posé : image centrée dans ses cases, bas de l'image au bas de la ligne `bottom`.
  const placed = (image, x, bottom, y = bottom) => {
    const { cols } = sizeOf({ img: image });
    const sx = x * size + ((cols * TILE - image[3]) / 2) * SCALE - cam.x;
    const sy = (bottom + 1) * size - image[4] * SCALE - cam.y;
    items.push({ y, draw: () => blit(ctx, image, sx, sy) });
  };
  for (const b of VILLAGE.buildings) {
    const sx = b.x * size - cam.x;
    const sy = (b.bottom + 1) * size - b.img[4] * SCALE - cam.y;
    items.push({ y: b.bottom, draw: () => {
      blit(ctx, b.img, sx, sy);
      for (const d of b.decor ?? []) blit(ctx, d.img, sx + d.dx * SCALE, sy + d.dy * SCALE);
    } });
  }
  for (const o of VILLAGE.props) placed(o.img, o.x, o.bottom);
  for (const [x, y, v] of VILLAGE.trees) {
    const tree = VILLAGE_ART.trees[v % VILLAGE_ART.trees.length];
    const sx = (x + 0.5) * size - (tree[3] / 2) * SCALE - cam.x;
    const sy = (y + 1) * size - tree[4] * SCALE - cam.y;
    items.push({ y, draw: () => blit(ctx, tree, sx, sy) });
  }
  const p = pos();
  const hp = currentPos(now);
  const near = VILLAGE.npcs.filter((n) => Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 3);
  for (const npc of VILLAGE.npcs) {
    const dir = near.includes(npc) ? faceTowards(npc, p) : 'down';
    items.push({ y: npc.y + 0.01, draw: () => drawActor(ctx, { sx: npc.x * size - cam.x, sy: npc.y * size - cam.y, size, scale: SCALE, dir, now: now + npc.x * 97, look: npc.look, sprite: NPC_SPRITES[npc.id] }) });
  }
  const heroSprite = (hero) => CLASS_SPRITES[hero?.classKey] ?? CLASS_SPRITES.paladin;
  items.push({ y: hp.y + 0.02, draw: () => drawActor(ctx, { sx: hp.x * size - cam.x, sy: hp.y * size - cam.y, size, scale: SCALE, dir: p.dir, facing: p.facing, moving: hp.moving, stride: hp.n, progress: hp.k, now, sprite: heroSprite(state.party[0]) }) });
  anim.followers.forEach((f, i) => {
    const hero = state.party[i + 1];
    if (!hero) return;
    const fp = tweenPos(f, now);
    items.push({ y: fp.y + 0.015 - i * 0.001, draw: () => drawActor(ctx, { sx: fp.x * size - cam.x, sy: fp.y * size - cam.y, size, scale: SCALE, dir: f.dir, facing: p.facing, moving: fp.moving, stride: fp.n, progress: fp.k, now, sprite: heroSprite(hero) }) });
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
