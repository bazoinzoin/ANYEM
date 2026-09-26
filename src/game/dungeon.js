// Donjons à étages (DESIGN_DOC §5-6) : progression, points de passage, expéditions.
//
// game.dungeons[clé] = { checkpoint, cleared }
//   checkpoint : dernier étage de boss vaincu (0 = aucun) ; une expédition peut
//                repartir de l'étage qui suit n'importe quel boss déjà vaincu.
// game.expedition = { dungeonKey, floor, canLeave, bossChoice, event, gains } | null
//   event      : événement en attente de choix (voir game/events.js), ou null
//   floor      : prochain étage à combattre
//   canLeave   : vrai au départ et juste après un boss (sinon : impossible de fuir)
//   bossChoice : vrai juste après un boss : il faut choisir entre rentrer au village
//                et continuer (continueExpedition, qui régénère l'équipe à 40 %)
//   gains    : cumul de l'expédition { gold, xp, items, materia }

import { maybeTriggerEvent } from './events.js';
import { DUNGEONS, DUNGEON_ORDER } from '../data/dungeons.js';
import { DUNGEON } from '../config.js';
import { applyVictory, applyDefeat } from './progression.js';
import { restoreParty } from './consumables.js';
import { pick } from './rng.js';

export function progressOf(game, key) {
  game.dungeons ??= {};
  game.dungeons[key] ??= { checkpoint: 0, cleared: false };
  return game.dungeons[key];
}

// Un donjon est ouvert si c'est le premier ou si le précédent est terminé.
export function isUnlocked(game, key) {
  const i = DUNGEON_ORDER.indexOf(key);
  return i === 0 || progressOf(game, DUNGEON_ORDER[i - 1]).cleared;
}

export function tierOf(key, floor) {
  return Math.floor((floor - 1) / DUNGEONS[key].bossEvery);
}

export function isBossFloor(key, floor) {
  return floor % DUNGEONS[key].bossEvery === 0;
}

// Niveau des ennemis : de minLevel (étage 1) à maxLevel (dernier étage).
export function floorLevel(key, floor) {
  const d = DUNGEONS[key];
  return d.minLevel + Math.round(((floor - 1) * (d.maxLevel - d.minLevel)) / (d.floors - 1));
}

// Composition d'un étage : { enemies: [clés], boss, final }.
export function encounterFor(key, floor) {
  const d = DUNGEONS[key];
  const tier = tierOf(key, floor);
  const byTier = (list) => list[Math.min(tier, list.length - 1)];
  const randomFoes = (n) => Array.from({ length: n }, () => pick(d.pool));
  if (isBossFloor(key, floor)) {
    return { enemies: [d.bosses[tier], ...randomFoes(byTier(DUNGEON.bossAddsByTier))], boss: true, final: floor === d.floors };
  }
  return { enemies: randomFoes(byTier(DUNGEON.enemiesByTier)), boss: false, final: false };
}

// Étages de départ possibles : 1, puis l'étage qui suit chaque boss déjà vaincu.
export function startFloors(game, key) {
  const d = DUNGEONS[key];
  const { checkpoint } = progressOf(game, key);
  const floors = [];
  for (let f = 1; f <= Math.min(checkpoint + 1, d.floors); f += d.bossEvery) floors.push(f);
  return floors;
}

export function startExpedition(game, key, floor = 1) {
  if (!isUnlocked(game, key) || !startFloors(game, key).includes(floor)) return false;
  game.expedition = { dungeonKey: key, floor, canLeave: true, bossChoice: false, gains: { gold: 0, xp: 0, items: 0, materia: 0 } };
  return true;
}

// Paramètres du combat de l'étage courant (pour createCombat).
export function floorCombat(game) {
  const { dungeonKey, floor } = game.expedition;
  const d = DUNGEONS[dungeonKey];
  const { enemies, boss } = encounterFor(dungeonKey, floor);
  return {
    enemies,
    level: floorLevel(dungeonKey, floor),
    title: `${d.name} — étage ${floor}/${d.floors}${boss ? ' — BOSS' : ''}`,
  };
}

/**
 * Étage gagné : récompenses, point de passage si c'était un boss, étage suivant.
 * Si c'était le dernier étage, le donjon est terminé et l'expédition s'achève.
 * Retourne le résultat d'applyVictory, plus { boss, cleared, unlocked }.
 */
export function winFloor(game, combat) {
  const exp = game.expedition;
  const key = exp.dungeonKey;
  const { boss, final } = encounterFor(key, exp.floor);
  const result = applyVictory(game, { level: combat.level, enemies: combat.enemies, final });
  exp.gains.gold += result.gold;
  exp.gains.xp += result.xp;
  exp.gains.items += result.loot.length;
  exp.gains.materia = (exp.gains.materia ?? 0) + result.materia.reduce((sum, m) => sum + m.amount, 0);
  const progress = progressOf(game, key);
  let cleared = false;
  let unlocked = null;
  if (boss) progress.checkpoint = Math.max(progress.checkpoint, exp.floor);
  if (final) {
    cleared = true;
    progress.cleared = true;
    unlocked = DUNGEON_ORDER[DUNGEON_ORDER.indexOf(key) + 1] ?? null;
    game.expedition = null;
  } else {
    exp.floor++;
    exp.canLeave = boss;
    exp.bossChoice = boss;
  }
  // Après un combat ordinaire : peut-être un événement (voir game/events.js).
  const event = !boss && game.expedition ? maybeTriggerEvent(game, combat.level) : null;
  return { ...result, boss, cleared, unlocked, event };
}

// Défaite : pertes habituelles (or, une partie du sac) et fin de l'expédition.
// La progression reste au dernier boss vaincu.
export function loseExpedition(game) {
  game.expedition = null;
  return applyDefeat(game);
}

// Le combat de l'étage suivant peut-il commencer ? (Pas tant qu'un choix d'après-boss
// ou un événement est en attente.)
export function canFightNextFloor(game) {
  return !!game.expedition && !game.expedition.bossChoice && !game.expedition.event && game.party.some((h) => h.alive);
}

// Après un boss : continuer le donjon. L'équipe (héros en vie) récupère 40 % de
// ses PV et de sa ressource, et ne pourra plus rentrer avant le boss suivant.
export function continueExpedition(game) {
  const exp = game.expedition;
  if (!exp?.bossChoice) return false;
  restoreParty(game.party, DUNGEON.continueRegenPct);
  exp.bossChoice = false;
  exp.canLeave = false;
  return true;
}

// Fuite par la Corde d'évasion : fin de l'expédition sans perte.
export function escapeExpedition(game) {
  game.expedition = null;
}

export function leaveExpedition(game) {
  if (!game.expedition?.canLeave) return false;
  game.expedition = null;
  return true;
}
