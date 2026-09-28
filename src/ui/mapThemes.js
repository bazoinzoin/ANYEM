// Décor des cartes d'étage : un thème par sous-zone (3 par donjon). La couche fixe (sol,
// murs, arbres, objets) est dessinée une fois par étage à la taille des tuiles (16 px par
// case), puis recopiée par mapView.js.
// Graphismes : packs Raven Fantasy (assets/raven/, voir assets/CREDITS.md) :
//   <pack>_A1 / _A2 / _A4 / _A5 : planches RPG Maker MV réduites en tuiles de 16 px
//     (A1 liquides et A2 chemins : autotiles de sol ; A4 : murs, dessus + face ; A5 : tuiles simples) ;
//   <pack>_obj : planche d'objets (fond transparent), objets repérés en pixels.

import { isFloor } from '../game/floorMap.js';
import { subzoneOf } from '../game/dungeon.js';
import { DUNGEONS } from '../data/dungeons.js';
import { mvFloorQuarter, mvWallQuarter } from './autotile.js';
import { image, isReady } from './sprites.js';

export const TILE = 16;

// ---- Objets : [planche, x, y, largeur, hauteur] en pixels ----

const o = (sheet, x, y, w, h) => [sheet, x, y, w, h];
const tiles = (sheet, c, r, w, h) => o(sheet, c * TILE, r * TILE, w * TILE, h * TILE);

const F = {
  treeGreen: tiles('forest_obj', 0, 5, 3, 4),
  treeAutumn: tiles('forest_obj', 3, 5, 3, 4),
  treeDark1: o('forest2_obj', 1, 150, 46, 55),
  treeDark2: o('forest2_obj', 49, 150, 46, 55),
  deadTree1: o('forest_obj', 2, 35, 41, 42),
  deadTree2: o('forest_obj', 48, 32, 43, 45),
  bush: tiles('forest_obj', 9, 1, 1, 1),
  berryBush: o('forest2_obj', 32, 16, 16, 15),
  roundBush: o('forest2_obj', 48, 16, 16, 15),
  roseBush: o('forest2_obj', 64, 16, 16, 15),
  reeds: tiles('forest_obj', 10, 1, 1, 2),
  cattails: o('forest_obj', 80, 160, 16, 28),
  rock: o('forest_obj', 98, 2, 28, 28),
  mossRock: o('forest_obj', 98, 34, 28, 28),
  pebble1: o('forest_obj', 66, 5, 13, 9),
  pebble2: o('forest_obj', 81, 2, 14, 12),
  pebble3: o('forest_obj', 66, 21, 13, 9),
  pebble4: o('forest_obj', 81, 18, 14, 12),
  greyRock: o('forest2_obj', 128, 17, 16, 14),
  log: o('forest_obj', 128, 33, 31, 13),
  stump: o('forest_obj', 107, 68, 26, 25),
  bigStump: o('forest2_obj', 104, 181, 31, 24),
  vine: o('forest2_obj', 208, 144, 16, 47),
  menhir1: o('forest2_obj', 208, 4, 31, 44),
  menhir2: o('forest2_obj', 240, 3, 16, 44),
  dolmen1: o('forest2_obj', 259, 0, 29, 47),
  dolmen2: o('forest2_obj', 293, 0, 40, 47),
  menhir3: o('forest2_obj', 352, 3, 16, 44),
  runeStone: o('forest2_obj', 371, 16, 28, 30),
  flowersPurple: o('forest_obj', 178, 32, 14, 14),
  flowersRed: o('forest_obj', 96, 161, 15, 14),
  flowersYellow: o('forest2_obj', 145, 34, 14, 11),
  flowersYellow2: o('forest2_obj', 128, 33, 9, 13),
  flowersBlue: o('forest2_obj', 138, 50, 22, 13),
  lilies: o('forest2_obj', 17, 48, 13, 15),
  mushrooms: o('forest2_obj', 16, 33, 15, 14),
  redMushrooms: o('forest2_obj', 33, 49, 14, 13),
  sunflower: tiles('forest_obj', 13, 0, 1, 2),
};

const D = {
  crate: o('dungeon_obj', 69, 50, 22, 27),
  crate1: o('dungeon_obj', 0, 88, 16, 21),
  barrels: o('dungeon_obj', 80, 84, 32, 24),
  barrel: o('dungeon_obj', 120, 82, 16, 24),
  torch: o('dungeon_obj', 162, 87, 12, 21),
  torch2: o('dungeon_obj', 178, 86, 12, 22),
  hangingSkeleton: o('dungeon_obj', 226, 66, 27, 30),
  skull: o('dungeon_obj', 210, 82, 13, 12),
  bone: o('dungeon_obj', 208, 99, 14, 11),
  bones: o('dungeon_obj', 225, 97, 15, 14),
  tombSmall1: o('dungeon_obj', 50, 80, 12, 15),
  tombSmall2: o('dungeon_obj', 66, 80, 12, 15),
  pillar: o('dungeon_obj', 131, 132, 10, 39),
  brokenPillar: o('dungeon_obj', 147, 148, 10, 23),
  rubble1: o('dungeon_obj', 98, 178, 12, 11),
  rubble2: o('dungeon_obj', 114, 177, 12, 15),
  rubble3: o('dungeon_obj', 129, 178, 14, 12),
  rubblePile: o('dungeon_obj', 117, 196, 23, 24),
  candle: o('dungeon_obj', 213, 195, 6, 13),
  tomb: o('dungeon_obj', 248, 176, 32, 32),
  fountain: o('dungeon_obj', 290, 177, 28, 30),
  coffin1: o('dungeon_obj', 242, 218, 28, 19),
  coffin2: o('dungeon_obj', 274, 217, 28, 20),
  blood: o('dungeon_obj', 101, 228, 38, 24),
  rug: o('dungeon_obj', 150, 228, 38, 24),
  roots: o('dungeon_obj', 121, 256, 63, 48),
  roots2: o('dungeon_obj', 208, 288, 32, 48),
  grave1: o('dungeon_obj', 58, 305, 28, 31),
  grave2: o('dungeon_obj', 106, 305, 28, 31),
  grave3: o('dungeon_obj', 10, 337, 28, 31),
  grave4: o('dungeon_obj', 58, 337, 28, 31),
  graveOpen: o('dungeon_obj', 10, 305, 28, 31),
};

const C = {
  mushroom1: o('cave_obj', 81, 4, 7, 10),
  mushroom2: o('cave_obj', 97, 2, 14, 12),
  mushroom3: o('cave_obj', 112, 0, 15, 14),
  rock1: o('cave_obj', 2, 228, 13, 10),
  rock2: o('cave_obj', 17, 225, 14, 13),
  rock3: o('cave_obj', 2, 244, 13, 10),
  rock4: o('cave_obj', 17, 241, 14, 13),
  boulder: o('cave_obj', 34, 225, 28, 29),
  mossBoulder: o('cave_obj', 2, 257, 28, 29),
  crate1: o('cave_obj', 64, 249, 16, 21),
  crate2: o('cave_obj', 88, 247, 16, 21),
  barrel: o('cave_obj', 104, 212, 16, 24),
  lantern: o('cave_obj', 19, 288, 10, 32),
  lantern2: o('cave_obj', 35, 288, 10, 32),
  shovel: o('cave_obj', 67, 178, 9, 26),
  pickaxe: o('cave_obj', 82, 185, 13, 19),
  wood: o('cave_obj', 97, 145, 15, 15),
  oreGrey: o('cave_obj', 0, 321, 16, 29),
  oreGold: o('cave_obj', 48, 321, 16, 29),
  oreGreen: o('cave_obj', 64, 321, 16, 29),
  oreBlue: o('cave_obj', 80, 321, 16, 29),
  orePurple: o('cave_obj', 96, 321, 16, 29),
  cart: o('cave_obj', 64, 437, 16, 24),
};

const W = {
  snowRock: o('winter_obj', 17, 2, 13, 13),
  snowBoulder: o('winter_obj', 38, 7, 19, 18),
  bush: o('winter_obj', 69, 1, 22, 46),
  snowBush: o('winter_obj', 101, 1, 22, 46),
  snowTree: tiles('winter_obj', 8, 0, 3, 4),
  snowTreeSmall: tiles('winter_obj', 11, 1, 2, 3),
  deadPine: o('winter_obj', 212, 6, 41, 57),
  deadTrunk: o('winter_obj', 261, 12, 21, 48),
  snowman: o('winter_obj', 4, 38, 24, 39),
  stone: o('winter_obj', 39, 34, 19, 28),
  stump: o('winter_obj', 293, 42, 21, 18),
  grave: o('winter_obj', 71, 50, 19, 28),
  runeStone: o('winter_obj', 39, 66, 19, 28),
  iceSpike: o('winter_obj', 98, 65, 11, 30),
  snowPine: o('winter_obj', 129, 66, 47, 61),
  greenPine: tiles('winter_obj', 11, 4, 3, 4),
  twigs: o('winter_obj', 97, 97, 15, 14),
  sapling: o('winter_obj', 113, 96, 14, 16),
  branch: o('winter_obj', 99, 116, 29, 7),
  snowStump1: o('winter_obj', 273, 129, 13, 22),
  snowStump2: o('winter_obj', 289, 129, 13, 22),
};

const U = {
  redShards: o('underworld_obj', 64, 49, 16, 14),
  redCrystal: o('underworld_obj', 84, 49, 25, 30),
  redSpike: o('underworld_obj', 113, 48, 14, 31),
  tealShards: o('underworld_obj', 128, 49, 16, 14),
  tealCrystal: o('underworld_obj', 148, 49, 25, 30),
  tealSpike: o('underworld_obj', 177, 48, 14, 31),
  blueCrystal: o('underworld_obj', 84, 81, 25, 30),
  blueSpike: o('underworld_obj', 113, 80, 14, 31),
  purpleCrystal: o('underworld_obj', 148, 81, 25, 30),
  purpleSpike: o('underworld_obj', 177, 80, 14, 31),
  skull1: o('underworld_obj', 275, 51, 10, 9),
  skull2: o('underworld_obj', 291, 51, 10, 9),
  skull3: o('underworld_obj', 275, 83, 10, 9),
  column: o('underworld_obj', 387, 52, 10, 38),
  brokenColumn: o('underworld_obj', 403, 68, 10, 22),
  rubble: o('underworld_obj', 418, 81, 30, 13),
  purpleRock: o('underworld_obj', 194, 82, 29, 28),
  skullPile: o('underworld_obj', 305, 97, 29, 30),
  bigTealCrystal: o('underworld_obj', 0, 112, 15, 32),
  bigRedCrystal: o('underworld_obj', 18, 112, 26, 31),
  bigPinkCrystal: o('underworld_obj', 48, 112, 15, 32),
  bigPurpleCrystal: o('underworld_obj', 66, 112, 26, 31),
  redTree1: o('underworld_obj', 129, 113, 47, 61),
  redTree2: o('underworld_obj', 177, 113, 47, 61),
  redTree3: o('underworld_obj', 98, 130, 27, 44),
  redTree4: o('underworld_obj', 130, 180, 44, 44),
  redRoots: o('underworld_obj', 393, 128, 63, 48),
  skeleton: o('underworld_obj', 289, 153, 30, 22),
  tentacles: o('underworld_obj', 480, 160, 32, 48),
  pillar: o('underworld_obj', 1, 177, 30, 94),
  grave1: o('underworld_obj', 330, 177, 28, 31),
  grave2: o('underworld_obj', 378, 177, 28, 31),
  grave3: o('underworld_obj', 330, 209, 28, 31),
  graveOpen: o('underworld_obj', 282, 177, 28, 31),
  flame1: o('underworld_obj', 19, 280, 10, 17),
  flame2: o('underworld_obj', 36, 281, 8, 16),
  statues: o('underworld_obj', 86, 276, 52, 44),
  statue: o('underworld_obj', 150, 275, 21, 45),
  brazier: o('underworld_obj', 0, 288, 16, 32),
};

// Catalogues d'objets, repris par les fonds de combat (ui/battleBacks.js).
export const PROPS = { forest: F, dungeon: D, cave: C, winter: W, abyss: U };

// ---- Thèmes ----
// Un thème :
//   base      tuiles posées partout, sous le reste : { sheet, tiles: [[col, ligne], …] }
//   floor     sol des salles : { sheet, tiles } (tuiles simples tirées au hasard) ou { sheet, auto: [col, ligne] }
//   path      sol des couloirs (par défaut celui des salles) ; un autotile s'y pose par-dessus le fond
//   outside   hors du sol : absent (le fond seul), { wall: { sheet, top, face, fill? } } (mur : dessus
//             en autotile, centre de la couleur `fill` s'il y en a une, face de 2 cases au-dessus
//             du sol) ou { auto: { sheet, at } } (liquide, vide)
//   props     objets : [{ on, chance, grid?, objects }] ; on : 'wall' (hors sol, toute l'emprise
//             hors sol et hors face), 'edge' (idem, voisin du sol), 'face' (sur la face basse d'un
//             mur), 'floor' (sur le sol, petits objets plats) ; grid : chance sur une case paire
//   shade     assombrit le fond hors du sol (0 à 1) pour que les salles ressortent
//   weather   'snow' : neige qui tombe (mapView.js)
const grass = { sheet: 'forest_A5', tiles: [[0, 1]] };
const darkGrass = { sheet: 'forest_A5', tiles: [[1, 1], [2, 1], [1, 1]] };
const dirt = { sheet: 'forest_A2', auto: [8, 0] };
const snow = { sheet: 'winter_A5', tiles: [[1, 0]] };
const caveFloor = { sheet: 'cave_A5', tiles: [[1, 0], [1, 0], [1, 0], [1, 0], [3, 0], [2, 0]] };
const purpleFloor = { sheet: 'underworld_A5', tiles: [[1, 1], [1, 2], [2, 2], [1, 1], [2, 1]] };

const forestEdge = { on: 'edge', chance: 0.45, objects: [F.bush, F.berryBush, F.roundBush, F.roseBush, F.pebble1, F.pebble2, F.mossRock, F.rock, F.log, F.stump, F.reeds] };
const forestFlowers = { on: 'floor', chance: 0.04, objects: [F.flowersPurple, F.flowersYellow, F.flowersYellow2, F.flowersBlue, F.lilies, F.pebble3, F.pebble4] };
const crypt = { wall: { sheet: 'dungeon_A4', top: [0, 0], face: [0, 3], fill: '#1d1720' } };
const dungeonFloorProps = { on: 'floor', chance: 0.035, objects: [D.skull, D.bone, D.bones, D.rubble1, D.rubble2, D.rubble3, D.candle] };
const caveWall = { wall: { sheet: 'cave_A4', top: [0, 0], face: [0, 3], fill: '#22181a' } };
const caveFloorProps = { on: 'floor', chance: 0.035, objects: [C.mushroom1, C.mushroom2, C.mushroom3, C.rock1, C.rock2, C.rock3, C.rock4, C.wood] };
const winterEdge = { on: 'edge', chance: 0.35, objects: [W.snowRock, W.snowBoulder, W.snowBush, W.stump, W.twigs, W.sapling, W.snowStump1, W.snowStump2, W.branch, W.iceSpike] };
const winterTrees = { on: 'wall', chance: 0.12, grid: 0.9, objects: [W.snowTree, W.snowPine, W.snowPine, W.greenPine, W.snowTreeSmall] };
const abyssFloorProps = { on: 'floor', chance: 0.035, objects: [U.skull1, U.skull2, U.skull3, U.redShards, U.tealShards, U.flame1, U.flame2, U.rubble] };

const THEMES = {
  foretMaudite: [
    { // La Lisière : clairières dans la forêt verte, sentiers de terre.
      base: grass,
      floor: dirt,
      props: [
        { on: 'wall', chance: 0.12, grid: 0.92, objects: [F.treeGreen, F.treeGreen, F.treeDark1, F.treeDark2] },
        forestEdge,
        forestFlowers,
      ],
    },
    { // Les Sous-bois : forêt plus sombre, feuillages d'automne, champignons.
      base: darkGrass,
      floor: dirt,
      props: [
        { on: 'wall', chance: 0.12, grid: 0.92, objects: [F.treeAutumn, F.treeDark2, F.treeDark1, F.treeAutumn, F.treeGreen] },
        { ...forestEdge, objects: [...forestEdge.objects, F.cattails, F.vine, F.bigStump] },
        { on: 'floor', chance: 0.05, objects: [F.mushrooms, F.redMushrooms, F.flowersRed, F.pebble3, F.lilies] },
      ],
    },
    { // Le Cœur de la forêt : arbres morts et pierres levées.
      base: darkGrass,
      floor: dirt,
      props: [
        { on: 'wall', chance: 0.1, grid: 0.85, objects: [F.deadTree1, F.deadTree2, F.treeAutumn, F.deadTree1, F.treeDark2] },
        { on: 'edge', chance: 0.4, objects: [F.menhir1, F.menhir2, F.menhir3, F.dolmen1, F.dolmen2, F.runeStone, F.mossRock, F.stump, F.bigStump, F.vine] },
        { on: 'floor', chance: 0.04, objects: [F.redMushrooms, F.flowersRed, F.mushrooms, F.pebble4] },
      ],
    },
  ],
  catacombes: [
    { // Le Vieux cimetière : tombes et arbres morts sous le ciel.
      base: darkGrass,
      floor: dirt,
      path: { sheet: 'dungeon_A5', tiles: [[1, 1], [3, 1]] },
      props: [
        { on: 'wall', chance: 0.1, grid: 0.75, objects: [F.deadTree1, F.deadTree2, D.roots, D.roots2, F.deadTree2] },
        { on: 'edge', chance: 0.5, objects: [D.grave1, D.grave2, D.grave3, D.grave4, D.graveOpen, D.tombSmall1, D.tombSmall2, D.brokenPillar, D.tomb] },
        { on: 'floor', chance: 0.035, objects: [D.skull, D.bone, D.bones, F.flowersPurple, D.candle] },
      ],
    },
    { // L'Ossuaire : pavés, os et torches.
      floor: { sheet: 'dungeon_A5', tiles: [[1, 1], [1, 1], [3, 1]] },
      outside: crypt,
      props: [
        { on: 'face', chance: 0.14, objects: [D.torch, D.torch2] },
        { on: 'face', chance: 0.05, objects: [D.hangingSkeleton] },
        { ...dungeonFloorProps, objects: [...dungeonFloorProps.objects, D.blood, D.rubblePile] },
      ],
    },
    { // La Crypte royale : dallage orné, cercueils.
      floor: { sheet: 'dungeon_A5', tiles: [[1, 0], [1, 0], [2, 1], [4, 1]] },
      outside: crypt,
      props: [
        { on: 'face', chance: 0.16, objects: [D.torch, D.torch2] },
        { on: 'floor', chance: 0.02, objects: [D.coffin1, D.coffin2, D.rug, D.candle] },
        dungeonFloorProps,
      ],
    },
  ],
  cavernesArdentes: [
    { // Les Galeries : mine abandonnée.
      floor: caveFloor,
      outside: caveWall,
      props: [
        { on: 'face', chance: 0.12, objects: [C.lantern, C.lantern2] },
        { on: 'face', chance: 0.06, objects: [C.oreGrey, C.oreGold, C.oreBlue] },
        { ...caveFloorProps, objects: [...caveFloorProps.objects, C.shovel, C.pickaxe] },
      ],
    },
    { // Les Forges noyées : îlots au milieu d'un lac souterrain.
      base: { sheet: 'cave_A5', tiles: [[1, 0]] },
      floor: caveFloor,
      outside: { auto: { sheet: 'cave_A1', at: [0, 0] } },
      props: [caveFloorProps, { on: 'floor', chance: 0.01, objects: [C.oreGreen, C.orePurple, C.crate1, C.barrel] }],
    },
    { // Le Lac de lave.
      base: { sheet: 'cave_A5', tiles: [[1, 0]] },
      floor: caveFloor,
      outside: { auto: { sheet: 'cave_A1', at: [0, 3] } },
      props: [caveFloorProps],
    },
  ],
  picsGeles: [
    { // Les Contreforts : forêt enneigée.
      base: snow,
      floor: { sheet: 'winter_A2', auto: [8, 0] },
      weather: 'snow',
      props: [winterTrees, winterEdge, { on: 'floor', chance: 0.012, objects: [W.twigs, W.snowRock, W.sapling] }],
    },
    { // Le Col des tempêtes : falaises de roche sous la neige.
      base: snow,
      floor: snow,
      outside: { wall: { sheet: 'winter_A4', top: [0, 0], face: [0, 3] } },
      weather: 'snow',
      props: [
        { on: 'wall', chance: 0.08, grid: 0.45, objects: [W.snowPine, W.snowTree, W.deadPine, W.snowTreeSmall] },
        { on: 'floor', chance: 0.015, objects: [W.snowRock, W.twigs, W.branch] },
      ],
    },
    { // Le Nid du dragon : glace et arbres morts.
      base: snow,
      floor: snow,
      outside: { auto: { sheet: 'winter_A1', at: [0, 0] } },
      weather: 'snow',
      props: [{ on: 'floor', chance: 0.02, objects: [W.iceSpike, W.snowRock, W.twigs, W.stone] }],
    },
  ],
  abimeInfernal: [
    { // La Porte : champ d'ossements, tombes et colonnes.
      base: { sheet: 'underworld_A5', tiles: [[0, 4], [1, 4], [2, 4], [0, 5], [1, 5], [2, 5]] },
      floor: purpleFloor,
      shade: 0.5,
      props: [
        { on: 'wall', chance: 0.05, grid: 0.4, objects: [U.redTree1, U.redTree2, U.redTree4, U.redTree3, U.statues, U.bigTealCrystal, U.bigPinkCrystal] },
        { on: 'edge', chance: 0.22, objects: [U.grave1, U.grave2, U.grave3, U.graveOpen, U.brokenColumn, U.skullPile, U.statue, U.redCrystal, U.purpleCrystal, U.tealCrystal] },
        abyssFloorProps,
      ],
    },
    { // Le Palais des tourments : dalles suspendues au-dessus du vide.
      floor: purpleFloor,
      outside: { auto: { sheet: 'underworld_A1', at: [0, 3] } },
      props: [abyssFloorProps, { on: 'floor', chance: 0.012, objects: [U.brazier, U.skeleton, U.skullPile] }],
    },
    { // Le Trône de l'Abîme : lac d'acide, arbres rouges.
      floor: { sheet: 'underworld_A5', tiles: [[0, 2], [1, 2], [0, 2], [2, 2]] },
      outside: { auto: { sheet: 'underworld_A1', at: [0, 0] } },
      props: [abyssFloorProps, { on: 'floor', chance: 0.012, objects: [U.tealShards, U.redShards, U.skeleton] }],
    },
  ],
};

// Thème de l'étage `floor` d'un donjon (celui de sa sous-zone).
export function themeOf(dungeonKey, floor = 1) {
  const list = THEMES[dungeonKey] ?? THEMES.foretMaudite;
  const sub = DUNGEONS[dungeonKey] ? DUNGEONS[dungeonKey].subzones.indexOf(subzoneOf(dungeonKey, floor)) : 0;
  return list[Math.max(0, sub)] ?? list[0];
}

// Hasard décoratif stable par case (le même décor à chaque affichage).
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Planche `assets/raven/<nom>.png`, ou null tant qu'elle charge.
export function sheet(name) {
  const img = image(`raven/${name}`);
  return isReady(img) ? img : null;
}

// Planches dont un thème a besoin.
function sheetsOf(theme) {
  const names = new Set();
  for (const layer of [theme.base, theme.floor, theme.path]) if (layer) names.add(layer.sheet);
  if (theme.outside?.wall) names.add(theme.outside.wall.sheet);
  if (theme.outside?.auto) names.add(theme.outside.auto.sheet);
  for (const rule of theme.props ?? []) for (const obj of rule.objects) names.add(obj[0]);
  return [...names];
}

// Dessine sur `ctx` la case (x, y) d'un autotile de sol MV dont le bloc commence à la
// tuile `at` de `img` ; même dessin pour un dessus de mur.
// `fill` : couleur unie à la place des quarts du centre (dessus de mur sombre).
export function drawFloorAuto(ctx, img, at, x, y, same, fill = null) {
  for (let q = 0; q < 4; q++) {
    const [qx, qy] = mvFloorQuarter(same, q);
    const dx = x * TILE + (q % 2) * 8;
    const dy = y * TILE + (q >> 1) * 8;
    if (fill && (qx === 1 || qx === 2) && (qy === 3 || qy === 4)) {
      ctx.fillStyle = fill;
      ctx.fillRect(dx, dy, 8, 8);
    } else {
      ctx.drawImage(img, at[0] * TILE + qx * 8, at[1] * TILE + qy * 8, 8, 8, dx, dy, 8, 8);
    }
  }
}

export function drawWallAuto(ctx, img, at, x, y, same) {
  for (let q = 0; q < 4; q++) {
    const [qx, qy] = mvWallQuarter(same, q);
    ctx.drawImage(img, at[0] * TILE + qx * 8, at[1] * TILE + qy * 8, 8, 8, x * TILE + (q % 2) * 8, y * TILE + (q >> 1) * 8, 8, 8);
  }
}

const cache = new WeakMap();

// Couche fixe de la carte (canvas map.w × map.h cases de 16 px), mise en cache par carte.
export function staticLayer(map, dungeonKey, floor = 1) {
  const cached = cache.get(map);
  if (cached?.complete) return cached.canvas;
  const canvas = cached?.canvas ?? document.createElement('canvas');
  canvas.width = map.w * TILE;
  canvas.height = map.h * TILE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const theme = themeOf(dungeonKey, floor);
  const imgs = Object.fromEntries(sheetsOf(theme).map((n) => [n, sheet(n)]));
  const complete = Object.values(imgs).every(Boolean);
  if (complete) {
    drawTheme(ctx, map, theme, imgs);
  } else {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  cache.set(map, { canvas, complete });
  return canvas;
}

function drawTheme(ctx, map, theme, imgs) {
  const floor = (x, y) => isFloor(map, x, y);
  const inRoom = (x, y) => map.rooms.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  const corridor = (x, y) => floor(x, y) && !inRoom(x, y);
  const pick = (list, x, y, salt) => list[Math.floor(hash(x, y, salt) * list.length)];
  const tile = (layer, x, y, salt) => {
    const [c, r] = pick(layer.tiles, x, y, salt);
    ctx.drawImage(imgs[layer.sheet], c * TILE, r * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
  };
  const wall = theme.outside?.wall;
  // Mur vu de face : les 2 cases au-dessus du sol ('low' juste au-dessus, puis 'high').
  const faceAt = (x, y) => {
    if (!wall || floor(x, y)) return null;
    if (floor(x, y + 1)) return 'low';
    if (floor(x, y + 2) && !floor(x, y + 1)) return 'high';
    return null;
  };

  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (theme.base) tile(theme.base, x, y, 3);
      if (floor(x, y)) {
        const layer = corridor(x, y) && theme.path ? theme.path : theme.floor;
        if (layer.auto) {
          if (layer !== theme.floor && theme.floor.tiles) tile(theme.floor, x, y, 1);
          const same = layer === theme.path ? (dx, dy) => corridor(x + dx, y + dy) : (dx, dy) => floor(x + dx, y + dy);
          drawFloorAuto(ctx, imgs[layer.sheet], layer.auto, x, y, same);
        } else {
          tile(layer, x, y, 1);
        }
        continue;
      }
      if (theme.shade) {
        ctx.fillStyle = `rgba(8,4,16,${theme.shade})`;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
      if (wall) {
        const face = faceAt(x, y);
        if (face) {
          // Face : 2 × 2 tuiles d'autotile ; haut / bas selon la hauteur.
          drawWallAuto(ctx, imgs[wall.sheet], wall.face, x, y, (dx, dy) => {
            if (dy) return face === 'high' ? dy > 0 : faceAt(x, y - 1) === 'high';
            return faceAt(x + dx, y) === face;
          });
        } else {
          drawFloorAuto(ctx, imgs[wall.sheet], wall.top, x, y, (dx, dy) => {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) return true;
            return !floor(nx, ny) && !faceAt(nx, ny);
          }, wall.fill);
        }
      } else if (theme.outside?.auto) {
        const { sheet: name, at } = theme.outside.auto;
        drawFloorAuto(ctx, imgs[name], at, x, y, (dx, dy) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) return true;
          return !floor(nx, ny);
        });
      }
    }
  }

  // Objets, dessinés de haut en bas (les plus bas passent devant).
  const props = [];
  const used = new Set(); // cases de base déjà occupées
  const footprint = (obj, x, y) => {
    const w = Math.ceil(obj[3] / TILE);
    const h = Math.ceil(obj[4] / TILE);
    return { left: x - Math.floor((w - 1) / 2), w, h };
  };
  const clear = (obj, x, y, allowFace) => {
    const { left, w, h } = footprint(obj, x, y);
    for (let cy = y - h + 1; cy <= y; cy++) {
      for (let cx = left; cx < left + w; cx++) {
        if (floor(cx, cy)) return false;
        if (!allowFace && faceAt(cx, cy)) return false;
      }
    }
    for (let cx = left; cx < left + w; cx++) if (used.has(`${cx},${y}`)) return false;
    return true;
  };
  const place = (obj, x, y, reserve) => {
    const { left, w } = footprint(obj, x, y);
    if (reserve) for (let cx = left; cx < left + w; cx++) used.add(`${cx},${y}`);
    const [name, sx, sy, sw, sh] = obj;
    const dx = Math.round(left * TILE + (w * TILE - sw) / 2);
    const dy = (y + 1) * TILE - sh - (reserve ? 0 : Math.round((TILE - Math.min(sh, TILE)) / 2));
    props.push({ y, draw: () => ctx.drawImage(imgs[name], sx, sy, sw, sh, dx, dy, sw, sh) });
  };
  const nearFloor = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => floor(x + dx, y + dy));
  (theme.props ?? []).forEach((rule, ri) => {
    const margin = rule.on === 'wall' ? 3 : 0;
    for (let y = 0; y < map.h + margin; y++) {
      for (let x = -margin; x < map.w + margin; x++) {
        const isFloorCell = floor(x, y);
        if (rule.on === 'floor' ? !isFloorCell : isFloorCell) continue;
        if (rule.on === 'floor' && (corridor(x, y) || (map.ladder && map.ladder.x === x && map.ladder.y === y))) continue;
        if (rule.on === 'edge' && (y >= map.h || !nearFloor(x, y) || faceAt(x, y))) continue;
        if (rule.on === 'face' && faceAt(x, y) !== 'low') continue;
        const chance = rule.grid !== undefined && x % 2 === 0 && y % 2 === 0 ? rule.grid : rule.chance;
        if (hash(x, y, 10 + ri) >= chance) continue;
        const obj = pick(rule.objects, x, y, 20 + ri);
        if (rule.on === 'floor') place(obj, x, y, false);
        else if (rule.on === 'face') place(obj, x, y, false);
        else if (clear(obj, x, y, false)) place(obj, x, y, true);
      }
    }
  });
  props.sort((a, b) => a.y - b.y).forEach((p) => p.draw());
}
