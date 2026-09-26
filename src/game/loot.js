// Butin de fin de combat.

import { LOOT } from '../config.js';
import { generateItem } from './items.js';
import { random } from './rng.js';

// Chaque ennemi vaincu a une chance de laisser un objet du niveau du donjon.
export function rollLoot(level, enemiesDefeated) {
  const loot = [];
  for (let i = 0; i < enemiesDefeated; i++) {
    if (random() < LOOT.dropChance) loot.push(generateItem({ level }));
  }
  return loot;
}
