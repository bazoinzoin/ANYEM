// Journal de combat et résumé de victoire (partagés par les écrans de combat,
// d'expédition et du village).

import { RARITIES, MATERIA_KINDS } from '../data/items.js';
import { CONSUMABLES } from '../data/consumables.js';
import { esc, tip } from './html.js';
import { itemChip } from './items.js';
import { iconHtml, consumableIcon, MATERIA_ICONS, GOLD_ICON } from './icons.js';

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
      <summary>${iconHtml(96, 16)} Journal du dernier combat (${esc(last.title)})</summary>
      <div class="log">${logLines(last.log)}</div>
    </details>`;
}

// Résumé détaillé d'une victoire (résultat de applyVictory / winFight).
export function victorySummary(r) {
  if (!r) return '';
  const rows = [
    [`${iconHtml(GOLD_ICON, 16)} Or`, `+${r.gold}`],
    [`${iconHtml(682, 16)} Expérience`, `+${r.xp} XP pour chaque héros`],
  ];
  if (r.levelUps?.length) rows.push([`${iconHtml(648, 16)} Niveau supérieur`, r.levelUps.map((h) => `${esc(h.name)} → niveau ${h.level}`).join(', ')]);
  rows.push([`${iconHtml(1447, 16)} Équipement`, r.loot?.length ? r.loot.map(itemChip).join(' ') : '<span class="hint">aucun</span>']);
  rows.push([`${iconHtml(162, 16)} Matéria`, r.materia?.length
    ? r.materia.map((m) => `<span style="color:${RARITIES[m.rarity].color}">${m.amount} × ${iconHtml(MATERIA_ICONS[m.kind], 16)} ${esc(MATERIA_KINDS[m.kind].label)} ${RARITIES[m.rarity].label.toLowerCase()}</span>`).join(', ')
    : '<span class="hint">aucune</span>']);
  rows.push([`${iconHtml(276, 16)} Consommables`, r.consumables?.length ? r.consumables.map((k) => `${iconHtml(consumableIcon(k), 16)} ${esc(CONSUMABLES[k].name)}`).join(', ') : '<span class="hint">aucun</span>']);
  return `
    <div class="victory-summary">
      <h3>Victoire !</h3>
      <table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
    </div>`;
}
