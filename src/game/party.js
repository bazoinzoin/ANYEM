// Héros et équipe.
//
// Un héros ne stocke que son état variable (PV, ressource, statuts, équipement).
// Ses stats sont toujours calculées par getStats() et ses compétences par
// getSkills() : ce sont les points d'extension pour l'équipement, les arbres de
// compétences et les buffs.

import { CLASSES } from '../data/classes.js';
import { SLOT_ORDER } from '../data/items.js';
import { zeroStats } from '../data/stats.js';
import { PARTY_ORDER, COMBAT } from '../config.js';
import { generateItem, itemStats } from './items.js';

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
  const total = { ...zeroStats(), ...cls.base };
  for (const [slot, item] of wornItems(hero)) {
    for (const [stat, value] of Object.entries(itemStats(item))) {
      // Arme en main gauche (ambidextrie) : son attaque ne compte qu'en partie.
      const factor = slot === 'mainGauche' && stat === 'atq' && item.slotType === 'arme' ? COMBAT.offHandAtqFactor : 1;
      total[stat] += Math.round(value * factor);
    }
  }
  const physFromStat = Math.round(total[cls.physStat] * COMBAT.physStatFactor);
  return {
    ...total,
    physPower: total.atq + physFromStat,
    physFromStat,
    magPower: Math.round(total.intelligence * COMBAT.magicPerInt),
    resMax: cls.resource.max,
  };
}

// Compétences du héros, modifiées par les passifs des objets légendaires portés.
export function getSkills(hero) {
  const passives = wornItems(hero).map(([, item]) => item.legendary?.passive).filter(Boolean);
  return getClass(hero).skills.map((skill) => {
    const mods = passives.filter((p) => p.skill === skill.id);
    if (!mods.length) return skill;
    const s = { ...skill, boosted: true };
    for (const p of mods) {
      if (p.powerPct) s.power = +(s.power * (1 + p.powerPct / 100)).toFixed(3);
      if (p.costDelta) s.cost = Math.max(0, s.cost + p.costDelta);
      if (p.bleedDelta) s.bleed = (s.bleed ?? 0) + p.bleedDelta;
    }
    return s;
  });
}

export function createHero(classKey, name) {
  const cls = CLASSES[classKey];
  const hero = {
    classKey,
    name: name || cls.name,
    hp: 0,
    res: cls.resource.start,
    alive: true,
    guard: false,
    bleed: 0,
    equipment: {},
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
  hero.bleed = 0;
}
