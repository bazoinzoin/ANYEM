// Soins hors combat (entre deux combats d'une expédition) : les héros peuvent
// lancer leurs compétences de soin et de purification. Les autres effets (buffs,
// boucliers, soins sur la durée) ne s'appliquent pas hors combat, pour éviter de
// se sur-préparer avant une rencontre.

import { getSkills } from './party.js';
import { statsOf, heal } from './units.js';
import { healAmount } from './formulas.js';
import { statusesOf } from './statuses.js';

// Compétence utilisable hors combat : un soin direct ou une purification.
export function isFieldSkill(skill) {
  return skill.kind === 'heal' || !!skill.cleanse;
}

// Compétences du héros utilisables hors combat : [{ skill, index }] (index dans getSkills).
export function fieldSkills(hero) {
  return getSkills(hero).map((skill, index) => ({ skill, index })).filter(({ skill }) => isFieldSkill(skill));
}

// Cibles possibles d'une compétence hors combat (héros en vie) : indices dans l'équipe.
export function fieldTargets(game, casterIndex, skill) {
  if (skill.target === 'self') return [casterIndex];
  if (skill.target === 'ally' || skill.target === 'allAllies') {
    return game.party.map((h, i) => (h.alive ? i : -1)).filter((i) => i >= 0);
  }
  return [];
}

// Raison pour laquelle la compétence ne peut pas être lancée maintenant, ou null.
export function cannotCastReason(game, casterIndex, skill) {
  const caster = game.party[casterIndex];
  if (!game.expedition) return 'Uniquement pendant une expédition.';
  if (!caster?.alive) return 'Ce héros est tombé.';
  if (!isFieldSkill(skill)) return 'Utilisable seulement en combat.';
  if (caster.res < skill.cost) return 'Pas assez de ressource.';
  return null;
}

/**
 * Lance la compétence `skillIndex` du héros `casterIndex` hors combat, sur le héros
 * `targetIndex` (ignoré pour une compétence de groupe). Retourne { ok, message }.
 */
export function castOutOfCombat(game, casterIndex, skillIndex, targetIndex) {
  const caster = game.party[casterIndex];
  const skill = caster && getSkills(caster)[skillIndex];
  if (!skill || cannotCastReason(game, casterIndex, skill)) return { ok: false, message: '' };
  const group = skill.target === 'allAllies';
  if (!group && !fieldTargets(game, casterIndex, skill).includes(skill.target === 'self' ? casterIndex : targetIndex)) {
    return { ok: false, message: '' };
  }
  const targets = group ? game.party.filter((h) => h.alive) : [game.party[skill.target === 'self' ? casterIndex : targetIndex]];
  caster.res -= skill.cost;
  const stats = statsOf(caster);
  const parts = targets.map((t) => {
    const bits = [];
    if (skill.kind === 'heal') bits.push(`+${heal(t, healAmount(stats, skill.power, skill.physHeal))} PV`);
    if (skill.cleanse) {
      const removed = statusesOf(t).filter((s) => s.kind === 'debuff');
      t.statuses = statusesOf(t).filter((s) => s.kind !== 'debuff');
      bits.push(removed.length ? `${removed.map((s) => s.name).join(', ')} retiré${removed.length > 1 ? 's' : ''}` : 'aucun effet négatif');
    }
    return `${t.name} : ${bits.join(', ')}`;
  });
  return { ok: true, message: `${caster.name} lance ${skill.name} (${parts.join(' ; ')}).` };
}
