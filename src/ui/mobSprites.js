// Monstres : chaque ennemi du bestiaire (data/enemies.js) reçoit une planche du pack
// « Fantasy RPG Monster pack » (Franuka), parfois recolorée (`tint` : décalage de teinte,
// saturation ×, luminosité ×) pour coller à sa zone (loup de givre, golem de magma…).
// Taille à l'écran : normal < élite < boss (mobScale).

import { ENEMIES } from '../data/enemies.js';
import { MOB_SHEETS } from './mobSheets.js';
import { image } from './sprites.js';
import { recolored } from './recolor.js';

const t = (hue, sat = 1, light = 1) => ({ hue, sat, light });

// Ennemi → { sheet (nom du monstre du pack), tint? }.
export const ENEMY_LOOKS = {
  // Forêt Maudite
  gobelin: { sheet: 'Goblin' },
  loup: { sheet: 'Hellhound', tint: t(10, 0.18, 1.2) },
  slime: { sheet: 'Slime' },
  chefGobelin: { sheet: 'WolfRider' },
  serpentAile: { sheet: 'SerpentFly' },
  lapinSoldat: { sheet: 'RabbitSoldier' },
  orque: { sheet: 'Orc' },
  loupAlpha: { sheet: 'Hellhound', tint: t(0, 0.12, 0.72) },
  fauveEclipse: { sheet: 'DisplacerBeast' },
  ogre: { sheet: 'Ogre' },
  lutin: { sheet: 'Pixie' },
  satyre: { sheet: 'Satyr' },
  chienVioloneux: { sheet: 'FiddleDog' },
  escargotAncien: { sheet: 'ElderSnail' },
  oursHibou: { sheet: 'Owlbear' },
  dragonFeerique: { sheet: 'FaerieDragon' },
  reineSylvestre: { sheet: 'Dryad' },
  // Catacombes
  squelette: { sheet: 'Skeleton' },
  zombie: { sheet: 'Peasant', tint: t(75, 0.55, 0.85) },
  chauveSouris: { sheet: 'Bat' },
  chevalierMort: { sheet: 'DeathKnight' },
  spectre: { sheet: 'Djinn', tint: t(10, 0.3, 1.25) },
  momie: { sheet: 'Mummy' },
  abomination: { sheet: 'Cyclops', tint: t(80, 0.7, 0.8) },
  gardienAnubis: { sheet: 'AnubisWarrior' },
  eveque: { sheet: 'ManticoreBishop' },
  banshee: { sheet: 'BheurHag', tint: t(20, 0.25, 1.3) },
  vampire: { sheet: 'Vampire' },
  liche: { sheet: 'Lich' },
  // Cavernes ardentes
  kobold: { sheet: 'Lizardfolk' },
  salamandre: { sheet: 'FrostSalamander', tint: t(190, 1.3, 1) },
  chienDesEnfers: { sheet: 'Hellhound' },
  verGeant: { sheet: 'PurpleWorm' },
  diablotin: { sheet: 'Imp' },
  gog: { sheet: 'Gog' },
  golemMagma: { sheet: 'IceGolem', tint: t(200, 1.4, 0.95) },
  fouisseur: { sheet: 'Bulette' },
  blemmye: { sheet: 'Blemmyae' },
  efrit: { sheet: 'Efreet' },
  cyclopeDesForges: { sheet: 'Cyclops', tint: t(-15, 1.4, 0.9) },
  dragonRouge: { sheet: 'AdultRedDragon' },
  // Pics gelés
  loupDeGivre: { sheet: 'Hellhound', tint: t(200, 0.45, 1.35) },
  bonnetRouge: { sheet: 'Redcap' },
  salamandreGivre: { sheet: 'FrostSalamander' },
  sorciereDesNeiges: { sheet: 'BheurHag' },
  griffon: { sheet: 'Griffin' },
  kappa: { sheet: 'Kappa' },
  ronin: { sheet: 'Ronin' },
  elementaireDeGlace: { sheet: 'IceGolem' },
  yeti: { sheet: 'Ogre', tint: t(190, 0.2, 1.55) },
  samourai: { sheet: 'Samurai' },
  geantDuGivre: { sheet: 'FrostGiant' },
  dragonnet: { sheet: 'BlueWyrmling' },
  oni: { sheet: 'Oni' },
  tengu: { sheet: 'Tengu' },
  dragonDeGlace: { sheet: 'YoungGreenDragon', tint: t(80, 0.9, 1.15) },
  // Abîme infernal
  demon: { sheet: 'Demon' },
  chevalierInfernal: { sheet: 'Paladin', tint: t(-45, 1.2, 0.6) },
  gardienDeLaPorte: { sheet: 'Beholder' },
  succube: { sheet: 'Medusa', tint: t(170, 1, 1) },
  sorcierNoir: { sheet: 'Wizard', tint: t(60, 0.8, 0.55) },
  behemoth: { sheet: 'Cyclops', tint: t(-25, 1.2, 0.55) },
  djinnNoir: { sheet: 'Djinn', tint: t(150, 1, 0.65) },
  angeDechu: { sheet: 'Planetar', tint: t(120, 0.5, 0.55) },
  seigneurDeLAbime: { sheet: 'AncientBlackDragon' },
};

// Taille d'un ennemi selon son rang : 'boss', 'elite' ou 'normal'.
export function mobTier(enemyKey) {
  const def = ENEMIES[enemyKey];
  return def?.boss ? 'boss' : def?.elite ? 'elite' : 'normal';
}

// Agrandissement à l'écran : normal ×1, élite ×1,5, boss ×2 par rapport à `base`, puis
// limité pour que le corps ne dépasse pas `maxBody` px de haut. Toujours entier (pixels nets).
export const TIER_FACTOR = { normal: 1, elite: 1.5, boss: 2 };
export function mobScale(enemyKey, base, maxBody = Infinity) {
  const look = ENEMY_LOOKS[enemyKey];
  const meta = look && MOB_SHEETS[look.sheet];
  const wanted = Math.round(base * TIER_FACTOR[mobTier(enemyKey)]);
  if (!meta) return wanted;
  const byHeight = Math.floor(maxBody / meta.body[3]);
  return Math.max(1, Math.min(wanted, byHeight));
}

const sprites = new Map();

// Sprite d'une planche du pack de monstres (`sheet` : nom du monstre), recolorée ou non.
export function sheetSprite(sheet, tint = null, key = sheet) {
  const meta = MOB_SHEETS[sheet];
  if (!meta) return null;
  const [, by, , bh] = meta.body;
  return {
    kind: 'mob',
    key,
    frameW: meta.w,
    frameH: meta.h,
    footOffset: meta.h - (by + bh),
    body: meta.body,
    rows: { down: 0, left: 1, right: 2, up: 3 },
    sheet: (anim) => {
      const src = `mobs/${sheet}_${meta[anim] ? anim : 'idle'}`;
      return tint
        ? recolored(src, `${tint.hue}|${tint.sat}|${tint.light}`, (h, s, l) => (s < 0.08 ? null : [h + tint.hue, Math.min(1, s * tint.sat), Math.min(1, l * tint.light)]))
        : image(src);
    },
    cols: (anim) => Array.from({ length: meta[anim] || meta.idle }, (_, i) => i),
  };
}

// Sprite d'un ennemi pour drawActor (kind 'mob'), ou null s'il n'a pas de planche.
export function enemySprite(enemyKey) {
  if (!sprites.has(enemyKey)) {
    const look = ENEMY_LOOKS[enemyKey];
    sprites.set(enemyKey, look ? sheetSprite(look.sheet, look.tint, enemyKey) : null);
  }
  return sprites.get(enemyKey);
}

// Boîte du corps dans une image (pour cadrer les portraits).
export function spriteBounds(sprite) {
  const [x, y, w, h] = sprite.body;
  return { x, y, w, h };
}
