// Opérations communes aux héros et aux ennemis (les « unités » d'un combat).

import { getStats, getClass, usesSouls } from './party.js';
import { statusMods, statusBonus, isDebuffed, absorbWithShields, statusesOf, addStatus, makeStatus } from './statuses.js';

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
  for (const [stat, v] of Object.entries(statusBonus(unit))) s[stat] = (s[stat] ?? 0) + v;
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
  let revived = null;
  if (unit.hp === 0 && unit.alive) {
    revived = tryRevive(unit);
    if (!revived) {
      unit.alive = false;
      unit.statuses = [];
      fell = true;
      if (isHero(unit) && usesSouls(getClass(unit))) unit.souls = 0; // ses âmes s'échappent
    }
  }
  return { taken, absorbed, fell, ...(revived ? { revived } : {}) };
}

/**
 * Résurrection au moment de tomber (Scarifié) : passif `selfRevive` (% des PV, une fois par
 * combat : `unit.selfRevived`) ou effet `revive` (Pacte de sang, consommé). Les effets négatifs
 * disparaissent ; `reviveStun` (Violent) : le héros perd son prochain tour.
 * Retourne { pct, source } ou null.
 */
function tryRevive(unit) {
  let pct = 0;
  let source = null;
  const pact = statusesOf(unit).find((s) => s.revive);
  const stats = isHero(unit) ? getStats(unit) : {};
  if (stats.selfRevive && !unit.selfRevived) {
    unit.selfRevived = true;
    pct = stats.selfRevive;
    source = 'passif';
  } else if (pact) {
    pct = pact.revive;
    source = pact.name;
  }
  if (!pct) return null;
  unit.statuses = statusesOf(unit).filter((s) => s.kind !== 'debuff' && s !== pact);
  unit.hp = Math.max(1, Math.round(stats.pv ? stats.pv * pct / 100 : 1));
  if (stats.reviveStun) addStatus(unit, makeStatus('etourdi', stats.reviveStun));
  return { pct, source };
}

export function heal(unit, amount) {
  const before = unit.hp;
  unit.hp = Math.min(statsOf(unit).pv, unit.hp + amount);
  return unit.hp - before;
}
