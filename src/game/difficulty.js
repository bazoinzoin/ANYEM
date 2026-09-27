// Difficulté de la partie (voir DIFFICULTIES dans config.js) : puissance des
// ennemis et règles de butin. Se change au village, jamais pendant une expédition.

import { DIFFICULTIES, LOOT, XP } from '../config.js';

export function difficultyOf(game) {
  return DIFFICULTIES[game?.difficulty] ? game.difficulty : 'balade';
}

export function setDifficulty(game, key) {
  if (!DIFFICULTIES[key] || game.expedition) return false;
  game.difficulty = key;
  return true;
}

// Multiplicateur des PV et de l'attaque des ennemis.
export function enemyPower(key) {
  return DIFFICULTIES[key]?.power ?? 1;
}

// Niveau des ennemis : celui de l'étage, ou le niveau maximum (Horreur et au-delà).
export function difficultyLevel(key, level) {
  return DIFFICULTIES[key]?.maxLevel ? XP.maxLevel : level;
}

// Règles de butin de la difficulté (LOOT, avec ses valeurs remplacées).
export function lootRules(key) {
  return { ...LOOT, ...(DIFFICULTIES[key]?.loot ?? {}) };
}
