// Bestiaire. Les stats évoluent avec le niveau de l'étage :
// valeur = base + perLevel × niveau ; la vitesse est tirée dans [min, max].
// Stats non précisées (critique, esquive, blocage…) : 0.
//
// Champs optionnels :
//   magic      l'attaque de base est magique (réduite par la Défense magique)
//   ranged     l'ennemi se tient à distance (sinon corps à corps : il peut riposter
//              et ses attaques physiques peuvent déclencher la riposte des héros)
//   riposte    chance (%) de riposter quand un héros le frappe au corps à corps
//   boss       ennemi de fin de sous-zone (butin garanti et meilleur, voir LOOT)
//   elite      ennemi ordinaire renforcé (plus rare dans les rencontres, plus d'XP et d'or)
//   xpMult     multiplicateur d'XP (défaut 1) ; goldMult : multiplicateur d'or
//   abilities  [{ chance, skill }] : à chaque tour, chaque capacité est tentée dans
//              l'ordre avec sa chance ; sinon, attaque de base. Le format de `skill`
//              est celui des compétences des héros (voir data/classes.js), avec les
//              cibles 'hero' (un héros, provocation respectée), 'allHeroes', 'self'
//              et 'allAllies' (les ennemis vivants). Buffs et debuffs : `effects` /
//              `selfEffects`, effets du catalogue data/effects.js.

// Raccourcis vers les effets du catalogue (data/effects.js).
const bleed = (power, turns = 3) => ({ id: 'saignement', turns, power });
const poison = (power, turns = 3) => ({ id: 'poison', turns, power });
const slow = (turns = 2) => ({ id: 'ralenti', turns });
const confus = (turns = 2) => ({ id: 'confus', turns });
const stun = { id: 'etourdi', turns: 1 };
const burn = (power, turns = 3) => ({ id: 'brulure', turns, power });
const dark = (power, turns = 3) => ({ id: 'tenebres', turns, power });

export const ENEMIES = {
  // ---- Forêt Maudite ----
  gobelin: {
    name: 'Gobelin', icon: '👹', riposte: 5,
    pv: { base: 40, perLevel: 8 }, atq: { base: 8, perLevel: 2 },
    def: { base: 2, perLevel: 1 }, defMag: { base: 0, perLevel: 1 }, vit: { min: 6, max: 11 },
  },
  loup: {
    name: 'Loup', icon: '🐺',
    pv: { base: 30, perLevel: 6 }, atq: { base: 7, perLevel: 2 },
    def: { base: 1, perLevel: 0.5 }, defMag: { base: 0, perLevel: 0.5 }, vit: { min: 10, max: 14 },
    abilities: [{ chance: 0.25, skill: { name: 'Morsure', kind: 'damage', target: 'hero', power: 1, effects: [bleed(0.25)] } }],
  },
  serpentAile: {
    name: 'Serpent ailé', icon: '🕷️',
    pv: { base: 35, perLevel: 7 }, atq: { base: 6, perLevel: 1.5 },
    def: { base: 2, perLevel: 1 }, defMag: { base: 1, perLevel: 1 }, vit: { min: 7, max: 10 },
    abilities: [{ chance: 0.35, skill: { name: 'Dard venimeux', kind: 'damage', target: 'hero', power: 0.6, effects: [poison(0.3)] } }],
  },
  chefGobelin: {
    name: 'Chef gobelin', icon: '👺', riposte: 15, boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 150, perLevel: 25 }, atq: { base: 12, perLevel: 2.5 },
    def: { base: 5, perLevel: 1 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 7, max: 9 },
    abilities: [
      { chance: 0.3, skill: { name: 'Cri de ralliement', kind: 'support', target: 'allAllies', effects: [{ id: 'puissance', turns: 3 }] } },
      { chance: 0.25, skill: { name: 'Coup de massue', kind: 'damage', target: 'hero', power: 1.4, effects: [stun] } },
    ],
  },
  ogre: {
    name: 'Ogre des bois', icon: '🕸️', boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 170, perLevel: 25 }, atq: { base: 11, perLevel: 2 },
    def: { base: 4, perLevel: 1 }, defMag: { base: 4, perLevel: 1 }, vit: { min: 8, max: 10 },
    abilities: [
      { chance: 0.35, skill: { name: 'Balayage de massue', kind: 'damage', target: 'allHeroes', power: 0.55, effects: [{ id: 'affaibli', turns: 2 }] } },
      { chance: 0.25, skill: { name: 'Rugissement', kind: 'support', target: 'allHeroes', effects: [slow(2)] } },
    ],
  },
  loupAlpha: {
    name: 'Loup alpha', icon: '🐺', riposte: 10, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 55, perLevel: 10 }, atq: { base: 9, perLevel: 2.3 },
    def: { base: 4, perLevel: 1 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 12, max: 15 },
    abilities: [
      { chance: 0.3, skill: { name: 'Hurlement', kind: 'support', target: 'allAllies', effects: [{ id: 'puissance', turns: 3 }, { id: 'hate', turns: 3 }] } },
      { chance: 0.3, skill: { name: 'Déchiquetage', kind: 'damage', target: 'hero', power: 1.4, effects: [bleed(0.3)] } },
    ],
  },
  oursHibou: {
    name: 'Ours-hibou', icon: '🌳', riposte: 10, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 75, perLevel: 12 }, atq: { base: 8, perLevel: 2 },
    def: { base: 8, perLevel: 1.5 }, defMag: { base: 2, perLevel: 1 }, vit: { min: 5, max: 7 },
    abilities: [
      { chance: 0.3, skill: { name: 'Étreinte', kind: 'damage', target: 'hero', power: 0.8, effects: [stun] } },
      { chance: 0.25, skill: { name: 'Lécher ses plaies', kind: 'heal', target: 'self', power: 1.5 } },
    ],
  },
  reineSylvestre: {
    name: 'Reine sylvestre', icon: '🧚', boss: true, xpMult: 8, goldMult: 6, magic: true, ranged: true,
    pv: { base: 320, perLevel: 35 }, atq: { base: 14, perLevel: 2.5 },
    def: { base: 5, perLevel: 1 }, defMag: { base: 6, perLevel: 1.5 }, vit: { min: 9, max: 11 },
    abilities: [
      { chance: 0.3, skill: { name: "Tempête d'épines", kind: 'damage', target: 'allHeroes', power: 0.7, magic: true, effects: [bleed(0.2)] } },
      { chance: 0.15, skill: { name: 'Pollen hallucinogène', kind: 'support', target: 'hero', effects: [confus(2)] } },
      { chance: 0.2, skill: { name: 'Malédiction', kind: 'support', target: 'allHeroes', effects: [{ id: 'affaibli', turns: 3 }] } },
      { chance: 0.2, skill: { name: 'Régénération', kind: 'support', target: 'self', effects: [{ id: 'regeneration', turns: 3, power: 0.8 }] } },
    ],
  },

  // ---- Catacombes oubliées ----
  squelette: {
    name: 'Squelette', icon: '💀', riposte: 10,
    pv: { base: 45, perLevel: 7 }, atq: { base: 9, perLevel: 2 },
    def: { base: 4, perLevel: 1.2 }, defMag: { base: 1, perLevel: 0.5 }, vit: { min: 6, max: 9 },
    abilities: [{ chance: 0.25, skill: { name: "Coup d'os", kind: 'damage', target: 'hero', power: 1.3 } }],
  },
  zombie: {
    name: 'Zombie', icon: '🧟',
    pv: { base: 60, perLevel: 9 }, atq: { base: 8, perLevel: 2 },
    def: { base: 2, perLevel: 1 }, defMag: { base: 1, perLevel: 1 }, vit: { min: 3, max: 6 },
    abilities: [{ chance: 0.3, skill: { name: 'Morsure putride', kind: 'damage', target: 'hero', power: 0.7, effects: [poison(0.35)] } }],
  },
  spectre: {
    name: 'Spectre', icon: '👻', magic: true, ranged: true,
    pv: { base: 30, perLevel: 6 }, atq: { base: 10, perLevel: 2 },
    def: { base: 8, perLevel: 2 }, defMag: { base: 0, perLevel: 0.5 }, vit: { min: 9, max: 13 },
    abilities: [{ chance: 0.25, skill: { name: 'Cri glaçant', kind: 'damage', target: 'allHeroes', power: 0.4, magic: true, effects: [slow(2)] } }],
  },
  chevalierMort: {
    name: 'Chevalier de la mort', icon: '🛡️', riposte: 20, boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 220, perLevel: 28 }, atq: { base: 14, perLevel: 2.5 },
    def: { base: 12, perLevel: 2 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 6, max: 8 },
    abilities: [
      { chance: 0.3, skill: { name: 'Égide funeste', kind: 'support', target: 'self', effects: [{ id: 'bouclier', turns: 2, power: 2 }] } },
      { chance: 0.25, skill: { name: 'Frappe écrasante', kind: 'damage', target: 'hero', power: 1.6 } },
    ],
  },
  eveque: {
    name: 'Évêque maudit', icon: '🧙', boss: true, xpMult: 5, goldMult: 4, magic: true, ranged: true,
    pv: { base: 200, perLevel: 25 }, atq: { base: 13, perLevel: 2.5 },
    def: { base: 4, perLevel: 1 }, defMag: { base: 8, perLevel: 1.5 }, vit: { min: 8, max: 10 },
    abilities: [
      { chance: 0.3, skill: { name: "Trait d'ombre", kind: 'damage', target: 'hero', power: 1.3, magic: true } },
      { chance: 0.2, skill: { name: 'Pacte funeste', kind: 'support', target: 'self', effects: [{ id: 'regeneration', turns: 3, power: 0.8 }] } },
      { chance: 0.25, skill: { name: 'Nuée de ténèbres', kind: 'damage', target: 'allHeroes', power: 0.6, magic: true } },
    ],
  },
  abomination: {
    name: 'Abomination', icon: '🧌', riposte: 10, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 80, perLevel: 12 }, atq: { base: 9, perLevel: 2.3 },
    def: { base: 6, perLevel: 1.5 }, defMag: { base: 4, perLevel: 1 }, vit: { min: 4, max: 6 },
    abilities: [
      { chance: 0.3, skill: { name: 'Vomi putride', kind: 'damage', target: 'allHeroes', power: 0.5, effects: [poison(0.35)] } },
      { chance: 0.25, skill: { name: 'Écrasement', kind: 'damage', target: 'hero', power: 1.8, effects: [stun] } },
    ],
  },
  banshee: {
    name: 'Banshee', icon: '😱', elite: true, xpMult: 1.5, goldMult: 1.5, magic: true, ranged: true,
    pv: { base: 45, perLevel: 8 }, atq: { base: 10, perLevel: 2.4 },
    def: { base: 10, perLevel: 2 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 11, max: 14 },
    abilities: [
      { chance: 0.3, skill: { name: 'Hurlement funèbre', kind: 'damage', target: 'allHeroes', power: 0.7, magic: true, effects: [{ id: 'terreur', turns: 2 }] } },
      { chance: 0.2, skill: { name: 'Murmures déments', kind: 'support', target: 'hero', effects: [confus(2)] } },
      { chance: 0.2, skill: { name: 'Voile spectral', kind: 'support', target: 'self', effects: [{ id: 'protection', turns: 2 }] } },
    ],
  },
  liche: {
    name: 'Liche', icon: '☠️', boss: true, xpMult: 8, goldMult: 6, magic: true, ranged: true,
    pv: { base: 380, perLevel: 38 }, atq: { base: 16, perLevel: 3 },
    def: { base: 8, perLevel: 1.5 }, defMag: { base: 10, perLevel: 2 }, vit: { min: 9, max: 11 },
    abilities: [
      { chance: 0.25, skill: { name: 'Nova de givre', kind: 'damage', target: 'allHeroes', power: 0.8, magic: true, effects: [slow(2)] } },
      { chance: 0.2, skill: { name: 'Doigt de mort', kind: 'damage', target: 'hero', power: 2.2, magic: true } },
      { chance: 0.2, skill: { name: 'Phylactère', kind: 'heal', target: 'self', power: 2 } },
    ],
  },
  // ---- Cavernes ardentes ----
  kobold: {
    name: 'Kobold', icon: '⛏️', riposte: 5,
    pv: { base: 40, perLevel: 8 }, atq: { base: 8, perLevel: 2 },
    def: { base: 3, perLevel: 1.1 }, defMag: { base: 1, perLevel: 0.8 }, vit: { min: 7, max: 11 },
    abilities: [{ chance: 0.25, skill: { name: 'Coup de pioche', kind: 'damage', target: 'hero', power: 1.3, effects: [bleed(0.2)] } }],
  },
  salamandre: {
    name: 'Salamandre', icon: '🦎',
    pv: { base: 35, perLevel: 7.5 }, atq: { base: 8, perLevel: 2.1 },
    def: { base: 2, perLevel: 0.8 }, defMag: { base: 3, perLevel: 1.2 }, vit: { min: 9, max: 13 },
    abilities: [{ chance: 0.3, skill: { name: 'Souffle ardent', kind: 'damage', target: 'hero', power: 0.7, magic: true, effects: [burn(0.35)] } }],
  },
  diablotin: {
    name: 'Diablotin', icon: '😈', magic: true, ranged: true,
    pv: { base: 28, perLevel: 6 }, atq: { base: 10, perLevel: 2.2 },
    def: { base: 1, perLevel: 0.6 }, defMag: { base: 4, perLevel: 1.4 }, vit: { min: 11, max: 15 },
    abilities: [{ chance: 0.25, skill: { name: 'Pluie de braises', kind: 'damage', target: 'allHeroes', power: 0.4, magic: true, effects: [burn(0.2, 2)] } }],
  },
  golemMagma: {
    name: 'Golem de magma', icon: '🗿', riposte: 15, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 85, perLevel: 13 }, atq: { base: 9, perLevel: 2.3 },
    def: { base: 8, perLevel: 2 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 3, max: 6 },
    abilities: [{ chance: 0.3, skill: { name: 'Poing de lave', kind: 'damage', target: 'hero', power: 1.4, effects: [burn(0.3), stun] } }],
  },
  verGeant: {
    name: 'Ver des profondeurs', icon: '👑', riposte: 15, boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 220, perLevel: 28 }, atq: { base: 13, perLevel: 2.6 },
    def: { base: 6, perLevel: 1.4 }, defMag: { base: 4, perLevel: 1.1 }, vit: { min: 8, max: 10 },
    abilities: [
      { chance: 0.3, skill: { name: 'Appel des profondeurs', kind: 'support', target: 'allAllies', effects: [{ id: 'puissance', turns: 3 }, { id: 'protection', turns: 2 }] } },
      { chance: 0.25, skill: { name: 'Éboulement', kind: 'damage', target: 'allHeroes', power: 0.7, effects: [stun] } },
    ],
  },
  efrit: {
    name: 'Éfrit des forges', icon: '🐉', boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 240, perLevel: 29 }, atq: { base: 13, perLevel: 2.7 },
    def: { base: 5, perLevel: 1.2 }, defMag: { base: 7, perLevel: 1.6 }, vit: { min: 9, max: 12 },
    abilities: [
      { chance: 0.3, skill: { name: 'Flammes dévorantes', kind: 'damage', target: 'allHeroes', power: 0.6, magic: true, effects: [burn(0.35)] } },
      { chance: 0.2, skill: { name: 'Cœur de braise', kind: 'heal', target: 'self', power: 1.6 } },
      { chance: 0.2, skill: { name: 'Poing de flammes', kind: 'damage', target: 'hero', power: 1.5 } },
    ],
  },
  dragonRouge: {
    name: 'Dragon rouge', icon: '🔥', boss: true, xpMult: 8, goldMult: 6, magic: true, ranged: true,
    pv: { base: 380, perLevel: 38 }, atq: { base: 16, perLevel: 3 },
    def: { base: 7, perLevel: 1.5 }, defMag: { base: 10, perLevel: 2 }, vit: { min: 9, max: 11 },
    abilities: [
      { chance: 0.25, skill: { name: 'Éruption', kind: 'damage', target: 'allHeroes', power: 0.8, magic: true, effects: [burn(0.4)] } },
      { chance: 0.2, skill: { name: 'Souffle ardent', kind: 'damage', target: 'hero', power: 2.1, magic: true } },
      { chance: 0.15, skill: { name: 'Fumées suffocantes', kind: 'support', target: 'allHeroes', effects: [{ id: 'affaibli', turns: 3 }] } },
      { chance: 0.15, skill: { name: 'Cœur de lave', kind: 'support', target: 'self', effects: [{ id: 'regeneration', turns: 3, power: 0.9 }] } },
    ],
  },

  // ---- Pics gelés ----
  loupDeGivre: {
    name: 'Loup de givre', icon: '🐺',
    pv: { base: 32, perLevel: 7 }, atq: { base: 8, perLevel: 2.1 },
    def: { base: 2, perLevel: 0.8 }, defMag: { base: 2, perLevel: 0.9 }, vit: { min: 11, max: 15 },
    abilities: [{ chance: 0.3, skill: { name: 'Crocs gelés', kind: 'damage', target: 'hero', power: 1, effects: [slow(2)] } }],
  },
  griffon: {
    name: 'Griffon', icon: '🦅', ranged: true,
    pv: { base: 30, perLevel: 6.5 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 2, perLevel: 0.7 }, defMag: { base: 2, perLevel: 0.9 }, vit: { min: 12, max: 16 },
    abilities: [{ chance: 0.3, skill: { name: 'Serres lacérantes', kind: 'damage', target: 'hero', power: 0.9, effects: [bleed(0.3)] } }],
  },
  elementaireDeGlace: {
    name: 'Golem de glace', icon: '❄️', magic: true, ranged: true,
    pv: { base: 38, perLevel: 7.5 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 6, perLevel: 1.6 }, defMag: { base: 5, perLevel: 1.5 }, vit: { min: 6, max: 9 },
    abilities: [{ chance: 0.3, skill: { name: 'Blizzard', kind: 'damage', target: 'allHeroes', power: 0.45, magic: true, effects: [slow(2)] } }],
  },
  yeti: {
    name: 'Yéti', icon: '🦍', riposte: 10, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 90, perLevel: 13 }, atq: { base: 10, perLevel: 2.4 },
    def: { base: 5, perLevel: 1.3 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 6, max: 9 },
    abilities: [{ chance: 0.3, skill: { name: 'Charge glaciale', kind: 'damage', target: 'hero', power: 1.5, effects: [stun] } }],
  },
  sorciereDesNeiges: {
    name: 'Sorcière des neiges', icon: '🪶', boss: true, xpMult: 5, goldMult: 4, ranged: true,
    pv: { base: 220, perLevel: 27 }, atq: { base: 14, perLevel: 2.7 },
    def: { base: 5, perLevel: 1.2 }, defMag: { base: 5, perLevel: 1.2 }, vit: { min: 12, max: 15 },
    abilities: [
      { chance: 0.3, skill: { name: 'Blizzard', kind: 'damage', target: 'allHeroes', power: 0.6, magic: true, effects: [slow(2)] } },
      { chance: 0.2, skill: { name: 'Maléfice', kind: 'support', target: 'hero', effects: [confus(2)] } },
      { chance: 0.2, skill: { name: 'Voile de givre', kind: 'support', target: 'self', effects: [{ id: 'protection', turns: 2 }] } },
    ],
  },
  geantDuGivre: {
    name: 'Géant du givre', icon: '🧊', riposte: 20, boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 280, perLevel: 32 }, atq: { base: 15, perLevel: 2.8 },
    def: { base: 10, perLevel: 2 }, defMag: { base: 5, perLevel: 1.2 }, vit: { min: 5, max: 7 },
    abilities: [
      { chance: 0.3, skill: { name: 'Séisme glacé', kind: 'damage', target: 'allHeroes', power: 0.7, effects: [slow(2)] } },
      { chance: 0.25, skill: { name: 'Massue de glace', kind: 'damage', target: 'hero', power: 1.8, effects: [stun] } },
      { chance: 0.15, skill: { name: 'Peau de givre', kind: 'support', target: 'self', effects: [{ id: 'bouclier', turns: 2, power: 2 }] } },
    ],
  },
  dragonDeGlace: {
    name: 'Dragon de glace', icon: '🐲', boss: true, xpMult: 8, goldMult: 6, magic: true,
    pv: { base: 400, perLevel: 40 }, atq: { base: 17, perLevel: 3.1 },
    def: { base: 9, perLevel: 1.8 }, defMag: { base: 9, perLevel: 1.8 }, vit: { min: 9, max: 11 },
    abilities: [
      { chance: 0.25, skill: { name: 'Souffle glacial', kind: 'damage', target: 'allHeroes', power: 0.85, magic: true, effects: [slow(2)] } },
      { chance: 0.2, skill: { name: 'Griffes de cristal', kind: 'damage', target: 'hero', power: 1.9, effects: [bleed(0.35)] } },
      { chance: 0.15, skill: { name: 'Rugissement', kind: 'support', target: 'allHeroes', effects: [{ id: 'terreur', turns: 2 }] } },
      { chance: 0.15, skill: { name: 'Armure de givre', kind: 'support', target: 'self', effects: [{ id: 'protection', turns: 2 }] } },
    ],
  },

  // ---- Abîme infernal ----
  demon: {
    name: 'Démon mineur', icon: '👿', riposte: 10,
    pv: { base: 42, perLevel: 8 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 3, perLevel: 1.1 }, defMag: { base: 3, perLevel: 1.1 }, vit: { min: 8, max: 12 },
    abilities: [{ chance: 0.25, skill: { name: 'Griffes infernales', kind: 'damage', target: 'hero', power: 1, effects: [burn(0.3)] } }],
  },
  succube: {
    name: 'Succube', icon: '💋', magic: true, ranged: true,
    pv: { base: 32, perLevel: 7 }, atq: { base: 10, perLevel: 2.3 },
    def: { base: 2, perLevel: 0.8 }, defMag: { base: 5, perLevel: 1.4 }, vit: { min: 10, max: 14 },
    abilities: [
      { chance: 0.2, skill: { name: 'Baiser envoûtant', kind: 'support', target: 'hero', effects: [confus(2)] } },
      { chance: 0.25, skill: { name: 'Fouet d\'ombre', kind: 'damage', target: 'hero', power: 0.9, magic: true, effects: [dark(0.3)] } },
    ],
  },
  chevalierInfernal: {
    name: 'Chevalier infernal', icon: '⚔️', riposte: 15,
    pv: { base: 48, perLevel: 8.5 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 6, perLevel: 1.6 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 6, max: 9 },
    abilities: [{ chance: 0.25, skill: { name: 'Lame maudite', kind: 'damage', target: 'hero', power: 1.3, effects: [{ id: 'affaibli', turns: 2 }] } }],
  },
  behemoth: {
    name: 'Béhémoth', icon: '🐂', riposte: 10, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 95, perLevel: 14 }, atq: { base: 10, perLevel: 2.5 },
    def: { base: 6, perLevel: 1.5 }, defMag: { base: 4, perLevel: 1.2 }, vit: { min: 5, max: 8 },
    abilities: [{ chance: 0.3, skill: { name: 'Piétinement', kind: 'damage', target: 'allHeroes', power: 0.6, effects: [stun] } }],
  },
  gardienDeLaPorte: {
    name: 'Gardien de la Porte', icon: '🚪', riposte: 20, boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 290, perLevel: 33 }, atq: { base: 15, perLevel: 2.8 },
    def: { base: 12, perLevel: 2.2 }, defMag: { base: 8, perLevel: 1.6 }, vit: { min: 6, max: 8 },
    abilities: [
      { chance: 0.3, skill: { name: 'Sceau infernal', kind: 'support', target: 'self', effects: [{ id: 'bouclier', turns: 2, power: 2.2 }] } },
      { chance: 0.25, skill: { name: 'Jugement', kind: 'damage', target: 'hero', power: 1.8, effects: [{ id: 'terreur', turns: 2 }] } },
    ],
  },
  angeDechu: {
    name: 'Ange déchu', icon: '🦇', boss: true, xpMult: 5, goldMult: 4, magic: true, ranged: true,
    pv: { base: 250, perLevel: 30 }, atq: { base: 16, perLevel: 2.9 },
    def: { base: 5, perLevel: 1.2 }, defMag: { base: 10, perLevel: 1.8 }, vit: { min: 11, max: 14 },
    abilities: [
      { chance: 0.25, skill: { name: "Ailes d'ombre", kind: 'damage', target: 'allHeroes', power: 0.7, magic: true, effects: [dark(0.3)] } },
      { chance: 0.2, skill: { name: 'Regard déchu', kind: 'support', target: 'hero', effects: [confus(2)] } },
      { chance: 0.2, skill: { name: 'Drain de vie', kind: 'heal', target: 'self', power: 1.8 } },
    ],
  },
  seigneurDeLAbime: {
    name: "Nidhogg, seigneur de l'Abîme", icon: '👹', boss: true, xpMult: 10, goldMult: 8, magic: true,
    pv: { base: 450, perLevel: 44 }, atq: { base: 18, perLevel: 3.3 },
    def: { base: 10, perLevel: 2 }, defMag: { base: 10, perLevel: 2 }, vit: { min: 10, max: 12 },
    abilities: [
      { chance: 0.25, skill: { name: 'Apocalypse', kind: 'damage', target: 'allHeroes', power: 0.9, magic: true, effects: [burn(0.4), dark(0.3)] } },
      { chance: 0.2, skill: { name: 'Main du néant', kind: 'damage', target: 'hero', power: 2.3, magic: true, effects: [stun] } },
      { chance: 0.15, skill: { name: 'Terreur absolue', kind: 'support', target: 'allHeroes', effects: [{ id: 'terreur', turns: 2 }, { id: 'affaibli', turns: 2 }] } },
      { chance: 0.15, skill: { name: 'Rage abyssale', kind: 'support', target: 'self', effects: [{ id: 'puissance', turns: 3 }, { id: 'hate', turns: 3 }] } },
    ],
  },
  // ---- Créatures ajoutées avec le pack de monstres (Franuka) ----
  // Forêt Maudite
  slime: {
    name: 'Gelée verte', icon: '🟢',
    pv: { base: 34, perLevel: 7 }, atq: { base: 6, perLevel: 1.6 },
    def: { base: 1, perLevel: 0.6 }, defMag: { base: 2, perLevel: 1 }, vit: { min: 5, max: 8 },
    abilities: [{ chance: 0.3, skill: { name: 'Jet acide', kind: 'damage', target: 'hero', power: 0.7, effects: [poison(0.25)] } }],
  },
  lapinSoldat: {
    name: 'Lapin soldat', icon: '🐇', riposte: 10,
    pv: { base: 32, perLevel: 6.5 }, atq: { base: 7, perLevel: 2 },
    def: { base: 2, perLevel: 1 }, defMag: { base: 1, perLevel: 0.6 }, vit: { min: 11, max: 15 },
    abilities: [{ chance: 0.25, skill: { name: 'Coup de lance', kind: 'damage', target: 'hero', power: 1.3 } }],
  },
  fauveEclipse: {
    name: 'Fauve éclipse', icon: '🐆', riposte: 10, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 58, perLevel: 10 }, atq: { base: 9, perLevel: 2.3 },
    def: { base: 3, perLevel: 1 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 12, max: 16 },
    abilities: [
      { chance: 0.3, skill: { name: 'Déplacement trompeur', kind: 'support', target: 'self', effects: [{ id: 'hate', turns: 3 }] } },
      { chance: 0.3, skill: { name: 'Tentacules lacérants', kind: 'damage', target: 'hero', power: 1.3, effects: [bleed(0.3)] } },
    ],
  },
  orque: {
    name: 'Orque', icon: '👹', riposte: 15,
    pv: { base: 44, perLevel: 8.5 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 3, perLevel: 1.1 }, defMag: { base: 1, perLevel: 0.6 }, vit: { min: 6, max: 9 },
    abilities: [{ chance: 0.25, skill: { name: 'Hache sauvage', kind: 'damage', target: 'hero', power: 1.4, effects: [bleed(0.25)] } }],
  },
  lutin: {
    name: 'Lutin farceur', icon: '🧚', magic: true, ranged: true,
    pv: { base: 26, perLevel: 5.5 }, atq: { base: 7, perLevel: 1.9 },
    def: { base: 1, perLevel: 0.5 }, defMag: { base: 3, perLevel: 1.1 }, vit: { min: 12, max: 16 },
    abilities: [{ chance: 0.25, skill: { name: 'Poussière de fée', kind: 'support', target: 'hero', effects: [confus(2)] } }],
  },
  satyre: {
    name: 'Satyre', icon: '🐐', riposte: 10,
    pv: { base: 38, perLevel: 7.5 }, atq: { base: 8, perLevel: 2 },
    def: { base: 2, perLevel: 1 }, defMag: { base: 2, perLevel: 1 }, vit: { min: 9, max: 13 },
    abilities: [{ chance: 0.25, skill: { name: 'Air de flûte', kind: 'support', target: 'allHeroes', effects: [slow(2)] } }],
  },
  chienVioloneux: {
    name: 'Chien violoneux', icon: '🎻', magic: true, ranged: true,
    pv: { base: 30, perLevel: 6 }, atq: { base: 7, perLevel: 1.9 },
    def: { base: 1, perLevel: 0.6 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 8, max: 12 },
    abilities: [{ chance: 0.3, skill: { name: 'Mélodie grinçante', kind: 'damage', target: 'allHeroes', power: 0.35, magic: true, effects: [{ id: 'affaibli', turns: 2 }] } }],
  },
  escargotAncien: {
    name: 'Escargot ancien', icon: '🐌', riposte: 5,
    pv: { base: 48, perLevel: 9 }, atq: { base: 6, perLevel: 1.7 },
    def: { base: 6, perLevel: 1.5 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 3, max: 5 },
    abilities: [{ chance: 0.3, skill: { name: 'Bave gluante', kind: 'damage', target: 'hero', power: 0.6, effects: [slow(2)] } }],
  },
  dragonFeerique: {
    name: 'Dragon féerique', icon: '🐉', elite: true, xpMult: 1.5, goldMult: 1.5, magic: true, ranged: true,
    pv: { base: 55, perLevel: 10 }, atq: { base: 9, perLevel: 2.3 },
    def: { base: 3, perLevel: 1 }, defMag: { base: 5, perLevel: 1.3 }, vit: { min: 11, max: 14 },
    abilities: [
      { chance: 0.3, skill: { name: 'Souffle scintillant', kind: 'damage', target: 'allHeroes', power: 0.5, magic: true, effects: [confus(1)] } },
      { chance: 0.2, skill: { name: 'Éclat de fée', kind: 'heal', target: 'allAllies', power: 1 } },
    ],
  },
  // Catacombes
  chauveSouris: {
    name: 'Chauve-souris vampire', icon: '🦇', ranged: true,
    pv: { base: 28, perLevel: 6 }, atq: { base: 8, perLevel: 2 },
    def: { base: 1, perLevel: 0.6 }, defMag: { base: 2, perLevel: 0.8 }, vit: { min: 13, max: 17 },
    abilities: [{ chance: 0.3, skill: { name: 'Morsure sanglante', kind: 'damage', target: 'hero', power: 0.9, effects: [bleed(0.3)] } }],
  },
  momie: {
    name: 'Momie', icon: '🧻', riposte: 5,
    pv: { base: 50, perLevel: 9 }, atq: { base: 8, perLevel: 2 },
    def: { base: 4, perLevel: 1.2 }, defMag: { base: 2, perLevel: 0.8 }, vit: { min: 4, max: 7 },
    abilities: [{ chance: 0.3, skill: { name: 'Bandelettes', kind: 'damage', target: 'hero', power: 0.8, effects: [slow(2)] } }],
  },
  gardienAnubis: {
    name: "Gardien d'Anubis", icon: '🐺', riposte: 20, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 80, perLevel: 12 }, atq: { base: 10, perLevel: 2.4 },
    def: { base: 7, perLevel: 1.5 }, defMag: { base: 5, perLevel: 1.2 }, vit: { min: 7, max: 10 },
    abilities: [
      { chance: 0.3, skill: { name: 'Jugement des morts', kind: 'damage', target: 'hero', power: 1.5, effects: [{ id: 'terreur', turns: 2 }] } },
      { chance: 0.2, skill: { name: 'Garde sacrée', kind: 'support', target: 'self', effects: [{ id: 'protection', turns: 2 }] } },
    ],
  },
  vampire: {
    name: 'Vampire', icon: '🧛', riposte: 10, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 70, perLevel: 11 }, atq: { base: 10, perLevel: 2.4 },
    def: { base: 4, perLevel: 1.1 }, defMag: { base: 5, perLevel: 1.2 }, vit: { min: 11, max: 14 },
    abilities: [
      { chance: 0.3, skill: { name: 'Baiser du vampire', kind: 'damage', target: 'hero', power: 1.2, effects: [bleed(0.3)] } },
      { chance: 0.2, skill: { name: 'Soif de sang', kind: 'heal', target: 'self', power: 1.5 } },
    ],
  },
  // Cavernes ardentes
  fouisseur: {
    name: 'Fouisseur', icon: '🦔', riposte: 15, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 85, perLevel: 12 }, atq: { base: 10, perLevel: 2.4 },
    def: { base: 9, perLevel: 1.6 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 7, max: 10 },
    abilities: [{ chance: 0.3, skill: { name: 'Charge souterraine', kind: 'damage', target: 'hero', power: 1.5, effects: [stun] } }],
  },
  gog: {
    name: 'Gog', icon: '👾', magic: true, ranged: true,
    pv: { base: 36, perLevel: 7 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 2, perLevel: 0.8 }, defMag: { base: 4, perLevel: 1.2 }, vit: { min: 7, max: 11 },
    abilities: [{ chance: 0.3, skill: { name: 'Boule de feu', kind: 'damage', target: 'hero', power: 1.1, magic: true, effects: [burn(0.3)] } }],
  },
  blemmye: {
    name: 'Blemmye', icon: '🗿', riposte: 15, elite: true, xpMult: 1.5, goldMult: 1.5, ranged: true,
    pv: { base: 90, perLevel: 13 }, atq: { base: 10, perLevel: 2.4 },
    def: { base: 6, perLevel: 1.4 }, defMag: { base: 4, perLevel: 1.1 }, vit: { min: 5, max: 8 },
    abilities: [{ chance: 0.3, skill: { name: 'Jet de rocher', kind: 'damage', target: 'hero', power: 1.4, effects: [stun] } }],
  },
  chienDesEnfers: {
    name: 'Chien des enfers', icon: '🐕', riposte: 5,
    pv: { base: 36, perLevel: 7 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 2, perLevel: 0.9 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 11, max: 15 },
    abilities: [{ chance: 0.3, skill: { name: 'Crocs de braise', kind: 'damage', target: 'hero', power: 1, effects: [burn(0.3)] } }],
  },
  cyclopeDesForges: {
    name: 'Cyclope des forges', icon: '👁️', riposte: 15, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 95, perLevel: 14 }, atq: { base: 10, perLevel: 2.5 },
    def: { base: 6, perLevel: 1.5 }, defMag: { base: 4, perLevel: 1.2 }, vit: { min: 5, max: 8 },
    abilities: [{ chance: 0.3, skill: { name: 'Marteau de forge', kind: 'damage', target: 'allHeroes', power: 0.6, effects: [burn(0.25)] } }],
  },
  // Pics gelés
  bonnetRouge: {
    name: 'Bonnet-rouge', icon: '🍄', riposte: 10,
    pv: { base: 34, perLevel: 7 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 2, perLevel: 0.9 }, defMag: { base: 2, perLevel: 0.9 }, vit: { min: 10, max: 14 },
    abilities: [{ chance: 0.3, skill: { name: 'Coup de hachette', kind: 'damage', target: 'hero', power: 1.2, effects: [bleed(0.3)] } }],
  },
  salamandreGivre: {
    name: 'Salamandre de givre', icon: '🦎', magic: true,
    pv: { base: 36, perLevel: 7 }, atq: { base: 8, perLevel: 2 },
    def: { base: 3, perLevel: 1 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 8, max: 12 },
    abilities: [{ chance: 0.3, skill: { name: 'Souffle gelé', kind: 'damage', target: 'hero', power: 0.8, magic: true, effects: [slow(2)] } }],
  },
  kappa: {
    name: 'Kappa', icon: '🐢', riposte: 10,
    pv: { base: 40, perLevel: 7.5 }, atq: { base: 8, perLevel: 2.1 },
    def: { base: 5, perLevel: 1.3 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 7, max: 10 },
    abilities: [{ chance: 0.3, skill: { name: 'Prise de sumo', kind: 'damage', target: 'hero', power: 1, effects: [stun] } }],
  },
  ronin: {
    name: 'Rônin', icon: '🗡️', riposte: 20,
    pv: { base: 38, perLevel: 7.5 }, atq: { base: 10, perLevel: 2.3 },
    def: { base: 3, perLevel: 1.1 }, defMag: { base: 2, perLevel: 0.9 }, vit: { min: 10, max: 13 },
    abilities: [{ chance: 0.3, skill: { name: 'Iaijutsu', kind: 'damage', target: 'hero', power: 1.4, effects: [bleed(0.25)] } }],
  },
  samourai: {
    name: 'Samouraï', icon: '⚔️', riposte: 25, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 85, perLevel: 13 }, atq: { base: 11, perLevel: 2.5 },
    def: { base: 7, perLevel: 1.5 }, defMag: { base: 4, perLevel: 1.1 }, vit: { min: 8, max: 11 },
    abilities: [
      { chance: 0.3, skill: { name: 'Taille décisive', kind: 'damage', target: 'hero', power: 1.6, effects: [bleed(0.3)] } },
      { chance: 0.2, skill: { name: 'Posture de garde', kind: 'support', target: 'self', effects: [{ id: 'protection', turns: 2 }] } },
    ],
  },
  dragonnet: {
    name: 'Dragonnet de givre', icon: '🐲', magic: true, ranged: true,
    pv: { base: 38, perLevel: 7.5 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 3, perLevel: 1 }, defMag: { base: 4, perLevel: 1.2 }, vit: { min: 9, max: 12 },
    abilities: [{ chance: 0.3, skill: { name: 'Souffle de glace', kind: 'damage', target: 'allHeroes', power: 0.4, magic: true, effects: [slow(2)] } }],
  },
  oni: {
    name: 'Oni', icon: '👹', riposte: 15, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 100, perLevel: 14 }, atq: { base: 11, perLevel: 2.6 },
    def: { base: 6, perLevel: 1.5 }, defMag: { base: 4, perLevel: 1.2 }, vit: { min: 6, max: 9 },
    abilities: [
      { chance: 0.3, skill: { name: 'Kanabō', kind: 'damage', target: 'hero', power: 1.7, effects: [stun] } },
      { chance: 0.2, skill: { name: 'Rage de l\'oni', kind: 'support', target: 'self', effects: [{ id: 'puissance', turns: 3 }] } },
    ],
  },
  tengu: {
    name: 'Tengu', icon: '👺', elite: true, xpMult: 1.5, goldMult: 1.5, magic: true, ranged: true,
    pv: { base: 80, perLevel: 12 }, atq: { base: 11, perLevel: 2.5 },
    def: { base: 4, perLevel: 1.1 }, defMag: { base: 6, perLevel: 1.4 }, vit: { min: 12, max: 15 },
    abilities: [
      { chance: 0.3, skill: { name: 'Bourrasque', kind: 'damage', target: 'allHeroes', power: 0.6, magic: true, effects: [slow(2)] } },
      { chance: 0.2, skill: { name: 'Éventail céleste', kind: 'support', target: 'allAllies', effects: [{ id: 'hate', turns: 3 }] } },
    ],
  },
  // Abîme infernal
  sorcierNoir: {
    name: 'Sorcier noir', icon: '🧙', magic: true, ranged: true,
    pv: { base: 34, perLevel: 7 }, atq: { base: 10, perLevel: 2.4 },
    def: { base: 2, perLevel: 0.8 }, defMag: { base: 6, perLevel: 1.5 }, vit: { min: 8, max: 11 },
    abilities: [
      { chance: 0.25, skill: { name: 'Projectile maudit', kind: 'damage', target: 'hero', power: 1.2, magic: true, effects: [dark(0.3)] } },
      { chance: 0.15, skill: { name: 'Bénédiction impie', kind: 'support', target: 'allAllies', effects: [{ id: 'puissance', turns: 3 }] } },
    ],
  },
  djinnNoir: {
    name: 'Djinn noir', icon: '🧞', elite: true, xpMult: 1.5, goldMult: 1.5, magic: true, ranged: true,
    pv: { base: 90, perLevel: 13 }, atq: { base: 11, perLevel: 2.6 },
    def: { base: 4, perLevel: 1.2 }, defMag: { base: 7, perLevel: 1.5 }, vit: { min: 10, max: 13 },
    abilities: [
      { chance: 0.3, skill: { name: 'Orbe du néant', kind: 'damage', target: 'allHeroes', power: 0.6, magic: true, effects: [dark(0.3)] } },
      { chance: 0.2, skill: { name: 'Vœu funeste', kind: 'support', target: 'hero', effects: [{ id: 'affaibli', turns: 3 }] } },
    ],
  },
};
