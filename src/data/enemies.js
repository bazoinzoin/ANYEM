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
  araignee: {
    name: 'Araignée géante', icon: '🕷️',
    pv: { base: 35, perLevel: 7 }, atq: { base: 6, perLevel: 1.5 },
    def: { base: 2, perLevel: 1 }, defMag: { base: 1, perLevel: 1 }, vit: { min: 7, max: 10 },
    abilities: [{ chance: 0.35, skill: { name: 'Crachat venimeux', kind: 'damage', target: 'hero', power: 0.6, effects: [poison(0.3)] } }],
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
  mereAraignee: {
    name: 'Mère araignée', icon: '🕸️', boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 170, perLevel: 25 }, atq: { base: 11, perLevel: 2 },
    def: { base: 4, perLevel: 1 }, defMag: { base: 4, perLevel: 1 }, vit: { min: 8, max: 10 },
    abilities: [
      { chance: 0.35, skill: { name: 'Pluie de venin', kind: 'damage', target: 'allHeroes', power: 0.5, effects: [poison(0.3)] } },
      { chance: 0.25, skill: { name: 'Toile collante', kind: 'support', target: 'allHeroes', effects: [slow(2)] } },
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
  sylvainCorrompu: {
    name: 'Sylvain corrompu', icon: '🌳', riposte: 10, elite: true, xpMult: 1.5, goldMult: 1.5,
    pv: { base: 75, perLevel: 12 }, atq: { base: 8, perLevel: 2 },
    def: { base: 8, perLevel: 1.5 }, defMag: { base: 2, perLevel: 1 }, vit: { min: 5, max: 7 },
    abilities: [
      { chance: 0.3, skill: { name: 'Étreinte des racines', kind: 'damage', target: 'hero', power: 0.8, effects: [stun] } },
      { chance: 0.25, skill: { name: 'Sève régénératrice', kind: 'heal', target: 'self', power: 1.5 } },
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
  chevalierSquelette: {
    name: 'Chevalier squelette', icon: '🛡️', riposte: 20, boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 220, perLevel: 28 }, atq: { base: 14, perLevel: 2.5 },
    def: { base: 12, perLevel: 2 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 6, max: 8 },
    abilities: [
      { chance: 0.3, skill: { name: 'Mur d\'os', kind: 'support', target: 'self', effects: [{ id: 'bouclier', turns: 2, power: 2 }] } },
      { chance: 0.25, skill: { name: 'Frappe écrasante', kind: 'damage', target: 'hero', power: 1.6 } },
    ],
  },
  necromancien: {
    name: 'Nécromancien', icon: '🧙', boss: true, xpMult: 5, goldMult: 4, magic: true, ranged: true,
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
    name: 'Kobold mineur', icon: '⛏️', riposte: 5,
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
  roiKobold: {
    name: 'Roi kobold', icon: '👑', riposte: 15, boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 220, perLevel: 28 }, atq: { base: 13, perLevel: 2.6 },
    def: { base: 6, perLevel: 1.4 }, defMag: { base: 4, perLevel: 1.1 }, vit: { min: 8, max: 10 },
    abilities: [
      { chance: 0.3, skill: { name: 'À moi, la mine !', kind: 'support', target: 'allAllies', effects: [{ id: 'puissance', turns: 3 }, { id: 'protection', turns: 2 }] } },
      { chance: 0.25, skill: { name: 'Éboulement', kind: 'damage', target: 'allHeroes', power: 0.7, effects: [stun] } },
    ],
  },
  salamandreAncestrale: {
    name: 'Salamandre ancestrale', icon: '🐉', boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 240, perLevel: 29 }, atq: { base: 13, perLevel: 2.7 },
    def: { base: 5, perLevel: 1.2 }, defMag: { base: 7, perLevel: 1.6 }, vit: { min: 9, max: 12 },
    abilities: [
      { chance: 0.3, skill: { name: 'Flammes dévorantes', kind: 'damage', target: 'allHeroes', power: 0.6, magic: true, effects: [burn(0.35)] } },
      { chance: 0.2, skill: { name: 'Mue brûlante', kind: 'heal', target: 'self', power: 1.6 } },
      { chance: 0.2, skill: { name: 'Queue enflammée', kind: 'damage', target: 'hero', power: 1.5 } },
    ],
  },
  seigneurDesBraises: {
    name: 'Seigneur des braises', icon: '🔥', boss: true, xpMult: 8, goldMult: 6, magic: true, ranged: true,
    pv: { base: 380, perLevel: 38 }, atq: { base: 16, perLevel: 3 },
    def: { base: 7, perLevel: 1.5 }, defMag: { base: 10, perLevel: 2 }, vit: { min: 9, max: 11 },
    abilities: [
      { chance: 0.25, skill: { name: 'Éruption', kind: 'damage', target: 'allHeroes', power: 0.8, magic: true, effects: [burn(0.4)] } },
      { chance: 0.2, skill: { name: 'Lance de feu', kind: 'damage', target: 'hero', power: 2.1, magic: true } },
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
  harpie: {
    name: 'Harpie', icon: '🦅', ranged: true,
    pv: { base: 30, perLevel: 6.5 }, atq: { base: 9, perLevel: 2.2 },
    def: { base: 2, perLevel: 0.7 }, defMag: { base: 2, perLevel: 0.9 }, vit: { min: 12, max: 16 },
    abilities: [{ chance: 0.3, skill: { name: 'Serres lacérantes', kind: 'damage', target: 'hero', power: 0.9, effects: [bleed(0.3)] } }],
  },
  elementaireDeGlace: {
    name: 'Élémentaire de glace', icon: '❄️', magic: true, ranged: true,
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
  reineHarpie: {
    name: 'Reine harpie', icon: '🪶', boss: true, xpMult: 5, goldMult: 4, ranged: true,
    pv: { base: 220, perLevel: 27 }, atq: { base: 14, perLevel: 2.7 },
    def: { base: 5, perLevel: 1.2 }, defMag: { base: 5, perLevel: 1.2 }, vit: { min: 12, max: 15 },
    abilities: [
      { chance: 0.3, skill: { name: 'Tornade', kind: 'damage', target: 'allHeroes', power: 0.6, effects: [bleed(0.25)] } },
      { chance: 0.2, skill: { name: 'Chant strident', kind: 'support', target: 'hero', effects: [confus(2)] } },
      { chance: 0.2, skill: { name: 'Envol', kind: 'support', target: 'self', effects: [{ id: 'hate', turns: 3 }] } },
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
    name: 'Gardien de la porte', icon: '🚪', riposte: 20, boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 290, perLevel: 33 }, atq: { base: 15, perLevel: 2.8 },
    def: { base: 12, perLevel: 2.2 }, defMag: { base: 8, perLevel: 1.6 }, vit: { min: 6, max: 8 },
    abilities: [
      { chance: 0.3, skill: { name: 'Sceau infernal', kind: 'support', target: 'self', effects: [{ id: 'bouclier', turns: 2, power: 2.2 }] } },
      { chance: 0.25, skill: { name: 'Jugement', kind: 'damage', target: 'hero', power: 1.8, effects: [{ id: 'terreur', turns: 2 }] } },
    ],
  },
  reineSuccube: {
    name: 'Reine succube', icon: '🦇', boss: true, xpMult: 5, goldMult: 4, magic: true, ranged: true,
    pv: { base: 250, perLevel: 30 }, atq: { base: 16, perLevel: 2.9 },
    def: { base: 5, perLevel: 1.2 }, defMag: { base: 10, perLevel: 1.8 }, vit: { min: 11, max: 14 },
    abilities: [
      { chance: 0.25, skill: { name: 'Danse des ombres', kind: 'damage', target: 'allHeroes', power: 0.7, magic: true, effects: [dark(0.3)] } },
      { chance: 0.2, skill: { name: 'Charme', kind: 'support', target: 'hero', effects: [confus(2)] } },
      { chance: 0.2, skill: { name: 'Drain de vie', kind: 'heal', target: 'self', power: 1.8 } },
    ],
  },
  seigneurDeLAbime: {
    name: "Seigneur de l'Abîme", icon: '👹', boss: true, xpMult: 10, goldMult: 8, magic: true,
    pv: { base: 450, perLevel: 44 }, atq: { base: 18, perLevel: 3.3 },
    def: { base: 10, perLevel: 2 }, defMag: { base: 10, perLevel: 2 }, vit: { min: 10, max: 12 },
    abilities: [
      { chance: 0.25, skill: { name: 'Apocalypse', kind: 'damage', target: 'allHeroes', power: 0.9, magic: true, effects: [burn(0.4), dark(0.3)] } },
      { chance: 0.2, skill: { name: 'Main du néant', kind: 'damage', target: 'hero', power: 2.3, magic: true, effects: [stun] } },
      { chance: 0.15, skill: { name: 'Terreur absolue', kind: 'support', target: 'allHeroes', effects: [{ id: 'terreur', turns: 2 }, { id: 'affaibli', turns: 2 }] } },
      { chance: 0.15, skill: { name: 'Rage abyssale', kind: 'support', target: 'self', effects: [{ id: 'puissance', turns: 3 }, { id: 'hate', turns: 3 }] } },
    ],
  },
};
