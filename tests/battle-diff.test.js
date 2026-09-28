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

test('effets visuels : projectile selon l\'élément, flèche à l\'arc, entaille au corps à corps, soin et bouclier', async () => {
  const { actionFx, enemyFx } = await import('../src/ui/battleDiff.js');
  const bow = { equipment: { mainDroite: { weaponType: 'arc' } } };
  const sword = { equipment: { mainDroite: { weaponType: 'epee' } } };
  const skill = (name, extra = {}) => ({ name, kind: 'damage', target: 'enemy', magic: true, ...extra });
  const act = { type: 'skill', skill: 0 };
  assert.equal(actionFx(sword, skill('Boule de Feu'), act).projectile, 'Fireball');
  assert.equal(actionFx(sword, skill('Trait de givre'), act).projectile, 'IceShard');
  assert.equal(actionFx(sword, skill('Éclair'), act).projectile, 'LightningBolt');
  assert.equal(actionFx(sword, skill("Explosion d'âme"), act).projectile, 'DeathCoil');
  assert.equal(actionFx(sword, skill('Rayon inconnu'), act).projectile, 'MagicMissile');
  assert.equal(actionFx(bow, null, { type: 'attack' }).projectile, 'Arrow');
  assert.equal(actionFx(sword, null, { type: 'attack' }).style, 'slash');
  assert.equal(actionFx(sword, skill('Entaille rituelle', { magic: false }), act).tint, '#e0424f', 'entaille teintée de sang');
  assert.equal(actionFx(sword, { name: 'Soin Majeur', kind: 'heal', target: 'ally' }, act).style, 'heal');
  assert.equal(actionFx(sword, { name: 'Rempart', kind: 'support', target: 'self', selfEffects: [{ id: 'bouclier', turns: 2 }] }, act).style, 'shield');
  assert.equal(enemyFx({ magic: true }, null).projectile, 'DarkOrb');
  assert.equal(enemyFx({ ranged: true }, null).projectile, 'Arrow');
  assert.equal(enemyFx({}, null).style, 'slash');
});
