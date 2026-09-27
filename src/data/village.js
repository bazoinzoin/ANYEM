// Village d'Anyem : petite carte à parcourir (cases de 16 px). Chaque service est un
// personnage ; lui parler ouvre son écran. Données pures : la grille de marche et les
// règles sont dans game/village.js, le rendu dans ui/villageView.js.
// Graphismes : chipsets RPG Maker 2003 (assets/rm2k3/chip_village, chip_town).
//
// Maisons : { id, x (colonne de gauche), bottom (ligne du bas), cols, roofRows, wallRows,
//   roof ('red' | 'teal' | 'green' | 'brown'), wall ('plaster' | 'stone' | 'brick'),
//   door (colonne de la porte, relative), windows ([colonnes]), sign ({ chip, tile, dx }) }
//   Toute l'emprise bloque le passage (l'habitant attend devant la porte).
// Objets : { chip ('village' | 'town'), rect: [col, ligne, largeur, hauteur] dans le chipset,
//   x (colonne de gauche), bottom (ligne du bas), block } ; block : 'all', 'base' (ligne du
//   bas), 'none', ou cases [dx, dy] relatives au coin bas-gauche (dy ≤ 0).

const bush = (x) => ({ chip: 'village', rect: [19, 9, 1, 1], x, bottom: 23, block: 'all' });
const flowers = (x, bottom) => ({ chip: 'village', rect: [18, 11, 1, 1], x, bottom, block: 'none' });

export const VILLAGE = {
  w: 34,
  h: 24,
  spawn: { x: 17, y: 20 },       // arrivée (retour d'expédition, début de partie)
  // Rues pavées : rectangles { x, y, w, h }.
  paths: [
    { x: 1, y: 9, w: 32, h: 2 },   // grand-rue, devant l'auberge et la forge
    { x: 16, y: 9, w: 3, h: 15 },  // allée centrale jusqu'à la porte
    { x: 10, y: 11, w: 13, h: 6 }, // place du puits
    { x: 2, y: 21, w: 30, h: 1 },  // rue du bas (banque, marchand)
    { x: 25, y: 20, w: 3, h: 1 },  // devant l'étal
  ],
  buildings: [
    { id: 'inn', x: 1, bottom: 8, cols: 12, roofRows: 4, wallRows: 3, roof: 'red', wall: 'plaster', door: 7, windows: [2, 4, 9, 10], sign: { chip: 'village', tile: [22, 14], dx: 6 } },
    { id: 'forge', x: 22, bottom: 7, cols: 10, roofRows: 3, wallRows: 3, roof: 'teal', wall: 'stone', door: 5, windows: [2, 8], sign: { chip: 'dungeon', tile: [21, 5], dx: 4 } },
    { id: 'bank', x: 2, bottom: 20, cols: 6, roofRows: 3, wallRows: 3, roof: 'teal', wall: 'brick', door: 2, windows: [4] },
    { id: 'shop', x: 24, bottom: 20, cols: 8, roofRows: 3, wallRows: 3, roof: 'red', wall: 'stone', door: 6, windows: [1, 3], sign: { chip: 'dungeon', tile: [20, 8], dx: 5 } },
  ],
  props: [
    { chip: 'village', rect: [22, 12, 1, 1], x: 12, bottom: 14, block: 'all' },   // puits
    { chip: 'village', rect: [26, 8, 1, 2], x: 11, bottom: 12, block: 'all' },    // statue
    { chip: 'village', rect: [21, 12, 1, 1], x: 20, bottom: 13, block: 'all' },   // feu de camp
    { chip: 'village', rect: [29, 5, 1, 2], x: 21, bottom: 11, block: [[0, 0]] }, // bannière
    { chip: 'village', rect: [18, 10, 1, 1], x: 15, bottom: 17, block: 'all' },   // braseros
    { chip: 'village', rect: [18, 10, 1, 1], x: 19, bottom: 17, block: 'all' },
    { chip: 'village', rect: [20, 14, 1, 1], x: 14, bottom: 8, block: 'all' },    // panneau
    { chip: 'village', rect: [27, 10, 2, 1], x: 8, bottom: 17, block: 'all' },    // table
    { chip: 'village', rect: [27, 5, 1, 1], x: 31, bottom: 8, block: 'all' },     // tonneaux
    { chip: 'village', rect: [27, 5, 1, 1], x: 32, bottom: 8, block: 'all' },
    { chip: 'town', rect: [22, 13, 1, 1], x: 20, bottom: 7, block: 'all' },       // caisse
    { chip: 'town', rect: [22, 12, 1, 1], x: 21, bottom: 7, block: 'all' },       // tonneau
    { chip: 'town', rect: [27, 12, 3, 4], x: 21, bottom: 20, block: 'base' },     // charrette de fleurs
    { chip: 'village', rect: [19, 8, 1, 1], x: 1, bottom: 12, block: 'all' },     // souches
    { chip: 'village', rect: [19, 8, 1, 1], x: 30, bottom: 11, block: 'all' },
    { chip: 'town', rect: [18, 10, 1, 1], x: 10, bottom: 16, block: 'all' },      // pots de fleurs
    { chip: 'town', rect: [19, 10, 1, 1], x: 22, bottom: 16, block: 'all' },
    { chip: 'village', rect: [20, 14, 1, 1], x: 21, bottom: 19, block: 'all' },   // panneau
    flowers(9, 20), flowers(13, 21), flowers(11, 19), flowers(29, 12), flowers(4, 12),
    // Porte de la ville : deux piliers, on passe entre eux.
    { chip: 'village', rect: [27, 8, 1, 2], x: 15, bottom: 23, block: [[0, 0]] },
    { chip: 'village', rect: [27, 8, 1, 2], x: 19, bottom: 23, block: [[0, 0]] },
    // Haie de buissons au bas du village (des arbres y cacheraient les habitants).
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].map(bush),
  ],
  // Arbres : pieds sur la case (x, y). Une case d'arbre bloque le passage.
  trees: [
    [0, 13], [0, 16], [0, 19], [0, 22], [33, 22], [33, 19], [33, 16], [33, 13],
    [33, 3], [33, 6], [0, 2], [0, 5], [15, 4], [18, 3], [5, 12], [28, 11],
  ],
  // Habitants : un par service. look : teintes { shirt, hair } (degrés de teinte) du
  // sprite du héros, pour les distinguer en attendant de vrais personnages.
  npcs: [
    { id: 'inn', name: 'Brunhild l\'aubergiste', service: 'inn', x: 8, y: 9, look: { shirt: 0, hair: 20 } },
    { id: 'forge', name: 'Borin le forgeron', service: 'forge', x: 27, y: 8, look: { shirt: 200, hair: 0 } },
    { id: 'bank', name: 'Mathis le banquier', service: 'bank', x: 6, y: 21, look: { shirt: 120, hair: 40 } },
    { id: 'shop', name: 'Lisa la marchande', service: 'merchant', x: 26, y: 21, look: { shirt: 300, hair: 10 } },
    { id: 'runes', name: 'Ysolde la runomancienne', service: 'runes', x: 22, y: 13, look: { shirt: 270, hair: 280 } },
    { id: 'master', name: 'Maître Aldric', service: 'talents', x: 14, y: 9, look: { shirt: 160, hair: 60 } },
    { id: 'hunter', name: 'Garrec le traqueur', service: 'bestiary', x: 9, y: 18, look: { shirt: 90, hair: 15 } },
    { id: 'oracle', name: 'L\'Oracle', service: 'difficulty', x: 13, y: 16, look: { shirt: 230, hair: 190 } },
    { id: 'guard', name: 'Garde de la porte', service: 'portals', x: 20, y: 21, look: { shirt: 20, hair: 30 } },
  ],
  // Passer sous l'arche de la porte (ligne du bas) ouvre aussi les portails.
  gateExit: [{ x: 16, y: 23 }, { x: 17, y: 23 }, { x: 18, y: 23 }],
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
