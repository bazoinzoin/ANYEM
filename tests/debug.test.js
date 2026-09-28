import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { DEBUG, XP, CLASS_ORDER, MERCHANT } from '../src/config.js';
import { LEGENDARIES, MATERIA_RARITIES } from '../src/data/items.js';
import { DUNGEON_ORDER, DUNGEONS } from '../src/data/dungeons.js';
import { setupDebugGame, itemBases } from '../src/game/debug.js';
import { primaryOptions } from '../src/game/items.js';
import { getSkills, getStats } from '../src/game/party.js';
import { pointsAvailable } from '../src/game/talents.js';
import { isUnlocked, startFloors, startExpedition } from '../src/game/dungeon.js';
import { zoneMedals, medalDifficulties } from '../src/game/medals.js';

beforeEach(() => setRandomSource(() => 0.5));

function newGame() {
  return { party: [], reserve: [], bag: [], gold: 0, dungeons: {}, consumables: {} };
}

test('partie Debug : héros niveau max avec leurs sorts de départ, toutes les classes présentes', () => {
  const game = setupDebugGame(newGame());
  const heroes = [...game.party, ...game.reserve];
  assert.deepEqual([...new Set(heroes.map((h) => h.classKey))].sort(), [...CLASS_ORDER].sort());
  for (const h of heroes) {
    assert.equal(h.level, XP.maxLevel);
    assert.ok(getSkills(h).length > 0, `${h.name} connaît ses sorts de départ`);
    assert.ok(pointsAvailable(h) > 0, 'il reste des points de talent à dépenser');
    assert.equal(h.hp, getStats(h).pv);
  }
});

test('partie Debug : or, matéria, consommables, tous les donjons et points de départ ouverts', () => {
  const game = setupDebugGame(newGame());
  assert.equal(game.gold, DEBUG.gold);
  for (const kind of Object.keys(game.materia)) for (const r of MATERIA_RARITIES) assert.equal(game.materia[kind][r], DEBUG.materia);
  assert.ok(Object.values(game.consumables).every((n) => n === MERCHANT.maxConsumable));
  for (const key of DUNGEON_ORDER) {
    assert.ok(isUnlocked(game, key));
    assert.equal(startFloors(game, key).length, DUNGEONS[key].subzones.length, `${key} : un départ par sous-zone`);
  }
  assert.ok(startExpedition(game, DUNGEON_ORDER.at(-1), DUNGEONS[DUNGEON_ORDER.at(-1)].floors - 4), 'dernière sous-zone accessible');
});

test('partie Debug : chaque base dans chaque stat principale et 4 raretés au niveau max, et tous les légendaires', () => {
  const game = setupDebugGame(newGame());
  const legendaries = game.bag.filter((i) => i.legendary);
  assert.deepEqual(legendaries.map((i) => i.legendary.key).sort(), Object.keys(LEGENDARIES).sort());
  const others = game.bag.filter((i) => !i.legendary);
  const variants = itemBases().reduce((n, base) => n + primaryOptions(base).length, 0);
  assert.equal(others.length, variants * DEBUG.rarities.length);
  assert.ok(game.bag.every((i) => i.level === XP.maxLevel));
  for (const rarity of DEBUG.rarities) assert.equal(others.filter((i) => i.rarity === rarity).length, variants);
  // Pour une même base et une même stat principale : une pièce de chaque rareté.
  const first = others[0];
  const same = others.filter((i) => i.weaponType === first.weaponType && i.slotType === first.slotType && i.primary === first.primary);
  assert.deepEqual(same.map((i) => i.rarity).sort(), [...DEBUG.rarities].sort());
});

test('partie Debug : toutes les médailles des 3 premières zones, aucune ailleurs', () => {
  const game = setupDebugGame({});
  const zones = DUNGEON_ORDER;
  for (const [i, key] of zones.entries()) {
    const won = zoneMedals(game, key).filter((m) => m.won).length;
    assert.equal(won, i < 3 ? medalDifficulties().length : 0, key);
  }
});
