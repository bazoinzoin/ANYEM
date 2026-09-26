// Butin de fin de combat.

import { LOOT } from '../config.js';
import { generateItem, weightedPick } from './items.js';
import { random } from './rng.js';

/**
 * Butin d'une victoire contre `enemies` (unités de combat) au niveau `level` :
 * chaque ennemi ordinaire a une chance de laisser un objet ; chaque boss laisse
 * des objets garantis, plus rares (un de plus pour le boss final, `final`).
 */
export function rollLoot(level, enemies, { final = false } = {}) {
  const loot = [];
  for (const enemy of enemies) {
    if (enemy.boss) {
      const drops = LOOT.bossDrops + (final ? 1 : 0);
      for (let i = 0; i < drops; i++) loot.push(generateItem({ level, rarity: weightedPick(LOOT.bossRarityWeights) }));
    } else if (random() < LOOT.dropChance) {
      loot.push(generateItem({ level }));
    }
  }
  return loot;
}
