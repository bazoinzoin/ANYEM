// Conséquences d'un combat et services du village sur l'état global du jeu.
// Chaque fonction modifie `game` et retourne ce qu'il faut afficher au village :
// { message, loot? }.

import { REWARDS, LOOT } from '../config.js';
import { getStats, restoreFully } from './party.js';
import { heal } from './units.js';
import { rollLoot } from './loot.js';
import { random } from './rng.js';

export function applyVictory(game, { enemiesDefeated = 0 } = {}) {
  const gold = REWARDS.goldBase + game.dungeonLvl * REWARDS.goldPerLevel;
  const loot = rollLoot(game.dungeonLvl, enemiesDefeated);
  game.gold += gold;
  game.bag.push(...loot);
  game.dungeonLvl++;
  for (const hero of game.party) {
    if (hero.alive) heal(hero, Math.round(getStats(hero).pv * REWARDS.victoryHealPct));
  }
  const lootText = loot.length ? ` Butin : ${loot.length} objet${loot.length > 1 ? 's' : ''}, rangé${loot.length > 1 ? 's' : ''} dans le sac.` : '';
  return { message: `Victoire ! Vous rapportez ${gold} pièces d'or.${lootText} Le prochain passage est plus dangereux.`, loot };
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
