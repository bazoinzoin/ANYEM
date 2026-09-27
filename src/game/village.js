// Village : grille de marche (bâtiments, décors, arbres et habitants bloquent), pas du
// groupe, habitant à qui parler, sortie par la porte. Données : data/village.js.
//
// grid = { w, h, tiles: [0 | 1] (1 = on peut marcher), path: [0 | 1] (terre battue) }

import { VILLAGE } from '../data/village.js';

let cached = null;

// Taille en cases : maison (cols × toit + murs) ou objet (rect du chipset).
export function sizeOf(obj) {
  if (obj.cols) return { cols: obj.cols, rows: obj.roofRows + obj.wallRows };
  return { cols: obj.rect[2], rows: obj.rect[3] };
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

export function villageGrid(village = VILLAGE) {
  if (village === VILLAGE && cached) return cached;
  const { w, h } = village;
  const grid = { w, h, tiles: new Array(w * h).fill(1), path: new Array(w * h).fill(0) };
  const set = (arr, x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) arr[y * w + x] = v; };
  for (const r of village.paths) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(grid.path, x, y, 1);
  for (const obj of [...village.buildings, ...village.props]) for (const [x, y] of footprint(obj)) set(grid.tiles, x, y, 0);
  for (const [x, y] of village.trees) set(grid.tiles, x, y, 0);
  if (village === VILLAGE) cached = grid;
  return grid;
}

export function npcAt(x, y, village = VILLAGE) {
  return village.npcs.find((n) => n.x === x && n.y === y) ?? null;
}

// Case où l'on peut marcher (dans la carte, libre, sans habitant).
export function canWalk(x, y, village = VILLAGE) {
  const g = villageGrid(village);
  return x >= 0 && y >= 0 && x < g.w && y < g.h && g.tiles[y * g.w + x] === 1 && !npcAt(x, y, village);
}

/**
 * Un pas depuis `pos` dans la direction { dx, dy }. Retourne { pos (nouvelle position),
 * moved, npc : habitant devant soi (le pas est bloqué), exit : vrai si l'on passe la porte }.
 */
export function villageStep(pos, dx, dy, village = VILLAGE) {
  const x = pos.x + dx;
  const y = pos.y + dy;
  const npc = npcAt(x, y, village);
  if (npc || !canWalk(x, y, village)) return { pos, moved: false, npc, exit: false };
  const exit = village.gateExit.some((p) => p.x === x && p.y === y);
  return { pos: { x, y }, moved: true, npc: null, exit };
}

// Habitant à qui parler depuis `pos` : celui qu'on regarde (`facing` = { dx, dy }), sinon
// un habitant adjacent.
export function talkTarget(pos, facing = null, village = VILLAGE) {
  if (facing) {
    const n = npcAt(pos.x + facing.dx, pos.y + facing.dy, village);
    if (n) return n;
  }
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const n = npcAt(pos.x + dx, pos.y + dy, village);
    if (n) return n;
  }
  return null;
}

// Cases libres à côté d'un habitant (pour aller lui parler en cliquant dessus).
export function spotsNextTo(npc, village = VILLAGE) {
  return [[0, 1], [0, -1], [1, 0], [-1, 0]]
    .map(([dx, dy]) => ({ x: npc.x + dx, y: npc.y + dy }))
    .filter((p) => canWalk(p.x, p.y, village));
}
