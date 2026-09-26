// Conséquences d'un combat et services du village sur l'état global du jeu.
// Chaque fonction modifie `game` et retourne ce qu'il faut afficher au village :
// { message, loot? }.

import { REWARDS, LOOT, XP } from '../config.js';
import { ENEMIES } from '../data/enemies.js';
import { getStats, restoreFully, gainXp } from './party.js';
import { heal } from './units.js';
import { rollLoot } from './loot.js';
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

/**
 * Victoire contre `enemies` (unités du combat) au niveau `level` : or, butin,
 * même XP pour chaque héros (tombés compris), petit soin des survivants.
 * Retourne { message, loot, gold, xp, levelUps }.
 */
export function applyVictory(game, { level, enemies, final = false }) {
  const gold = goldReward(level, enemies);
  const xp = xpReward(level, enemies);
  const loot = rollLoot(level, enemies, { final });
  const levelUps = game.party.filter((hero) => gainXp(hero, xp) > 0);
  game.gold += gold;
  game.bag.push(...loot);
  game.dungeonLvl = Math.max(game.dungeonLvl, level);
  for (const hero of game.party) {
    if (hero.alive) heal(hero, Math.round(getStats(hero).pv * REWARDS.victoryHealPct));
  }
  const lootText = loot.length ? ` Butin : ${loot.length} objet${loot.length > 1 ? 's' : ''}, rangé${loot.length > 1 ? 's' : ''} dans le sac.` : '';
  const levelText = levelUps.length
    ? ` Niveau supérieur : ${levelUps.map((h) => `${h.name} (niv. ${h.level})`).join(', ')} — de nouveaux points de talent sont disponibles !`
    : '';
  return { message: `Victoire ! ${gold} pièces d'or et ${xp} XP.${lootText}${levelText}`, loot, gold, xp, levelUps };
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
