// Formules de dégâts et de soins, et leurs estimations affichées au joueur.
// Les estimations utilisent exactement les mêmes calculs que les jets réels.
//
// Un coup : puissance du lanceur × multiplicateur × variance [× critique] × facteur de défense.
// Puissance physique (arme + Force/Agilité) contre la Défense, ou puissance magique
// (Intelligence) contre la Défense magique.
// `attacker` / `defender` sont des objets de stats (getStats() ou stats d'ennemi).

import { COMBAT, VARIANCE } from '../config.js';
import { rand, random } from './rng.js';

// Options d'un coup : { power, variance, magic, alwaysCrit }
export const BASIC_ATTACK = { power: 1, variance: VARIANCE.hero, magic: false, alwaysCrit: false };
export const ENEMY_ATTACK = { power: 1, variance: VARIANCE.enemy, magic: false, alwaysCrit: false };

export function skillHitOptions(skill) {
  return {
    power: skill.power,
    variance: skill.target === 'allEnemies' ? VARIANCE.aoe : VARIANCE.hero,
    magic: !!skill.magic,
    alwaysCrit: !!skill.alwaysCrit,
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
  if (defender) mult *= defenseFactor(opts.magic ? defender.defMag : defender.def);
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
  const crit = opts.alwaysCrit || random() < chance(attacker, 'critChance');
  const base = powerOf(attacker, opts.magic) * hitMultiplier(attacker, opts, defender, crit);
  const [lo, hi] = opts.variance;
  return { amount: Math.max(1, Math.round(base * rand(lo, hi))), crit };
}

// Soins : toujours sur la puissance magique.
export function healAmount(stats, power) {
  return Math.round(stats.magPower * power);
}

// Estimation {lo, hi} de l'effet d'une compétence (soin exact, ou dégâts).
export function estimateSkill(attacker, skill, defender = null) {
  if (skill.kind === 'heal') {
    const amount = healAmount(attacker, skill.power);
    return { lo: amount, hi: amount };
  }
  return estimateHit(attacker, skillHitOptions(skill), defender);
}
