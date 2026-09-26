// Carte d'un étage : salles reliées par des couloirs, brouillard, monstres qui
// patrouillent ou poursuivent le groupe, événements et échelle. Règles pures (sans
// DOM) ; tout aléatoire passe par game/rng.js.
//
// map = {
//   w, h,
//   tiles: [0 | 1]   (w × h, ligne par ligne) 0 = mur, 1 = sol
//   seen:  [0 | 1]   cases déjà découvertes (brouillard)
//   rooms: [{ x, y, w, h }]
//   party: { x, y }
//   ladder: { x, y } | null     (null à l'étage d'un boss : le boss garde la fin)
//   mobs:  [{ id, x, y, room, enemies: [clés], boss, chasing }]
//   events: [{ id, x, y }]
// }

import { MAP } from '../config.js';
import { random, pick, seededRandom } from './rng.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const idx = (map, x, y) => y * map.w + x;
export const inside = (map, x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h;
export const isFloor = (map, x, y) => inside(map, x, y) && map.tiles[idx(map, x, y)] === 1;
// Tirages de la génération (générateur local, voir seededRandom) ; ailleurs : random().
let gen = random;
const randInt = (min, max) => min + Math.floor(gen() * (max - min + 1));
const genPick = (list) => list[Math.floor(gen() * list.length)];
const center = (r) => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) });

function carveRect(map, { x, y, w, h }) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map.tiles[idx(map, i, j)] = 1;
}

// Couloir en L entre deux points.
function carveCorridor(map, a, b) {
  const horizontalFirst = gen() < 0.5;
  const corner = horizontalFirst ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
  for (const [p, q] of [[a, corner], [corner, b]]) {
    for (let x = Math.min(p.x, q.x); x <= Math.max(p.x, q.x); x++) map.tiles[idx(map, x, p.y)] = 1;
    for (let y = Math.min(p.y, q.y); y <= Math.max(p.y, q.y); y++) map.tiles[idx(map, p.x, y)] = 1;
  }
}

function overlaps(a, b) {
  return a.x - 1 <= b.x + b.w && b.x - 1 <= a.x + a.w && a.y - 1 <= b.y + b.h && b.y - 1 <= a.y + a.h;
}

// Distances (en pas) depuis `from` sur le sol ; Infinity si inaccessible.
export function distances(map, from) {
  const dist = new Array(map.w * map.h).fill(Infinity);
  dist[idx(map, from.x, from.y)] = 0;
  const queue = [from];
  while (queue.length) {
    const { x, y } = queue.shift();
    const d = dist[idx(map, x, y)];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (isFloor(map, nx, ny) && dist[idx(map, nx, ny)] === Infinity) {
        dist[idx(map, nx, ny)] = d + 1;
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return dist;
}

// Premier pas du plus court chemin de `from` vers `to` (en évitant `blocked(x, y)`), ou null.
export function stepToward(map, from, to, blocked = () => false) {
  const dist = distances(map, to);
  let best = null;
  let bestD = dist[idx(map, from.x, from.y)];
  for (const [dx, dy] of DIRS) {
    const x = from.x + dx;
    const y = from.y + dy;
    if (!isFloor(map, x, y) || (blocked(x, y) && !(x === to.x && y === to.y))) continue;
    const d = dist[idx(map, x, y)];
    if (d < bestD) {
      bestD = d;
      best = { x, y };
    }
  }
  return best;
}

// Ligne de vue (Bresenham) : aucune case de mur entre a et b (b exclu).
export function lineOfSight(map, a, b) {
  let { x, y } = a;
  const dx = Math.abs(b.x - x);
  const dy = -Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1;
  const sy = y < b.y ? 1 : -1;
  let err = dx + dy;
  while (x !== b.x || y !== b.y) {
    if (!(x === a.x && y === a.y) && !isFloor(map, x, y)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return true;
}

// Cases visibles depuis le groupe : rayon MAP.sightRadius, ligne de vue (murs compris,
// pour qu'ils s'affichent).
export function visibleFrom(map, pos, radius = MAP.sightRadius) {
  const visible = new Set();
  for (let y = pos.y - radius; y <= pos.y + radius; y++) {
    for (let x = pos.x - radius; x <= pos.x + radius; x++) {
      if (!inside(map, x, y) || (x - pos.x) ** 2 + (y - pos.y) ** 2 > radius * radius) continue;
      if (lineOfSight(map, pos, { x, y })) visible.add(idx(map, x, y));
    }
  }
  return visible;
}

export function reveal(map) {
  for (const i of visibleFrom(map, map.party)) map.seen[i] = 1;
}

// Case de sol libre au hasard dans une salle (ni occupée, ni sur `taken`).
function freeTileIn(map, room, taken) {
  for (let tries = 0; tries < 60; tries++) {
    const x = randInt(room.x, room.x + room.w - 1);
    const y = randInt(room.y, room.y + room.h - 1);
    if (!taken.some((p) => p.x === x && p.y === y)) return { x, y };
  }
  return null;
}

/**
 * Génère la carte d'un étage.
 * groups : [{ enemies, boss }] groupes de monstres (un boss se place dans la salle
 *          la plus éloignée du départ et ne bouge pas) ; events : nombre d'événements.
 */
export function generateFloorMap({ groups, events = 0 }) {
  gen = seededRandom();
  const { width: w, height: h } = MAP;
  const map = { w, h, tiles: new Array(w * h).fill(0), seen: new Array(w * h).fill(0), rooms: [], mobs: [], events: [], ladder: null };
  for (let tries = 0; map.rooms.length < MAP.rooms && tries < 400; tries++) {
    const room = { w: randInt(MAP.roomSize.min, MAP.roomSize.max), h: randInt(MAP.roomSize.min - 1, MAP.roomSize.max - 2) };
    room.x = randInt(1, w - room.w - 1);
    room.y = randInt(1, h - room.h - 1);
    if (map.rooms.some((r) => overlaps(r, room))) continue;
    map.rooms.push(room);
  }
  // Salles reliées de gauche à droite (plus une boucle), pour un étage qui se parcourt.
  map.rooms.sort((a, b) => a.x - b.x);
  map.rooms.forEach((r) => carveRect(map, r));
  for (let i = 1; i < map.rooms.length; i++) carveCorridor(map, center(map.rooms[i - 1]), center(map.rooms[i]));
  if (map.rooms.length > 3) carveCorridor(map, center(map.rooms[0]), center(map.rooms[Math.floor(map.rooms.length / 2) + 1]));

  const startRoom = 0;
  map.party = center(map.rooms[startRoom]);
  const dist = distances(map, map.party);
  const farthest = map.rooms.reduce((best, r, i) =>
    (dist[idx(map, center(r).x, center(r).y)] > dist[idx(map, center(map.rooms[best]).x, center(map.rooms[best]).y)] ? i : best), 0);

  const taken = [map.party];
  const hasBoss = groups.some((g) => g.boss);
  if (!hasBoss) {
    map.ladder = center(map.rooms[farthest]);
    taken.push(map.ladder);
  }
  const otherRooms = map.rooms.map((_, i) => i).filter((i) => i !== startRoom);
  groups.forEach((g, n) => {
    const room = g.boss ? farthest : genPick(otherRooms.filter((i) => i !== farthest || !hasBoss));
    const pos = g.boss ? center(map.rooms[room]) : freeTileIn(map, map.rooms[room], taken);
    if (!pos) return;
    taken.push(pos);
    map.mobs.push({ id: `m${n + 1}`, ...pos, room, enemies: g.enemies, boss: !!g.boss, chasing: false });
  });
  for (let n = 0; n < events; n++) {
    const pos = freeTileIn(map, map.rooms[genPick(otherRooms)], taken);
    if (!pos) continue;
    taken.push(pos);
    map.events.push({ id: `e${n + 1}`, ...pos });
  }
  reveal(map);
  gen = random;
  return map;
}

const inRoom = (room, p) => p.x >= room.x && p.x < room.x + room.w && p.y >= room.y && p.y < room.y + room.h;

export const mobAt = (map, x, y) => map.mobs.find((m) => m.x === x && m.y === y) ?? null;

// Déplacement des monstres après un pas du groupe. Un monstre qui voit le groupe
// (rayon MAP.aggroRadius, ligne de vue) le poursuit, et lâche prise au-delà de
// MAP.loseRadius ; sinon il erre dans sa salle. Un boss ne bouge pas.
// Retourne le monstre qui atteint le groupe (combat), ou null.
export function moveMobs(map) {
  for (const mob of map.mobs) {
    if (mob.boss) continue;
    const d2 = (mob.x - map.party.x) ** 2 + (mob.y - map.party.y) ** 2;
    if (d2 <= MAP.aggroRadius ** 2 && lineOfSight(map, mob, map.party)) mob.chasing = true;
    else if (d2 > MAP.loseRadius ** 2) mob.chasing = false;
    const blocked = (x, y) => !!mobAt(map, x, y) || (map.ladder?.x === x && map.ladder?.y === y);
    let next = null;
    if (mob.chasing) {
      next = stepToward(map, mob, map.party, blocked);
    } else if (!inRoom(map.rooms[mob.room], mob)) {
      next = stepToward(map, mob, center(map.rooms[mob.room]), blocked); // retour dans sa salle
    } else if (random() < MAP.wanderChance) {
      const room = map.rooms[mob.room];
      const options = DIRS.map(([dx, dy]) => ({ x: mob.x + dx, y: mob.y + dy })).filter((p) =>
        isFloor(map, p.x, p.y) && !blocked(p.x, p.y) && !(p.x === map.party.x && p.y === map.party.y)
        && inRoom(room, p));
      if (options.length) next = pick(options);
    }
    if (!next) continue;
    if (next.x === map.party.x && next.y === map.party.y) return mob;
    mob.x = next.x;
    mob.y = next.y;
  }
  return null;
}
