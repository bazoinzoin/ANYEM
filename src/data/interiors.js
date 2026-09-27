// Intérieurs des maisons du village (une par habitant, voir data/village.js). Données pures.
// Mobilier : planche `interiors_obj` (pack Raven Fantasy Interiors, tuiles de 16 px).
//
// Pièce : { w, h, floor, exit (colonne de la porte, dans le mur du bas), npcs: { id: {x, y} },
//   furniture: [{ img, x, bottom, block, layer? }] }
//   Le mur du haut occupe les lignes 0 et 1 (fenêtres, bannières, étagères s'y adossent) ;
//   les colonnes 0 et w-1 et la ligne h-1 sont des murs, sauf la porte (ligne h-1, colonne
//   `exit`) : y marcher ramène au village, devant la maison.
//   floor : 'wood' | 'gray' | 'stone' ; block : comme les objets du village ('all', 'base',
//   'none') ; layer 'floor' : posé au sol, sous tout le reste (tapis).

const O = (x, y, w, h) => ['interiors_obj', x, y, w, h];
const CRAFT = (c, r, w, h) => ['craft_obj', c * 16, r * 16, w * 16, h * 16];

// Mobilier repéré dans la planche (pixels).
export const FURNITURE = {
  fireplace: O(52, 160, 42, 48),
  bigTable: O(0, 208, 48, 64),
  chairs: O(48, 224, 32, 32),
  lantern: O(96, 208, 16, 16),
  candle: O(144, 176, 16, 16),
  bedBlue: O(162, 192, 28, 40),
  bedBrown: O(194, 192, 28, 40),
  bedTeal: O(162, 256, 28, 40),
  bedRed: O(194, 256, 28, 40),
  barrel: O(224, 180, 16, 24),
  spears: O(256, 264, 16, 30),
  crate: O(228, 288, 24, 28),
  chest: O(224, 272, 16, 16),
  rugYellow: O(0, 288, 48, 48),
  rugGreen: O(48, 288, 48, 48),
  rugRed: O(96, 288, 48, 48),
  oreGray: O(272, 0, 16, 32),
  oreGold: O(320, 0, 16, 32),
  crystalRed: O(304, 32, 16, 16),
  crystalGreen: O(320, 32, 16, 16),
  crystalBlue: O(336, 32, 16, 16),
  crystalPurple: O(352, 32, 16, 16),
  anvil: O(371, 37, 26, 22),
  anvilDark: O(404, 37, 24, 22),
  mirror: O(432, 0, 16, 34),
  axe: O(528, 32, 16, 16),
  shield: O(480, 48, 16, 16),
  wardrobe: O(259, 98, 26, 42),
  shelf: O(291, 98, 26, 42),
  shelfJars: O(323, 98, 26, 42),
  shelfFood: O(355, 98, 26, 42),
  bookOpen: O(304, 48, 16, 16),
  bookRed: O(320, 48, 16, 16),
  potions: O(304, 80, 32, 16),
  skeletonStand: O(480, 96, 16, 30),
  armor: O(496, 96, 16, 16),
  plantPurple: O(272, 160, 16, 24),
  plantBlue: O(288, 160, 16, 24),
  statue: O(332, 193, 32, 47),
  basin: O(368, 162, 16, 25),
  candelabraGold: O(384, 192, 16, 32),
  candelabraSilver: O(384, 224, 16, 32),
  longTable: O(432, 176, 48, 32),
  banner: O(304, 272, 16, 32),
  bannerRed: O(320, 272, 16, 32),
  bannerBlue: O(336, 272, 16, 32),
  hay: O(272, 256, 16, 24),
  fruits: O(288, 256, 16, 24),
  windowBig: O(128, 48, 48, 32),
  windowSmall: O(160, 80, 16, 16),
  coins: O(432, 48, 32, 16),
  cauldron: O(160, 96, 32, 32),
  furnace: CRAFT(0, 0, 2, 3),
  runeTable: CRAFT(0, 7, 2, 2),
};

// Murs et sols (motifs de 3 × 1 et 3 × 3 tuiles).
export const INTERIOR_ART = {
  wallTop: O(0, 80, 48, 16),     // lambris
  wallBottom: O(0, 96, 48, 16),  // soubassement de pierre
  floors: { wood: O(208, 0, 48, 48), gray: O(144, 0, 48, 48), stone: O(128, 0, 16, 16) },
  door: O(0, 176, 16, 32),
};

const F = FURNITURE;
const put = (img, x, bottom, block = 'base', layer) => ({ img, x, bottom, block, ...(layer ? { layer } : {}) });
const wall = (img, x, bottom = 1) => put(img, x, bottom, 'none');
const rug = (img, x, bottom) => put(img, x, bottom, 'none', 'floor');

export const INTERIORS = {
  inn: {
    w: 14, h: 10, floor: 'wood', exit: 7, npcs: { inn: { x: 4, y: 5 } },
    furniture: [
      rug(F.rugRed, 6, 8),
      wall(F.windowBig, 4), wall(F.windowBig, 8), wall(F.bannerRed, 7),
      put(F.fireplace, 10, 2),
      put(F.barrel, 1, 2), put(F.barrel, 2, 2), put(F.barrel, 3, 2),
      put(F.longTable, 1, 5, 'all'), put(F.potions, 1, 4, 'none'),
      put(F.longTable, 6, 5, 'all'), put(F.candle, 7, 4, 'none'), put(F.chairs, 6, 7, 'base'),
      put(F.bedRed, 11, 6), put(F.bedBlue, 11, 8),
      put(F.lantern, 12, 3, 'none'),
    ],
  },
  forge: {
    w: 12, h: 9, floor: 'stone', exit: 6, npcs: { forge: { x: 6, y: 5 } },
    furniture: [
      wall(F.shield, 5), wall(F.axe, 6), wall(F.banner, 8),
      put(F.furnace, 1, 3), put(F.anvil, 4, 4, 'all'), put(F.anvilDark, 8, 4, 'all'),
      put(F.oreGray, 9, 2), put(F.oreGold, 10, 2),
      put(F.spears, 1, 6, 'all'), put(F.crate, 10, 6, 'all'), put(F.cauldron, 9, 7),
    ],
  },
  bank: {
    w: 12, h: 9, floor: 'gray', exit: 5, npcs: { bank: { x: 7, y: 3 } },
    furniture: [
      rug(F.rugGreen, 4, 7),
      wall(F.bannerBlue, 3), wall(F.bannerBlue, 8),
      put(F.statue, 1, 3), put(F.statue, 9, 3),
      put(F.chest, 4, 2), put(F.chest, 5, 2), put(F.chest, 6, 2),
      put(F.longTable, 4, 4, 'all'), put(F.coins, 4, 3, 'none'),
      put(F.candelabraSilver, 3, 6), put(F.candelabraSilver, 8, 6),
    ],
  },
  shop: {
    w: 12, h: 9, floor: 'wood', exit: 5, npcs: { shop: { x: 7, y: 5 } },
    furniture: [
      rug(F.rugYellow, 4, 7),
      put(F.shelfFood, 1, 2), put(F.shelfJars, 3, 2), put(F.wardrobe, 9, 2),
      put(F.longTable, 4, 5, 'all'), put(F.fruits, 4, 4, 'none'), put(F.potions, 5, 4, 'none'),
      put(F.hay, 8, 3, 'all'), put(F.barrel, 10, 6, 'all'), put(F.barrel, 10, 5, 'all'), put(F.crate, 1, 6, 'all'),
    ],
  },
  runes: {
    w: 11, h: 9, floor: 'wood', exit: 5, npcs: { runes: { x: 5, y: 4 } },
    furniture: [
      rug(F.rugRed, 4, 7),
      put(F.shelfJars, 1, 2), put(F.mirror, 8, 2),
      put(F.runeTable, 4, 3),
      put(F.crystalBlue, 1, 4, 'all'), put(F.crystalPurple, 2, 4, 'all'),
      put(F.crystalGreen, 8, 4, 'all'), put(F.crystalRed, 9, 4, 'all'),
      put(F.candle, 2, 7, 'none'), put(F.candle, 8, 7, 'none'), put(F.plantPurple, 9, 7, 'all'),
    ],
  },
  master: {
    w: 12, h: 9, floor: 'wood', exit: 6, npcs: { master: { x: 8, y: 4 } },
    furniture: [
      rug(F.rugGreen, 5, 7),
      wall(F.banner, 4), wall(F.bannerBlue, 7),
      put(F.shelf, 1, 2), put(F.shelfJars, 3, 2), put(F.wardrobe, 9, 2),
      put(F.statue, 5, 3),
      put(F.bigTable, 1, 7, 'all'), put(F.bookOpen, 2, 5, 'none'), put(F.bookRed, 1, 6, 'none'),
      put(F.candelabraGold, 10, 6),
    ],
  },
  hunter: {
    w: 11, h: 9, floor: 'wood', exit: 5, npcs: { hunter: { x: 5, y: 4 } },
    furniture: [
      rug(F.rugYellow, 4, 7),
      wall(F.axe, 7), wall(F.shield, 8),
      put(F.fireplace, 4, 2),
      put(F.skeletonStand, 1, 3, 'all'), put(F.armor, 2, 3, 'all'), put(F.spears, 9, 3, 'all'),
      put(F.hay, 9, 6, 'all'), put(F.crate, 1, 7, 'all'), put(F.bedBrown, 8, 7),
    ],
  },
  oracle: {
    w: 10, h: 9, floor: 'gray', exit: 5, npcs: { oracle: { x: 5, y: 5 } },
    furniture: [
      rug(F.rugRed, 3, 7),
      put(F.mirror, 1, 2), put(F.statue, 4, 2), put(F.plantPurple, 8, 2),
      put(F.basin, 4, 4, 'all'), put(F.candelabraGold, 2, 4), put(F.candelabraGold, 7, 4),
      put(F.plantBlue, 1, 7, 'all'), put(F.candle, 8, 7, 'none'),
    ],
  },
  guard: {
    w: 10, h: 8, floor: 'stone', exit: 4, npcs: { guard: { x: 5, y: 3 } },
    furniture: [
      wall(F.bannerRed, 4), wall(F.banner, 6),
      put(F.spears, 1, 2), put(F.armor, 2, 2),
      put(F.bedBlue, 7, 4), put(F.chest, 7, 6, 'all'),
      put(F.longTable, 2, 5, 'all'), put(F.lantern, 3, 4, 'none'),
    ],
  },
  family: {
    w: 11, h: 9, floor: 'wood', exit: 5, npcs: { kid1: { x: 3, y: 6 }, kid2: { x: 5, y: 5 } },
    furniture: [
      rug(F.rugYellow, 1, 7),
      wall(F.windowBig, 2),
      put(F.bedTeal, 1, 4), put(F.bedRed, 3, 4),
      put(F.fireplace, 7, 2),
      put(F.bigTable, 6, 7, 'all'), put(F.fruits, 7, 5, 'none'),
      put(F.plantBlue, 9, 3, 'all'),
    ],
  },
  fisher: {
    w: 9, h: 8, floor: 'wood', exit: 4, npcs: { fisher: { x: 4, y: 4 } },
    furniture: [
      rug(F.rugGreen, 2, 6),
      wall(F.windowSmall, 4),
      put(F.bedBrown, 1, 4), put(F.barrel, 6, 2), put(F.barrel, 7, 2),
      put(F.crate, 6, 5, 'all'), put(F.lantern, 3, 3, 'none'),
    ],
  },
};
