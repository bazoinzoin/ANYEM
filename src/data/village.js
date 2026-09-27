// Village d'Anyem : petite carte à parcourir (cases de 16 px). Chaque service est un
// personnage ; lui parler ouvre son écran. Données pures : la grille de marche et les
// règles sont dans game/village.js, le rendu dans ui/villageView.js.
// Graphismes : packs Raven Fantasy (assets/raven/ : maisons `buildings_obj`, objets
// `village_obj`, établis `craft_obj`, arbres et fleurs `forest_obj` / `forest2_obj`).
//
// Image : [planche, x, y, largeur, hauteur] en pixels dans la planche.
// Maisons : { id, img, x (colonne de gauche), bottom (ligne du bas), decor } ; toute l'emprise
//   bloque le passage (l'habitant attend devant). decor : [{ img, dx, dy }] posés sur la
//   maison (portes, fenêtres, enseignes, cheminées ; décalage en pixels depuis son coin haut-gauche).
// Objets : { img, x, bottom, block } ; block : 'all', 'base' (ligne du bas), 'none', ou cases
//   [dx, dy] relatives au coin bas-gauche (dy ≤ 0).
// Arbres : [x, bas, variante] ; seul le tronc (case du milieu en bas) bloque.

const img = (sheet, x, y, w, h) => [sheet, x, y, w, h];
const tile = (sheet, c, r, w = 1, h = 1) => img(sheet, c * 16, r * 16, w * 16, h * 16);

export const VILLAGE_ART = {
  grass: { sheet: 'village_A5', tiles: [[1, 0], [1, 0], [1, 0], [2, 0]] },
  path: { sheet: 'village_A2', auto: [8, 0] },
  trees: [tile('forest_obj', 0, 5, 3, 4), img('forest2_obj', 1, 150, 46, 55), img('forest2_obj', 49, 150, 46, 55)],
};

const DOOR = tile('village_obj', 10, 5, 1, 2);
const WINDOW = tile('village_obj', 9, 8);
const SIGN = { potion: tile('village_obj', 13, 5), mug: tile('village_obj', 13, 6), arrow: tile('village_obj', 13, 7), shield: tile('village_obj', 13, 8) };
const CHIMNEY = img('village_obj', 99, 145, 12, 47);
const flowers = (x, bottom, n = 0) => ({ img: [img('forest_obj', 178, 32, 14, 14), img('forest2_obj', 145, 34, 14, 11), img('forest2_obj', 138, 50, 22, 13), img('forest_obj', 96, 161, 15, 14)][n % 4], x, bottom, block: 'none' });
const bush = (x, bottom) => ({ img: img('forest2_obj', 48, 16, 16, 15), x, bottom, block: 'all' });
const fence = (x, bottom) => ({ img: img('village_obj', 208, 144, 48, 16), x, bottom, block: 'all' });

export const VILLAGE = {
  w: 40,
  h: 30,
  spawn: { x: 19, y: 26 },       // arrivée (retour d'expédition, début de partie)
  // Chemins de terre : rectangles { x, y, w, h }.
  paths: [
    { x: 1, y: 13, w: 38, h: 2 },  // grand-rue, devant l'auberge et la forge
    { x: 18, y: 13, w: 3, h: 17 }, // allée centrale jusqu'à la porte
    { x: 14, y: 15, w: 9, h: 6 },  // place du puits
    { x: 2, y: 26, w: 36, h: 2 },  // rue du bas (banque, marchande)
    { x: 4, y: 12, w: 3, h: 1 },   // marches de l'auberge
  ],
  buildings: [
    { id: 'inn', img: img('buildings_obj', 283, 0, 202, 192), x: 2, bottom: 11,
      decor: [
        { img: DOOR, dx: 38, dy: 138 },
        { img: WINDOW, dx: 118, dy: 126 }, { img: WINDOW, dx: 158, dy: 126 },
        { img: SIGN.mug, dx: 62, dy: 120 },
        { img: CHIMNEY, dx: 150, dy: 30 },
      ] },
    { id: 'master', img: img('buildings_obj', 19, 16, 74, 128), x: 17, bottom: 11,
      decor: [{ img: DOOR, dx: 29, dy: 96 }, { img: CHIMNEY, dx: 50, dy: 10 }] },
    { id: 'forge', img: img('buildings_obj', 296, 208, 152, 128), x: 27, bottom: 11,
      decor: [
        { img: DOOR, dx: 30, dy: 96 },
        { img: SIGN.shield, dx: 52, dy: 86 },
        { img: CHIMNEY, dx: 128, dy: -6 },
      ] },
    { id: 'bank', img: img('buildings_obj', 119, 2, 146, 142), x: 3, bottom: 24,
      decor: [{ img: img('buildings_obj', 480, 465, 32, 31), dx: 57, dy: 96 }, { img: SIGN.arrow, dx: 96, dy: 90 }] },
    { id: 'shop', img: img('buildings_obj', 27, 368, 106, 176), x: 30, bottom: 25,
      decor: [{ img: SIGN.potion, dx: 20, dy: 118 }] },
  ],
  props: [
    { img: tile('village_obj', 0, 5, 2, 2), x: 17, bottom: 18, block: 'all' },               // puits
    { img: tile('craft_obj', 0, 0, 2, 3), x: 37, bottom: 11, block: 'base' },                // fourneau de la forge
    { img: tile('craft_obj', 0, 3, 2, 2), x: 24, bottom: 11, block: 'base' },                // établi
    { img: tile('craft_obj', 0, 9, 2, 2), x: 24, bottom: 9, block: 'base' },                 // coffre de minerais
    { img: tile('craft_obj', 0, 7, 2, 2), x: 22, bottom: 16, block: 'base' },                // table de runes
    { img: tile('craft_obj', 6, 3, 2, 2), x: 12, bottom: 16, block: 'base' },                // alambic de l'Oracle
    { img: tile('forest_obj', 6, 6, 3, 4), x: 25, bottom: 21, block: 'base' },               // tente du traqueur
    { img: img('forest_obj', 144, 57, 16, 20), x: 24, bottom: 22, block: 'all' },            // feu de camp
    { img: tile('village_obj', 2, 7, 2, 2), x: 35, bottom: 22, block: 'base' },              // charrette
    { img: img('village_obj', 0, 38, 48, 24), x: 13, bottom: 12, block: 'base' },            // tonneaux de l'auberge
    { img: img('village_obj', 72, 36, 16, 24), x: 26, bottom: 11, block: 'base' },           // tonneau
    { img: img('village_obj', 97, 38, 15, 22), x: 29, bottom: 25, block: 'base' },           // paniers
    { img: img('village_obj', 113, 39, 14, 21), x: 37, bottom: 25, block: 'base' },
    { img: img('village_obj', 80, 64, 16, 48), x: 17, bottom: 28, block: 'base' },           // panneaux de la porte
    { img: img('village_obj', 96, 64, 16, 48), x: 21, bottom: 28, block: 'base' },
    { img: tile('village_obj', 0, 4), x: 21, bottom: 13, block: 'none' },                    // lanternes
    { img: tile('village_obj', 0, 4), x: 15, bottom: 26, block: 'none' },
    { img: img('village_obj', 112, 1, 16, 29), x: 1, bottom: 12, block: 'all' },             // tournesols
    { img: img('village_obj', 112, 1, 16, 29), x: 15, bottom: 11, block: 'all' },
    fence(22, 23), fence(25, 23), fence(12, 23),
    flowers(14, 21, 0), flowers(22, 20, 1), flowers(1, 16, 2), flowers(26, 13, 3), flowers(11, 27, 1),
    flowers(28, 27, 2), flowers(34, 16, 0), flowers(16, 23, 3), flowers(38, 14, 1),
    bush(13, 24), bush(14, 24), bush(22, 24), bush(23, 24), bush(1, 24), bush(38, 20),
  ],
  // Arbres : [x (colonne du tronc), ligne du tronc, variante].
  trees: [
    [0, 3, 0], [0, 7, 1], [0, 11, 2], [0, 19, 0], [0, 23, 1], [0, 28, 2], [2, 29, 0], [5, 29, 1], [8, 29, 2], [11, 29, 0], [14, 29, 1],
    [23, 29, 2], [26, 29, 0], [29, 29, 1], [32, 29, 2], [35, 29, 0], [38, 29, 1], [39, 24, 2], [39, 18, 0], [39, 7, 1], [39, 3, 2],
    [22, 3, 0], [25, 2, 1], [23, 7, 2], [16, 2, 1], [36, 20, 1],
  ],
  // Habitants : un par service, et quelques villageois qui n'ont qu'une phrase (`line`).
  npcs: [
    { id: 'inn', name: 'Brunhild l\'aubergiste', service: 'inn', x: 5, y: 13 },
    { id: 'forge', name: 'Borin le forgeron', service: 'forge', x: 29, y: 12 },
    { id: 'bank', name: 'Mathis le banquier', service: 'bank', x: 8, y: 25 },
    { id: 'shop', name: 'Lars le marchand', service: 'merchant', x: 32, y: 26 },
    { id: 'runes', name: 'Ysolde la runomancienne', service: 'runes', x: 21, y: 17 },
    { id: 'master', name: 'Maître Aldric', service: 'talents', x: 19, y: 12 },
    { id: 'hunter', name: 'Garrec le traqueur', service: 'bestiary', x: 27, y: 22 },
    { id: 'oracle', name: 'L\'Oracle', service: 'difficulty', x: 14, y: 16 },
    { id: 'guard', name: 'Garde de la porte', service: 'portals', x: 21, y: 29 },
    { id: 'fisher', name: 'Gaspard le pêcheur', service: null, line: 'Ça ne mord pas, aujourd\'hui…', x: 1, y: 21 },
    { id: 'kid1', name: 'Tom', service: null, line: 'Un jour, je serai aventurier !', x: 25, y: 18 },
    { id: 'kid2', name: 'Lina', service: null, line: 'Tu as déjà vu un dragon ?', x: 27, y: 17 },
  ],
  // Franchir la porte (ligne du bas) ouvre aussi les portails.
  gateExit: [{ x: 18, y: 29 }, { x: 19, y: 29 }, { x: 20, y: 29 }],
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
