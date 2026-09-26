// Décor des cartes d'étage, par zone : couche fixe (sol, arbres, rochers) dessinée une
// fois par étage à la taille des sprites (16 px par case), puis recopiée par mapView.js.
// Forêt Maudite : pack Fan-tasy (sol en tuiles « blob », murs = forêt). Autres zones :
// couleurs unies en attendant leurs graphismes.

import { idx, isFloor } from '../game/floorMap.js';
import { blobTile } from './autotile.js';
import { image, isReady } from './sprites.js';

export const TILE = 16;

// Héros sur la carte : planches du pack (4 images par ligne, 40 × 48 px).
// Lignes : 0 = profil (vers la droite, retourné pour la gauche), 2 = dos, 3 = face.
export const HERO = {
  walk: 'fantasy/Character_Walk',
  idle: 'fantasy/Character_Idle',
  frameW: 40,
  frameH: 48,
  frames: 4,
  rows: { right: 0, left: 0, up: 2, down: 3 },
  footOffset: 6,
};

const FOREST = {
  ground: 'fantasy/Tileset_Ground',
  groundCol: 6, // moitié droite du tileset : herbe sur terre battue
  grassVariants: [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [5, 9]],
  trees: ['fantasy/Tree_Emerald_1', 'fantasy/Tree_Emerald_2', 'fantasy/Tree_Emerald_3', 'fantasy/Tree_Emerald_4'],
  bushes: ['fantasy/Bush_Emerald_1', 'fantasy/Bush_Emerald_3', 'fantasy/Bush_Emerald_4', 'fantasy/Bush_Emerald_5', 'fantasy/Bush_Emerald_6', 'fantasy/Bush_Emerald_7'],
  rocks: ['fantasy/Rock_Brown_1', 'fantasy/Rock_Brown_4', 'fantasy/Rock_Brown_6', 'fantasy/Rock_Brown_9'],
};

// Zones sans graphismes : couleurs { wall, floor, edge }.
const PALETTES = {
  catacombes: { wall: '#17151c', floor: '#4a4553', edge: '#2a2631' },
  cavernesArdentes: { wall: '#220f0a', floor: '#5c3322', edge: '#3a1c12' },
  picsGeles: { wall: '#1a2430', floor: '#8ea6b8', edge: '#4d6272' },
  abimeInfernal: { wall: '#170609', floor: '#4a1c26', edge: '#2c0d14' },
};

// Hasard décoratif stable par case (le même décor à chaque affichage).
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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
  const complete = dungeonKey === 'foretMaudite' ? drawForest(ctx, map) : drawPlain(ctx, map, PALETTES[dungeonKey] ?? PALETTES.catacombes);
  cache.set(map, { canvas, complete });
  return canvas;
}

function drawPlain(ctx, map, pal) {
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const floor = map.tiles[idx(map, x, y)] === 1;
      const edge = !floor && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isFloor(map, x + dx, y + dy));
      ctx.fillStyle = floor ? pal.floor : edge ? pal.edge : pal.wall;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      if (floor) {
        ctx.strokeStyle = 'rgba(0,0,0,.15)';
        ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
      }
    }
  }
  return true;
}

// Forêt : sol de terre battue dans les salles et couloirs, herbe partout ailleurs (bords
// « blob »), arbres dans l'herbe loin des chemins, buissons et rochers en lisière.
// Retourne faux si des images ne sont pas encore chargées (la couche sera redessinée).
function drawForest(ctx, map) {
  const keys = [FOREST.ground, ...FOREST.trees, ...FOREST.bushes, ...FOREST.rocks];
  if (!keys.every((k) => isReady(image(k)))) {
    drawPlain(ctx, map, { wall: '#2e4a24', floor: '#8a6a45', edge: '#3c5a2e' });
    return false;
  }
  const ground = image(FOREST.ground);
  const wall = (x, y) => !isFloor(map, x, y); // hors carte : herbe
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      let [tx, ty] = blobTile((dx, dy) => wall(x + dx, y + dy));
      tx += FOREST.groundCol;
      // Herbe pleine : variantes (touffes) pour éviter la répétition.
      if (tx === FOREST.groundCol + 2 && ty === 1 && hash(x, y) < 0.35) {
        [tx, ty] = FOREST.grassVariants[Math.floor(hash(x, y, 1) * FOREST.grassVariants.length)];
      }
      ctx.drawImage(ground, tx * TILE, ty * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Décors, dessinés de haut en bas : { y (bas du sprite), draw }.
  const props = [];
  const nearFloor = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isFloor(map, x + dx, y + dy));
  // Un décor ne doit jamais recouvrir un chemin : toutes les cases sous le sprite (sa
  // largeur, sa hauteur au-dessus du pied) doivent être de l'herbe.
  const fits = (img, x, y, jitter) => {
    const left = Math.floor((x * TILE + TILE / 2 - img.width / 2 + jitter + 2) / TILE);
    const right = Math.floor((x * TILE + TILE / 2 + img.width / 2 + jitter - 3) / TILE);
    const top = y - Math.ceil(img.height / TILE) + 1;
    for (let cy = top; cy <= y; cy++) for (let cx = left; cx <= right; cx++) if (isFloor(map, cx, cy)) return false;
    return true;
  };
  const place = (key, x, y, jitter = 0) => {
    const img = image(key);
    if (!fits(img, x, y, jitter)) return false;
    const px = Math.round(x * TILE + TILE / 2 - img.width / 2 + jitter);
    const py = y * TILE + TILE - img.height;
    props.push({ y: py + img.height, draw: () => ctx.drawImage(img, px, py) });
    return true;
  };
  for (let y = 0; y < map.h + 6; y++) {
    for (let x = -2; x <= map.w + 1; x++) {
      if (isFloor(map, x, y)) continue;
      const r = hash(x, y, 2);
      const grid = x % 2 === 0 && y % 2 === 0;
      const tree = FOREST.trees[Math.floor(hash(x, y, 3) * FOREST.trees.length)];
      if (r < (grid ? 0.85 : 0.1) && place(tree, x, y, Math.round((hash(x, y, 4) - 0.5) * 8))) continue;
      if (y < map.h && x >= 0 && x < map.w && nearFloor(x, y)) {
        if (r < 0.35) place(FOREST.bushes[Math.floor(hash(x, y, 5) * FOREST.bushes.length)], x, y);
        else if (r < 0.45) place(FOREST.rocks[Math.floor(hash(x, y, 6) * FOREST.rocks.length)], x, y);
      }
    }
  }
  props.sort((a, b) => a.y - b.y).forEach((p) => p.draw());
  return true;
}
