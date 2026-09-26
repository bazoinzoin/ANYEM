// Libellés partagés entre plusieurs écrans : description et estimation des compétences.
// Toutes les valeurs viennent de game/formulas.js (mêmes calculs que le combat).

import { estimateSkill, effectValue } from '../game/formulas.js';
import { getStats, getClass } from '../game/party.js';
import { statusesOf } from '../game/statuses.js';
import { EFFECTS } from '../data/effects.js';
import { CONSUMABLES } from '../data/consumables.js';
import { range } from './html.js';

const TARGET_LABELS = {
  allEnemies: 'tous les ennemis',
  allAllies: "toute l'équipe",
  self: 'soi-même',
  deadAlly: 'un allié tombé',
};

// « Poison ~6/tour, 4 tours », « Bouclier de 30, 2 tours », « Ralenti (−30 % de Vitesse), 2 tours ».
function effectLabel(stats, skill, entry) {
  const def = EFFECTS[entry.id];
  const value = effectValue(stats, skill, entry);
  const turns = def.stun ? '' : `, ${entry.turns} tour${entry.turns > 1 ? 's' : ''}`;
  if (def.value === 'dot') return `${def.name} ~${value}/tour${turns}`;
  if (def.value === 'hot') return `${def.name} +${value} PV/tour${turns}`;
  if (def.value === 'shield') return `${def.name} de ${value}${turns}`;
  if (def.value === 'trap') return `${def.name} (~${value} dégâts à son prochain tour, puis ${def.desc.split(', et ')[1]?.replace(/\.$/, '') ?? 'effet'})`;
  return `${def.name} (${def.desc.replace(/\.$/, '')})${turns}`;
}

/**
 * Description complète d'une compétence pour un lanceur de stats `stats`
 * (et une cible de stats `target` si fournie : sa défense est alors comptée).
 * Ex. « 4 × ~9-12 dégâts physiques · Poison ~6/tour pendant 4 tours ».
 */
export function skillEffectLabel(stats, skill, target = null) {
  const parts = [];
  const est = estimateSkill(stats, skill, target);
  if (skill.kind === 'damage') {
    let text = `${skill.hits > 1 ? `${skill.hits} × ` : ''}~${range(est)} dégâts ${skill.magic ? 'magiques' : 'physiques'}`;
    if (skill.alwaysCrit) text += ' (critique garanti)';
    if (skill.critBonus) text += ` (+${skill.critBonus} % de critique)`;
    if (skill.executePct) text += ` (+${skill.executePct} % sous 30 % de PV)`;
    parts.push(text);
  } else if (skill.kind === 'heal') {
    parts.push(`Soin +${range(est)} PV`);
  } else if (skill.kind === 'revive') {
    parts.push(`Relève avec ${Math.round(skill.power * 100)} % des PV`);
  }
  for (const e of skill.effects ?? []) parts.push(effectLabel(stats, skill, e));
  for (const e of skill.selfEffects ?? []) parts.push(`Lanceur : ${effectLabel(stats, skill, e)}`);
  if (skill.cleanse) parts.push('Retire tous les effets négatifs');
  if (skill.resourceGain) parts.push(`+${skill.resourceGain} de ressource`);
  if (skill.oncePerCombat) parts.push('une fois par combat');
  if (skill.comboGain) parts.push(`+${skill.comboGain} point de combo`);
  const who = TARGET_LABELS[skill.target];
  const text = `${parts.join(' · ')}${who ? ` — ${who}` : ''}`;
  // Finisher : valeurs données par point de combo, ou pour les points dépensés.
  if (!skill.finisher) return text;
  if (!skill.comboPoints) return `Finisher, par point de combo : ${text}`;
  return `Finisher avec ${skill.comboPoints} point${skill.comboPoints > 1 ? 's' : ''} de combo : ${text}`;
}

// Estimation courte pour un bouton : « ~12-15 », « 4 × ~9-12 », « +23 PV », « 🛡️ 30 »…
export function skillShortEstimate(stats, skill, target = null) {
  const est = estimateSkill(stats, skill, target);
  if (skill.kind === 'damage') return `${skill.hits > 1 ? `${skill.hits} × ` : ''}~${range(est)}`;
  if (skill.kind === 'heal') return `+${range(est)} PV`;
  if (skill.kind === 'revive') return `${Math.round(skill.power * 100)} % PV`;
  const main = [...(skill.effects ?? []), ...(skill.selfEffects ?? [])][0];
  if (!main) return skill.resourceGain ? `+${skill.resourceGain}` : '';
  const def = EFFECTS[main.id];
  const value = effectValue(stats, skill, main);
  if (def.value === 'shield') return `🛡️ ${value}`;
  if (def.value === 'hot') return `+${value}/tour`;
  if (def.value === 'dot') return `~${value}/tour`;
  if (def.value === 'trap') return `🪤 ~${value}`;
  return def.name;
}

// Effet prévu d'un consommable sur un héros (« +45 PV », « retire Poison »…).
export function consumableEstimate(key, hero) {
  const { effect } = CONSUMABLES[key];
  const stats = getStats(hero);
  if (effect.revivePct) return `${Math.max(1, Math.round(stats.pv * effect.revivePct / 100))} PV`;
  if (effect.healPct) return `+${Math.min(stats.pv - hero.hp, Math.round(stats.pv * effect.healPct / 100))} PV`;
  if (effect.resourcePct) return `+${Math.min(stats.resMax - hero.res, Math.round(stats.resMax * effect.resourcePct / 100))} ${getClass(hero).resource.name}`;
  if (effect.cure || effect.cleanse) {
    const names = statusesOf(hero).filter((s) => s.kind === 'debuff' && (effect.cleanse || effect.cure.includes(s.key))).map((s) => s.name);
    return `retire ${names.join(', ')}`;
  }
  return '';
}
