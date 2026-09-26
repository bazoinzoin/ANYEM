// Marchand : revente du butin, achat de consommables et d'équipement.
// Chaque fonction retourne false (sans rien modifier) si l'opération est impossible.

import { MERCHANT } from '../config.js';
import { CONSUMABLES } from '../data/consumables.js';
import { generateItem, weightedPick } from './items.js';
import { addConsumable, countOf } from './consumables.js';

export function sellPrice(item) {
  const base = MERCHANT.sellBase + MERCHANT.sellPerLevel * item.level;
  return Math.max(1, Math.round(base * MERCHANT.sellRarityMult[item.rarity] * (1 + MERCHANT.sellPerPlus * (item.plus ?? 0))));
}

export function buyPrice(item) {
  return sellPrice(item) * MERCHANT.buyMarkup;
}

// Vend un objet du sac (jamais un objet porté).
export function sell(game, item) {
  const index = game.bag.indexOf(item);
  if (index === -1) return false;
  game.bag.splice(index, 1);
  game.gold += sellPrice(item);
  return true;
}

// Stock d'équipement : renouvelé quand le niveau du donjon change.
export function ensureStock(game) {
  if (game.shop?.level === game.dungeonLvl) return game.shop.stock;
  const stock = [];
  for (let i = 0; i < MERCHANT.stockSize; i++) {
    stock.push(generateItem({ level: game.dungeonLvl, rarity: weightedPick(MERCHANT.stockRarityWeights) }));
  }
  game.shop = { level: game.dungeonLvl, stock };
  return stock;
}

// Achète un objet du stock : il rejoint le sac.
export function buyItem(game, item) {
  const stock = ensureStock(game);
  const index = stock.indexOf(item);
  const price = buyPrice(item);
  if (index === -1 || game.gold < price) return false;
  stock.splice(index, 1);
  game.gold -= price;
  game.bag.push(item);
  return true;
}

export function canBuyConsumable(game, key) {
  return game.gold >= CONSUMABLES[key].price && countOf(game.consumables, key) < MERCHANT.maxConsumable;
}

export function buyConsumable(game, key) {
  if (!canBuyConsumable(game, key)) return false;
  addConsumable(game.consumables, key);
  game.gold -= CONSUMABLES[key].price;
  return true;
}
