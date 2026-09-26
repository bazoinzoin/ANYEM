// Libellés partagés entre plusieurs écrans.

import { estimateSkill } from '../game/formulas.js';
import { range } from './html.js';

// `stats` : stats du lanceur (getStats). Sans cible : défense ennemie non comptée.
// Ex. « ~34-41 dégâts (zone) + saignement 3 tours » ou « Soin +23 PV ».
export function skillEffectLabel(stats, skill) {
  const est = range(estimateSkill(stats, skill));
  if (skill.kind === 'heal') return `Soin +${est} PV`;
  let label = `~${est} dégâts ${skill.magic ? 'magiques' : 'physiques'}`;
  if (skill.alwaysCrit) label += ' (critique garanti)';
  if (skill.target === 'allEnemies') label += ' (zone)';
  if (skill.bleed) label += ` + saignement ${skill.bleed} tours`;
  return label;
}

export function skillShortEstimate(stats, skill) {
  const est = range(estimateSkill(stats, skill));
  return skill.kind === 'heal' ? `+${est} PV` : `~${est}`;
}
