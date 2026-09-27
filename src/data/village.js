// Village d'Anyem : carte à parcourir (cases de 16 px). Chaque habitant a sa maison, avec
// un panneau devant, et l'on peut entrer dans chacune (intérieurs : data/interiors.js).
// À chaque retour au village, chaque habitant est au hasard chez lui ou devant sa porte
// (game/village.js, `rollResidents`). Parler à un habitant de service ouvre son écran.
// Données pures : la grille de marche et les règles sont dans game/village.js, le rendu
// dans ui/villageView.js.
// Graphismes : packs Raven Fantasy (assets/raven/ : maisons `buildings_obj`, objets
// `village_obj`, établis `craft_obj`, mobilier `interiors_obj`, arbres `forest_obj`…).
//
// Image : [planche, x, y, largeur, hauteur] en pixels dans la planche.
// Maisons : { id, name, img, x (colonne de gauche), bottom (ligne du bas), door (colonne de
//   la porte), decor } ; toute l'emprise bloque le passage, sauf la porte : y entrer (depuis
//   la case devant) mène à l'intérieur `id`. decor : [{ img, dx, dy }] posés sur la maison
//   (portes, fenêtres, enseignes, cheminées ; décalage en pixels depuis son coin haut-gauche).
// Panneaux : { x, y, house, icon } devant chaque maison (icône de la planche d'icônes).
// Objets : { img, x, bottom, block } ; block : 'all', 'base' (ligne du bas), 'none', ou cases
//   [dx, dy] relatives au coin bas-gauche (dy ≤ 0).
// Arbres : [x, bas, variante] ; seul le tronc (case du milieu en bas) bloque.
// Habitants : { id, name, service | line, home (maison), x, y (devant chez lui) }.

const img = (sheet, x, y, w, h) => [sheet, x, y, w, h];
const tile = (sheet, c, r, w = 1, h = 1) => img(sheet, c * 16, r * 16, w * 16, h * 16);

export const VILLAGE_ART = {
  grass: { sheet: 'village_A5', tiles: [[1, 0], [1, 0], [1, 0], [2, 0]] },
  path: { sheet: 'village_A2', auto: [8, 0] },
  trees: [tile('forest_obj', 0, 5, 3, 4), img('forest2_obj', 1, 150, 46, 55), img('forest2_obj', 49, 150, 46, 55)],
  // Panneau devant une maison : planche en bois sur un poteau (l'icône est posée dessus).
  signBoard: img('interiors_obj', 192, 176, 32, 16),
};

const DOOR = tile('village_obj', 10, 5, 1, 2);
const ARCH = img('buildings_obj', 480, 465, 32, 31); // porte cintrée en pierre
const WINDOW = tile('village_obj', 9, 8);
const LIT_WINDOW = tile('village_obj', 8, 8);
const SIGN = { potion: tile('village_obj', 13, 5), mug: tile('village_obj', 13, 6), arrow: tile('village_obj', 13, 7), shield: tile('village_obj', 13, 8) };
const CHIMNEY = img('village_obj', 99, 145, 12, 47);
const INT = (x, y, w, h) => img('interiors_obj', x, y, w, h);
const flowers = (x, bottom, n = 0) => ({ img: [img('forest_obj', 178, 32, 14, 14), img('forest2_obj', 145, 34, 14, 11), img('forest2_obj', 138, 50, 22, 13), img('forest_obj', 96, 161, 15, 14)][n % 4], x, bottom, block: 'none' });
const bush = (x, bottom) => ({ img: img('forest2_obj', 48, 16, 16, 15), x, bottom, block: 'all' });
const fence = (x, bottom) => ({ img: img('village_obj', 208, 144, 48, 16), x, bottom, block: 'all' });
const lantern = (x, bottom) => ({ img: tile('village_obj', 0, 4), x, bottom, block: 'all' });

// Maisons (sprites de buildings_obj) : les portes sont posées au pied du mur de façade.
const HOUSE = {
  hut: img('buildings_obj', 19, 16, 74, 128),         // petite chaumière
  manor: img('buildings_obj', 119, 2, 146, 142),      // manoir de pierre au toit bleu
  inn: img('buildings_obj', 283, 0, 202, 192),        // grande maison double, perron
  cottage: img('buildings_obj', 27, 176, 106, 160),   // chaumière haute
  hall: img('buildings_obj', 163, 160, 106, 208),     // grande maison au toit de tuiles, perron
  smithy: img('buildings_obj', 296, 208, 152, 128),   // maison et atelier de pierre
  stall: img('buildings_obj', 27, 368, 106, 167),     // échoppe ouverte
  lodge: img('buildings_obj', 157, 416, 134, 128),    // maison de bois sur soubassement de pierre
  house: img('buildings_obj', 312, 416, 107, 128),    // maison de bois
};

export const VILLAGE = {
  w: 54,
  h: 40,
  spawn: { x: 23, y: 37 },       // arrivée (retour d'expédition, début de partie)
  // Chemins de terre : rectangles { x, y, w, h } (les seuils des portes sont ajoutés en plus).
  paths: [
    { x: 1, y: 14, w: 52, h: 2 },  // grand-rue
    { x: 1, y: 28, w: 52, h: 2 },  // rue du bas
    { x: 3, y: 38, w: 48, h: 1 },  // chemin de ronde, le long de la palissade
    { x: 23, y: 14, w: 2, h: 26 }, // allée centrale jusqu'à la porte
    { x: 20, y: 17, w: 10, h: 8 }, // place du puits
  ],
  buildings: [
    { id: 'inn', name: "Auberge de la Chope d'Or", img: HOUSE.inn, x: 1, bottom: 12, door: 3,
      decor: [
        { img: DOOR, dx: 38, dy: 138 },
        { img: LIT_WINDOW, dx: 118, dy: 126 }, { img: LIT_WINDOW, dx: 158, dy: 126 },
        { img: SIGN.mug, dx: 62, dy: 120 },
        { img: CHIMNEY, dx: 150, dy: 30 },
      ] },
    { id: 'master', name: 'Maison du Maître des compétences', img: HOUSE.hall, x: 16, bottom: 12, door: 19,
      decor: [{ img: DOOR, dx: 45, dy: 144 }, { img: WINDOW, dx: 20, dy: 150 }, { img: WINDOW, dx: 70, dy: 150 }] },
    { id: 'runes', name: 'Atelier de la runomancienne', img: HOUSE.lodge, x: 26, bottom: 12, door: 30,
      decor: [{ img: DOOR, dx: 59, dy: 96 }, { img: LIT_WINDOW, dx: 18, dy: 100 }, { img: SIGN.potion, dx: 84, dy: 86 }, { img: CHIMNEY, dx: 110, dy: -8 }] },
    { id: 'forge', name: 'Forge de Borin', img: HOUSE.smithy, x: 38, bottom: 12, door: 40,
      decor: [{ img: DOOR, dx: 30, dy: 96 }, { img: SIGN.shield, dx: 52, dy: 86 }, { img: CHIMNEY, dx: 128, dy: -6 }] },
    { id: 'bank', name: "Banque d'Anyem", img: HOUSE.manor, x: 2, bottom: 26, door: 6,
      decor: [{ img: ARCH, dx: 57, dy: 96 }, { img: SIGN.arrow, dx: 96, dy: 90 }] },
    { id: 'shop', name: 'Échoppe de Lars', img: HOUSE.stall, x: 13, bottom: 26, door: 16,
      decor: [{ img: DOOR, dx: 45, dy: 135 }, { img: SIGN.potion, dx: 20, dy: 118 }] },
    { id: 'hunter', name: 'Cabane du traqueur', img: HOUSE.cottage, x: 30, bottom: 26, door: 33,
      decor: [{ img: DOOR, dx: 45, dy: 128 }, { img: WINDOW, dx: 14, dy: 134 }, { img: CHIMNEY, dx: 70, dy: 20 }] },
    { id: 'oracle', name: "Hutte de l'Oracle", img: HOUSE.hut, x: 39, bottom: 26, door: 41,
      decor: [{ img: DOOR, dx: 29, dy: 96 }] },
    { id: 'family', name: 'Maison de Tom et Lina', img: HOUSE.house, x: 45, bottom: 26, door: 48,
      decor: [{ img: DOOR, dx: 45, dy: 96 }, { img: WINDOW, dx: 16, dy: 102 }, { img: WINDOW, dx: 76, dy: 102 }, { img: CHIMNEY, dx: 80, dy: -4 }] },
    { id: 'guard', name: 'Corps de garde', img: HOUSE.house, x: 27, bottom: 37, door: 30,
      decor: [{ img: DOOR, dx: 45, dy: 96 }, { img: SIGN.shield, dx: 70, dy: 86 }] },
    { id: 'fisher', name: 'Cabane du pêcheur', img: HOUSE.hut, x: 6, bottom: 37, door: 8,
      decor: [{ img: DOOR, dx: 29, dy: 96 }] },
  ],
  // Panneaux devant les maisons (icônes : planche raven16).
  signs: [
    { x: 6, y: 13, house: 'inn', icon: 93 },
    { x: 17, y: 13, house: 'master', icon: 96 },
    { x: 27, y: 13, house: 'runes', icon: 165 },
    { x: 43, y: 13, house: 'forge', icon: 1471 },
    { x: 3, y: 27, house: 'bank', icon: 131 },
    { x: 14, y: 27, house: 'shop', icon: 157 },
    { x: 31, y: 27, house: 'hunter', icon: 96 },
    { x: 39, y: 27, house: 'oracle', icon: 658 },
    { x: 46, y: 27, house: 'family', icon: 15 },
    { x: 28, y: 38, house: 'guard', icon: 1000 },
    { x: 6, y: 38, house: 'fisher', icon: 337 },
  ],
  props: [
    // Auberge : tonneaux, lanternes, tournesols.
    { img: img('village_obj', 0, 38, 48, 24), x: 9, bottom: 13, block: 'base' },
    lantern(2, 13), lantern(12, 13),
    { img: img('village_obj', 112, 1, 16, 29), x: 14, bottom: 12, block: 'all' },
    // Maître : statue et chandelier devant l'école.
    { img: INT(332, 193, 32, 47), x: 23, bottom: 12, block: 'base' },
    { img: INT(384, 192, 16, 32), x: 22, bottom: 13, block: 'all' },
    // Runomancienne : table des runes, cristaux.
    { img: tile('craft_obj', 0, 7, 2, 2), x: 35, bottom: 12, block: 'base' },
    { img: INT(336, 32, 16, 16), x: 35, bottom: 13, block: 'all' },
    { img: INT(352, 32, 16, 16), x: 36, bottom: 13, block: 'all' },
    // Forge : fourneau, enclume, minerai.
    { img: tile('craft_obj', 0, 0, 2, 3), x: 48, bottom: 12, block: 'base' },
    { img: INT(371, 37, 26, 22), x: 50, bottom: 12, block: 'base' },
    { img: INT(272, 0, 16, 32), x: 46, bottom: 13, block: 'all' },
    { img: INT(320, 0, 16, 32), x: 47, bottom: 13, block: 'all' },
    // Banque : lanternes de part et d'autre de l'entrée, coffres.
    lantern(5, 27), lantern(8, 27),
    { img: INT(224, 272, 16, 16), x: 10, bottom: 27, block: 'all' },
    // Échoppe : caisses, paniers, charrette.
    { img: INT(228, 288, 24, 28), x: 18, bottom: 27, block: 'all' },
    { img: tile('village_obj', 6, 2, 1, 2), x: 12, bottom: 26, block: 'base' },
    { img: tile('village_obj', 7, 2, 1, 2), x: 12, bottom: 25, block: 'base' },
    { img: tile('village_obj', 2, 7, 2, 2), x: 20, bottom: 26, block: 'base' },
    // Traqueur : table de boucher, trophée, foin.
    { img: tile('craft_obj', 0, 9, 2, 2), x: 37, bottom: 26, block: 'base' },
    { img: INT(480, 96, 16, 30), x: 35, bottom: 27, block: 'all' },
    { img: INT(272, 256, 16, 24), x: 29, bottom: 26, block: 'all' },
    // Oracle : chandelier doré, plantes.
    { img: INT(384, 192, 16, 32), x: 44, bottom: 26, block: 'base' },
    { img: INT(272, 160, 16, 24), x: 43, bottom: 27, block: 'all' },
    // Famille : fleurs et clôture.
    flowers(50, 27, 0), flowers(52, 26, 1), fence(49, 22),
    // Corps de garde : armes et bannière.
    { img: INT(256, 264, 16, 30), x: 34, bottom: 37, block: 'all' },
    { img: INT(304, 272, 16, 32), x: 26, bottom: 37, block: 'all' },
    // Pêcheur : tonneaux, caisse.
    { img: tile('village_obj', 0, 2, 1, 2), x: 11, bottom: 37, block: 'base' },
    { img: INT(228, 288, 24, 28), x: 12, bottom: 37, block: 'all' },
    // Place : puits, lanternes, fleurs ; porte du village.
    { img: tile('village_obj', 0, 5, 2, 2), x: 21, bottom: 20, block: 'all' },
    lantern(27, 17), lantern(20, 24),
    { img: img('village_obj', 80, 64, 16, 48), x: 21, bottom: 38, block: 'base' },
    { img: img('village_obj', 96, 64, 16, 48), x: 26, bottom: 38, block: 'base' },
    flowers(22, 23, 0), flowers(27, 21, 1), flowers(1, 16, 2), flowers(25, 13, 3), flowers(11, 30, 1),
    flowers(35, 31, 2), flowers(44, 16, 0), flowers(16, 31, 3), flowers(51, 17, 1),
    bush(18, 32), bush(19, 32), bush(38, 32), bush(39, 32), bush(1, 31), bush(52, 31),
  ],
  // Arbres : [x (colonne du tronc), ligne du tronc, variante].
  trees: [
    [0, 3, 0], [0, 7, 1], [0, 11, 2], [0, 19, 0], [0, 23, 1], [0, 27, 2], [0, 33, 0], [0, 37, 1],
    [53, 3, 2], [53, 8, 0], [53, 12, 1], [53, 19, 2], [53, 24, 0], [53, 33, 1], [53, 37, 2],
    [2, 39, 0], [14, 39, 1], [17, 39, 2], [20, 39, 0],
    [36, 39, 1], [39, 39, 2], [42, 39, 0], [45, 39, 1], [48, 39, 2], [51, 39, 0],
    [36, 3, 0], [49, 3, 1], [43, 17, 2], [9, 16, 1], [50, 17, 0], [16, 34, 1], [41, 34, 2], [47, 33, 0], [3, 32, 2],
  ],
  // Habitants : un par service, et quelques villageois qui n'ont qu'une phrase (`line`).
  // x, y : place devant chez eux (dans leur maison : voir data/interiors.js).
  npcs: [
    { id: 'inn', name: 'Brunhild l\'aubergiste', service: 'inn', home: 'inn', x: 4, y: 13 },
    { id: 'master', name: 'Maître Aldric', service: 'talents', home: 'master', x: 20, y: 13 },
    { id: 'runes', name: 'Ysolde la runomancienne', service: 'runes', home: 'runes', x: 31, y: 13 },
    { id: 'forge', name: 'Borin le forgeron', service: 'forge', home: 'forge', x: 41, y: 13 },
    { id: 'bank', name: 'Mathis le banquier', service: 'bank', home: 'bank', x: 7, y: 27 },
    { id: 'shop', name: 'Lars le marchand', service: 'merchant', home: 'shop', x: 17, y: 27 },
    { id: 'hunter', name: 'Garrec le traqueur', service: 'bestiary', home: 'hunter', x: 34, y: 27 },
    { id: 'oracle', name: 'L\'Oracle', service: 'difficulty', home: 'oracle', x: 42, y: 27 },
    { id: 'guard', name: 'Garde de la porte', service: 'portals', home: 'guard', x: 25, y: 38 },
    { id: 'fisher', name: 'Gaspard le pêcheur', service: null, home: 'fisher', line: 'Le lac est gelé… alors je répare mes filets.', x: 4, y: 38 },
    { id: 'kid1', name: 'Tom', service: null, home: 'family', line: 'Un jour, je serai aventurier !', x: 47, y: 27 },
    { id: 'kid2', name: 'Lina', service: null, home: 'family', line: 'Tu as déjà vu un dragon ?', x: 49, y: 27 },
  ],
  // Franchir la porte (ligne du bas) ouvre aussi les portails.
  gateExit: [{ x: 23, y: 39 }, { x: 24, y: 39 }],
};

// Description courte de chaque service (bulle au-dessus du personnage).
export const VILLAGE_SERVICES = {
  inn: 'Auberge : repos, recrutement, équipe',
  forge: 'Forge : décraft, amélioration, fabrication',
  bank: 'Banque : or, objets, matéria à l\'abri',
  merchant: 'Marchand : achat et vente',
  runes: 'Runomancien : relancer une stat',
  talents: 'Maître des compétences : talents',
  bestiary: 'Bestiaire',
  difficulty: 'Difficulté',
  portals: 'Portails vers les zones',
};
