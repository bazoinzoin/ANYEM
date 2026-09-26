// Affichage des objets et des stats.

import { STATS } from '../data/stats.js';
import { RARITIES, SLOTS, WEAPON_TYPES, RANGE_LABELS } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { itemTypeLabel, itemStatLines } from '../game/items.js';
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

// « Corps à corps · vitesse d'attaque ×1,08 » pour une arme, sinon ''.
export function weaponLine(item) {
  const w = item.slotType === 'arme' ? WEAPON_TYPES[item.weaponType] : null;
  return w ? `${RANGE_LABELS[w.range]} · vitesse d'attaque ×${String(w.speed).replace('.', ',')}` : '';
}

export function itemMeta(item) {
  return `${RARITIES[item.rarity].label} · Niveau ${item.level} · ${itemTypeLabel(item)}${weaponLine(item) ? ` · ${weaponLine(item)}` : ''}`;
}

// Texte brut multi-lignes (infobulles).
export function itemTooltipText(item) {
  const lines = [itemName(item), itemMeta(item), ...itemStatLines(item).map((l) => formatStat(l.stat, l.value))];
  if (item.legendary) lines.push(`Unique (${CLASSES[item.legendary.classKey].name}) : ${item.legendary.desc}`);
  return lines.join('\n');
}

// Nom coloré par rareté, avec infobulle détaillée.
export function itemChip(item) {
  return `<span ${tip(itemTooltipText(item), 'item-chip')} style="--rc:${RARITIES[item.rarity].color}">${esc(itemName(item))}</span>`;
}

// Fiche complète d'un objet.
export function itemCard(item) {
  const statLines = itemStatLines(item).map((l) =>
    `<li class="${l.secondary ? 'secondary' : 'main'}">${formatStat(l.stat, l.value)}</li>`);
  return `
    <div class="item-card" style="--rc:${RARITIES[item.rarity].color}">
      <div class="item-name">${esc(itemName(item))}</div>
      <div class="item-rarity">${RARITIES[item.rarity].label}</div>
      <div class="item-meta">Niveau ${item.level} · ${item.slotType === 'arme' ? `${WEAPON_TYPES[item.weaponType].name} · ` : ''}${itemTypeLabel(item)}</div>
      ${weaponLine(item) ? `<div class="item-meta">${weaponLine(item)}</div>` : ''}
      <ul class="item-stats">${statLines.join('')}</ul>
      ${item.legendary ? `<div class="item-legendary">Unique (${CLASSES[item.legendary.classKey].name}) : ${esc(item.legendary.desc)}</div>` : ''}
    </div>`;
}

export function slotLabel(slot) {
  return SLOTS[slot].label;
}
