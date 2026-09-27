// Village : lieux où l'on marche (le village, ou l'intérieur d'une maison), grille de marche,
// habitants présents, pas du groupe, portes, sortie par la porte du village.
// Données : data/village.js (dehors) et data/interiors.js (maisons).
//
// Scène = { id ('village' ou id de maison), place (données), grid, npcs (présents, avec leur
// case) }. grid = { w, h, tiles: [0 | 1] (1 = on peut marcher), path: [0 | 1] (terre battue) }.
// À chaque retour au village, chaque habitant est chez lui ou devant sa porte (rollResidents).

import { VILLAGE } from '../data/village.js';
import { INTERIORS, ROOM_TOP } from '../data/interiors.js';
import { random } from './rng.js';

const grids = new Map();

// Taille en cases d'une maison ou d'un objet : celle de son image (img = [planche, x, y, l, h]).
export function sizeOf(obj) {
  return { cols: Math.ceil(obj.img[3] / 16), rows: Math.ceil(obj.img[4] / 16) };
}

function footprint(obj) {
  const { cols, rows } = sizeOf(obj);
  const block = obj.block ?? 'all';
  if (block === 'none') return [];
  if (Array.isArray(block)) return block.map(([dx, dy]) => [obj.x + dx, obj.bottom + dy]);
  const cells = [];
  const top = block === 'base' ? obj.bottom : obj.bottom - rows + 1;
  for (let y = top; y <= obj.bottom; y++) for (let x = obj.x; x < obj.x + cols; x++) cells.push([x, y]);
  return cells;
}

export function placeOf(id = 'village') {
  return id === 'village' ? VILLAGE : INTERIORS[id];
}

// Grille de marche d'un lieu (mise en cache).
export function placeGrid(id = 'village') {
  if (grids.has(id)) return grids.get(id);
  const place = placeOf(id);
  const { w, h } = place;
  const grid = { w, h, tiles: new Array(w * h).fill(1), path: new Array(w * h).fill(0) };
  const set = (arr, x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) arr[y * w + x] = v; };
  if (id === 'village') {
    for (const r of place.paths) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(grid.path, x, y, 1);
    for (const b of place.buildings) set(grid.path, b.door, b.bottom + 1, 1); // seuil de la porte
    for (const obj of [...place.buildings, ...place.props]) for (const [x, y] of footprint(obj)) set(grid.tiles, x, y, 0);
    for (const s of place.signs) set(grid.tiles, s.x, s.y, 0);
    for (const [x, y] of place.trees) set(grid.tiles, x, y, 0); // tronc
  } else {
    // Murs : le mur du fond (dessus + façade), les côtés et la ligne du bas (sauf la porte).
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (y < ROOM_TOP || x === 0 || x === w - 1 || y === h - 1) set(grid.tiles, x, y, 0);
    }
    set(grid.tiles, place.exit, h - 1, 1);
    for (const obj of place.furniture.filter((f) => !f.layer)) for (const [x, y] of footprint(obj)) set(grid.tiles, x, y, 0);
  }
  grids.set(id, grid);
  return grid;
}

// Grille du village (compatibilité : dehors).
export function villageGrid() {
  return placeGrid('village');
}

// Chez lui ('home') ou devant sa porte ('out') : tiré à chaque retour au village.
export function rollResidents() {
  return Object.fromEntries(VILLAGE.npcs.map((n) => [n.id, random() < 0.5 ? 'home' : 'out']));
}

// Habitants présents dans un lieu, à leur case.
export function npcsIn(id = 'village', residents = {}) {
  if (id === 'village') return VILLAGE.npcs.filter((n) => residents[n.id] !== 'home');
  const spots = INTERIORS[id]?.npcs ?? {};
  return VILLAGE.npcs
    .filter((n) => n.home === id && residents[n.id] === 'home' && spots[n.id])
    .map((n) => ({ ...n, ...spots[n.id] }));
}

// Scène où marche le groupe : lieu, grille et habitants présents.
export function sceneOf(id = 'village', residents = {}) {
  return { id, place: placeOf(id), grid: placeGrid(id), npcs: npcsIn(id, residents) };
}

const outside = () => sceneOf('village', {});

export function npcAt(x, y, scene = outside()) {
  return scene.npcs.find((n) => n.x === x && n.y === y) ?? null;
}

// Case où l'on peut marcher (dans le lieu, libre, sans habitant).
export function canWalk(x, y, scene = outside()) {
  const g = scene.grid;
  return x >= 0 && y >= 0 && x < g.w && y < g.h && g.tiles[y * g.w + x] === 1 && !npcAt(x, y, scene);
}

// Maison dont la porte est à la case (x, y) du village (ou null).
export function doorAt(x, y) {
  return VILLAGE.buildings.find((b) => b.door === x && b.bottom === y) ?? null;
}

// Case devant la porte d'une maison (où l'on ressort).
export function doorstep(houseId) {
  const b = VILLAGE.buildings.find((h) => h.id === houseId);
  return { x: b.door, y: b.bottom + 1 };
}

// Case où l'on arrive en entrant dans une maison (juste derrière la porte).
export function entryOf(houseId) {
  const room = INTERIORS[houseId];
  return { x: room.exit, y: room.h - 2 };
}

/**
 * Un pas depuis `pos` dans la direction { dx, dy }. Retourne { pos (nouvelle position),
 * moved, npc : habitant devant soi (le pas est bloqué), exit : vrai si l'on passe la porte
 * du village, enter : maison dont on franchit la porte, leave : vrai si l'on sort d'une
 * maison }.
 */
export function villageStep(pos, dx, dy, scene = outside()) {
  const x = pos.x + dx;
  const y = pos.y + dy;
  const none = { pos, moved: false, npc: null, exit: false, enter: null, leave: false };
  const npc = npcAt(x, y, scene);
  if (npc) return { ...none, npc };
  if (scene.id === 'village') {
    const house = doorAt(x, y);
    if (house && INTERIORS[house.id] && dy === -1) return { ...none, enter: house.id };
  }
  if (!canWalk(x, y, scene)) return none;
  const leave = scene.id !== 'village' && y === scene.place.h - 1 && x === scene.place.exit;
  const exit = scene.id === 'village' && VILLAGE.gateExit.some((p) => p.x === x && p.y === y);
  return { ...none, pos: { x, y }, moved: true, exit, leave };
}

// Habitant à qui parler depuis `pos` : celui qu'on regarde (`facing` = { dx, dy }), sinon
// un habitant adjacent.
export function talkTarget(pos, facing = null, scene = outside()) {
  if (facing) {
    const n = npcAt(pos.x + facing.dx, pos.y + facing.dy, scene);
    if (n) return n;
  }
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const n = npcAt(pos.x + dx, pos.y + dy, scene);
    if (n) return n;
  }
  return null;
}

// Cases libres à côté d'un habitant (pour aller lui parler en cliquant dessus).
export function spotsNextTo(npc, scene = outside()) {
  return [[0, 1], [0, -1], [1, 0], [-1, 0]]
    .map(([dx, dy]) => ({ x: npc.x + dx, y: npc.y + dy }))
    .filter((p) => canWalk(p.x, p.y, scene));
}
