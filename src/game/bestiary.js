// Bestiaire : ennemis rencontrés et vaincus.
//
// game.bestiary = { clé d'ennemi: { seen: combats où il est apparu, kills: nombre de vaincus } }
// Un ennemi jamais rencontré n'a pas d'entrée (page vide au bestiaire).

import { ENEMIES } from '../data/enemies.js';
import { DUNGEONS, DUNGEON_ORDER } from '../data/dungeons.js';

export function bestiaryOf(game) {
  game.bestiary ??= {};
  return game.bestiary;
}

function entry(game, key) {
  const book = bestiaryOf(game);
  book[key] ??= { seen: 0, kills: 0 };
  return book[key];
}

// Début d'un combat : chaque sorte d'ennemi présente est notée une fois.
export function recordEncounter(game, keys) {
  for (const key of new Set(keys)) if (ENEMIES[key]) entry(game, key).seen++;
}

// Fin d'un combat : compte les ennemis vaincus.
export function recordKills(game, enemies) {
  for (const e of enemies) if (!e.alive && ENEMIES[e.enemyKey]) entry(game, e.enemyKey).kills++;
}

export function isDiscovered(game, key) {
  return !!bestiaryOf(game)[key]?.seen;
}

// Pages du bestiaire, par donjon : [{ dungeonKey, enemies: [clés] }] (ordinaires puis boss).
export function bestiaryPages() {
  return DUNGEON_ORDER.map((dungeonKey) => ({
    dungeonKey,
    enemies: [...DUNGEONS[dungeonKey].pool, ...DUNGEONS[dungeonKey].bosses],
  }));
}

// Niveaux où l'on croise l'ennemi dans la zone : { minLevel, maxLevel } des sous-zones
// qui le contiennent, ou null.
export function levelRange(dungeonKey, enemyKey) {
  const subs = DUNGEONS[dungeonKey].subzones.filter((s) =>
    s.boss === enemyKey || s.pool.includes(enemyKey) || s.elites?.includes(enemyKey));
  if (!subs.length) return null;
  return { minLevel: Math.min(...subs.map((s) => s.minLevel)), maxLevel: Math.max(...subs.map((s) => s.maxLevel)) };
}

// Nombre d'ennemis découverts / total.
export function bestiaryProgress(game) {
  const all = bestiaryPages().flatMap((p) => p.enemies);
  return { found: all.filter((k) => isDiscovered(game, k)).length, total: all.length };
}
