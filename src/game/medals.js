// Médailles de zone : battre le dernier boss d'une zone dans une difficulté à partir de
// MEDALS.from (Horreur) donne la médaille de cette zone pour cette difficulté.
// Stockées dans la progression du donjon : game.dungeons[zone].medals = [difficultés].
// Rang : 0 pour la première difficulté à médaille, puis +1 par difficulté ; la dernière
// (la plus difficile) est la médaille « majeure ». Toute difficulté ajoutée à la fin de
// DIFFICULTIES reçoit ainsi sa médaille sans autre changement.

import { DIFFICULTY_ORDER, MEDALS } from '../config.js';

// Difficultés qui donnent une médaille, de la plus facile à la plus difficile.
export function medalDifficulties() {
  const from = DIFFICULTY_ORDER.indexOf(MEDALS.from);
  return from < 0 ? [] : DIFFICULTY_ORDER.slice(from);
}

// Rang d'une médaille : { rank, count, major } (null si la difficulté n'en donne pas).
export function medalRank(difficulty) {
  const list = medalDifficulties();
  const rank = list.indexOf(difficulty);
  if (rank < 0) return null;
  return { rank, count: list.length, major: rank === list.length - 1 };
}

export function hasMedal(game, zone, difficulty) {
  return !!game.dungeons?.[zone]?.medals?.includes(difficulty);
}

// Médailles d'une zone, dans l'ordre des difficultés : [{ difficulty, won, rank, count, major }].
export function zoneMedals(game, zone) {
  return medalDifficulties().map((difficulty) => ({ difficulty, won: hasMedal(game, zone, difficulty), ...medalRank(difficulty) }));
}

// Dernier boss d'une zone vaincu : donne la médaille si la difficulté en offre une et
// qu'elle n'est pas déjà gagnée. Retourne la difficulté de la médaille gagnée, ou null.
export function awardMedal(game, zone, difficulty) {
  if (!medalRank(difficulty) || hasMedal(game, zone, difficulty)) return null;
  game.dungeons ??= {};
  game.dungeons[zone] ??= { checkpoint: 0, cleared: false };
  const progress = game.dungeons[zone];
  progress.medals = [...(progress.medals ?? []), difficulty];
  return difficulty;
}
