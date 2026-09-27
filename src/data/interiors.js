// Intérieurs des maisons du village (une par habitant, voir data/village.js). Données pures.
// Graphismes : packs Raven Fantasy Interiors et Cozy Home, planches RPG Maker MV réduites en
// tuiles de 16 px (assets/raven/) : `interiors_A4` (murs : dessus + façade, autotiles),
// `interiors_A5` / `cozy_A5` (sols), `interiors_B`, `interiors_C`, `cozy_B` (mobilier). Chaque
// meuble est un rectangle de tuiles entières de sa planche (jamais une découpe au pixel).
//
// Pièce : { w, h, floor, wall, exit, npcs: { id: {x, y} }, furniture }
//   Ligne 0 : dessus du mur (plafond) ; lignes 1-2 : façade du mur du fond ; on marche à partir
//   de la ligne ROOM_TOP (3). Colonnes 0 et w-1, ligne h-1 : dessus des murs, sauf la porte
//   (ligne h-1, colonne `exit`) : y marcher ramène au village, devant la maison.
//   floor : [planche, colonne, ligne] d'une tuile de sol ; wall : { top, face } = blocs
//   d'autotile de `interiors_A4` ([colonne, ligne] en tuiles).
//   furniture : [{ img, x, bottom, block, layer?, z? }] ; img = [planche, x, y, l, h] en pixels ;
//   block : 'all' (toute l'emprise au sol), 'base' (ligne du bas), 'none' ; layer 'floor' :
//   posé au sol sous tout le reste (tapis) ; layer 'wall' : accroché à la façade (fenêtres,
//   bannières) ; z : ligne de tri (objet posé sur un meuble : celle du meuble).

export const ROOM_TOP = 3;

const T = (sheet, c, r, w = 1, h = 1) => [sheet, c * 16, r * 16, w * 16, h * 16];
const B = (c, r, w, h) => T('interiors_B', c, r, w, h);
const C = (c, r, w, h) => T('interiors_C', c, r, w, h);
const H = (c, r, w, h) => T('cozy_B', c, r, w, h);

// Mobilier (tuiles de 16 px).
export const FURNITURE = {
  // Lits (une place : 2 × 3 ; deux places : 3 × 3).
  bedBrown: B(14, 0, 2, 3), bedRed: B(14, 3, 2, 3), bedBlue: B(14, 6, 2, 3), bedTeal: B(14, 9, 2, 3),
  doubleBedStars: H(7, 0, 3, 3), doubleBedRed: H(10, 0, 3, 3),
  // Tapis et paillassons.
  rugYellow: B(8, 0, 3, 3), rugGreen: B(11, 0, 3, 3), rugRed: B(8, 3, 3, 3),
  rugBlueOval: H(0, 9, 3, 4), rugGreenOval: H(3, 10, 4, 3), rugGreenSquare: H(0, 13, 2, 2),
  matYellow: B(7, 0), matRed: B(7, 1), matGreen: B(7, 2),
  // Au mur.
  windowTall: B(0, 4, 1, 2), windowWide: B(1, 4, 2, 2), windowPlanter: B(0, 6, 2, 1), windowSmall: B(2, 6), windowCross: B(3, 6),
  curtain: B(11, 3, 1, 2), bannerCross: C(0, 6, 1, 2), bannerRed: C(1, 6, 1, 2), bannerBlue: C(2, 6, 1, 2),
  bowWall: C(11, 3), axeWall: C(13, 0, 1, 2), swordWall: C(10, 0, 1, 2), shieldWall: C(11, 1),
  // Rangements.
  shelfJars: B(0, 8, 2, 3), shelfPotions: B(2, 8, 2, 3), shelfPotions2: B(4, 8, 2, 3), weaponRack: B(6, 8, 1, 3),
  wardrobe: B(0, 11, 2, 3), shelfEmpty: B(2, 11, 2, 3), shelfMisc: B(4, 11, 2, 3), shelfKitchen: B(6, 11, 2, 3),
  bookcase: H(2, 13, 2, 3), bookshelf: H(6, 6, 1, 3), cupboard: H(4, 13, 2, 3), dishCabinet: H(7, 13, 2, 3), dresser: H(9, 14, 3, 2),
  drawers: B(4, 5, 1, 2), nightstand: H(15, 7, 1, 2), ladder: B(5, 0, 1, 3),
  // Tables et sièges.
  counter: B(8, 11, 3, 3), noticeBoard: B(11, 11, 3, 3), longTable: C(0, 8, 3, 2), deskTable: C(0, 10, 3, 2), bench: C(0, 12, 3, 1),
  woodTable: H(7, 3, 3, 4), roundTable: H(9, 7, 2, 2), roundTableCloth: H(11, 7, 2, 2), desk: H(13, 7, 2, 2),
  chairs: B(11, 6, 2, 3), chairTall: B(13, 6, 1, 3), chair: B(11, 9, 1, 2), stool: B(12, 9, 1, 2), stoolYellow: H(11, 11, 1, 2),
  // Cuisine.
  stove: H(14, 10, 1, 2), stovePipe: H(15, 9, 1, 3), kitchenCounter: H(13, 12, 3, 2), sink: H(13, 14, 3, 2),
  // Réserves.
  barrel: B(5, 5, 1, 2), barrelOpen: B(6, 5, 1, 2), barrelWater: B(7, 9, 1, 2), crate: B(5, 14, 2, 2),
  chest: B(3, 14, 1, 2), chestIron: B(4, 14, 1, 2), firewood: B(6, 2),
  // Plantes et pots.
  plantBlue: B(7, 3, 1, 2), plantPurple: B(7, 5, 1, 2), potPurple: B(5, 3), potBlue: B(6, 3),
  // Pierre, métier, magie.
  statue: C(0, 0, 2, 3), statueHood: C(0, 3, 2, 3), basin: C(2, 1, 1, 2), fireplace: C(9, 6, 3, 4),
  anvil: C(3, 5, 2, 2), anvilDark: C(5, 5, 2, 2), armorStand: C(10, 4, 1, 2),
  oreGray: C(0, 13, 1, 2), oreDark: C(1, 13, 1, 2), oreSilver: C(2, 13, 1, 2), oreGold: C(3, 13, 1, 2),
  oreGreen: C(4, 13, 1, 2), oreBlue: C(5, 13, 1, 2), orePurple: C(6, 13, 1, 2),
  crystalOrange: C(2, 15), crystalGreen: C(3, 15), crystalBlue: C(4, 15), crystalPurple: C(5, 15),
  // Petits objets (posés sur un meuble).
  coins: C(8, 1, 2, 1), bookOpen: C(4, 0), bookRed: C(6, 0), papers: C(4, 1), skull: C(6, 1), potionRack: C(4, 2, 2, 1),
  bread: C(4, 12), fish: C(6, 12), meat: C(4, 10), plates: C(3, 11), jars: C(5, 11), cup: C(6, 10),
  potionBlue: B(2, 14, 1, 2), potionPurple: B(1, 14, 1, 2),
  // Établis (planche Craft Stations).
  furnace: ['craft_obj', 0, 0, 32, 48],
  runeTable: ['craft_obj', 0, 112, 32, 32],
};

// Murs (blocs d'autotile de `interiors_A4`) et sols.
const WALLS = {
  wood: { top: [0, 0], face: [0, 3] },   // lambris sur soubassement de pierre
  planks: { top: [2, 0], face: [2, 3] }, // planches
  stone: { top: [4, 0], face: [4, 3] },  // pierre de taille
};
const FLOORS = {
  wood: ['cozy_A5', 1, 1], lightWood: ['cozy_A5', 3, 1], beige: ['cozy_A5', 0, 1], tiles: ['cozy_A5', 1, 2],
  brick: ['cozy_A5', 2, 2], cobble: ['interiors_A5', 6, 0], darkStone: ['interiors_A5', 4, 0],
  rose: ['interiors_A5', 2, 0], terracotta: ['interiors_A5', 3, 0],
};

const F = FURNITURE;
const put = (img, x, bottom, block = 'all', extra = {}) => ({ img, x, bottom, block, ...extra });
const on = (img, x, bottom, host) => put(img, x, bottom, 'none', { z: host + 0.001 });
const wall = (img, x, bottom = 2) => put(img, x, bottom, 'none', { layer: 'wall' });
const rug = (img, x, bottom) => put(img, x, bottom, 'none', { layer: 'floor' });

export const INTERIORS = {
  // Auberge : comptoir, tonneaux et étagère derrière l'aubergiste, cheminée, tables rondes.
  inn: {
    w: 16, h: 12, floor: FLOORS.wood, wall: WALLS.wood, exit: 8, npcs: { inn: { x: 2, y: 4 } },
    furniture: [
      wall(F.windowWide, 4), wall(F.windowWide, 11),
      put(F.shelfKitchen, 1, 3), put(F.barrel, 3, 3), put(F.barrelOpen, 4, 3),
      put(F.deskTable, 1, 6), on(F.cup, 1, 5, 6), on(F.plates, 3, 5, 6),
      put(F.fireplace, 7, 3), rug(F.rugRed, 7, 6), put(F.firewood, 10, 3),
      put(F.ladder, 14, 3),
      put(F.roundTable, 5, 9), put(F.stool, 4, 9), put(F.stool, 7, 9), on(F.bread, 5, 8, 9),
      put(F.roundTable, 11, 9), put(F.stool, 10, 9), put(F.stool, 13, 9), on(F.cup, 12, 8, 9),
      put(F.roundTableCloth, 11, 6), put(F.stoolYellow, 13, 6),
      put(F.plantPurple, 1, 10), put(F.plantBlue, 14, 10),
      rug(F.matRed, 8, 10),
    ],
  },
  // Forge : fourneau, deux enclumes, minerai, râtelier ; murs et sol de pierre.
  forge: {
    w: 14, h: 11, floor: FLOORS.cobble, wall: WALLS.stone, exit: 7, npcs: { forge: { x: 7, y: 5 } },
    furniture: [
      wall(F.bannerCross, 2), wall(F.swordWall, 5), wall(F.shieldWall, 6), wall(F.axeWall, 8),
      put(F.furnace, 10, 3), put(F.barrelWater, 12, 3),
      put(F.anvil, 5, 6), put(F.anvilDark, 8, 6),
      put(F.weaponRack, 1, 5), put(F.armorStand, 1, 7), put(F.barrelWater, 1, 9),
      put(F.oreGray, 12, 6), put(F.oreGold, 11, 6), put(F.oreSilver, 12, 8), put(F.crate, 10, 9),
      put(F.oreDark, 2, 3), put(F.chestIron, 3, 3),
    ],
  },
  // Banque : statues, bannières, coffres de la salle forte, guichet et pièces.
  bank: {
    w: 14, h: 11, floor: FLOORS.rose, wall: WALLS.stone, exit: 7, npcs: { bank: { x: 6, y: 4 } },
    furniture: [
      wall(F.bannerBlue, 4), wall(F.bannerBlue, 9),
      put(F.statueHood, 1, 3), put(F.statueHood, 11, 3),
      put(F.chestIron, 5, 3), put(F.chest, 6, 3), put(F.chestIron, 7, 3), put(F.chest, 8, 3),
      put(F.deskTable, 5, 6), on(F.coins, 5, 5, 6), on(F.papers, 7, 5, 6),
      rug(F.rugGreen, 6, 9),
      put(F.potBlue, 1, 9), put(F.potBlue, 12, 9), put(F.plantBlue, 1, 6), put(F.plantBlue, 12, 6),
    ],
  },
  // Échoppe : étagères de marchandises, fenêtre, comptoir, tonneaux et caisses.
  shop: {
    w: 13, h: 10, floor: FLOORS.lightWood, wall: WALLS.planks, exit: 6, npcs: { shop: { x: 6, y: 4 } },
    furniture: [
      wall(F.windowWide, 5),
      put(F.shelfPotions, 1, 3), put(F.shelfMisc, 3, 3), put(F.shelfJars, 8, 3), put(F.shelfKitchen, 10, 3),
      put(F.counter, 5, 7), on(F.potionBlue, 5, 5, 7), on(F.bread, 7, 5, 7),
      put(F.barrel, 11, 6), put(F.barrelOpen, 11, 8), put(F.crate, 1, 8),
      rug(F.rugYellow, 5, 8), rug(F.matYellow, 6, 8),
    ],
  },
  // Atelier de la runomancienne : table des runes, cristaux, bibliothèque, potions.
  runes: {
    w: 12, h: 10, floor: FLOORS.darkStone, wall: WALLS.wood, exit: 6, npcs: { runes: { x: 5, y: 5 } },
    furniture: [
      wall(F.windowSmall, 4), wall(F.windowSmall, 7),
      put(F.shelfPotions2, 1, 3), put(F.bookcase, 9, 3),
      put(F.runeTable, 5, 4),
      put(F.crystalPurple, 1, 5), put(F.crystalBlue, 2, 5), put(F.crystalGreen, 9, 5), put(F.crystalOrange, 10, 5),
      put(F.orePurple, 1, 8), put(F.oreBlue, 10, 8),
      rug(F.rugRed, 4, 8),
    ],
  },
  // Maître des compétences : bibliothèques, statue, bureau, tableau des leçons.
  master: {
    w: 14, h: 11, floor: FLOORS.beige, wall: WALLS.wood, exit: 7, npcs: { master: { x: 8, y: 5 } },
    furniture: [
      wall(F.bannerCross, 5), wall(F.bannerRed, 8),
      put(F.bookcase, 1, 3), put(F.bookshelf, 3, 3), put(F.statue, 6, 3), put(F.bookshelf, 10, 3), put(F.bookcase, 11, 3),
      put(F.woodTable, 1, 8), on(F.bookOpen, 2, 6, 8), on(F.papers, 1, 7, 8), put(F.chairTall, 4, 7),
      put(F.noticeBoard, 10, 6), put(F.weaponRack, 12, 9),
      rug(F.rugGreen, 6, 8),
    ],
  },
  // Cabane du traqueur : cheminée, trophées au mur, table de boucher, lit, réserves.
  hunter: {
    w: 12, h: 10, floor: FLOORS.wood, wall: WALLS.planks, exit: 6, npcs: { hunter: { x: 7, y: 6 } },
    furniture: [
      wall(F.bowWall, 1), wall(F.axeWall, 2), wall(F.swordWall, 8), wall(F.shieldWall, 7),
      put(F.fireplace, 4, 3), put(F.firewood, 3, 3),
      put(F.armorStand, 1, 4), put(F.bedBrown, 9, 5),
      put(F.longTable, 3, 7), on(F.meat, 3, 6, 7), on(F.fish, 5, 6, 7),
      put(F.crate, 1, 8), put(F.barrel, 10, 8),
      rug(F.matYellow, 6, 8),
    ],
  },
  // Hutte de l'Oracle : statue voilée, vasque de divination, cristaux, bannières.
  oracle: {
    w: 11, h: 10, floor: FLOORS.cobble, wall: WALLS.stone, exit: 5, npcs: { oracle: { x: 5, y: 6 } },
    furniture: [
      wall(F.bannerBlue, 2), wall(F.bannerBlue, 8),
      put(F.bookshelf, 1, 3), put(F.statueHood, 4, 3), put(F.shelfJars, 8, 3),
      put(F.basin, 5, 5),
      put(F.crystalPurple, 2, 5), put(F.crystalBlue, 8, 5),
      put(F.plantPurple, 1, 8), put(F.plantBlue, 9, 8),
      rug(F.rugBlueOval, 4, 8),
    ],
  },
  // Corps de garde : râtelier, armure, bannières, lits, table et banc.
  guard: {
    w: 12, h: 10, floor: FLOORS.cobble, wall: WALLS.stone, exit: 6, npcs: { guard: { x: 6, y: 4 } },
    furniture: [
      wall(F.bannerCross, 5), wall(F.bannerRed, 7),
      put(F.weaponRack, 1, 3), put(F.armorStand, 2, 3), put(F.chestIron, 3, 3),
      put(F.bedBlue, 9, 5), put(F.bedBrown, 9, 8),
      put(F.longTable, 2, 7), on(F.bread, 3, 6, 7), put(F.bench, 2, 8),
      put(F.barrel, 7, 3),
    ],
  },
  // Maison de Tom et Lina : lits des enfants, cuisine, table ronde, tapis de jeu.
  family: {
    w: 12, h: 10, floor: FLOORS.wood, wall: WALLS.wood, exit: 6, npcs: { kid1: { x: 2, y: 7 }, kid2: { x: 5, y: 6 } },
    furniture: [
      wall(F.windowPlanter, 5), wall(F.windowSmall, 9),
      put(F.bedTeal, 1, 4), put(F.bedRed, 3, 4),
      put(F.stove, 7, 3), put(F.kitchenCounter, 8, 3),
      put(F.roundTableCloth, 7, 7), put(F.stool, 6, 7), put(F.stool, 9, 7), on(F.bread, 7, 6, 7),
      rug(F.rugGreenOval, 1, 8), put(F.plantBlue, 10, 8),
    ],
  },
  // Cabane du pêcheur : lit, tonneaux, table (poisson du jour), caisse.
  fisher: {
    w: 10, h: 9, floor: FLOORS.lightWood, wall: WALLS.planks, exit: 5, npcs: { fisher: { x: 3, y: 6 } },
    furniture: [
      wall(F.windowSmall, 4),
      put(F.bedBrown, 1, 4), put(F.barrel, 7, 3), put(F.barrelWater, 8, 3),
      put(F.roundTable, 5, 6), on(F.fish, 5, 5, 6), put(F.stool, 7, 5),
      put(F.crate, 7, 7), rug(F.matGreen, 5, 7),
    ],
  },
};
