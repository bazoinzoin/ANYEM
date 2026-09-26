import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills } from '../src/game/party.js';
import { learn, branchesOf } from '../src/game/talents.js';
import { startExpedition } from '../src/game/dungeon.js';
import { createCombat } from '../src/game/combat.js';
import { fieldSkills, castOutOfCombat, cannotCastReason } from '../src/game/field.js';
import { addStatus, makeStatus } from '../src/game/statuses.js';
import { healAmount } from '../src/game/formulas.js';

beforeEach(() => setRandomSource(() => 0.5));

const inDungeon = () => {
  const game = { party: createParty(), reserve: [], bag: [], gold: 100, dungeonLvl: 1, dungeons: {}, expedition: null, consumables: {} };
  startExpedition(game, 'foretMaudite', 1);
  return game;
};

test('seuls les soins et les purifications sont utilisables hors combat', () => {
  const game = inDungeon();
  const [g, , p, m] = game.party;
  assert.deepEqual(fieldSkills(g), []);
  assert.deepEqual(fieldSkills(m), []);
  assert.deepEqual(fieldSkills(p).map((f) => f.skill.id), ['soin-majeur']);
  p.level = 50;
  const clerc = branchesOf(p).find((b) => b.key === 'clerc');
  let ok = true;
  while (ok) ok = clerc.nodes.some((n) => n.tier <= 7 && learn(p, n.id));
  const ids = fieldSkills(p).map((f) => f.skill.id);
  assert.ok(ids.includes('priere-de-soins') && ids.includes('purification'));
  assert.ok(!ids.includes('resurrection'), 'pas de résurrection hors combat');
});

test('soigner hors combat : coûte la ressource et soigne la cible', () => {
  const game = inDungeon();
  const [g, , p] = game.party;
  g.hp = 10;
  const res = p.res;
  const skill = getSkills(p)[0];
  const r = castOutOfCombat(game, 2, 0, 0);
  assert.ok(r.ok);
  assert.equal(p.res, res - skill.cost);
  assert.equal(g.hp, Math.min(getStats(g).pv, 10 + healAmount(getStats(p), skill.power)));
  p.res = 0;
  assert.match(cannotCastReason(game, 2, skill), /ressource/);
  assert.equal(castOutOfCombat(game, 2, 0, 0).ok, false);
  game.expedition = null;
  p.res = 80;
  assert.equal(castOutOfCombat(game, 2, 0, 0).ok, false, 'uniquement en expédition');
});

test('les effets négatifs restent entre deux combats, pas les effets positifs', () => {
  const game = inDungeon();
  const [g] = game.party;
  addStatus(g, makeStatus('poison', 3, 5));
  addStatus(g, makeStatus('puissance', 3));
  createCombat({ party: game.party, enemies: ['gobelin'], level: 1 });
  assert.deepEqual(g.statuses.map((s) => s.key), ['poison']);
});
