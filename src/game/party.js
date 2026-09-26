// Héros et équipe.
//
// Un héros ne stocke que son état variable (niveau, XP, PV, ressource, statuts,
// équipement, talents). Ses stats sont toujours calculées par getStats() et ses
// compétences par getSkills() : c'est là que s'appliquent niveau, équipement et
// talents (les buffs de combat s'ajoutent ensuite dans units.statsOf).

import { CLASSES } from '../data/classes.js';
import { SLOT_ORDER, WEAPON_TYPES } from '../data/items.js';
import { EFFECTS } from '../data/effects.js';
import { zeroStats } from '../data/stats.js';
import { PARTY_ORDER, COMBAT, XP } from '../config.js';
import { generateItem, itemStats } from './items.js';
import { talentEffects } from './talents.js';

export function getClass(hero) {
  return CLASSES[hero.classKey];
}

function wornItems(hero) {
  return SLOT_ORDER.map((slot) => [slot, hero.equipment[slot]]).filter(([, item]) => item);
}

// Coefficient de vitesse d'attaque des armes tenues (moyenne en ambidextrie, 1 sans arme).
export function weaponSpeedOf(hero) {
  const weapons = ['mainDroite', 'mainGauche'].map((slot) => hero.equipment[slot]).filter((it) => it?.slotType === 'arme');
  if (!weapons.length) return 1;
  return +(weapons.reduce((sum, it) => sum + WEAPON_TYPES[it.weaponType].speed, 0) / weapons.length).toFixed(3);
}

/**
 * Stats finales du héros (base de classe + équipement), plus :
 *   physPower  puissance physique = Attaque + stat physique de la classe × facteur
 *              (attaque de base et compétences non magiques)
 *   magPower   puissance magique = Intelligence × facteur (sorts et soins)
 *   resMax     maximum de la ressource de classe
 *   vit        Vitesse × coefficient de vitesse des armes (vitBase : avant arme)
 */
export function getStats(hero) {
  const cls = getClass(hero);
  const fx = talentEffects(hero);
  const total = { ...zeroStats(), ...cls.base };
  for (const [stat, value] of Object.entries(cls.growth ?? {})) total[stat] += value * ((hero.level ?? 1) - 1);
  for (const [stat, value] of Object.entries(fx.flat)) total[stat] += value;
  for (const [slot, item] of wornItems(hero)) {
    for (const [stat, value] of Object.entries(itemStats(item))) {
      // Arme en main gauche (ambidextrie) : son attaque ne compte qu'en partie.
      const factor = slot === 'mainGauche' && stat === 'atq' && item.slotType === 'arme' ? COMBAT.offHandAtqFactor : 1;
      total[stat] += Math.round(value * factor);
    }
  }
  const physFromStat = Math.round(total[cls.physStat] * COMBAT.physStatFactor[cls.physStat]);
  const weaponSpeed = weaponSpeedOf(hero);
  const stats = {
    ...total,
    // L'Armure (stat obligatoire des armures et boucliers) protège des deux types de dégâts.
    def: total.def + total.armure,
    defMag: total.defMag + total.armure,
    // Vitesse d'attaque : la Vitesse est multipliée par le coefficient des armes.
    vitBase: total.vit,
    weaponSpeed,
    vit: Math.round(total.vit * weaponSpeed),
    physPower: total.atq + physFromStat,
    physFromStat,
    magPower: Math.round(total.intelligence * COMBAT.magicPerInt),
    resMax: cls.resource.max + (fx.passive.resMaxBonus ?? 0),
    // Passifs des talents (berserk, healPct, dotPct, resRegen, vsDebuffedPct, guardShieldPct, critCombo…).
    ...fx.passive,
  };
  for (const [stat, pct] of Object.entries(fx.pct)) stats[stat] = Math.round(stats[stat] * (1 + pct / 100));
  return stats;
}

/**
 * Modificateurs de compétence (objets légendaires et talents) :
 *   powerPct        +% de puissance      costDelta     ± coût
 *   critBonus       + % de chance de critique
 *   dotTurnsDelta   ± tours des effets de dégâts sur la durée (poison, saignement…)
 *   dotPowerPct     +% de dégâts de ces effets
 *   effectTurnsDelta ± tours de tous les effets appliqués aux cibles
 *   effectPowerPct  +% de valeur de tous les effets à valeur (soins/tour, boucliers…)
 *   addEffects      effets supplémentaires appliqués aux cibles (ex. une brûlure)
 *   addSelfEffects  effets supplémentaires appliqués au lanceur
 *   cleanse         la compétence retire aussi les effets négatifs des cibles
 */
function applySkillMod(skill, mod) {
  const s = { ...skill, boosted: true };
  if (mod.powerPct && s.power) s.power = +(s.power * (1 + mod.powerPct / 100)).toFixed(3);
  if (mod.costDelta) s.cost = Math.max(1, s.cost + mod.costDelta);
  if (mod.critBonus) s.critBonus = (s.critBonus ?? 0) + mod.critBonus;
  s.effects = [...(skill.effects ?? []), ...(mod.addEffects ?? [])].map((e) => {
    const dot = EFFECTS[e.id].value === 'dot';
    const turns = (mod.effectTurnsDelta ?? 0) + (dot ? mod.dotTurnsDelta ?? 0 : 0);
    const pct = (mod.effectPowerPct ?? 0) + (dot ? mod.dotPowerPct ?? 0 : 0);
    if (!turns && !(pct && e.power)) return e;
    return { ...e, turns: e.turns + turns, ...(e.power ? { power: +(e.power * (1 + pct / 100)).toFixed(3) } : {}) };
  });
  if (mod.cleanse) s.cleanse = true;
  if (mod.addSelfEffects) s.selfEffects = [...(skill.selfEffects ?? []), ...mod.addSelfEffects];
  return s;
}

// Compétences du héros : celles apprises par ses talents (un héros commence sans
// sort : les sorts de départ sont au palier 0 des orientations), sans doublon,
// modifiées par les passifs des objets légendaires portés et des talents.
export function getSkills(hero) {
  const fx = talentEffects(hero);
  const mods = [...wornItems(hero).map(([, item]) => item.legendary?.passive).filter(Boolean), ...fx.skillMods];
  const unique = fx.skills.filter((skill, i) => fx.skills.findIndex((s) => s.id === skill.id) === i);
  return unique.map((skill) =>
    mods.filter((m) => m.skill === skill.id).reduce(applySkillMod, skill));
}

export function xpToNext(level) {
  return XP.toNextBase + XP.toNextPerLevel * level;
}

// Ajoute de l'XP ; retourne le nombre de niveaux gagnés. PV et ressource
// gagnés avec le niveau sont ajoutés aux valeurs actuelles.
export function gainXp(hero, amount) {
  if (hero.level >= XP.maxLevel) return 0;
  hero.xp += amount;
  let levels = 0;
  while (hero.level < XP.maxLevel && hero.xp >= xpToNext(hero.level)) {
    const before = getStats(hero).pv;
    hero.xp -= xpToNext(hero.level);
    hero.level++;
    levels++;
    if (hero.alive) hero.hp += getStats(hero).pv - before;
  }
  if (hero.level >= XP.maxLevel) hero.xp = 0; // niveau maximum atteint
  return levels;
}

export function createHero(classKey, name) {
  const cls = CLASSES[classKey];
  const hero = {
    classKey,
    name: name || cls.name,
    hp: 0,
    res: cls.resource.start,
    level: 1,
    xp: 0,
    alive: true,
    guard: false,
    statuses: [],
    position: cls.position ?? 'melee', // position de combat choisie (écran Stratégie)
    equipment: {},
    talents: {},
  };
  for (const piece of cls.starterKit) {
    const item = generateItem({ level: 1, rarity: 'commun', ...piece });
    hero.equipment[piece.slotType === 'arme' ? 'mainDroite' : piece.slotType] = item;
  }
  hero.hp = getStats(hero).pv;
  return hero;
}

// Équipe de héros : `classes` (clés de data/classes.js, défaut PARTY_ORDER) et noms.
export function createParty(names = [], classes = PARTY_ORDER) {
  return classes.map((key, i) => createHero(key, names[i]?.trim()));
}

export function gainResource(hero, amount) {
  if (!amount) return;
  hero.res = Math.min(getStats(hero).resMax, hero.res + amount);
}

// Ramène PV et ressource sous leurs maximums (après un changement d'équipement).
export function clampToStats(hero) {
  const stats = getStats(hero);
  hero.hp = Math.min(hero.hp, stats.pv);
  hero.res = Math.min(hero.res, stats.resMax);
}

// Soin complet, ressource pleine, statuts retirés, héros ramené à la vie.
export function restoreFully(hero) {
  const stats = getStats(hero);
  hero.alive = true;
  hero.hp = stats.pv;
  hero.res = stats.resMax;
  hero.guard = false;
  hero.statuses = [];
}
