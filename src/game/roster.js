// Auberge : recrutement de compagnons et gestion de l'équipe.
//
// L'équipe (game.party) compte toujours 4 héros. Recruter un compagnon (niveau 1,
// équipement de départ de sa classe) le fait entrer à la place d'un membre de
// l'équipe, qui part se reposer à l'auberge (game.reserve) avec son équipement et
// ses talents. Les héros de l'auberge ne gagnent pas d'XP (seule l'équipe combat).
// Tout se fait au village, jamais pendant une expédition.

import { INN } from '../config.js';
import { CLASSES } from '../data/classes.js';
import { createHero, restoreFully } from './party.js';
import { equippedItems } from './equipment.js';

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
export function recruit(game, classKey, name, replaceIndex, feminine = false) {
  if (recruitProblem(game) || !CLASSES[classKey] || !game.party[replaceIndex]) return null;
  const hero = createHero(classKey, name?.trim(), null, feminine);
  const [leaving] = game.party.splice(replaceIndex, 1, hero);
  restoreFully(leaving);
  reserveOf(game).push(leaving);
  return hero;
}

// Pourquoi on ne peut pas recruter maintenant (texte), ou null.
export function recruitProblem(game) {
  const locked = rosterLockedReason(game);
  if (locked) return locked;
  if (reserveOf(game).length >= INN.maxReserve) {
    return `L'auberge est pleine (${INN.maxReserve} compagnons au repos) : renvoie d'abord un compagnon.`;
  }
  return null;
}

// Ce que deviendrait l'équipement d'un compagnon renvoyé :
// { destroyed: objets communs (perdus), returned: autres objets (rendus au sac) }.
export function dismissOutcome(hero) {
  const items = [...new Set(equippedItems(hero))];
  return {
    destroyed: items.filter((i) => i.rarity === 'commun'),
    returned: items.filter((i) => i.rarity !== 'commun'),
  };
}

// Renvoie définitivement le compagnon `reserveIndex` de l'auberge. Ses objets communs
// sont détruits, les autres rendus au sac. Retourne { hero, destroyed, returned }, ou null.
export function dismiss(game, reserveIndex) {
  const reserve = reserveOf(game);
  if (rosterLockedReason(game) || !reserve[reserveIndex]) return null;
  const [hero] = reserve.splice(reserveIndex, 1);
  const outcome = dismissOutcome(hero);
  game.bag.push(...outcome.returned);
  for (const slot of Object.keys(hero.equipment)) hero.equipment[slot] = null;
  return { hero, ...outcome };
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
