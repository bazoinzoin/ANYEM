// Conséquences d'un combat et services du village sur l'état global du jeu.
// Chaque fonction modifie `game` et retourne ce qu'il faut afficher au village :
// { message, loot? }.

import { REWARDS, LOOT, XP } from '../config.js';
import { ENEMIES } from '../data/enemies.js';
import { getStats, restoreFully, gainXp } from './party.js';
import { rollLoot } from './loot.js';
import { emptyMateria } from './forge.js';
import { addConsumable } from './consumables.js';
import { CONSUMABLES } from '../data/consumables.js';
import { RARITIES, MATERIA_KINDS } from '../data/items.js';
import { random } from './rng.js';

const mult = (enemy, field) => ENEMIES[enemy.enemyKey]?.[field] ?? 1;

// XP d'une victoire (pour chaque héros) : par ennemi, (base + par niveau) × multiplicateur (boss).
export function xpReward(level, enemies) {
  return enemies.reduce((sum, e) => sum + Math.round((XP.xpBase + XP.xpPerLevel * level) * mult(e, 'xpMult')), 0);
}

export function goldReward(level, enemies) {
  const best = Math.max(1, ...enemies.map((e) => mult(e, 'goldMult')));
  return Math.round((REWARDS.goldBase + REWARDS.goldPerLevel * level) * best);
}

// « 2 × Matéria d'arme rare, 1 × Matéria d'armure commun »
function materiaText(materia) {
  return materia.map((m) => `${m.amount} × ${MATERIA_KINDS[m.kind].label} ${RARITIES[m.rarity].label.toLowerCase()}`).join(', ');
}

/**
 * Victoire contre `enemies` (unités du combat) au niveau `level` : or, butin
 * (équipement dans le sac, matéria, consommables — voir loot.js),
 * même XP pour chaque héros (tombés compris). Aucun soin : PV et ressources
 * restent tels qu'à la fin du combat.
 * Un consommable trouvé alors qu'on en porte déjà le maximum est perdu.
 * Retourne { message, loot (équipements), materia, consumables, gold, xp, levelUps }.
 */
export function applyVictory(game, { level, enemies, final = false }) {
  const gold = goldReward(level, enemies);
  const xp = xpReward(level, enemies);
  const { items: loot, materia, consumables: found } = rollLoot(level, enemies, { final });
  const levelUps = game.party.filter((hero) => gainXp(hero, xp) > 0);
  game.gold += gold;
  game.bag.push(...loot);
  game.materia ??= emptyMateria();
  for (const m of materia) game.materia[m.kind][m.rarity] += m.amount;
  game.consumables ??= {};
  const consumables = found.filter((key) => addConsumable(game.consumables, key));
  const full = found.length - consumables.length;
  game.dungeonLvl = Math.max(game.dungeonLvl, level);
  const parts = [];
  if (loot.length) parts.push(`${loot.length} équipement${loot.length > 1 ? 's' : ''} (dans le sac)`);
  if (materia.length) parts.push(materiaText(materia));
  if (consumables.length) parts.push(consumables.map((k) => `${CONSUMABLES[k].icon} ${CONSUMABLES[k].name}`).join(', '));
  if (full) parts.push(`${full} consommable${full > 1 ? 's' : ''} laissé${full > 1 ? 's' : ''} faute de place`);
  const lootText = parts.length ? ` Butin : ${parts.join(' · ')}.` : ' Aucun butin.';
  const levelText = levelUps.length
    ? ` Niveau supérieur : ${levelUps.map((h) => `${h.name} (niv. ${h.level})`).join(', ')} — de nouveaux points de talent sont disponibles !`
    : '';
  return { message: `Victoire ! ${gold} pièces d'or et ${xp} XP.${lootText}${levelText}`, loot, materia, consumables, gold, xp, levelUps };
}

// Défaite : perte d'or et d'une partie du sac (jamais de l'équipement porté).
export function applyDefeat(game) {
  const loss = Math.round(game.gold * REWARDS.defeatGoldLossPct);
  game.gold -= loss;
  const lost = game.bag.filter(() => random() < LOOT.defeatBagLossChance);
  game.bag = game.bag.filter((item) => !lost.includes(item));
  for (const hero of game.party) {
    restoreFully(hero);
    hero.hp = Math.round(getStats(hero).pv * REWARDS.defeatHpPct);
  }
  const lostText = lost.length ? ` et ${lost.length} objet${lost.length > 1 ? 's' : ''} du sac` : '';
  return { message: `Votre équipe est vaincue et regagne le village de justesse, ayant perdu ${loss} pièces d'or${lostText}.` };
}

// Auberge : soin complet de toute l'équipe, héros tombés compris.
export function restAtInn(game) {
  game.party.forEach(restoreFully);
  return { message: "Vous vous reposez à l'auberge. Équipe entièrement soignée." };
}
