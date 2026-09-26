import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty } from '../src/game/party.js';
import { recruit, recruitProblem, dismiss, dismissOutcome, reserveOf } from '../src/game/roster.js';
import { generateItem } from '../src/game/items.js';
import { equippedItems } from '../src/game/equipment.js';
import { recordEncounter, recordKills, isDiscovered, bestiaryOf, bestiaryPages, bestiaryProgress, levelRange } from '../src/game/bestiary.js';
import { createCombat } from '../src/game/combat.js';
import { startExpedition, floorCombat, winFloor, loseExpedition } from '../src/game/dungeon.js';
import { createEnemy, enemyStats } from '../src/game/enemies.js';
import { ENEMIES } from '../src/data/enemies.js';
import { INN } from '../src/config.js';

beforeEach(() => setRandomSource(() => 0.5));

const newGame = () => ({ party: createParty(), reserve: [], bag: [], gold: 100, dungeonLvl: 1, dungeons: {}, expedition: null, consumables: {} });

// ---- Auberge ----

test(`auberge : au plus ${INN.maxReserve} compagnons au repos`, () => {
  const game = newGame();
  for (let i = 0; i < INN.maxReserve; i++) assert.ok(recruit(game, 'mage', `M${i}`, 0));
  assert.equal(reserveOf(game).length, INN.maxReserve);
  assert.match(recruitProblem(game), /pleine/);
  assert.equal(recruit(game, 'mage', 'Trop', 0), null);
  assert.equal(game.party[0].name, `M${INN.maxReserve - 1}`);
  assert.ok(dismiss(game, 0));
  assert.equal(recruitProblem(game), null);
});

test('renvoi : objets communs portés détruits, les autres rendus au sac', () => {
  const game = newGame();
  const hero = game.party[0];
  const rare = generateItem({ slotType: 'anneau', rarity: 'rare' });
  hero.equipment.anneau1 = rare;
  recruit(game, 'paladin', 'P', 0);
  const commons = equippedItems(hero).filter((i) => i.rarity === 'commun');
  assert.ok(commons.length > 0);
  const preview = dismissOutcome(hero);
  assert.deepEqual(preview.returned, [rare]);

  const r = dismiss(game, 0);
  assert.equal(r.hero, hero);
  assert.deepEqual(r.returned, [rare]);
  assert.equal(r.destroyed.length, commons.length);
  assert.deepEqual(game.bag, [rare]);
  assert.deepEqual(reserveOf(game), []);
  assert.equal(equippedItems(hero).length, 0);
});

test("renvoi : impossible pendant une expédition ou pour un index inconnu", () => {
  const game = newGame();
  recruit(game, 'mage', 'M', 0);
  assert.equal(dismiss(game, 3), null);
  game.expedition = { dungeonKey: 'foretMaudite' };
  assert.equal(dismiss(game, 0), null);
  assert.equal(reserveOf(game).length, 1);
});

// ---- Bestiaire ----

test('bestiaire : rencontre notée une fois par combat, ennemis vaincus comptés', () => {
  const game = newGame();
  assert.equal(isDiscovered(game, 'loup'), false);
  recordEncounter(game, ['loup', 'loup', 'gobelin']);
  assert.deepEqual(bestiaryOf(game).loup, { seen: 1, kills: 0 });
  const [a, b] = [createEnemy('loup', 1), createEnemy('loup', 1)];
  a.alive = false;
  recordKills(game, [a, b]);
  assert.equal(bestiaryOf(game).loup.kills, 1);
  assert.ok(isDiscovered(game, 'gobelin'));
  assert.equal(isDiscovered(game, 'araignee'), false);
});

test('bestiaire : victoire et défaite en expédition comptent les vaincus', () => {
  const game = newGame();
  startExpedition(game, 'foretMaudite');
  const params = floorCombat(game);
  recordEncounter(game, params.enemies);
  const cb = createCombat({ party: game.party, ...params });
  cb.enemies.forEach((e) => { e.alive = false; e.hp = 0; });
  winFloor(game, cb);
  const kills = Object.values(bestiaryOf(game)).reduce((n, e) => n + e.kills, 0);
  assert.equal(kills, params.enemies.length);

  const cb2 = createCombat({ party: game.party, ...floorCombat(game) });
  cb2.enemies[0].alive = false;
  loseExpedition(game, cb2);
  assert.equal(Object.values(bestiaryOf(game)).reduce((n, e) => n + e.kills, 0), kills + 1);
});

test('bestiaire : chaque ennemi des donjons a une page, progression comptée', () => {
  const pages = bestiaryPages();
  const all = pages.flatMap((p) => p.enemies);
  all.forEach((k) => assert.ok(ENEMIES[k], k));
  const game = newGame();
  recordEncounter(game, [all[0]]);
  assert.deepEqual(bestiaryProgress(game), { found: 1, total: all.length });
});

test('stats du bestiaire = stats de combat (hors Vitesse tirée au hasard)', () => {
  const s = enemyStats('gobelin', 10, 1.3);
  const e = createEnemy('gobelin', 10, null, 1.3);
  assert.equal(s.pv, e.stats.pv);
  assert.equal(s.atq, e.stats.atq);
  assert.equal(s.def, e.stats.def);
  assert.equal(s.vit, ENEMIES.gobelin.vit.min);
});

test('bestiaire : niveaux où la créature apparaît dans la zone', () => {
  assert.deepEqual(levelRange('foretMaudite', 'gobelin'), { minLevel: 1, maxLevel: 10 });
  assert.deepEqual(levelRange('foretMaudite', 'araignee'), { minLevel: 4, maxLevel: 10 });
  assert.deepEqual(levelRange('foretMaudite', 'chefGobelin'), { minLevel: 1, maxLevel: 3 });
  assert.equal(levelRange('foretMaudite', 'liche'), null);
});
