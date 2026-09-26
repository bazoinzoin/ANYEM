// Libellés partagés entre plusieurs écrans.

import { estimateSkill } from '../game/formulas.js';
import { range } from './html.js';

// Ex. « ~34-41 dégâts (zone) + saignement » ou « +23 PV ».
export function skillEffectLabel(atq, skill) {
  const est = range(estimateSkill(atq, skill));
  if (skill.kind === 'heal') return `Soin +${est} PV`;
  let label = `~${est} dégâts`;
  if (skill.target === 'allEnemies') label += ' (zone)';
  if (skill.bleed) label += ` + saignement ${skill.bleed} tours`;
  return label;
}

export function skillShortEstimate(atq, skill) {
  const est = range(estimateSkill(atq, skill));
  return skill.kind === 'heal' ? `+${est} PV` : `~${est}`;
}
