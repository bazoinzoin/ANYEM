// Sprites des personnages sur les cartes : héros par classe, habitants du village,
// monstres par ennemi. Planches RPG Maker 2003 (assets/rm2k3/, 3 images × 4 directions de
// 24 × 32 px) ; certaines sont recolorées (`tint` : décalage de teinte, saturation,
// luminosité) pour distinguer les variantes d'un même monstre.

// tint : { hue (degrés ajoutés), sat (×), light (×) }
const rm = (name, tint = null) => ({ kind: 'rm', key: `rm2k3/${name}`, tint, frameW: 24, frameH: 32, footOffset: -1 });

export const CLASS_SPRITES = {
  guerrier: rm('hero_guerrier'),
  voleur: rm('hero_voleur'),
  pretre: rm('hero_pretre'),
  mage: rm('hero_mage'),
  chasseur: rm('hero_chasseur'),
  paladin: rm('hero_paladin'),
};

// Habitants du village, par id (data/village.js).
export const NPC_SPRITES = {
  inn: rm('npc_woman'),
  forge: rm('npc_man2'),
  bank: rm('npc_man'),
  shop: rm('npc_woman2'),
  runes: rm('npc_seer'),
  master: rm('npc_oldman'),
  hunter: rm('npc_man', { hue: 110, sat: 0.9, light: 0.95 }),
  oracle: rm('npc_oldwoman'),
  guard: rm('npc_guard'),
};

// Monstres, par clé d'ennemi (data/enemies.js) ; un groupe s'affiche avec son premier ennemi.
export const ENEMY_SPRITES = {
  // Forêt Maudite
  gobelin: rm('mob_goblin'),
  loup: rm('mob_wolf', { hue: 130, sat: 0.45, light: 1.05 }),
  araignee: rm('mob_spider'),
  chefGobelin: rm('mob_ogre'),
  mereAraignee: rm('mob_spider', { hue: -35, sat: 1.3, light: 0.9 }),
  loupAlpha: rm('mob_werewolf'),
  sylvainCorrompu: rm('mob_golem', { hue: 70, sat: 1.1, light: 0.9 }),
  reineSylvestre: rm('mob_fairy'),
  // Catacombes
  squelette: rm('mob_skeleton'),
  zombie: rm('mob_mummy', { hue: 60, sat: 0.6, light: 0.85 }),
  spectre: rm('mob_ghost'),
  chevalierSquelette: rm('mob_redknight', { hue: 0, sat: 0.1, light: 1.1 }),
  necromancien: rm('mob_reaper'),
  abomination: rm('mob_brute', { hue: 80, sat: 0.8, light: 0.85 }),
  banshee: rm('mob_wraith'),
  liche: rm('mob_vampire'),
  // Cavernes ardentes
  kobold: rm('mob_lizard', { hue: -80, sat: 1, light: 1 }),
  salamandre: rm('mob_drake', { hue: -110, sat: 1.2, light: 1 }),
  diablotin: rm('mob_imp'),
  golemMagma: rm('mob_golem', { hue: -20, sat: 1.6, light: 0.9 }),
  roiKobold: rm('mob_lizard', { hue: -60, sat: 1.4, light: 1.15 }),
  salamandreAncestrale: rm('mob_dragon', { hue: 170, sat: 1.1, light: 0.95 }),
  seigneurDesBraises: rm('mob_redknight'),
  // Pics gelés
  loupDeGivre: rm('mob_wolf', { hue: -70, sat: 0.7, light: 1.2 }),
  harpie: rm('mob_bat', { hue: -80, sat: 0.6, light: 1.2 }),
  elementaireDeGlace: rm('mob_icefish'),
  yeti: rm('mob_werewolf', { hue: 0, sat: 0.15, light: 1.45 }),
  reineHarpie: rm('mob_fairy', { hue: 150, sat: 0.9, light: 1.05 }),
  geantDuGivre: rm('mob_golem', { hue: 170, sat: 0.9, light: 1.15 }),
  dragonDeGlace: rm('mob_dragon'),
  // Abîme infernal
  demon: rm('mob_foxdemon'),
  succube: rm('mob_naga'),
  chevalierInfernal: rm('mob_redknight', { hue: -20, sat: 1, light: 0.6 }),
  behemoth: rm('mob_werewolf', { hue: -30, sat: 1.4, light: 0.8 }),
  gardienDeLaPorte: rm('mob_golem', { hue: -110, sat: 1, light: 0.7 }),
  reineSuccube: rm('mob_naga', { hue: 40, sat: 1.2, light: 0.9 }),
  seigneurDeLAbime: rm('mob_demonlord'),
};
