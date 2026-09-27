import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { learnStarters } from './helpers.js';
import { setRandomSource } from '../src/game/rng.js';
import { createParty } from '../src/game/party.js';
import { createCombat } from '../src/game/combat.js';
import { makeStatus, addStatus } from '../src/game/statuses.js';
import { snapshotBattle, diffBattle, heroGesture, enemyGesture } from '../src/ui/battleDiff.js';

beforeEach(() => setRandomSource(() => 0.5));

function newCombat() {
  const party = learnStarters(createParty());
  return createCombat({ enemies: ['gobelin', 'gobelin'], level: 1, party });
}

test('diffBattle repère dégâts, soins, chutes, relevés et nouveaux effets', () => {
  const cb = newCombat();
  const [a, b] = cb.enemies;
  cb.party[1].alive = false;
  cb.party[1].hp = 0;
  const before = snapshotBattle(cb);
  a.hp -= 5;
  b.hp = 0;
  b.alive = false;
  cb.party[1].alive = true;
  cb.party[1].hp = 10;
  addStatus(cb.party[0], makeStatus('poison', 2, 1));
  cb.log.push({ text: 'x', crit: true });
  const { changes, crit } = diffBattle(cb, before);
  const of = (u) => changes.find((c) => c.unit === u);
  assert.equal(of(a).delta, -5);
  assert.equal(of(a).side, 'enemy');
  assert.ok(of(b).died);
  assert.ok(of(cb.party[1]).revived);
  assert.equal(of(cb.party[1]).delta, 10);
  assert.equal(of(cb.party[0]).added.length, 1);
  assert.equal(of(cb.party[2]), undefined, 'rien de changé : absent');
  assert.ok(crit);
});

test('diffBattle ignore le journal déjà présent et les effets déjà posés', () => {
  const cb = newCombat();
  cb.log.push({ text: 'ancien', crit: true });
  addStatus(cb.enemies[0], makeStatus('poison', 2, 1));
  const before = snapshotBattle(cb);
  const diff = diffBattle(cb, before);
  assert.deepEqual(diff.changes, []);
  assert.equal(diff.crit, false);
});

test('gestes : bond pour une attaque ou un coup d’arme, sort sinon', () => {
  assert.equal(heroGesture(null, { type: 'attack' }), 'lunge');
  assert.equal(heroGesture(null, { type: 'item' }), 'cast');
  assert.equal(heroGesture(null, { type: 'defend' }), null);
  assert.equal(heroGesture({ kind: 'damage', target: 'enemy' }, { type: 'skill' }), 'lunge');
  assert.equal(heroGesture({ kind: 'damage', target: 'enemy', magic: true }, { type: 'skill' }), 'cast');
  assert.equal(heroGesture({ kind: 'heal', target: 'ally' }, { type: 'skill' }), 'cast');

  const hero = { side: 'hero', delta: -4, added: [] };
  assert.equal(enemyGesture({}, { changes: [hero] }), 'lunge');
  assert.equal(enemyGesture({ magic: true }, { changes: [hero] }), 'cast');
  assert.equal(enemyGesture({}, { changes: [hero, { ...hero }] }), 'cast');
  assert.equal(enemyGesture({}, { changes: [{ side: 'enemy', delta: 6, added: [] }] }), 'cast');
  assert.equal(enemyGesture({}, { changes: [] }), 'lunge', 'coup esquivé : bond quand même');
});
