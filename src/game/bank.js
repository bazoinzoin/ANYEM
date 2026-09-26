// Banque du village : met à l'abri l'or, les objets, les consommables et les
// matéria (le sac, lui, peut être perdu en partie lors d'une défaite).
//
// game.bank = { gold, items: [objets], consumables: { clé: n }, materia: { kind: { rareté: n } } }
// Dépôts et retraits au village uniquement (jamais pendant une expédition).
// Le sac ne peut pas porter plus de MERCHANT.maxConsumable exemplaires d'un
// consommable ; la banque n'a pas de limite.

import { MERCHANT } from '../config.js';
import { emptyMateria } from './forge.js';
import { countOf } from './consumables.js';

export function bankOf(game) {
  if (!game.bank) game.bank = { gold: 0, items: [], consumables: {}, materia: emptyMateria() };
  return game.bank;
}

const closed = (game) => !!game.expedition;

// Or : `amount` pièces du sac vers la banque (négatif : retrait).
export function moveGold(game, amount) {
  const bank = bankOf(game);
  const n = Math.trunc(amount);
  if (closed(game) || !n || (n > 0 && n > game.gold) || (n < 0 && -n > bank.gold)) return false;
  game.gold -= n;
  bank.gold += n;
  return true;
}

export function depositItem(game, itemId) {
  const i = game.bag.findIndex((it) => it.id === itemId);
  if (closed(game) || i < 0) return false;
  bankOf(game).items.push(...game.bag.splice(i, 1));
  return true;
}

export function withdrawItem(game, itemId) {
  const bank = bankOf(game);
  const i = bank.items.findIndex((it) => it.id === itemId);
  if (closed(game) || i < 0) return false;
  game.bag.push(...bank.items.splice(i, 1));
  return true;
}

// Consommables : `amount` exemplaires du sac vers la banque (négatif : retrait,
// limité par la place dans le sac).
export function moveConsumable(game, key, amount) {
  const bank = bankOf(game);
  const inBag = countOf(game.consumables, key);
  const inBank = countOf(bank.consumables, key);
  if (closed(game) || !amount) return false;
  if (amount > 0 && amount > inBag) return false;
  if (amount < 0 && (-amount > inBank || inBag - amount > MERCHANT.maxConsumable)) return false;
  game.consumables[key] = inBag - amount;
  bank.consumables[key] = inBank + amount;
  return true;
}

// Matéria : `amount` du sac vers la banque (négatif : retrait).
export function moveMateria(game, kind, rarity, amount) {
  const bank = bankOf(game);
  const inBag = game.materia[kind]?.[rarity] ?? 0;
  const inBank = bank.materia[kind]?.[rarity] ?? 0;
  if (closed(game) || !amount || (amount > 0 && amount > inBag) || (amount < 0 && -amount > inBank)) return false;
  game.materia[kind][rarity] = inBag - amount;
  bank.materia[kind][rarity] = inBank + amount;
  return true;
}
