// Fonds de combat : un décor par sous-zone, composé avec les tuiles et objets du thème de
// sa carte (ui/mapThemes.js, packs Raven Fantasy) : au fond un mur (crypte, mine), un lac
// (lave, eau, vide) ou une lisière d'arbres sous le ciel ; devant, le sol où se tiennent les
// combattants, parsemé de petits objets. Dessiné une fois en tuiles de 16 px sur un petit
// canvas (le décor est ensuite agrandi ×3 comme les personnages), puis mis en cache.
//
// BACKS[donjon][sous-zone] précise ou remplace ce qui se déduit du thème :
//   back     'wall' | 'liquid' | 'trees' (défaut : selon theme.outside)
//   sky      [haut, bas] : dégradé derrière les arbres
//   trees    objets de la lisière (défaut : props 'wall' du thème)
//   edge     objets posés au pied du fond (défaut : props 'edge' du thème)
//   onWall   objets accrochés au mur (défaut : props 'face')
//   scatter  petits objets au sol (défaut : props 'floor')
//   wall     mur A4 derrière un lac (paroi de la caverne) : { sheet, face }
//   ground   sol à la place de celui de la carte : { sheet, tiles }
//   clearing true : le sol des salles (autotile) forme une clairière sous les combattants
//   glow     [couleur, force] : lueur montant du fond (lave, acide)
//   tint     voile de couleur sur tout le décor ; weather 'snow' : neige qui tombe

import { themeOf, sheet, drawFloorAuto, drawWallAuto, TILE, PROPS } from './mapThemes.js';
import { DUNGEONS } from '../data/dungeons.js';
import { subzoneOf } from '../game/dungeon.js';

export const BACK_ZOOM = 3;          // agrandissement du décor (celui des personnages)
const COLS = 14;
const ROWS = 8;
const SW = COLS * TILE;              // petit canvas : 224 × 128 px, affiché ×3
const SH = ROWS * TILE;
const FLOOR_ROW = 3;                 // première rangée de sol (les pieds du rang du fond y sont)

const { forest: F, dungeon: D, cave: C, winter: W, abyss: U } = PROPS;

const caveWall = { sheet: 'cave_A4', face: [0, 3] };
const caveGround = { sheet: 'cave_A5', tiles: [[1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [2, 0]] };

const BACKS = {
  foretMaudite: [
    { sky: ['#8fc3d8', '#cfe6c8'], ground: { sheet: 'forest_A5', tiles: [[0, 1], [0, 1], [0, 1], [0, 1], [1, 1]] }, scatter: [F.flowersPurple, F.flowersYellow2, F.pebble1, F.pebble3, F.mushrooms] },
    { sky: ['#4c5f4a', '#8a8a5a'], tint: 'rgba(40,20,0,.12)' },
    { sky: ['#2d2a3a', '#5a4a5a'], tint: 'rgba(20,0,40,.22)' },
  ],
  catacombes: [
    { sky: ['#232236', '#5d5872'], trees: [F.deadTree1, F.deadTree2, F.deadTree1], tint: 'rgba(20,10,50,.25)' },
    { edge: [D.bones, D.skull, D.rubblePile, D.barrel, D.crate, D.brokenPillar], tint: 'rgba(0,0,0,.15)' },
    { edge: [D.coffin1, D.pillar, D.coffin2, D.pillar, D.candle], tint: 'rgba(0,0,0,.15)' },
  ],
  cavernesArdentes: [
    { ground: caveGround, edge: [C.cart, C.crate1, C.barrel, C.boulder, C.pickaxe, C.crate2] },
    { ground: caveGround, edge: [C.boulder, C.oreBlue, C.mossBoulder], wall: caveWall },
    { ground: caveGround, edge: [C.boulder, C.rock2, C.rock4], wall: caveWall, glow: ['255,120,30', 0.45], tint: 'rgba(60,10,0,.15)' },
  ],
  picsGeles: [
    { sky: ['#9eb4cc', '#e6eef4'] },
    { sky: ['#7d8ea6', '#c8d4e0'], edge: [W.snowBoulder, W.stone, W.iceSpike, W.snowRock] },
    { edge: [W.iceSpike, W.snowBoulder, W.iceSpike, W.stone], wall: { sheet: 'winter_A4', face: [0, 3] }, glow: ['170,220,255', 0.25] },
  ],
  abimeInfernal: [
    { sky: ['#1a0d1c', '#4a1c2a'], tint: 'rgba(40,0,20,.2)' },
    { edge: [U.brazier, U.column, U.skullPile, U.brokenColumn, U.statue], glow: ['160,60,220', 0.3] },
    { edge: [U.redTree3, U.skeleton, U.bigRedCrystal, U.redTree4], glow: ['90,255,120', 0.2], tint: 'rgba(25,0,35,.35)' },
  ],
};

// Hasard décoratif stable.
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const propsOn = (theme, on) => (theme.props ?? []).filter((r) => r.on === on).flatMap((r) => r.objects);

// Description complète du décor d'une sous-zone (thème de la carte + précisions).
export function backdropOf(dungeonKey, floor = 1) {
  const theme = themeOf(dungeonKey, floor);
  const d = DUNGEONS[dungeonKey];
  const sub = d ? Math.max(0, d.subzones.indexOf(subzoneOf(dungeonKey, floor))) : 0;
  const extra = BACKS[dungeonKey]?.[sub] ?? {};
  const back = extra.back ?? (theme.outside?.wall ? 'wall' : theme.outside?.auto ? 'liquid' : 'trees');
  // Les objets hauts (arbres, colonnes) ne vont pas au sol : seulement les petits.
  const small = (list) => list.filter((o) => o[4] <= 16 && o[3] <= 16);
  return {
    key: `${dungeonKey}:${sub}`,
    theme,
    back,
    sky: extra.sky ?? ['#1b1620', '#3a3040'],
    trees: extra.trees ?? propsOn(theme, 'wall'),
    edge: extra.edge ?? propsOn(theme, 'edge'),
    onWall: extra.onWall ?? propsOn(theme, 'face'),
    scatter: small(extra.scatter ?? propsOn(theme, 'floor')),
    wall: extra.wall ?? null,
    ground: extra.ground ?? null,
    clearing: extra.clearing ?? false,
    glow: extra.glow ?? null,
    tint: extra.tint ?? null,
    weather: extra.weather ?? theme.weather ?? null,
  };
}

function sheetsOf(b) {
  const t = b.theme;
  const names = new Set();
  for (const layer of [t.base, t.floor, t.path, b.ground]) if (layer) names.add(layer.sheet);
  if (t.outside?.wall) names.add(t.outside.wall.sheet);
  if (t.outside?.auto) names.add(t.outside.auto.sheet);
  if (b.wall) names.add(b.wall.sheet);
  for (const o of [...b.trees, ...b.edge, ...b.onWall, ...b.scatter]) names.add(o[0]);
  return [...names];
}

// Une case de sol : tuile simple tirée au hasard ou autotile (`inside(x, y)` = même terrain).
function groundTile(ctx, imgs, layer, x, y, inside) {
  const img = imgs[layer.sheet];
  if (layer.auto) {
    drawFloorAuto(ctx, img, layer.auto, x, y, (dx, dy) => inside(x + dx, y + dy));
    return;
  }
  const [c, r] = layer.tiles[Math.floor(hash(x, y, 7) * layer.tiles.length)];
  ctx.drawImage(img, c * TILE, r * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
}

function drawObject(ctx, imgs, o, x, bottom) {
  const [name, sx, sy, w, h] = o;
  ctx.drawImage(imgs[name], sx, sy, w, h, Math.round(x - w / 2), Math.round(bottom - h), w, h);
}

// Objets en rangée (lisière, pied du mur) : un tous les `step` px environ, un peu décalés.
function row(ctx, imgs, list, { step, bottom, jitter = 3, salt = 0, from = 0 }) {
  if (!list.length) return;
  for (let i = 0, x = from; x < SW + step; i++, x += step) {
    const o = list[Math.floor(hash(i, salt, 3) * list.length)];
    const dx = (hash(i, salt, 5) - 0.5) * step * 0.5;
    const dy = Math.round((hash(i, salt, 9) - 0.5) * 2 * jitter);
    drawObject(ctx, imgs, o, x + dx, bottom + dy);
  }
}

// Dessine le décor sur un petit canvas (SW × SH) ; null tant qu'une planche charge.
function compose(b) {
  const imgs = Object.fromEntries(sheetsOf(b).map((n) => [n, sheet(n)]));
  if (!Object.values(imgs).every(Boolean)) return null;
  const c = document.createElement('canvas');
  c.width = SW;
  c.height = SH;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const t = b.theme;

  // Sol : fond (base), puis le sol des salles au milieu (autotile : une grande clairière).
  const groundTop = b.back === 'trees' ? 1 : FLOOR_ROW;
  const floor = b.ground ?? t.floor ?? t.base;
  const base = b.ground ?? t.base ?? floor;
  const patch = (x, y) => y >= FLOOR_ROW && y <= ROWS - 2 && x >= 1 && x <= COLS - 2;
  for (let y = groundTop; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      groundTile(ctx, imgs, base, x, y, () => true);
      if (floor !== base && (!floor.auto || (b.clearing && patch(x, y)))) groundTile(ctx, imgs, floor, x, y, patch);
    }
  }

  if (b.back === 'wall') {
    const w = t.outside.wall;
    const img = imgs[w.sheet];
    for (let x = 0; x < COLS; x++) {
      drawFloorAuto(ctx, img, w.top, x, 0, (dx, dy) => dy <= 0, w.fill ?? null);
      for (let y = 1; y < FLOOR_ROW; y++) drawWallAuto(ctx, img, w.face, x, y, (dx, dy) => y + dy >= 1 && y + dy < FLOOR_ROW);
    }
    row(ctx, imgs, b.onWall, { step: 56, bottom: FLOOR_ROW * TILE - 6, jitter: 0, salt: 1, from: 20 });
    row(ctx, imgs, b.edge, { step: 64, bottom: FLOOR_ROW * TILE + 2, jitter: 1, salt: 2, from: 36 });
  } else if (b.back === 'liquid') {
    const a = t.outside.auto;
    // Paroi au fond (2 rangées de face), le lac devant, sinon le lac jusqu'en haut.
    const top = b.wall ? 2 : 0;
    for (let y = 0; y < top; y++) for (let x = 0; x < COLS; x++) {
      drawWallAuto(ctx, imgs[b.wall.sheet], b.wall.face, x, y, (dx, dy) => y + dy >= 0 && y + dy < top);
    }
    for (let y = top; y < FLOOR_ROW; y++) for (let x = 0; x < COLS; x++) {
      drawFloorAuto(ctx, imgs[a.sheet], a.at, x, y, (dx, dy) => y + dy < FLOOR_ROW);
    }
    row(ctx, imgs, b.edge, { step: 60, bottom: FLOOR_ROW * TILE + 8, jitter: 3, salt: 2, from: 14 });
  } else {
    // Ciel, lisière lointaine assombrie, puis lisière proche.
    const g = ctx.createLinearGradient(0, 0, 0, 3 * TILE);
    g.addColorStop(0, b.sky[0]);
    g.addColorStop(1, b.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SW, 3 * TILE);
    const far = document.createElement('canvas');
    far.width = SW;
    far.height = SH;
    const fctx = far.getContext('2d');
    row(fctx, imgs, b.trees, { step: 30, bottom: 30, jitter: 4, salt: 11, from: 0 });
    fctx.globalCompositeOperation = 'source-atop';
    fctx.fillStyle = 'rgba(12,16,24,.55)';
    fctx.fillRect(0, 0, SW, SH);
    ctx.drawImage(far, 0, 0);
    row(ctx, imgs, b.trees, { step: 40, bottom: 50, jitter: 4, salt: 12, from: 12 });
    row(ctx, imgs, b.edge, { step: 38, bottom: 58, jitter: 3, salt: 2, from: 24 });
  }

  // Petits objets au sol, clairsemés (sous les combattants).
  if (b.scatter.length) {
    for (let i = 0; i < 9; i++) {
      const o = b.scatter[Math.floor(hash(i, 1, 21) * b.scatter.length)];
      const x = 10 + hash(i, 2, 22) * (SW - 20);
      const y = FLOOR_ROW * TILE + 20 + hash(i, 3, 23) * (SH - FLOOR_ROW * TILE - 22);
      drawObject(ctx, imgs, o, x, y);
    }
  }

  // Lumière : lueur du fond, voile de couleur, bas et haut assombris (les combattants ressortent).
  if (b.glow) {
    const [rgb, k] = b.glow;
    const g = ctx.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, `rgba(${rgb},${k})`);
    g.addColorStop(0.55, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SW, SH);
  }
  if (b.tint) {
    ctx.fillStyle = b.tint;
    ctx.fillRect(0, 0, SW, SH);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, SH);
  shade.addColorStop(0, 'rgba(0,0,0,.25)');
  shade.addColorStop(0.3, 'rgba(0,0,0,0)');
  shade.addColorStop(0.85, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,.3)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, SW, SH);
  return c;
}

const cache = new Map();

// Décor prêt à dessiner (petit canvas), ou null tant que les planches chargent.
export function battleBack(dungeonKey, floor) {
  const b = backdropOf(dungeonKey, floor);
  if (!cache.has(b.key)) {
    const c = compose(b);
    if (!c) return null;
    cache.set(b.key, { canvas: c, weather: b.weather });
  }
  return cache.get(b.key);
}

// Dessine le décor sur le canvas de combat (w × h), centré, agrandi ×3 ; neige animée.
export function drawBattleBack(ctx, back, w, h, now) {
  const dw = SW * BACK_ZOOM;
  const dh = SH * BACK_ZOOM;
  ctx.drawImage(back.canvas, Math.round((w - dw) / 2), h - dh, dw, dh);
  if (back.weather === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 70; i++) {
      const speed = 18 + hash(i, 0, 31) * 26;
      const x = (hash(i, 1, 32) * w + Math.sin(now / 900 + i) * 14 + now / 1000 * 10) % w;
      const y = (hash(i, 2, 33) * h + now / 1000 * speed) % h;
      const s = hash(i, 3, 34) < 0.3 ? 3 : 2;
      ctx.fillRect(Math.round(x), Math.round(y), s, s);
    }
  }
}
