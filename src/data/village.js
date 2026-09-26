// Village d'Anyem : petite carte à parcourir (cases de 16 px). Chaque service est un
// personnage ; lui parler ouvre son écran. Données pures : la grille de marche et les
// règles sont dans game/village.js, le rendu dans ui/village.js.
//
// Objets posés (bâtiments, décors) : { key (image de assets/), w, h (px), x (colonne de
// gauche), bottom (ligne du bas), block }. Le sprite est dessiné pieds sur la ligne
// `bottom` ; `block` : 'all' (toute son emprise), 'base' (sa ligne du bas), 'none', ou
// liste de cases [dx, dy] relatives au coin bas-gauche (dy ≤ 0).

export const VILLAGE = {
  w: 34,
  h: 24,
  spawn: { x: 17, y: 20 },       // arrivée (retour d'expédition, début de partie)
  // Chemins de terre battue : rectangles { x, y, w, h }.
  paths: [
    { x: 1, y: 9, w: 32, h: 2 },   // grand-rue, devant l'auberge et la forge
    { x: 16, y: 9, w: 3, h: 15 },  // allée centrale jusqu'à la porte
    { x: 10, y: 11, w: 13, h: 6 }, // place du puits
    { x: 2, y: 21, w: 30, h: 1 },  // rue du bas (banque, marchand)
    { x: 4, y: 20, w: 1, h: 1 },   // seuil de la banque
    { x: 30, y: 20, w: 1, h: 1 },  // seuil du marchand
    { x: 25, y: 20, w: 3, h: 1 },  // devant l'étal
  ],
  buildings: [
    { id: 'inn', key: 'fantasy/House_Hay_3', w: 180, h: 128, x: 1, bottom: 8, block: 'all' },
    { id: 'forge', key: 'fantasy/House_Hay_2', w: 157, h: 112, x: 22, bottom: 7, block: 'all' },
    { id: 'bank', key: 'fantasy/House_Hay_1', w: 88, h: 103, x: 2, bottom: 20, block: 'all' },
    { id: 'shop', key: 'fantasy/House_Hay_4_Purple', w: 128, h: 128, x: 24, bottom: 20, block: 'all' },
    { id: 'well', key: 'fantasy/Well_Hay_1', w: 56, h: 75, x: 11, bottom: 15, block: [[0, 0], [1, 0], [2, 0], [3, 0], [0, -1], [1, -1], [2, -1], [3, -1]] },
    // Porte de la ville : piliers seulement, on passe sous l'arche.
    { id: 'gate', key: 'fantasy/CityWall_Gate_1', w: 80, h: 96, x: 15, bottom: 23, block: [[0, 0], [0, -1], [0, -2], [4, 0], [4, -1], [4, -2]] },
  ],
  props: [
    { key: 'fantasy/BulletinBoard_1', w: 44, h: 42, x: 13, bottom: 8, block: 'base' },
    { key: 'fantasy/Animation_Campfire', w: 32, h: 32, x: 20, bottom: 13, block: 'all', frames: 8 },
    { key: 'fantasy/Banner_Stick_1_Purple', w: 24, h: 59, x: 21, bottom: 11, block: [[0, 0]] },
    { key: 'fantasy/LampPost_3', w: 46, h: 62, x: 14, bottom: 17, block: [[1, 0]] },
    { key: 'fantasy/LampPost_3', w: 46, h: 62, x: 18, bottom: 17, block: [[1, 0]] },
    { key: 'fantasy/Table_Medium_1', w: 42, h: 39, x: 8, bottom: 17, block: 'base' },
    { key: 'fantasy/Basket_Empty', w: 22, h: 17, x: 8, bottom: 16, block: 'none' },
    { key: 'fantasy/Barrel_Small_Empty', w: 16, h: 20, x: 31, bottom: 8, block: 'all' },
    { key: 'fantasy/Barrel_Small_Empty', w: 16, h: 20, x: 32, bottom: 8, block: 'all' },
    { key: 'fantasy/Crate_Large_Empty', w: 24, h: 29, x: 20, bottom: 7, block: 'all' },
    { key: 'fantasy/Crate_Water_1', w: 30, h: 22, x: 22, bottom: 20, block: 'all' },
    { key: 'fantasy/Crate_Medium_Closed', w: 16, h: 21, x: 23, bottom: 19, block: 'all' },
    { key: 'fantasy/Sack_3', w: 16, h: 14, x: 22, bottom: 18, block: 'all' },
    { key: 'fantasy/HayStack_2', w: 29, h: 32, x: 1, bottom: 12, block: 'all' },
    { key: 'fantasy/Chopped_Tree_1', w: 32, h: 31, x: 30, bottom: 11, block: 'all' },
    { key: 'fantasy/Bench_3', w: 14, h: 14, x: 10, bottom: 16, block: 'all' },
    { key: 'fantasy/Bench_3', w: 14, h: 14, x: 22, bottom: 16, block: 'all' },
    { key: 'fantasy/Sign_1', w: 24, h: 22, x: 21, bottom: 19, block: 'base' },
    { key: 'fantasy/Plant_2', w: 15, h: 11, x: 9, bottom: 20, block: 'none' },
    { key: 'fantasy/Plant_2', w: 15, h: 11, x: 13, bottom: 21, block: 'none' },
    // Haie de buissons au bas du village (des arbres y cacheraient les habitants).
    { key: 'fantasy/Bush_Emerald_1', w: 40, h: 29, x: 1, bottom: 23, block: 'base' },
    { key: 'fantasy/Bush_Emerald_3', w: 28, h: 28, x: 3, bottom: 23, block: 'base' },
    { key: 'fantasy/Bush_Emerald_1', w: 40, h: 29, x: 6, bottom: 23, block: 'base' },
    { key: 'fantasy/Bush_Emerald_3', w: 28, h: 28, x: 9, bottom: 23, block: 'base' },
    { key: 'fantasy/Bush_Emerald_1', w: 40, h: 29, x: 12, bottom: 23, block: 'base' },
    { key: 'fantasy/Bush_Emerald_3', w: 28, h: 28, x: 21, bottom: 23, block: 'base' },
    { key: 'fantasy/Bush_Emerald_1', w: 40, h: 29, x: 24, bottom: 23, block: 'base' },
    { key: 'fantasy/Bush_Emerald_3', w: 28, h: 28, x: 27, bottom: 23, block: 'base' },
    { key: 'fantasy/Bush_Emerald_1', w: 40, h: 29, x: 30, bottom: 23, block: 'base' },
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
