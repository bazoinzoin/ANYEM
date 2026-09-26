// Forge : décraft des objets en matéria et amélioration de +1 à +5.
//
// game.materia : { arme: { commun: n, peuCommun: n, … }, armure: { … } }

import { FORGE } from '../config.js';
import { RARITY_ORDER, MATERIA_KINDS } from '../data/items.js';
import { isWeapon } from './items.js';
import { random } from './rng.js';

export function emptyMateria() {
  return Object.fromEntries(Object.keys(MATERIA_KINDS).map((kind) =>
    [kind, Object.fromEntries(RARITY_ORDER.map((r) => [r, 0]))]));
}

export function materiaKind(item) {
  return isWeapon(item) ? 'arme' : 'armure';
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
