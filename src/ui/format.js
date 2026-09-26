// Libellés partagés entre plusieurs écrans : description et estimation des compétences.
// Toutes les valeurs viennent de game/formulas.js (mêmes calculs que le combat).

import { estimateSkill, dotTick, hotTick, shieldAmount } from '../game/formulas.js';
import { getStats, getClass } from '../game/party.js';
import { statusesOf } from '../game/statuses.js';
import { STATS } from '../data/stats.js';
import { CONSUMABLES } from '../data/consumables.js';
import { range } from './html.js';

const TARGET_LABELS = {
  allEnemies: 'tous les ennemis',
  allAllies: "toute l'équipe",
  self: 'soi-même',
  deadAlly: 'un allié tombé',
};

const POWER_LABELS = { physPower: 'puissance physique', magPower: 'puissance magique' };

function statusLabel(status) {
  const effects = [];
  for (const [stat, pct] of Object.entries(status.mods ?? {})) {
    effects.push(`${pct > 0 ? '+' : ''}${pct} % ${POWER_LABELS[stat] ?? STATS[stat]?.label ?? stat}`);
  }
  if (status.stun) effects.push('perd son prochain tour');
  if (status.taunt) effects.push('attire les attaques');
  if (status.confuse) effects.push('peut frapper ses alliés');
  const duration = status.stun ? '' : `, ${status.turns} tour${status.turns > 1 ? 's' : ''}`;
  return `${status.name} (${effects.join(', ')}${duration})`;
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
    parts.push(text);
  } else if (skill.kind === 'heal') {
    parts.push(`Soin +${range(est)} PV`);
  } else if (skill.kind === 'revive') {
    parts.push(`Relève avec ${Math.round(skill.power * 100)} % des PV`);
  }
  if (skill.dot) parts.push(`${skill.dot.name} ~${dotTick(stats, skill)}/tour pendant ${skill.dot.turns} tours`);
  if (skill.hot) parts.push(`Soin +${hotTick(stats, skill)}/tour pendant ${skill.hot.turns} tours`);
  if (skill.shield) parts.push(`Bouclier de ${shieldAmount(stats, skill)} (${skill.shield.turns} tours)`);
  if (skill.status) parts.push(statusLabel(skill.status));
  if (skill.selfStatus) parts.push(`Lanceur : ${statusLabel(skill.selfStatus)}`);
  const who = TARGET_LABELS[skill.target];
  return `${parts.join(' · ')}${who ? ` — ${who}` : ''}`;
}

// Estimation courte pour un bouton : « ~12-15 », « 4 × ~9-12 », « +23 PV », « 🛡️ 30 »…
export function skillShortEstimate(stats, skill, target = null) {
  const est = estimateSkill(stats, skill, target);
  if (skill.kind === 'damage') return `${skill.hits > 1 ? `${skill.hits} × ` : ''}~${range(est)}`;
  if (skill.kind === 'heal') return `+${range(est)} PV`;
  if (skill.kind === 'revive') return `${Math.round(skill.power * 100)} % PV`;
  if (skill.shield) return `🛡️ ${shieldAmount(stats, skill)}`;
  if (skill.hot) return `+${hotTick(stats, skill)}/tour`;
  if (skill.dot) return `~${dotTick(stats, skill)}/tour`;
  return skill.status?.name ?? skill.selfStatus?.name ?? '';
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
