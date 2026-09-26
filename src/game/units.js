// Opérations communes aux héros et aux ennemis (les « unités » d'un combat).

import { getStats } from './party.js';
import { statusMods, isDebuffed, absorbWithShields } from './statuses.js';

export const isHero = (unit) => 'classKey' in unit;
export const isAlive = (unit) => unit.alive;

/**
 * Stats de combat d'une unité : stats de base (getStats() pour un héros),
 * modifiées par ses statuts (buffs/debuffs en %) et, pour un héros, par Berserk
 * (+x % de puissance physique par tranche de 10 % de PV manquants).
 * `debuffed` indique si l'unité subit au moins un effet négatif.
 */
export function statsOf(unit) {
  const s = { ...(isHero(unit) ? getStats(unit) : unit.stats) };
  for (const [stat, pct] of Object.entries(statusMods(unit))) {
    if (typeof s[stat] === 'number') s[stat] = Math.round(s[stat] * (1 + pct / 100));
  }
  if (s.berserk) {
    const missingTenths = Math.floor((1 - unit.hp / s.pv) * 10);
    s.physPower = Math.round(s.physPower * (1 + (s.berserk * missingTenths) / 100));
  }
  s.debuffed = isDebuffed(unit);
  s.hpPct = s.pv ? unit.hp / s.pv : 1;
  return s;
}

/**
 * Inflige des dégâts (absorbés d'abord par les boucliers).
 * Retourne { taken, absorbed, fell } ; fell = l'unité vient de tomber.
 */
export function damage(unit, amount) {
  const absorbed = absorbWithShields(unit, amount);
  const taken = amount - absorbed;
  unit.hp = Math.max(0, unit.hp - taken);
  let fell = false;
  if (unit.hp === 0 && unit.alive) {
    unit.alive = false;
    unit.statuses = [];
    fell = true;
  }
  return { taken, absorbed, fell };
}

export function heal(unit, amount) {
  const before = unit.hp;
  unit.hp = Math.min(statsOf(unit).pv, unit.hp + amount);
  return unit.hp - before;
}
