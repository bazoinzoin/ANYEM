// Donjons à étages (DESIGN_DOC §5-6) : progression, points de passage, expéditions.
//
// game.dungeons[clé] = { checkpoint, cleared }
//   checkpoint : dernier étage de boss vaincu (0 = aucun) ; une expédition peut
//                repartir de l'étage qui suit n'importe quel boss déjà vaincu.
// game.expedition = { dungeonKey, floor, map, engaged, canLeave, bossChoice, event, gains } | null
//   floor      : étage en cours d'exploration
//   map        : carte de l'étage (voir game/floorMap.js) : le groupe s'y déplace case par
//                case, les monstres visibles bougent à chaque pas, toucher un groupe de
//                monstres lance le combat, l'échelle mène à l'étage suivant
//   engaged    : id du groupe de monstres combattu (combat en cours), ou null
//   event      : événement en attente de choix (voir game/events.js), ou null
//   canLeave   : vrai au départ et juste après un boss (sinon : impossible de fuir)
//   bossChoice : vrai juste après un boss : il faut choisir entre rentrer au village
//                et continuer (continueExpedition, qui régénère l'équipe à 40 %)
//   gains    : cumul de l'expédition { gold, xp, items, materia }

import { rollEvent, rollEventKey } from './events.js';
import { generateFloorMap, reveal, moveMobs, mobAt, isFloor } from './floorMap.js';
import { difficultyOf, enemyPower, difficultyLevel } from './difficulty.js';
import { DUNGEONS, DUNGEON_ORDER, FLOORS_PER_SUBZONE } from '../data/dungeons.js';
import { DUNGEON } from '../config.js';
import { applyVictory, applyDefeat } from './progression.js';
import { recordKills } from './bestiary.js';
import { restoreParty } from './consumables.js';
import { pick, random } from './rng.js';

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

// Sous-zone d'un étage (voir data/dungeons.js).
export function subzoneOf(key, floor) {
  return DUNGEONS[key].subzones[tierOf(key, floor)];
}

// Étage dans sa sous-zone : 1 à FLOORS_PER_SUBZONE (le dernier est celui du boss).
export function floorInSubzone(floor) {
  return ((floor - 1) % FLOORS_PER_SUBZONE) + 1;
}

// Niveau des ennemis : de minLevel (1er étage de la sous-zone) à maxLevel (étage du boss).
export function floorLevel(key, floor) {
  const { minLevel, maxLevel } = subzoneOf(key, floor);
  const step = (floor - 1) % FLOORS_PER_SUBZONE;
  return minLevel + Math.round((step * (maxLevel - minLevel)) / (FLOORS_PER_SUBZONE - 1));
}

// Niveau des ennemis d'un étage pour la difficulté de la partie.
export function expeditionLevel(game, key, floor) {
  return difficultyLevel(difficultyOf(game), floorLevel(key, floor));
}

// Composition d'une rencontre de l'étage : { enemies: [clés], boss, final }.
// À l'étage d'un boss : le boss et ses acolytes (sauf `ordinary`).
export function encounterFor(key, floor, opts = {}) {
  const d = DUNGEONS[key];
  const tier = tierOf(key, floor);
  const byTier = (list) => list[Math.min(tier, list.length - 1)];
  const sub = subzoneOf(key, floor);
  // Un ennemi ordinaire est parfois remplacé par un élite de la sous-zone.
  const foe = () => (sub.elites?.length && random() < DUNGEON.eliteChance ? pick(sub.elites) : pick(sub.pool));
  const randomFoes = (n) => Array.from({ length: n }, foe);
  if (isBossFloor(key, floor) && !opts.ordinary) {
    return { enemies: [sub.boss, ...randomFoes(byTier(DUNGEON.bossAddsByTier))], boss: true, final: floor === d.floors };
  }
  return { enemies: randomFoes(byTier(DUNGEON.enemiesByTier)), boss: false, final: false };
}

// Groupe de monstres ordinaire de l'étage (clés d'ennemis).
function ordinaryEncounter(key, floor) {
  return encounterFor(key, floor, { ordinary: true }).enemies;
}

// Étages de départ possibles : 1, puis l'étage qui suit chaque boss déjà vaincu.
export function startFloors(game, key) {
  const d = DUNGEONS[key];
  const { checkpoint } = progressOf(game, key);
  const floors = [];
  for (let f = 1; f <= Math.min(checkpoint + 1, d.floors); f += d.bossEvery) floors.push(f);
  return floors;
}

// Nombre de groupes de monstres ordinaires d'un étage : DUNGEON.fightsPerFloor
// (à l'étage d'un boss : DUNGEON.bossFloorGroups, en plus du boss).
export function fightsOnFloor(key, floor) {
  if (isBossFloor(key, floor)) return DUNGEON.bossFloorGroups;
  const { min, max } = DUNGEON.fightsPerFloor;
  return min + Math.floor(random() * (max - min + 1));
}

// Carte d'un étage : groupes de monstres (compositions tirées maintenant), boss, événements.
export function buildFloorMap(key, floor) {
  const groups = [];
  for (let n = fightsOnFloor(key, floor); n > 0; n--) groups.push({ enemies: ordinaryEncounter(key, floor) });
  if (isBossFloor(key, floor)) groups.push({ enemies: encounterFor(key, floor).enemies, boss: true });
  const events = isBossFloor(key, floor) ? 0 : DUNGEON.mapEventChances.filter((c) => random() < c).length;
  const map = generateFloorMap({ groups, events });
  // Chaque événement est connu dès la génération : il est dessiné sur la carte (coffre,
  // autel, personnage…).
  for (const e of map.events) e.key = rollEventKey();
  return map;
}

// Arrivée à un étage : nouvelle carte.
function enterFloor(exp, floor) {
  exp.floor = floor;
  exp.engaged = null;
  exp.map = buildFloorMap(exp.dungeonKey, floor);
}

export function startExpedition(game, key, floor = 1) {
  if (!isUnlocked(game, key) || !startFloors(game, key).includes(floor)) return false;
  game.expedition = { dungeonKey: key, floor, map: null, engaged: null, canLeave: true, bossChoice: false, event: null, gains: { gold: 0, xp: 0, items: 0, materia: 0 } };
  enterFloor(game.expedition, floor);
  return true;
}

// Groupe de monstres combattu (ou null).
export function engagedMob(game) {
  const exp = game.expedition;
  return exp?.map?.mobs.find((m) => m.id === exp.engaged) ?? null;
}

// Paramètres du combat contre le groupe engagé (pour createCombat).
export function floorCombat(game) {
  const { dungeonKey, floor } = game.expedition;
  const d = DUNGEONS[dungeonKey];
  const mob = engagedMob(game);
  return {
    enemies: mob.enemies,
    level: expeditionLevel(game, dungeonKey, floor),
    power: enemyPower(difficultyOf(game)),
    title: `${d.name} · ${subzoneOf(dungeonKey, floor).name} — étage ${floorInSubzone(floor)}/${FLOORS_PER_SUBZONE}${mob.boss ? ' — BOSS' : ''}`,
  };
}

// Peut-on explorer (se déplacer, combattre) ? Pas pendant un choix d'après-boss ou un
// événement en attente, ni sans héros debout.
export function canExplore(game) {
  const exp = game.expedition;
  return !!exp?.map && !exp.bossChoice && !exp.event && !exp.engaged && game.party.some((h) => h.alive);
}

/**
 * Un pas du groupe dans la direction { dx, dy } (une case). Puis les monstres bougent.
 * Retourne { moved, encounter: groupe de monstres touché (combat à lancer) | null,
 *   event: événement déclenché | null, ladder: vrai si le groupe est sur l'échelle }.
 * Toucher un groupe (en marchant dessus, ou s'il nous rattrape) l'engage : exp.engaged.
 */
export function stepParty(game, dx, dy) {
  const none = { moved: false, encounter: null, event: null, ladder: false };
  if (!canExplore(game) || Math.abs(dx) + Math.abs(dy) !== 1) return none;
  const exp = game.expedition;
  const map = exp.map;
  const x = map.party.x + dx;
  const y = map.party.y + dy;
  if (!isFloor(map, x, y)) return none;
  const target = mobAt(map, x, y);
  if (target) {
    exp.engaged = target.id;
    return { ...none, encounter: target };
  }
  map.party = { x, y };
  reveal(map);
  let event = null;
  const marker = map.events.find((e) => e.x === x && e.y === y);
  if (marker) {
    map.events = map.events.filter((e) => e !== marker);
    event = rollEvent(expeditionLevel(game, exp.dungeonKey, exp.floor), marker.key);
    exp.event = event;
  }
  const catcher = event ? null : moveMobs(map);
  if (catcher) exp.engaged = catcher.id;
  return { moved: true, encounter: catcher, event, ladder: !!map.ladder && map.ladder.x === x && map.ladder.y === y };
}

// Descendre par l'échelle (le groupe doit être dessus) : étage suivant, nouvelle carte.
export function takeLadder(game) {
  const exp = game.expedition;
  if (!canExplore(game) || !exp.map.ladder || exp.map.party.x !== exp.map.ladder.x || exp.map.party.y !== exp.map.ladder.y) return false;
  enterFloor(exp, exp.floor + 1);
  exp.canLeave = false;
  return true;
}

/**
 * Combat gagné contre le groupe engagé : récompenses, le groupe disparaît de la carte.
 * Contre un boss, l'étage est franchi : point de passage, étage suivant (choix
 * rentrer / continuer), ou fin de la zone si c'était le dernier boss.
 * Retourne le résultat d'applyVictory, plus { boss, cleared, unlocked }.
 */
export function winFight(game, combat) {
  const exp = game.expedition;
  const key = exp.dungeonKey;
  const mob = engagedMob(game);
  const boss = !!mob?.boss;
  const final = boss && exp.floor === DUNGEONS[key].floors;
  recordKills(game, combat.enemies);
  const result = applyVictory(game, { level: combat.level, enemies: combat.enemies, final });
  exp.gains.gold += result.gold;
  exp.gains.xp += result.xp;
  exp.gains.items += result.loot.length;
  exp.gains.materia = (exp.gains.materia ?? 0) + result.materia.reduce((sum, m) => sum + m.amount, 0);
  exp.map.mobs = exp.map.mobs.filter((m) => m !== mob);
  exp.engaged = null;
  let cleared = false;
  let unlocked = null;
  if (boss) {
    const progress = progressOf(game, key);
    progress.checkpoint = Math.max(progress.checkpoint, exp.floor);
    if (final) {
      cleared = true;
      progress.cleared = true;
      unlocked = DUNGEON_ORDER[DUNGEON_ORDER.indexOf(key) + 1] ?? null;
      game.expedition = null;
    } else {
      enterFloor(exp, exp.floor + 1);
      exp.canLeave = true;
      exp.bossChoice = true;
    }
  }
  return { ...result, boss, cleared, unlocked };
}

// Défaite : pertes habituelles (or, une partie du sac) et fin de l'expédition.
// La progression reste au dernier boss vaincu.
// `combat` (facultatif) : le combat perdu, pour compter les ennemis vaincus au bestiaire.
export function loseExpedition(game, combat = null) {
  if (combat) recordKills(game, combat.enemies);
  game.expedition = null;
  return applyDefeat(game);
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

export function leaveExpedition(game) {
  if (!game.expedition?.canLeave) return false;
  game.expedition = null;
  return true;
}
