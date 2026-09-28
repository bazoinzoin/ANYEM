// Marchand : revente du butin, achat de consommables et d'équipement.
// Chaque fonction retourne false (sans rien modifier) si l'opération est impossible.

import { MERCHANT } from '../config.js';
import { CONSUMABLES } from '../data/consumables.js';
import { generateItem, weightedPick } from './items.js';
import { addConsumable, countOf } from './consumables.js';
import { playerLevel } from './party.js';

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

// Prix d'un consommable pour un joueur de niveau `level` (voir MERCHANT, config.js).
export function consumablePriceAt(key, level) {
  return Math.round(CONSUMABLES[key].price * MERCHANT.consumableMult * (1 + MERCHANT.consumablePerLevel * (Math.max(1, level) - 1)));
}

export function consumablePrice(game, key) {
  return consumablePriceAt(key, playerLevel(game));
}

export function canBuyConsumable(game, key) {
  return game.gold >= consumablePrice(game, key) && countOf(game.consumables, key) < MERCHANT.maxConsumable;
}

export function buyConsumable(game, key) {
  if (!canBuyConsumable(game, key)) return false;
  game.gold -= consumablePrice(game, key);
  addConsumable(game.consumables, key);
  return true;
}
