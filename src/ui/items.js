// Affichage des objets et des stats.

import { STATS } from '../data/stats.js';
import { RARITIES, SLOTS } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { itemTypeLabel, itemStats } from '../game/items.js';
import { esc, tip } from './html.js';

// « +5 Défense », « -1 Vitesse », « +2 % Taux critique ».
export function formatStat(key, value, { sign = true } = {}) {
  const def = STATS[key];
  const prefix = sign && value >= 0 ? '+' : '';
  return `${prefix}${value}${def.suffix ? ` ${def.suffix}` : ''} ${def.label}`;
}

// Nom avec niveau d'amélioration, ex. « Épée du Faucon +2 » (texte brut, non échappé).
export function itemName(item) {
  return item.plus ? `${item.name} +${item.plus}` : item.name;
}

function itemStatKeys(item) {
  const primary = item.mandatory.includes(item.primary) ? [] : [item.primary];
  return [...item.mandatory, ...primary, ...item.secondaries];
}

export function itemMeta(item) {
  return `${RARITIES[item.rarity].label} · Niveau ${item.level} · ${itemTypeLabel(item)}`;
}

// Texte brut multi-lignes (infobulles).
export function itemTooltipText(item) {
  const stats = itemStats(item);
  const lines = [itemName(item), itemMeta(item), ...itemStatKeys(item).map((k) => formatStat(k, stats[k]))];
  if (item.legendary) lines.push(`Unique (${CLASSES[item.legendary.classKey].name}) : ${item.legendary.desc}`);
  return lines.join('\n');
}

// Nom coloré par rareté, avec infobulle détaillée.
export function itemChip(item) {
  return `<span ${tip(itemTooltipText(item), 'item-chip')} style="--rc:${RARITIES[item.rarity].color}">${esc(itemName(item))}</span>`;
}

// Fiche complète d'un objet.
export function itemCard(item) {
  const stats = itemStats(item);
  const statLines = itemStatKeys(item).map((k) => {
    const cls = item.secondaries.includes(k) ? 'secondary' : 'main';
    return `<li class="${cls}">${formatStat(k, stats[k])}</li>`;
  });
  return `
    <div class="item-card" style="--rc:${RARITIES[item.rarity].color}">
      <div class="item-name">${esc(itemName(item))}</div>
      <div class="item-rarity">${RARITIES[item.rarity].label}</div>
      <div class="item-meta">Niveau ${item.level} · ${itemTypeLabel(item)}</div>
      <ul class="item-stats">${statLines.join('')}</ul>
      ${item.legendary ? `<div class="item-legendary">Unique (${CLASSES[item.legendary.classKey].name}) : ${esc(item.legendary.desc)}</div>` : ''}
    </div>`;
}

export function slotLabel(slot) {
  return SLOTS[slot].label;
}
