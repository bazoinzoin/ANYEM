// Bestiaire. Les stats évoluent avec le niveau de l'étage :
// valeur = base + perLevel × niveau ; la vitesse est tirée dans [min, max].
// Stats non précisées (critique, esquive, blocage…) : 0.
//
// Champs optionnels :
//   magic      l'attaque de base est magique (réduite par la Défense magique)
//   boss       ennemi de fin de palier (butin garanti et meilleur, voir LOOT)
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

export const ENEMIES = {
  // ---- Forêt Maudite ----
  gobelin: {
    name: 'Gobelin', icon: '👹',
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
    name: 'Chef gobelin', icon: '👺', boss: true, xpMult: 5, goldMult: 4,
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
    name: 'Loup alpha', icon: '🐺', boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 180, perLevel: 25 }, atq: { base: 14, perLevel: 2.5 },
    def: { base: 4, perLevel: 1 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 12, max: 15 },
    abilities: [
      { chance: 0.3, skill: { name: 'Hurlement', kind: 'support', target: 'allAllies', effects: [{ id: 'puissance', turns: 3 }, { id: 'hate', turns: 3 }] } },
      { chance: 0.3, skill: { name: 'Déchiquetage', kind: 'damage', target: 'hero', power: 1.4, effects: [bleed(0.3)] } },
    ],
  },
  sylvainCorrompu: {
    name: 'Sylvain corrompu', icon: '🌳', boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 240, perLevel: 30 }, atq: { base: 12, perLevel: 2 },
    def: { base: 8, perLevel: 1.5 }, defMag: { base: 2, perLevel: 1 }, vit: { min: 5, max: 7 },
    abilities: [
      { chance: 0.3, skill: { name: 'Étreinte des racines', kind: 'damage', target: 'hero', power: 0.8, effects: [stun] } },
      { chance: 0.25, skill: { name: 'Sève régénératrice', kind: 'heal', target: 'self', power: 1.5 } },
    ],
  },
  reineSylvestre: {
    name: 'Reine sylvestre', icon: '🧚', boss: true, xpMult: 8, goldMult: 6, magic: true,
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
    name: 'Squelette', icon: '💀',
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
    name: 'Spectre', icon: '👻', magic: true,
    pv: { base: 30, perLevel: 6 }, atq: { base: 10, perLevel: 2 },
    def: { base: 8, perLevel: 2 }, defMag: { base: 0, perLevel: 0.5 }, vit: { min: 9, max: 13 },
    abilities: [{ chance: 0.25, skill: { name: 'Cri glaçant', kind: 'damage', target: 'allHeroes', power: 0.4, magic: true, effects: [slow(2)] } }],
  },
  chevalierSquelette: {
    name: 'Chevalier squelette', icon: '🛡️', boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 220, perLevel: 28 }, atq: { base: 14, perLevel: 2.5 },
    def: { base: 12, perLevel: 2 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 6, max: 8 },
    abilities: [
      { chance: 0.3, skill: { name: 'Mur d\'os', kind: 'support', target: 'self', effects: [{ id: 'bouclier', turns: 2, power: 2 }] } },
      { chance: 0.25, skill: { name: 'Frappe écrasante', kind: 'damage', target: 'hero', power: 1.6 } },
    ],
  },
  necromancien: {
    name: 'Nécromancien', icon: '🧙', boss: true, xpMult: 5, goldMult: 4, magic: true,
    pv: { base: 200, perLevel: 25 }, atq: { base: 13, perLevel: 2.5 },
    def: { base: 4, perLevel: 1 }, defMag: { base: 8, perLevel: 1.5 }, vit: { min: 8, max: 10 },
    abilities: [
      { chance: 0.3, skill: { name: "Trait d'ombre", kind: 'damage', target: 'hero', power: 1.3, magic: true } },
      { chance: 0.2, skill: { name: 'Pacte funeste', kind: 'support', target: 'self', effects: [{ id: 'regeneration', turns: 3, power: 0.8 }] } },
      { chance: 0.25, skill: { name: 'Nuée de ténèbres', kind: 'damage', target: 'allHeroes', power: 0.6, magic: true } },
    ],
  },
  abomination: {
    name: 'Abomination', icon: '🧌', boss: true, xpMult: 5, goldMult: 4,
    pv: { base: 320, perLevel: 35 }, atq: { base: 15, perLevel: 2.5 },
    def: { base: 6, perLevel: 1.5 }, defMag: { base: 4, perLevel: 1 }, vit: { min: 4, max: 6 },
    abilities: [
      { chance: 0.3, skill: { name: 'Vomi putride', kind: 'damage', target: 'allHeroes', power: 0.5, effects: [poison(0.35)] } },
      { chance: 0.25, skill: { name: 'Écrasement', kind: 'damage', target: 'hero', power: 1.8, effects: [stun] } },
    ],
  },
  banshee: {
    name: 'Banshee', icon: '😱', boss: true, xpMult: 5, goldMult: 4, magic: true,
    pv: { base: 210, perLevel: 25 }, atq: { base: 15, perLevel: 2.5 },
    def: { base: 10, perLevel: 2 }, defMag: { base: 3, perLevel: 1 }, vit: { min: 11, max: 14 },
    abilities: [
      { chance: 0.3, skill: { name: 'Hurlement funèbre', kind: 'damage', target: 'allHeroes', power: 0.7, magic: true, effects: [{ id: 'terreur', turns: 2 }] } },
      { chance: 0.2, skill: { name: 'Murmures déments', kind: 'support', target: 'hero', effects: [confus(2)] } },
      { chance: 0.2, skill: { name: 'Voile spectral', kind: 'support', target: 'self', effects: [{ id: 'protection', turns: 2 }] } },
    ],
  },
  liche: {
    name: 'Liche', icon: '☠️', boss: true, xpMult: 8, goldMult: 6, magic: true,
    pv: { base: 380, perLevel: 38 }, atq: { base: 16, perLevel: 3 },
    def: { base: 8, perLevel: 1.5 }, defMag: { base: 10, perLevel: 2 }, vit: { min: 9, max: 11 },
    abilities: [
      { chance: 0.25, skill: { name: 'Nova de givre', kind: 'damage', target: 'allHeroes', power: 0.8, magic: true, effects: [slow(2)] } },
      { chance: 0.2, skill: { name: 'Doigt de mort', kind: 'damage', target: 'hero', power: 2.2, magic: true } },
      { chance: 0.2, skill: { name: 'Phylactère', kind: 'heal', target: 'self', power: 2 } },
    ],
  },
};
