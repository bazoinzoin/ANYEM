// Auberge : recrutement de compagnons et gestion de l'équipe.
//
// L'équipe (game.party) compte toujours 4 héros. Recruter un compagnon (niveau 1,
// équipement de départ de sa classe) le fait entrer à la place d'un membre de
// l'équipe, qui part se reposer à l'auberge (game.reserve) avec son équipement et
// ses talents. Les héros de l'auberge ne gagnent pas d'XP (seule l'équipe combat).
// Tout se fait au village, jamais pendant une expédition.

import { CLASSES } from '../data/classes.js';
import { createHero, restoreFully } from './party.js';

export function reserveOf(game) {
  if (!game.reserve) game.reserve = [];
  return game.reserve;
}

// Raison pour laquelle l'équipe ne peut pas être modifiée maintenant, ou null.
export function rosterLockedReason(game) {
  return game.expedition ? "Impossible pendant une expédition : revenez d'abord au village." : null;
}

/**
 * Recrute un compagnon de classe `classKey` à la place du héros `replaceIndex`
 * de l'équipe ; le héros remplacé part à l'auberge. Retourne le nouveau héros, ou
 * null si c'est impossible.
 */
export function recruit(game, classKey, name, replaceIndex) {
  if (rosterLockedReason(game) || !CLASSES[classKey] || !game.party[replaceIndex]) return null;
  const hero = createHero(classKey, name?.trim());
  const [leaving] = game.party.splice(replaceIndex, 1, hero);
  restoreFully(leaving);
  reserveOf(game).push(leaving);
  return hero;
}

// Échange le héros `partyIndex` de l'équipe avec le héros `reserveIndex` de l'auberge.
export function swapWithReserve(game, partyIndex, reserveIndex) {
  const reserve = reserveOf(game);
  if (rosterLockedReason(game) || !game.party[partyIndex] || !reserve[reserveIndex]) return false;
  const leaving = game.party[partyIndex];
  restoreFully(leaving);
  game.party[partyIndex] = reserve[reserveIndex];
  reserve[reserveIndex] = leaving;
  return true;
}
