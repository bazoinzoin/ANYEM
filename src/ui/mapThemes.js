// Décor des cartes d'étage, par zone : couche fixe (sol, murs, arbres, objets) dessinée une
// fois par étage à la taille des tuiles (16 px par case), puis recopiée par mapView.js.
// Graphismes : chipsets RPG Maker 2003 (assets/rm2k3/chip_*.png, 30 × 16 tuiles) :
//   colonnes 0 à 17 : sol (autotiles de 3 × 4 tuiles et tuiles simples) ;
//   colonnes 18 à 29 : objets posés sur le sol, fond de couleur clé (rendu transparent).

import { idx, isFloor } from '../game/floorMap.js';
import { rmQuarter } from './autotile.js';
import { image, isReady } from './sprites.js';
import { recolored } from './recolor.js';

export const TILE = 16;

// Thème d'une zone :
//   chip       image du chipset ; recolor : (h, s, l) → [h, s, l] | null (variante de couleurs)
//   floor      sol des salles et couloirs : { auto: [col, ligne] } (autotile, bords contre les
//              murs) ou { tiles: [[col, ligne], …] } (tuiles simples tirées au hasard)
//   outside    tout le reste (murs) : { auto } (autotile, bords contre le sol) ou { tiles }
//   face       mur vu de face juste au-dessus du sol (donjons) : { low, high } tuiles
//   props      objets : [{ on, chance, grid?, objects: [[col, ligne, largeur, hauteur], …] }]
//              on : 'wall' (hors sol), 'edge' (mur voisin du sol), 'face' (sur un mur de face),
//              'floor' (sur le sol, petits objets plats) ; grid : chance sur une case paire
//   weather    'snow' : neige qui tombe (mapView.js)
const TREES = [[19, 8, 1, 2], [20, 8, 2, 2], [22, 8, 2, 2], [18, 10, 2, 3], [24, 8, 1, 3], [27, 9, 1, 2], [28, 9, 1, 2], [24, 11, 1, 2], [24, 13, 1, 3]];

const THEMES = {
  foretMaudite: {
    chip: 'rm2k3/chip_forest',
    floor: { auto: [0, 12] },
    outside: { tiles: [[1, 10]] },
    props: [
      { on: 'wall', chance: 0.12, grid: 0.9, objects: TREES },
      { on: 'edge', chance: 0.35, objects: [[18, 9, 1, 1], [21, 14, 1, 1], [22, 14, 1, 1], [20, 14, 1, 1], [28, 15, 1, 1]] },
      { on: 'floor', chance: 0.015, objects: [[19, 14, 1, 1]] },
    ],
  },
  catacombes: {
    chip: 'rm2k3/chip_dungeon',
    floor: { tiles: [[13, 1], [13, 1], [12, 0], [13, 0], [14, 0], [12, 1], [14, 1]] },
    outside: { tiles: [[10, 6]] },
    face: { low: [13, 3], high: [13, 2] },
    props: [
      { on: 'face', chance: 0.12, objects: [[24, 8, 1, 1]] },
      { on: 'face', chance: 0.06, objects: [[25, 4, 1, 2], [26, 4, 1, 2]] },
      { on: 'floor', chance: 0.02, objects: [[29, 9, 1, 1], [27, 4, 1, 1], [28, 4, 1, 1]] },
    ],
  },
  cavernesArdentes: {
    chip: 'rm2k3/chip_lava',
    floor: { tiles: [[1, 14], [1, 14], [12, 8], [13, 8], [14, 8]] },
    outside: { auto: [3, 12] },
    props: [
      { on: 'wall', chance: 0.03, objects: [[24, 1, 1, 1], [25, 1, 1, 1], [26, 1, 1, 1]] },
    ],
  },
  picsGeles: {
    chip: 'rm2k3/chip_dungeon',
    floor: { tiles: [[7, 2]] },
    outside: { auto: [9, 8] },
    weather: 'snow',
    props: [
      { on: 'edge', chance: 0.14, objects: [[22, 8, 1, 2], [21, 8, 1, 2], [23, 13, 1, 1], [22, 12, 1, 1]] },
      { on: 'floor', chance: 0.008, objects: [[15, 10, 1, 2]] },
    ],
  },
  abimeInfernal: {
    chip: 'rm2k3/chip_lava',
    // La lave des cavernes, virée au pourpre : l'Abîme.
    recolor: (h, s, l) => (s < 0.2 ? [h, s, l * 0.8] : [h + 275, s * 0.9, l * 0.85]),
    floor: { tiles: [[1, 14], [1, 14], [12, 8], [13, 8], [14, 8]] },
    outside: { auto: [3, 12] },
    props: [
      { on: 'wall', chance: 0.04, objects: [[24, 1, 1, 1], [25, 1, 1, 1], [26, 1, 1, 1]] },
    ],
  },
};

export function themeOf(dungeonKey) {
  return THEMES[dungeonKey] ?? THEMES.foretMaudite;
}

// Hasard décoratif stable par case (le même décor à chaque affichage).
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Chipset prêt à dessiner : recoloré si besoin, couleur clé des objets rendue transparente
// (la couleur la plus fréquente des colonnes 18 à 29). Canvas mis en cache, ou null.
const chips = new Map();
function chipOf(theme) {
  const id = `${theme.chip}|${theme.recolor ? 'r' : ''}`;
  if (chips.has(id)) return chips.get(id);
  const src = theme.recolor ? recolored(theme.chip, 'theme', theme.recolor) : image(theme.chip);
  if (!src || (src instanceof HTMLImageElement && !isReady(src))) return null;
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const counts = new Map();
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 18 * TILE; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const key = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 18 * TILE; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]) === key) px[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  chips.set(id, canvas);
  return canvas;
}

// Chipset `key` prêt à dessiner (couleur clé des objets transparente), ou null s'il charge.
export function chipImage(key) {
  return chipOf({ chip: key });
}

const cache = new WeakMap();

// Couche fixe de la carte (canvas map.w × map.h cases de 16 px), mise en cache par carte.
export function staticLayer(map, dungeonKey) {
  const cached = cache.get(map);
  if (cached?.complete) return cached.canvas;
  const canvas = cached?.canvas ?? document.createElement('canvas');
  canvas.width = map.w * TILE;
  canvas.height = map.h * TILE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const theme = themeOf(dungeonKey);
  const chip = chipOf(theme);
  let complete = false;
  if (chip) {
    drawTheme(ctx, map, theme, chip);
    complete = true;
  } else {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  cache.set(map, { canvas, complete });
  return canvas;
}

function drawTheme(ctx, map, theme, chip) {
  const floor = (x, y) => isFloor(map, x, y);
  const tile = ([c, r], x, y) => ctx.drawImage(chip, c * TILE, r * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
  const auto = ([c, r], x, y, same) => {
    for (let q = 0; q < 4; q++) {
      const [col, row] = rmQuarter(same, q);
      const qx = (q % 2) * 8;
      const qy = (q >> 1) * 8;
      ctx.drawImage(chip, (c + col) * TILE + qx, (r + row) * TILE + qy, 8, 8, x * TILE + qx, y * TILE + qy, 8, 8);
    }
  };
  const pick = (list, x, y, salt) => list[Math.floor(hash(x, y, salt) * list.length)];
  // Mur vu de face : juste au-dessus du sol (bas), ou deux cases au-dessus (haut).
  const faceAt = (x, y) => {
    if (!theme.face || floor(x, y)) return null;
    if (floor(x, y + 1)) return 'low';
    if (floor(x, y + 2) && theme.face.high) return 'high';
    return null;
  };

  // Sol et murs.
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (floor(x, y)) {
        if (theme.floor.auto) auto(theme.floor.auto, x, y, (dx, dy) => floor(x + dx, y + dy));
        else tile(pick(theme.floor.tiles, x, y, 1), x, y);
        continue;
      }
      const face = faceAt(x, y);
      if (face) tile(theme.face[face], x, y);
      else if (theme.outside.auto) auto(theme.outside.auto, x, y, (dx, dy) => !floor(x + dx, y + dy));
      else tile(pick(theme.outside.tiles, x, y, 2), x, y);
    }
  }

  // Objets, dessinés de haut en bas (les plus bas passent devant).
  const props = [];
  const used = new Set(); // cases de base déjà occupées
  const clear = (x, y, w, h, allowFace) => {
    for (let cy = y - h + 1; cy <= y; cy++) {
      for (let cx = x; cx < x + w; cx++) {
        if (floor(cx, cy)) return false;
        if (!allowFace && faceAt(cx, cy)) return false;
      }
    }
    for (let cx = x; cx < x + w; cx++) if (used.has(`${cx},${y}`)) return false;
    return true;
  };
  const place = ([c, r, w, h], x, y) => {
    for (let cx = x; cx < x + w; cx++) used.add(`${cx},${y}`);
    props.push({ y, draw: () => ctx.drawImage(chip, c * TILE, r * TILE, w * TILE, h * TILE, x * TILE, (y - h + 1) * TILE, w * TILE, h * TILE) });
  };
  const nearFloor = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => floor(x + dx, y + dy));
  (theme.props ?? []).forEach((rule, ri) => {
    const margin = rule.on === 'wall' ? 2 : 0;
    for (let y = 0; y < map.h + margin * 2; y++) {
      for (let x = -margin; x < map.w + margin; x++) {
        const isFloorCell = floor(x, y);
        if (rule.on === 'floor' ? !isFloorCell : isFloorCell) continue;
        if (rule.on === 'edge' && (y >= map.h || !nearFloor(x, y) || faceAt(x, y))) continue;
        if (rule.on === 'face' && faceAt(x, y) !== 'low') continue;
        const chance = rule.grid !== undefined && x % 2 === 0 && y % 2 === 0 ? rule.grid : rule.chance;
        if (hash(x, y, 10 + ri) >= chance) continue;
        const obj = pick(rule.objects, x, y, 20 + ri);
        const left = x - Math.floor((obj[2] - 1) / 2);
        if (rule.on === 'floor') {
          props.push({ y, draw: () => ctx.drawImage(chip, obj[0] * TILE, obj[1] * TILE, obj[2] * TILE, obj[3] * TILE, left * TILE, (y - obj[3] + 1) * TILE, obj[2] * TILE, obj[3] * TILE) });
        } else if (clear(left, y, obj[2], obj[3], rule.on === 'face')) {
          place(obj, left, y);
        }
      }
    }
  });
  props.sort((a, b) => a.y - b.y).forEach((p) => p.draw());
}
