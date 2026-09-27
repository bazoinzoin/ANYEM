// Classes à Énergie (Voleur) : plusieurs actions par tour et points de combo.
//
// Actions multiples : chaque action (attaque, défense, objet, compétence) coûte de
// l'Énergie ; le héros garde la main tant qu'il peut payer une action, puis finit
// son tour (ou le finit plus tôt s'il le souhaite). Voir game/combat.js.
//
// Points de combo : une compétence `comboGain` en donne au lanceur (plafond
// comboMax de la classe) ; un `finisher` les dépense tous, et sa puissance comme
// la valeur de ses effets sont multipliées par le nombre de points dépensés.

import { getClass } from './party.js';

export function isMultiAction(hero) {
  return !!getClass(hero).resource.multiAction;
}

// Coût en ressource d'une action de base ('attack' | 'defend' | 'item') : 0 hors
// classes à Énergie.
export function actionCost(hero, type) {
  return getClass(hero).resource.actionCosts?.[type] ?? 0;
}

export function canPay(hero, type) {
  return hero.res >= actionCost(hero, type);
}

export function comboMax(hero) {
  return getClass(hero).comboMax ?? 0;
}

export function comboOf(hero) {
  return hero.combo ?? 0;
}

export function gainCombo(hero, amount) {
  if (!amount || !comboMax(hero)) return 0;
  const before = comboOf(hero);
  hero.combo = Math.min(comboMax(hero), before + amount);
  return hero.combo - before;
}

// Points de combo d'un finisher à pleine puissance (comboMax du Voleur).
export const FULL_COMBO = 5;

// Multiplicateur d'un finisher pour `points` points de combo. Un finisher `fullAt: n`
// (Empoisonneur) atteint sa pleine puissance (celle de FULL_COMBO points) dès n points.
export function comboFactor(skill, points) {
  if (!skill.fullAt) return points;
  return +((Math.min(points, skill.fullAt) * FULL_COMBO) / skill.fullAt).toFixed(3);
}

/**
 * Compétence telle qu'elle sera lancée avec `points` points de combo : un finisher
 * voit sa puissance et la valeur de ses effets multipliées par comboFactor (champ
 * comboPoints ajouté). Les autres compétences sont renvoyées telles quelles.
 */
export function atCombo(skill, points) {
  if (!skill.finisher) return skill;
  const factor = comboFactor(skill, points);
  const scale = (v) => (v === undefined ? v : +(v * factor).toFixed(3));
  return {
    ...skill,
    power: scale(skill.power),
    effects: (skill.effects ?? []).map((e) => (e.power === undefined ? e : { ...e, power: scale(e.power) })),
    comboPoints: points,
  };
}
