// Formules de dégâts et de soins, et leurs estimations affichées au joueur.
// Les estimations utilisent exactement les mêmes calculs que les jets réels.
//
// Un coup : puissance du lanceur × multiplicateur × variance [× critique] × facteur de défense.
// Puissance physique (arme + Force/Agilité) contre la Défense, ou puissance magique
// (Intelligence) contre la Défense magique.
// `attacker` / `defender` sont des objets de stats (getStats() ou stats d'ennemi).

import { COMBAT, VARIANCE } from '../config.js';
import { EFFECTS } from '../data/effects.js';
import { rand, random } from './rng.js';

// Options d'un coup : { power, variance, magic, alwaysCrit, critBonus, aoe, executePct }
export const BASIC_ATTACK = { power: 1, variance: VARIANCE.hero, magic: false, alwaysCrit: false, critBonus: 0 };
export const ENEMY_ATTACK = { power: 1, variance: VARIANCE.enemy, magic: false, alwaysCrit: false, critBonus: 0 };

export function skillHitOptions(skill) {
  return {
    power: skill.power,
    variance: skill.target === 'allEnemies' ? VARIANCE.aoe : VARIANCE.hero,
    magic: !!skill.magic,
    alwaysCrit: !!skill.alwaysCrit,
    critBonus: skill.critBonus ?? 0,
    aoe: skill.target === 'allEnemies',
    executePct: skill.executePct ?? 0,
  };
}

export function defenseFactor(defense) {
  return COMBAT.defenseK / (COMBAT.defenseK + Math.max(0, defense));
}

export function critMultiplier(stats) {
  return 1 + stats.critDmg / 100;
}

// Probabilité (0-1) plafonnée d'une stat en %, ex. chance(stats, 'esquive').
export function chance(stats, stat) {
  return Math.min(COMBAT.caps[stat] ?? 100, stats[stat] ?? 0) / 100;
}

export function powerOf(attacker, magic) {
  return magic ? attacker.magPower : attacker.physPower;
}

// Facteurs multiplicateurs d'un coup, détaillés pour le journal de combat :
// [{ label, value }] (puissance de la compétence, critique, défense, bonus…).
function hitFactors(attacker, opts, defender, crit) {
  const factors = [];
  if (opts.power !== 1) factors.push({ label: 'compétence', value: opts.power });
  if (crit) factors.push({ label: 'critique', value: critMultiplier(attacker) });
  // Légendaire « Cœur sacrifié » : dégâts infligés augmentés.
  if (attacker.dmgDealtPct) factors.push({ label: 'Cœur sacrifié', value: 1 + attacker.dmgDealtPct / 100 });
  // Talents : bonus aux compétences de zone.
  if (opts.aoe && attacker.aoePct) factors.push({ label: 'zone', value: 1 + attacker.aoePct / 100 });
  if (defender) {
    const def = opts.magic ? defender.defMag : defender.def;
    factors.push({ label: `${opts.magic ? 'défense magique' : 'défense'} ${def}`, value: defenseFactor(def) });
    // Talents « Opportuniste »… : bonus contre une cible affaiblie (debuff actif).
    if (defender.debuffed && attacker.vsDebuffedPct) factors.push({ label: 'cible affaiblie', value: 1 + attacker.vsDebuffedPct / 100 });
    // Exécution (compétence ou talent) : bonus contre une cible presque vaincue.
    const execute = (opts.executePct ?? 0) + (attacker.executePct ?? 0);
    if (execute && defender.hpPct !== undefined && defender.hpPct < COMBAT.executeThreshold) factors.push({ label: 'exécution', value: 1 + execute / 100 });
  }
  return factors;
}

function hitMultiplier(attacker, opts, defender, crit) {
  return hitFactors(attacker, opts, defender, crit).reduce((m, f) => m * f.value, 1);
}

// Fourchette {lo, hi} hors critique aléatoire (inclut le critique s'il est garanti).
// Sans `defender`, la défense de la cible n'est pas prise en compte.
export function estimateHit(attacker, opts, defender = null) {
  const base = powerOf(attacker, opts.magic) * hitMultiplier(attacker, opts, defender, opts.alwaysCrit);
  const [lo, hi] = opts.variance;
  return { lo: Math.max(1, Math.round(base * lo)), hi: Math.max(1, Math.round(base * hi)) };
}

// Jet d'un coup. `detail` explique le calcul (affiché au survol du journal) :
// « Puissance physique 22 × 1,5 (critique) × 0,91 (défense 10) × 1,04 (variation) = 31 ».
export function rollHit(attacker, opts, defender) {
  const critChance = Math.min(COMBAT.caps.critChance, (attacker.critChance ?? 0) + (opts.critBonus ?? 0)) / 100;
  const crit = opts.alwaysCrit || random() < critChance;
  const power = powerOf(attacker, opts.magic);
  const factors = hitFactors(attacker, opts, defender, crit);
  const [lo, hi] = opts.variance;
  const roll = rand(lo, hi);
  const amount = Math.max(1, Math.round(power * factors.reduce((m, f) => m * f.value, 1) * roll));
  const num = (v) => String(+v.toFixed(2)).replace('.', ',');
  const detail = [`Puissance ${opts.magic ? 'magique' : 'physique'} ${power}`, ...factors.map((f) => `× ${num(f.value)} (${f.label})`), `× ${num(roll)} (variation) = ${amount}`].join(' ');
  return { amount, crit, detail };
}

// Soins : sur la puissance magique (+ bonus de soins des talents), ou sur la
// puissance physique pour une compétence `physHeal` (Paladin Templier, Force).
export function healAmount(stats, power, phys = false) {
  return Math.round((phys ? stats.physPower : stats.magPower) * power * (1 + (stats.healPct ?? 0) / 100));
}

// Dégâts par tour d'un effet sur la durée (poison, saignement, brûlure…) :
// puissance du lanceur (magique si la compétence l'est) × power, + bonus des talents.
export function dotTick(stats, power, magic) {
  return Math.max(1, Math.round(powerOf(stats, magic) * power * (1 + (stats.dotPct ?? 0) / 100) * (1 + (stats.dmgDealtPct ?? 0) / 100)));
}

// Soins par tour (Régénération) : puissance magique × power.
export function hotTick(stats, power, phys = false) {
  return Math.max(1, healAmount(stats, power, phys));
}

// Dégâts d'un piège : puissance du lanceur × power, + bonus des talents (trapPct).
export function trapDamage(stats, power, magic) {
  return Math.max(1, Math.round(powerOf(stats, magic) * power * (1 + (stats.trapPct ?? 0) / 100)));
}

// Points de bouclier : puissance du lanceur (magique si la compétence l'est) × power.
export function shieldAmount(stats, power, magic) {
  return Math.max(1, Math.round(powerOf(stats, magic) * power * (1 + (stats.shieldPct ?? 0) / 100)));
}

// Valeur d'un effet appliqué par `skill` (entrée { id, turns, power }) : dégâts ou
// soins par tour, points de bouclier ; undefined pour un effet sans valeur.
export function effectValue(stats, skill, entry) {
  switch (EFFECTS[entry.id].value) {
    case 'dot': return dotTick(stats, entry.power, skill.magic);
    case 'hot': return hotTick(stats, entry.power, skill.physHeal);
    case 'trap': return trapDamage(stats, entry.power, skill.magic);
    case 'shield': return shieldAmount(stats, entry.power, skill.magic);
    default: return undefined;
  }
}

// Estimation {lo, hi} de l'effet principal d'une compétence : dégâts d'un coup,
// soin (exact), ou null si la compétence n'inflige ni dégâts ni soin directs.
export function estimateSkill(attacker, skill, defender = null) {
  if (skill.kind === 'heal') {
    const amount = healAmount(attacker, skill.power, skill.physHeal);
    return { lo: amount, hi: amount };
  }
  if (skill.kind !== 'damage') return null;
  return estimateHit(attacker, skillHitOptions(skill), defender);
}
