// Opérations communes aux héros et aux ennemis (les « unités » d'un combat).

import { getStats } from './party.js';
import { statusMods, isDebuffed, absorbWithShields, statusesOf } from './statuses.js';

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
 * Inflige des dégâts (absorbés d'abord par les boucliers ; une part peut être
 * reportée sur un protecteur, voir l'effet Intercession).
 * Retourne { taken, absorbed, fell, redirected?, protector? } ; fell = l'unité vient de tomber.
 */
export function damage(unit, amount) {
  // Intercession : une part des dégâts est encaissée par le protecteur.
  const guard = statusesOf(unit).find((s) => s.redirect && s.source && s.source !== unit && s.source.alive);
  if (guard && amount > 0) {
    const protector = guard.source;
    const moved = Math.round(amount * guard.redirect / 100);
    const r = damage(protector, moved);
    const own = applyDamage(unit, amount - moved);
    return { ...own, redirected: moved, protector: { ...r, unit: protector } };
  }
  return applyDamage(unit, amount);
}

// Dégâts sans report : boucliers, puis PV.
function applyDamage(unit, amount) {
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
