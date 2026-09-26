// Formules de dégâts et de soins, et leurs estimations affichées au joueur.
// Les estimations utilisent exactement les mêmes calculs que les jets réels.
//
// Un coup : puissance du lanceur × multiplicateur × variance [× critique] × facteur de défense.
// Puissance physique (arme + Force/Agilité) contre la Défense, ou puissance magique
// (Intelligence) contre la Défense magique.
// `attacker` / `defender` sont des objets de stats (getStats() ou stats d'ennemi).

import { COMBAT, VARIANCE } from '../config.js';
import { rand, random } from './rng.js';

// Options d'un coup : { power, variance, magic, alwaysCrit, critBonus }
export const BASIC_ATTACK = { power: 1, variance: VARIANCE.hero, magic: false, alwaysCrit: false, critBonus: 0 };
export const ENEMY_ATTACK = { power: 1, variance: VARIANCE.enemy, magic: false, alwaysCrit: false, critBonus: 0 };

export function skillHitOptions(skill) {
  return {
    power: skill.power,
    variance: skill.target === 'allEnemies' ? VARIANCE.aoe : VARIANCE.hero,
    magic: !!skill.magic,
    alwaysCrit: !!skill.alwaysCrit,
    critBonus: skill.critBonus ?? 0,
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

function hitMultiplier(attacker, opts, defender, crit) {
  let mult = opts.power * (crit ? critMultiplier(attacker) : 1);
  if (defender) {
    mult *= defenseFactor(opts.magic ? defender.defMag : defender.def);
    // Talent « Opportuniste » : bonus contre une cible affaiblie (debuff actif).
    if (defender.debuffed && attacker.vsDebuffedPct) mult *= 1 + attacker.vsDebuffedPct / 100;
  }
  return mult;
}

// Fourchette {lo, hi} hors critique aléatoire (inclut le critique s'il est garanti).
// Sans `defender`, la défense de la cible n'est pas prise en compte.
export function estimateHit(attacker, opts, defender = null) {
  const base = powerOf(attacker, opts.magic) * hitMultiplier(attacker, opts, defender, opts.alwaysCrit);
  const [lo, hi] = opts.variance;
  return { lo: Math.max(1, Math.round(base * lo)), hi: Math.max(1, Math.round(base * hi)) };
}

export function rollHit(attacker, opts, defender) {
  const critChance = Math.min(COMBAT.caps.critChance, (attacker.critChance ?? 0) + (opts.critBonus ?? 0)) / 100;
  const crit = opts.alwaysCrit || random() < critChance;
  const base = powerOf(attacker, opts.magic) * hitMultiplier(attacker, opts, defender, crit);
  const [lo, hi] = opts.variance;
  return { amount: Math.max(1, Math.round(base * rand(lo, hi))), crit };
}

// Soins : toujours sur la puissance magique (+ bonus de soins des talents).
export function healAmount(stats, power) {
  return Math.round(stats.magPower * power * (1 + (stats.healPct ?? 0) / 100));
}

// Dégâts par round d'un effet sur la durée (poison, saignement, brûlure…) :
// puissance du lanceur × dot.power, + bonus des talents. Ignore la défense.
export function dotTick(stats, skill) {
  return Math.max(1, Math.round(powerOf(stats, skill.magic) * skill.dot.power * (1 + (stats.dotPct ?? 0) / 100)));
}

// Soins par round d'un soin sur la durée.
export function hotTick(stats, skill) {
  return Math.max(1, healAmount(stats, skill.hot.power));
}

// Points de bouclier : puissance du lanceur (magique ou physique) × shield.power.
export function shieldAmount(stats, skill) {
  return Math.max(1, Math.round(powerOf(stats, skill.magic) * skill.shield.power));
}

// Estimation {lo, hi} de l'effet principal d'une compétence : dégâts d'un coup,
// soin (exact), ou null si la compétence n'inflige ni dégâts ni soin directs.
export function estimateSkill(attacker, skill, defender = null) {
  if (skill.kind === 'heal') {
    const amount = healAmount(attacker, skill.power);
    return { lo: amount, hi: amount };
  }
  if (skill.kind !== 'damage') return null;
  return estimateHit(attacker, skillHitOptions(skill), defender);
}
