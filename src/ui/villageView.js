// Village à parcourir (écran du village) : le groupe se promène, chaque service est un
// habitant ; lui parler (Espace / Entrée / E face à lui, ou clic dessus) ouvre son écran.
// On entre dans une maison en montant dans sa porte ; on en sort par la porte du bas.
// Carte : data/village.js, intérieurs : data/interiors.js ; règles de marche : game/village.js.
// Graphismes : packs Raven Fantasy (assets/raven/).

import { state } from '../state.js';
import { VILLAGE, VILLAGE_ART, VILLAGE_SERVICES } from '../data/village.js';
import { INTERIOR_ART } from '../data/interiors.js';
import {
  sceneOf, villageStep, talkTarget, spotsNextTo, npcAt, canWalk, sizeOf, rollResidents, doorstep, entryOf, doorAt,
} from '../game/village.js';
import { stepToward } from '../game/floorMap.js';
import { sheet, drawFloorAuto } from './mapThemes.js';
import { drawActor, dirBetween } from './actors.js';
import { holdToWalk } from './heldKeys.js';
import { NPC_SPRITES } from './spriteCatalog.js';
import { heroSprite } from './heroSprite.js';
import { clampView, fitCanvas } from './viewport.js';
import { image, isReady } from './sprites.js';

const TILE = 16;
const SCALE = 3;
const STEP_MS = 180; // durée d'un pas, aussi le rythme de marche
const WALK_MS = STEP_MS;

// Position du groupe (conservée entre deux menus) : state.village = { place ('village' ou
// maison), x, y, dir, residents (chez lui / dehors, tiré à chaque arrivée) }.
function pos() {
  state.village ??= { ...VILLAGE.spawn, dir: 'down', place: 'village' };
  state.village.place ??= 'village';
  state.village.residents ??= rollResidents();
  return state.village;
}

// Remet le groupe à l'entrée du village (retour d'expédition) ; les habitants ont bougé.
export function arriveAtVillage() {
  state.village = { ...VILLAGE.spawn, dir: 'up', place: 'village', residents: rollResidents() };
}

// Scène courante (lieu, grille, habitants présents), recalculée quand le lieu change.
let cached = null;
function scene() {
  const p = pos();
  if (!cached || cached.id !== p.place || cached.residents !== p.residents) {
    cached = { ...sceneOf(p.place, p.residents), residents: p.residents };
  }
  return cached;
}

// Nom du lieu (titre du HUD).
export function placeName() {
  const p = pos();
  return p.place === 'village' ? "Village d'Anyem" : VILLAGE.buildings.find((b) => b.id === p.place)?.name ?? '';
}

let onTalk = () => {};
let walk = null;
let frameRequested = false;
// followers : compagnons en file indienne derrière le meneur ({ from, to, t0, dir }).
const anim = { from: null, to: null, t0: 0, n: 0, followers: [] };

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
    <p class="hint map-help">Flèches / ZQSD, clic ou croix pour marcher ; <b>Espace</b> face à un habitant (ou clic sur lui) pour lui parler. Montez dans une porte pour entrer dans une maison. Le garde, près de la porte du village, ouvre les portails.</p>
    <button id="talkBtn" class="btn-primary">Parler</button>`;
}

// `talk(service)` : ouvre l'écran du service d'un habitant.
export function bindVillage(app, talk) {
  onTalk = talk;
  const canvas = app.querySelector('#villageMap');
  if (!canvas) return;
  resetAnim();
  const title = app.querySelector('.hud-title h2');
  if (title) title.textContent = placeName();
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
    const sc = scene();
    const npc = npcAt(x, y, sc) ?? npcAt(x, y + 1, sc); // clic sur la tête d'un habitant
    const door = sc.id === 'village' ? doorAt(x, y) : null;
    if (npc) walkTo(npc);
    else if (door) walkTo({ ...doorstep(door.id), then: () => step(0, -1) });
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
  const r = villageStep(p, dx, dy, scene());
  if (r.enter) {
    moveTo(r.enter, entryOf(r.enter), 'up');
    return false;
  }
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
  if (r.leave) {
    stopWalk();
    const house = p.place;
    setTimeout(() => { if (pos().place === house) moveTo('village', doorstep(house), 'down'); }, STEP_MS);
    return false;
  }
  return true;
}

// Change de lieu (entrer / sortir d'une maison) : le groupe apparaît groupé sur la case.
function moveTo(place, at, dir) {
  stopWalk();
  const p = pos();
  Object.assign(p, { place, x: at.x, y: at.y, dir });
  resetAnim();
  const title = document.querySelector('.hud-title h2');
  if (title) title.textContent = placeName();
  requestFrame();
}

function resetAnim() {
  const p = pos();
  anim.from = { x: p.x, y: p.y };
  anim.to = { x: p.x, y: p.y };
  anim.t0 = 0;
  anim.followers = state.party.slice(1).map(() => ({ from: { x: p.x, y: p.y }, to: { x: p.x, y: p.y }, t0: 0, dir: p.dir }));
}

function talk_() {
  const p = pos();
  const npc = talkTarget(p, FACING[p.dir], scene());
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
  const sc = scene();
  const grid = sc.grid;
  const map = { w: grid.w, h: grid.h, tiles: grid.tiles.map((t, i) => (t && !npcAt(i % grid.w, Math.floor(i / grid.w), sc) ? 1 : 0)) };
  const npc = target.name ? target : null; // un habitant (avec ou sans service)
  const goals = npc ? spotsNextTo(npc, sc) : canWalk(target.x, target.y, sc) ? [target] : [];
  if (!goals.length) return;
  walk = { timer: null };
  const tick = () => {
    if (!walk) return;
    const p = pos();
    if (p.place !== sc.id) return stopWalk();
    if (goals.some((g) => g.x === p.x && g.y === p.y)) {
      stopWalk();
      if (npc) {
        face(npc);
        requestFrame();
        onTalk(npc.service);
      }
      target.then?.();
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
  const { w, h } = scene().place;
  return {
    x: Math.round(clampView((p.x + 0.5) * size - canvas.width / 2, w * size - canvas.width)),
    y: Math.round(clampView((p.y + 0.5) * size - canvas.height / 2, h * size - canvas.height)),
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

// Sol d'un lieu (dessiné une fois par lieu) : herbe et chemins de terre au village ;
// dans une maison, parquet ou dalles, murs et tapis.
const groundLayers = new Map();
function ground(sc) {
  if (groundLayers.has(sc.id)) return groundLayers.get(sc.id);
  const layer = sc.id === 'village' ? villageGround(sc.grid) : roomGround(sc.place);
  if (layer) groundLayers.set(sc.id, layer);
  return layer;
}

function villageGround(grid) {
  const { grass, path } = VILLAGE_ART;
  const grassImg = sheet(grass.sheet);
  const pathImg = sheet(path.sheet);
  if (!grassImg || !pathImg) return null;
  const canvas = document.createElement('canvas');
  canvas.width = grid.w * TILE;
  canvas.height = grid.h * TILE;
  const ctx = canvas.getContext('2d');
  const onPath = (x, y) => x >= 0 && y >= 0 && x < grid.w && y < grid.h && !!grid.path[y * grid.w + x];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const [c, r] = grass.tiles[Math.floor(hash(x, y, 1) * grass.tiles.length)];
      ctx.drawImage(grassImg, c * TILE, r * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
      if (onPath(x, y)) drawFloorAuto(ctx, pathImg, path.auto, x, y, (dx, dy) => onPath(x + dx, y + dy));
    }
  }
  return canvas;
}

// Intérieur : sol en motif (3 × 3 tuiles), mur du fond (lambris + soubassement), murs
// latéraux et du bas vus de dessus, seuil de la porte, tapis.
function roomGround(room) {
  const obj = sheet('interiors_obj');
  if (!obj) return null;
  const { w, h } = room;
  const canvas = document.createElement('canvas');
  canvas.width = w * TILE;
  canvas.height = h * TILE;
  const ctx = canvas.getContext('2d');
  const tileOf = (art, x, y) => {
    const cols = art[3] / TILE;
    const rows = art[4] / TILE;
    ctx.drawImage(obj, art[1] + (x % cols) * TILE, art[2] + (y % rows) * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
  };
  const floor = INTERIOR_ART.floors[room.floor] ?? INTERIOR_ART.floors.wood;
  for (let y = 2; y < h; y++) for (let x = 0; x < w; x++) tileOf(floor, x, y);
  for (let x = 0; x < w; x++) {
    ctx.drawImage(obj, INTERIOR_ART.wallTop[1] + (x % 3) * TILE, INTERIOR_ART.wallTop[2], TILE, TILE, x * TILE, 0, TILE, TILE);
    ctx.drawImage(obj, INTERIOR_ART.wallBottom[1] + (x % 3) * TILE, INTERIOR_ART.wallBottom[2], TILE, TILE, x * TILE, TILE, TILE, TILE);
  }
  // Murs vus de dessus : bandeau sombre bordé d'une arête claire côté pièce.
  const wallTile = (x, y, edge) => {
    ctx.fillStyle = '#2b1d14';
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    ctx.fillStyle = '#6b4a30';
    if (edge === 'right') ctx.fillRect(x * TILE + TILE - 3, y * TILE, 3, TILE);
    if (edge === 'left') ctx.fillRect(x * TILE, y * TILE, 3, TILE);
    if (edge === 'top') ctx.fillRect(x * TILE, y * TILE, TILE, 3);
  };
  for (let y = 0; y < h; y++) { wallTile(0, y, 'right'); wallTile(w - 1, y, 'left'); }
  for (let x = 1; x < w - 1; x++) if (x !== room.exit) wallTile(x, h - 1, 'top');
  // Seuil : paillasson devant la porte, lumière du dehors.
  ctx.fillStyle = 'rgba(255, 236, 170, 0.35)';
  ctx.fillRect(room.exit * TILE, (h - 1) * TILE, TILE, TILE);
  ctx.fillStyle = '#7a3b24';
  ctx.fillRect(room.exit * TILE + 2, (h - 2) * TILE + 10, TILE - 4, 5);
  for (const f of room.furniture) {
    if (f.layer !== 'floor') continue;
    const { cols } = sizeOf(f);
    const [, sx, sy, fw, fh] = f.img;
    ctx.drawImage(obj, sx, sy, fw, fh, f.x * TILE + (cols * TILE - fw) / 2, (f.bottom + 1) * TILE - fh, fw, fh);
  }
  return canvas;
}

function draw(canvas, now) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const size = TILE * SCALE;
  const sc = scene();
  const cam = camera(canvas, now);
  ctx.fillStyle = sc.id === 'village' ? '#4f7a4a' : '#120c08';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const layer = ground(sc);
  if (layer) ctx.drawImage(layer, -cam.x, -cam.y, layer.width * SCALE, layer.height * SCALE);

  // Tout ce qui a de la hauteur est trié par la ligne de ses pieds (les plus bas devant).
  const items = [];
  // Objet posé : image centrée dans ses cases, bas de l'image au bas de la ligne `bottom`.
  const placed = (image, x, bottom, y = bottom) => {
    const { cols } = sizeOf({ img: image });
    const sx = x * size + ((cols * TILE - image[3]) / 2) * SCALE - cam.x;
    const sy = (bottom + 1) * size - image[4] * SCALE - cam.y;
    items.push({ y, draw: () => blit(ctx, image, sx, sy) });
  };
  if (sc.id === 'village') {
    for (const b of VILLAGE.buildings) {
      const sx = b.x * size - cam.x;
      const sy = (b.bottom + 1) * size - b.img[4] * SCALE - cam.y;
      items.push({ y: b.bottom, draw: () => {
        blit(ctx, b.img, sx, sy);
        for (const d of b.decor ?? []) blit(ctx, d.img, sx + d.dx * SCALE, sy + d.dy * SCALE);
      } });
    }
    for (const o of VILLAGE.props) placed(o.img, o.x, o.bottom);
    for (const s of VILLAGE.signs) items.push({ y: s.y, draw: () => drawSign(ctx, s, cam, size) });
    for (const [x, y, v] of VILLAGE.trees) {
      const tree = VILLAGE_ART.trees[v % VILLAGE_ART.trees.length];
      const sx = (x + 0.5) * size - (tree[3] / 2) * SCALE - cam.x;
      const sy = (y + 1) * size - tree[4] * SCALE - cam.y;
      items.push({ y, draw: () => blit(ctx, tree, sx, sy) });
    }
  } else {
    // Objets adossés au mur du fond d'abord, puis par ligne.
    for (const f of sc.place.furniture) if (f.layer !== 'floor') placed(f.img, f.x, f.bottom, f.bottom - (f.block === 'none' ? 0.5 : 0));
  }
  const p = pos();
  const hp = currentPos(now);
  const near = sc.npcs.filter((n) => Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 3);
  for (const npc of sc.npcs) {
    const dir = near.includes(npc) ? faceTowards(npc, p) : 'down';
    items.push({ y: npc.y + 0.01, draw: () => drawActor(ctx, { sx: npc.x * size - cam.x, sy: npc.y * size - cam.y, size, scale: SCALE, dir, now: now + npc.x * 97, sprite: NPC_SPRITES[npc.id], shadow: NPC_SPRITES[npc.id]?.kind === 'hero' }) });
  }
  items.push({ y: hp.y + 0.02, draw: () => drawActor(ctx, { sx: hp.x * size - cam.x, sy: hp.y * size - cam.y, size, scale: SCALE, dir: p.dir, facing: p.facing, moving: hp.moving, stride: hp.n, progress: hp.k, now, sprite: heroSprite(state.party[0]) }) });
  anim.followers.forEach((f, i) => {
    const hero = state.party[i + 1];
    if (!hero) return;
    const fp = tweenPos(f, now);
    items.push({ y: fp.y + 0.015 - i * 0.001, draw: () => drawActor(ctx, { sx: fp.x * size - cam.x, sy: fp.y * size - cam.y, size, scale: SCALE, dir: f.dir, facing: p.facing, moving: fp.moving, stride: fp.n, progress: fp.k, now, sprite: heroSprite(hero) }) });
  });
  items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());

  // Nom et rôle des habitants proches, au-dessus de leur tête ; nom de la maison devant
  // un panneau.
  const target = talkTarget(p, FACING[p.dir], sc);
  if (sc.id === 'village') {
    for (const s of VILLAGE.signs) {
      if (Math.abs(s.x - p.x) + Math.abs(s.y - p.y) > 2) continue;
      const house = VILLAGE.buildings.find((b) => b.id === s.house);
      const home = VILLAGE.npcs.filter((n) => n.home === s.house);
      const inside = home.length && home.every((n) => p.residents[n.id] === 'home');
      bubble(ctx, (s.x + 0.5) * size - cam.x, s.y * size - cam.y - size * 0.3, [house.name, inside ? 'À l\'intérieur — entrez par la porte' : 'Entrez par la porte'], false, size);
    }
  }
  for (const npc of near) label(ctx, npc, npc === target, cam, size);
}

// Panneau devant une maison : planche sur son poteau, icône du métier peinte dessus.
function drawSign(ctx, s, cam, size) {
  const board = VILLAGE_ART.signBoard;
  const sx = (s.x + 0.5) * size - (board[3] / 2) * SCALE - cam.x;
  const sy = (s.y + 1) * size - board[4] * SCALE - cam.y;
  blit(ctx, board, sx, sy);
  const icons = image('icons/raven16');
  if (!isReady(icons)) return;
  const d = 12 * SCALE;
  ctx.drawImage(icons, (s.icon % 16) * 16, Math.floor(s.icon / 16) * 16, 16, 16,
    Math.round((s.x + 0.5) * size - d / 2 - cam.x), Math.round(sy + (board[4] * SCALE - d) / 2 - 2), d, d);
}

function faceTowards(npc, p) {
  const dx = p.x - npc.x;
  const dy = p.y - npc.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy < 0 ? 'up' : 'down';
}

function label(ctx, npc, active, cam, size) {
  const lines = [npc.name, npc.service ? VILLAGE_SERVICES[npc.service] + (active ? ' — Espace pour parler' : '') : `« ${npc.line} »`];
  bubble(ctx, (npc.x + 0.5) * size - cam.x, npc.y * size - cam.y - size * 1.9, lines, active, size);
}

// Bulle de deux lignes centrée en `cx`, bas en `top`.
function bubble(ctx, cx, top, lines, active, size) {
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
