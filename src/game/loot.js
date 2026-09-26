// Butin de fin de combat. Pour chaque ennemi vaincu, trois tirages indépendants :
// équipement, matéria et consommable (voir LOOT dans config.js).

import { LOOT } from '../config.js';
import { CONSUMABLES } from '../data/consumables.js';
import { MATERIA_KINDS } from '../data/items.js';
import { generateItem, weightedPick } from './items.js';
import { random, pick } from './rng.js';

const between = ({ min, max }) => min + Math.floor(random() * (max - min + 1));

const CONSUMABLE_DROP_WEIGHTS = Object.fromEntries(
  Object.entries(CONSUMABLES).filter(([, c]) => c.drop > 0).map(([k, c]) => [k, c.drop]));

function addMateria(list, kind, rarity, amount) {
  const same = list.find((m) => m.kind === kind && m.rarity === rarity);
  if (same) same.amount += amount;
  else list.push({ kind, rarity, amount });
}

/**
 * Butin d'une victoire contre `enemies` (unités de combat) au niveau `level`.
 * - Équipement : chance par ennemi ordinaire ; garanti et plus rare pour un boss
 *   (un de plus pour le boss final, `final`).
 * - Matéria : chance par ennemi (garanties et plus rares pour un boss), type
 *   d'arme ou d'armure au hasard, raretés moins rares que l'équipement.
 * - Consommable : chance par ennemi (plus forte pour un boss), tiré selon son poids.
 * Retourne { items: [objets], materia: [{ kind, rarity, amount }], consumables: [clés] }.
 */
export function rollLoot(level, enemies, { final = false } = {}) {
  const loot = { items: [], materia: [], consumables: [] };
  const kinds = Object.keys(MATERIA_KINDS);
  for (const enemy of enemies) {
    if (enemy.boss) {
      const drops = LOOT.bossDrops + (final ? 1 : 0);
      for (let i = 0; i < drops; i++) loot.items.push(generateItem({ level, rarity: weightedPick(LOOT.bossRarityWeights) }));
      addMateria(loot.materia, pick(kinds), weightedPick(LOOT.bossMateriaRarityWeights), between(LOOT.bossMateriaAmount));
    } else {
      if (random() < LOOT.dropChance) loot.items.push(generateItem({ level }));
      if (random() < LOOT.materiaChance) {
        addMateria(loot.materia, pick(kinds), weightedPick(LOOT.materiaRarityWeights), between(LOOT.materiaAmount));
      }
    }
    if (random() < (enemy.boss ? LOOT.bossConsumableChance : LOOT.consumableChance)) {
      loot.consumables.push(weightedPick(CONSUMABLE_DROP_WEIGHTS));
    }
  }
  return loot;
}
