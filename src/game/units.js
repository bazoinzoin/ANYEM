// Opérations communes aux héros et aux ennemis (les « unités » d'un combat).

import { getStats } from './party.js';

export const isHero = (unit) => 'classKey' in unit;
export const isAlive = (unit) => unit.alive;

export function statsOf(unit) {
  return isHero(unit) ? getStats(unit) : unit.stats;
}

// Inflige des dégâts ; retourne true si l'unité vient de tomber.
export function damage(unit, amount) {
  unit.hp = Math.max(0, unit.hp - amount);
  if (unit.hp === 0 && unit.alive) {
    unit.alive = false;
    return true;
  }
  return false;
}

export function heal(unit, amount) {
  unit.hp = Math.min(statsOf(unit).pv, unit.hp + amount);
}
