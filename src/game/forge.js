// Forge : décraft des objets en matéria, amélioration de +1 à +5 et fabrication.
//
// game.materia : { arme: { commun: n, peuCommun: n, … }, armure: { … }, bijou: { … } }

import { FORGE } from '../config.js';
import {
  RARITY_ORDER, MATERIA_KINDS, WEAPON_TYPES, ARMOR_PIECES, ARMOR_TYPES, JEWELS, LEGENDARIES,
} from '../data/items.js';
import { isWeapon, generateItem, primaryOptions } from './items.js';
import { random, pick } from './rng.js';

export function emptyMateria() {
  return Object.fromEntries(Object.keys(MATERIA_KINDS).map((kind) =>
    [kind, Object.fromEntries(RARITY_ORDER.map((r) => [r, 0]))]));
}

export function materiaKind(item) {
  if (isWeapon(item)) return 'arme';
  if (JEWELS[item.slotType]) return 'bijou';
  return 'armure';
}

// Gain possible : { kind, rarity, min, max } (la quantité est tirée au décraft).
export function decraftYield(item) {
  return { kind: materiaKind(item), rarity: item.rarity, ...FORGE.decraftYield };
}

// Décrafte un objet du sac (jamais un objet porté). Retourne le gain { kind, rarity, amount }, ou null.
export function decraft(game, item) {
  const index = game.bag.indexOf(item);
  if (index === -1) return null;
  game.bag.splice(index, 1);
  const { kind, rarity, min, max } = decraftYield(item);
  const amount = min + Math.floor(random() * (max - min + 1));
  game.materia[kind][rarity] += amount;
  return { kind, rarity, amount };
}

/**
 * Coût du prochain niveau d'amélioration, ou null si l'objet est au maximum.
 * { plus: niveau visé, gold, kind, materia: { rareté: quantité } }
 */
export function upgradeCost(item) {
  const plus = (item.plus ?? 0) + 1;
  if (plus > FORGE.maxPlus) return null;
  const tiers = RARITY_ORDER.slice(0, RARITY_ORDER.indexOf(item.rarity) + 1);
  const materia = Object.fromEntries(tiers.map((tier) => [tier, FORGE.tierCost[plus - 1]]));
  return { plus, gold: (FORGE.goldBase + FORGE.goldPerLevel * item.level) * plus, kind: materiaKind(item), materia };
}

// Ce qui manque pour améliorer : { gold, materia: { rareté: manque } } (vide si tout est là).
export function missingForUpgrade(game, item) {
  const cost = upgradeCost(item);
  if (!cost) return null;
  const missing = { gold: Math.max(0, cost.gold - game.gold), materia: {} };
  for (const [tier, need] of Object.entries(cost.materia)) {
    const lack = need - game.materia[cost.kind][tier];
    if (lack > 0) missing.materia[tier] = lack;
  }
  return missing;
}

export function canUpgrade(game, item) {
  const missing = missingForUpgrade(game, item);
  return !!missing && missing.gold === 0 && Object.keys(missing.materia).length === 0;
}

// Améliore l'objet (porté ou dans le sac) en payant son coût. Retourne false si impossible.
export function upgrade(game, item) {
  if (!canUpgrade(game, item)) return false;
  const cost = upgradeCost(item);
  game.gold -= cost.gold;
  for (const [tier, need] of Object.entries(cost.materia)) game.materia[cost.kind][tier] -= need;
  item.plus = cost.plus;
  return true;
}

// ---- Fabrication ----
//
// Une commande : { kind: 'arme' | 'armure' | 'bijou', rarity, …filtres }.
// Filtres possibles (chacun optionnel, tiré au hasard s'il est omis) :
//   arme   : weaponType, primary
//   armure : slotType (pièce d'armure ou 'bouclier'), armorType, primary
//   bijou  : slotType ('anneau' | 'collier'), primary
// Un légendaire est tiré parmi les légendaires de la catégorie qui respectent les filtres.

export const CRAFT_FILTERS = {
  arme: ['weaponType', 'primary'],
  armure: ['slotType', 'armorType', 'primary'],
  bijou: ['slotType', 'primary'],
};

const PRIMARIES = ['force', 'agilite', 'intelligence'];

// Valeurs proposées pour chaque filtre d'une catégorie.
export function craftOptions(kind) {
  if (kind === 'arme') return { weaponType: Object.keys(WEAPON_TYPES), primary: PRIMARIES };
  if (kind === 'bijou') return { slotType: Object.keys(JEWELS), primary: PRIMARIES };
  return { slotType: [...Object.keys(ARMOR_PIECES), 'bouclier'], armorType: Object.keys(ARMOR_TYPES), primary: PRIMARIES };
}

export function craftFilterCount(order) {
  return (CRAFT_FILTERS[order.kind] ?? []).filter((f) => order[f]).length;
}

// Coût : { kind, rarity, amount } matéria.
export function craftCost(order) {
  return { kind: order.kind, rarity: order.rarity, amount: FORGE.craftBase + FORGE.craftPerFilter * craftFilterCount(order) };
}

function legendaryKind(leg) {
  return materiaKind({ slotType: leg.slotType });
}

// Légendaires pouvant sortir d'une commande légendaire.
export function craftLegendaries(order) {
  return Object.keys(LEGENDARIES).filter((key) => {
    const leg = LEGENDARIES[key];
    return legendaryKind(leg) === order.kind && CRAFT_FILTERS[order.kind].every((f) => !order[f] || leg[f] === order[f]);
  });
}

// Pourquoi la commande est impossible (texte), ou null si elle peut être passée.
export function craftProblem(game, order) {
  if (!CRAFT_FILTERS[order.kind] || !RARITY_ORDER.includes(order.rarity)) return 'Commande invalide.';
  const options = craftOptions(order.kind);
  for (const f of CRAFT_FILTERS[order.kind]) {
    if (order[f] && !options[f].includes(order[f])) return 'Commande invalide.';
  }
  if (order.slotType === 'bouclier') {
    if (order.armorType) return "Un bouclier n'a pas de type d'armure.";
    if (order.primary && !primaryOptions({ slotType: 'bouclier' }).includes(order.primary)) return "Un bouclier ne peut pas porter d'Agilité.";
  }
  if (order.rarity === 'legendaire' && !craftLegendaries(order).length) return 'Aucun légendaire ne correspond à ces critères.';
  const { kind, rarity, amount } = craftCost(order);
  const have = game.materia[kind][rarity];
  if (have < amount) return `Il manque ${amount - have} matéria.`;
  return null;
}

// Fabrique l'objet (niveau = plus haut niveau atteint) et le range dans le sac.
// Retourne l'objet, ou null si la commande est impossible.
export function craft(game, order) {
  if (craftProblem(game, order)) return null;
  const { kind, rarity, amount } = craftCost(order);
  const level = game.dungeonLvl ?? 1;
  let item;
  if (rarity === 'legendaire') {
    item = generateItem({ level, legendary: pick(craftLegendaries(order)) });
  } else {
    const base = { slotType: order.slotType, weaponType: order.weaponType, armorType: order.armorType };
    if (kind === 'arme') {
      base.slotType = 'arme';
      base.weaponType ??= pick(Object.keys(WEAPON_TYPES));
    } else if (kind === 'bijou') {
      base.slotType ??= pick(Object.keys(JEWELS));
    } else {
      // Un type d'armure ou l'Agilité imposés excluent le bouclier.
      const shieldOk = !order.armorType && (!order.primary || primaryOptions({ slotType: 'bouclier' }).includes(order.primary));
      base.slotType ??= pick(craftOptions('armure').slotType.filter((slot) => slot !== 'bouclier' || shieldOk));
      if (base.slotType !== 'bouclier') base.armorType ??= pick(Object.keys(ARMOR_TYPES));
    }
    const primary = order.primary ?? pick(primaryOptions(base));
    item = generateItem({ level, rarity, ...base, primary });
  }
  game.materia[kind][rarity] -= amount;
  game.bag.push(item);
  return item;
}
