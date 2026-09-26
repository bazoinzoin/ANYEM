// Runomancien : relance une stat secondaire choisie d'un objet (nouvelle stat
// et nouvelle valeur, tirées comme au butin), contre de l'or selon la rareté.

import { RUNES } from '../config.js';
import { RARITIES, SECONDARY_STATS, SHIELD } from '../data/items.js';
import { secondaryValue } from './items.js';
import { pick } from './rng.js';

// Prix d'une relance, ou null si l'objet n'a pas de secondaire.
export function rerollCost(item) {
  if (!Object.keys(item.bonus ?? {}).length) return null;
  return RUNES.price[item.rarity] ?? null;
}

// Stats pouvant remplacer `stat` : jamais une stat déjà présente sur l'objet
// (sauf le Blocage d'un bouclier), mais la stat relancée peut ressortir avec une autre valeur.
export function rerollPool(item, stat) {
  const repeatable = item.slotType === 'bouclier' ? SHIELD.repeatableSecondaries : [];
  const others = Object.keys(item.bonus).filter((k) => k !== stat);
  return Object.keys(SECONDARY_STATS).filter((k) =>
    k === stat || (!others.includes(k) && (!(k in item.stats) || repeatable.includes(k))));
}

// Pourquoi la relance est impossible (texte), ou null.
export function rerollProblem(game, item, stat) {
  if (!(stat in (item.bonus ?? {}))) return "Cette stat n'est pas une stat secondaire de l'objet.";
  const cost = rerollCost(item);
  if (game.gold < cost) return `Il manque ${cost - game.gold} pièces d'or.`;
  return null;
}

// Relance la secondaire `stat` (l'ordre des lignes est conservé).
// Retourne { from: { stat, value }, to: { stat, value } }, ou null si impossible.
export function rerollSecondary(game, item, stat) {
  if (rerollProblem(game, item, stat)) return null;
  game.gold -= rerollCost(item);
  const from = { stat, value: item.bonus[stat] };
  const newStat = pick(rerollPool(item, stat));
  const to = { stat: newStat, value: secondaryValue(newStat, item.level, RARITIES[item.rarity].range) };
  item.bonus = Object.fromEntries(Object.entries(item.bonus).map(([k, v]) => (k === stat ? [newStat, to.value] : [k, v])));
  return { from, to };
}
