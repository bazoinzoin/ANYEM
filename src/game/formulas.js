// Formules de dégâts et de soins, et leurs estimations affichées au joueur.
// Les estimations utilisent exactement les mêmes fourchettes que les jets réels.

import { VARIANCE } from '../config.js';
import { rand } from './rng.js';

export function rollDamage(atq, power = 1, [lo, hi] = VARIANCE.hero) {
  return Math.round(atq * power * rand(lo, hi));
}

export function estimateDamage(atq, power = 1, [lo, hi] = VARIANCE.hero) {
  return { lo: Math.round(atq * power * lo), hi: Math.round(atq * power * hi) };
}

export function healAmount(atq, power) {
  return Math.round(atq * power);
}

export function skillVariance(skill) {
  return skill.target === 'allEnemies' ? VARIANCE.aoe : VARIANCE.hero;
}

// Estimation {lo, hi} de l'effet d'une compétence pour un lanceur d'attaque `atq`.
export function estimateSkill(atq, skill) {
  if (skill.kind === 'heal') {
    const amount = healAmount(atq, skill.power);
    return { lo: amount, hi: amount };
  }
  return estimateDamage(atq, skill.power, skillVariance(skill));
}
