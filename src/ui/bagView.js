// Présentation du sac : onglets (catégories), tri et pages de la grille d'inventaire.
// Pur, testable sous Node.

import { RARITY_ORDER, JEWELS } from '../data/items.js';
import { cannotEquipReason } from '../game/equipment.js';

// Onglets du sac : objets d'équipement par catégorie, puis consommables et matéria.
export const BAG_TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'usable', label: 'Équipable' },
  { id: 'weapons', label: 'Armes' },
  { id: 'armor', label: 'Armures' },
  { id: 'jewels', label: 'Bijoux' },
  { id: 'consumables', label: 'Objets' },
  { id: 'materia', label: 'Matéria' },
];

const FILTERS = {
  all: () => true,
  usable: (item, hero) => !cannotEquipReason(hero, item),
  weapons: (item) => item.slotType === 'arme',
  armor: (item) => item.slotType !== 'arme' && !JEWELS[item.slotType],
  jewels: (item) => !!JEWELS[item.slotType],
};

// Objets du sac pour un onglet d'équipement, du plus rare au moins rare, puis par niveau.
export function bagItems(bag, tab, hero) {
  const keep = FILTERS[tab] ?? FILTERS.all;
  return bag.filter((item) => keep(item, hero)).sort((a, b) =>
    RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.level - a.level || a.name.localeCompare(b.name));
}

// Page `page` (0…) d'une liste découpée en pages de `perPage` : { items, page, pages }.
export function paginate(list, page, perPage) {
  const pages = Math.max(1, Math.ceil(list.length / Math.max(1, perPage)));
  const p = Math.max(0, Math.min(page, pages - 1));
  return { items: list.slice(p * perPage, (p + 1) * perPage), page: p, pages };
}
