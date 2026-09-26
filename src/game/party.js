// Héros et équipe.
//
// Un héros ne stocke que son état variable (niveau, XP, PV, ressource, statuts,
// équipement, talents). Ses stats sont toujours calculées par getStats() et ses
// compétences par getSkills() : c'est là que s'appliquent niveau, équipement et
// talents (les buffs de combat s'ajoutent ensuite dans units.statsOf).

import { CLASSES } from '../data/classes.js';
import { SLOT_ORDER } from '../data/items.js';
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

/**
 * Stats finales du héros (base de classe + équipement), plus :
 *   physPower  puissance physique = Attaque + stat physique de la classe × facteur
 *              (attaque de base et compétences non magiques)
 *   magPower   puissance magique = Intelligence × facteur (sorts et soins)
 *   resMax     maximum de la ressource de classe
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
  const stats = {
    ...total,
    physPower: total.atq + physFromStat,
    physFromStat,
    magPower: Math.round(total.intelligence * COMBAT.magicPerInt),
    resMax: cls.resource.max,
    // Passifs des talents (berserk, healPct, dotPct, resRegen, vsDebuffedPct, guardShieldPct).
    ...fx.passive,
  };
  for (const [stat, pct] of Object.entries(fx.pct)) stats[stat] = Math.round(stats[stat] * (1 + pct / 100));
  return stats;
}

/**
 * Modificateurs de compétence (objets légendaires et talents) :
 *   powerPct       +% de puissance      costDelta     ± coût
 *   dotTurnsDelta  ± tours de l'effet sur la durée
 *   dotPowerPct    +% de dégâts de l'effet sur la durée
 *   set            champs remplacés ou ajoutés (ex. ajouter une brûlure)
 */
function applySkillMod(skill, mod) {
  const s = { ...skill, ...(mod.set ?? {}), boosted: true };
  if (mod.powerPct) s.power = +(s.power * (1 + mod.powerPct / 100)).toFixed(3);
  if (mod.costDelta) s.cost = Math.max(0, s.cost + mod.costDelta);
  if (s.dot && (mod.dotTurnsDelta || mod.dotPowerPct)) {
    s.dot = {
      ...s.dot,
      turns: s.dot.turns + (mod.dotTurnsDelta ?? 0),
      power: +(s.dot.power * (1 + (mod.dotPowerPct ?? 0) / 100)).toFixed(3),
    };
  }
  return s;
}

// Compétences du héros : celles de sa classe puis celles de ses talents, modifiées
// par les passifs des objets légendaires portés et des talents.
export function getSkills(hero) {
  const fx = talentEffects(hero);
  const mods = [...wornItems(hero).map(([, item]) => item.legendary?.passive).filter(Boolean), ...fx.skillMods];
  return [...getClass(hero).skills, ...fx.skills].map((skill) =>
    mods.filter((m) => m.skill === skill.id).reduce(applySkillMod, skill));
}

export function xpToNext(level) {
  return XP.toNextBase + XP.toNextPerLevel * level;
}

// Ajoute de l'XP ; retourne le nombre de niveaux gagnés. PV et ressource
// gagnés avec le niveau sont ajoutés aux valeurs actuelles.
export function gainXp(hero, amount) {
  hero.xp += amount;
  let levels = 0;
  while (hero.xp >= xpToNext(hero.level)) {
    const before = getStats(hero).pv;
    hero.xp -= xpToNext(hero.level);
    hero.level++;
    levels++;
    if (hero.alive) hero.hp += getStats(hero).pv - before;
  }
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

export function createParty(names = []) {
  return PARTY_ORDER.map((key, i) => createHero(key, names[i]?.trim()));
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
