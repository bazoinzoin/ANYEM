// Journal de combat et résumé de victoire (partagés par les écrans de combat,
// d'expédition et du village).

import { RARITIES, MATERIA_KINDS } from '../data/items.js';
import { CONSUMABLES } from '../data/consumables.js';
import { esc, tip } from './html.js';
import { itemChip } from './items.js';

// Lignes du journal : les coups critiques ressortent, et le calcul des dégâts
// s'affiche au survol quand il est connu.
export function logLines(entries) {
  return entries.map((l) => {
    const cls = `${l.hit ? 'hit' : ''} ${l.crit ? 'crit' : ''}`;
    if (!l.detail) return `<div class="${cls}">${l.crit ? '💥 ' : ''}${esc(l.text)}</div>`;
    return `<div ${tip(l.detail, `${cls} has-detail`)}>${l.crit ? '💥 ' : ''}${esc(l.text)} <span class="why">ⓘ</span></div>`;
  }).join('');
}

// Journal du dernier combat, repliable (après la fin du combat).
export function lastCombatLog(last) {
  if (!last?.log?.length) return '';
  return `
    <details class="card last-log">
      <summary>📜 Journal du dernier combat (${esc(last.title)})</summary>
      <div class="log">${logLines(last.log)}</div>
    </details>`;
}

// Résumé détaillé d'une victoire (résultat de applyVictory / winFloor).
export function victorySummary(r) {
  if (!r) return '';
  const rows = [
    ['💰 Or', `+${r.gold}`],
    ['⭐ Expérience', `+${r.xp} XP pour chaque héros`],
  ];
  if (r.levelUps?.length) rows.push(['🎉 Niveau supérieur', r.levelUps.map((h) => `${esc(h.name)} → niveau ${h.level}`).join(', ')]);
  rows.push(['🎒 Équipement', r.loot?.length ? r.loot.map(itemChip).join(' ') : '<span class="hint">aucun</span>']);
  rows.push(['💎 Matéria', r.materia?.length
    ? r.materia.map((m) => `<span style="color:${RARITIES[m.rarity].color}">${m.amount} × ${MATERIA_KINDS[m.kind].icon} ${RARITIES[m.rarity].label.toLowerCase()}</span>`).join(', ')
    : '<span class="hint">aucune</span>']);
  rows.push(['🧪 Consommables', r.consumables?.length ? r.consumables.map((k) => `${CONSUMABLES[k].icon} ${CONSUMABLES[k].name}`).join(', ') : '<span class="hint">aucun</span>']);
  return `
    <div class="victory-summary">
      <h3>Victoire !</h3>
      <table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
    </div>`;
}
