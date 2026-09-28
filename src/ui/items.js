// Affichage des objets et des stats.

import { STATS } from '../data/stats.js';
import { RARITIES, SLOTS, WEAPON_TYPES, RANGE_LABELS, LEGENDARIES } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { itemTypeLabel, itemStatLines } from '../game/items.js';
import { esc, tip } from './html.js';
import { iconHtml, itemIcon } from './icons.js';

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
  const lines = [itemName(item), itemMeta(item), ...itemStatLines(item).map((l) => `${formatStat(l.stat, l.value)}${rangeText(l)}`)];
  if (item.legendary) lines.push(`Unique${legendaryOwner(item)} : ${item.legendary.desc}`);
  if (item.absorbed) lines.push(`Pouvoir absorbé (${item.absorbed.name}${absorbedOwner(item)}) : ${item.absorbed.desc}`);
  if (quoteOf(item)) lines.push(`« ${quoteOf(item)} »`);
  return lines.join('\n');
}

// Citation d'un légendaire (ou du pouvoir absorbé par un objet divin), lue dans le catalogue.
function quoteOf(item) {
  const key = item.legendary?.key ?? item.absorbed?.key;
  return (key && LEGENDARIES[key]?.quote) || '';
}

// « (Guerrier) » pour un légendaire réservé à une classe, rien s'il est neutre.
function legendaryOwner(item) {
  const cls = CLASSES[item.legendary.classKey];
  return cls ? ` (${cls.name})` : '';
}

// « , Guerrier » : classe qui profite du pouvoir absorbé par un objet divin.
function absorbedOwner(item) {
  const cls = CLASSES[item.absorbed.classKey];
  return cls ? `, ${cls.name}` : '';
}

// « (2 à 5) » : fourchette possible d'une stat secondaire, pour juger du tirage.
function rangeText(line) {
  if (!line.range || line.range.lo === line.range.hi) return '';
  return ` (${line.range.lo} à ${line.range.hi})`;
}

// Nom coloré par rareté, avec infobulle détaillée.
export function itemChip(item) {
  return `<span ${tip(itemTooltipText(item), 'item-chip')} style="--rc:${RARITIES[item.rarity].color}">${iconHtml(itemIcon(item), 16)} ${esc(itemName(item))}</span>`;
}

// Fiche complète d'un objet.
export function itemCard(item) {
  const statLines = itemStatLines(item).map((l) =>
    `<li class="${l.secondary ? 'secondary' : 'main'}">${formatStat(l.stat, l.value)}${rangeText(l) ? ` <span ${tip(`Valeurs possibles pour cette stat à ce niveau et à cette rareté : de ${l.range.lo} à ${l.range.hi}. Plus la valeur est proche du maximum, meilleur est le tirage.`, 'stat-range')}>${rangeText(l).trim()}</span>` : ''}</li>`);
  return `
    <div class="item-card" style="--rc:${RARITIES[item.rarity].color}">
      <div class="item-name">${esc(itemName(item))}</div>
      <div class="item-rarity">${RARITIES[item.rarity].label}</div>
      <div class="item-meta">Niveau ${item.level} · ${item.slotType === 'arme' ? `${WEAPON_TYPES[item.weaponType].name} · ` : ''}${itemTypeLabel(item)}</div>
      ${weaponLine(item) ? `<div class="item-meta">${weaponLine(item)}</div>` : ''}
      <ul class="item-stats">${statLines.join('')}</ul>
      ${item.legendary ? `<div class="item-legendary">Unique${legendaryOwner(item)} : ${esc(item.legendary.desc)}</div>` : ''}
      ${item.absorbed ? `<div class="item-legendary item-absorbed">Pouvoir absorbé — ${esc(item.absorbed.name)}${absorbedOwner(item)} : ${esc(item.absorbed.desc)}</div>` : ''}
      ${quoteOf(item) ? `<div class="item-quote no-gloss">« ${esc(quoteOf(item))} »</div>` : ''}
    </div>`;
}

export function slotLabel(slot) {
  return SLOTS[slot].label;
}



// Texte d'infobulle : équipement porté par un héros.
export function equipmentTooltip(hero) {
  const lines = SLOT_ORDER_FOR_TIP.map((slot) => hero.equipment[slot] && `${SLOTS[slot].label} : ${itemName(hero.equipment[slot])} (${RARITIES[hero.equipment[slot].rarity].label})`).filter(Boolean);
  return lines.length ? `Équipement de ${hero.name} :\n${lines.join('\n')}` : `${hero.name} ne porte aucun équipement.`;
}
const SLOT_ORDER_FOR_TIP = Object.keys(SLOTS);
