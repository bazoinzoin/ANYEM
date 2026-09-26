// Conséquences d'un combat et services du village sur l'état global du jeu.
// Chaque fonction modifie `game` et retourne le message à afficher au village.

import { REWARDS } from '../config.js';
import { getStats, restoreFully } from './party.js';
import { heal } from './units.js';

export function applyVictory(game) {
  const gold = REWARDS.goldBase + game.dungeonLvl * REWARDS.goldPerLevel;
  game.gold += gold;
  game.dungeonLvl++;
  for (const hero of game.party) {
    if (hero.alive) heal(hero, Math.round(getStats(hero).pv * REWARDS.victoryHealPct));
  }
  return `Victoire ! Vous rapportez ${gold} pièces d'or. Le prochain passage est plus dangereux.`;
}

export function applyDefeat(game) {
  const loss = Math.round(game.gold * REWARDS.defeatGoldLossPct);
  game.gold -= loss;
  for (const hero of game.party) {
    restoreFully(hero);
    hero.hp = Math.round(getStats(hero).pv * REWARDS.defeatHpPct);
  }
  return `Votre équipe est vaincue et regagne le village de justesse, ayant perdu ${loss} pièces d'or.`;
}

// Auberge : soin complet de toute l'équipe, héros tombés compris.
export function restAtInn(game) {
  game.party.forEach(restoreFully);
  return "Vous vous reposez à l'auberge. Équipe entièrement soignée.";
}
