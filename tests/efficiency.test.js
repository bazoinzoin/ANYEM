// Efficacité au combat : suivi pendant le combat (game/combat.js) et coefficient d'XP
// (combatEfficiency, applyVictory dans game/progression.js).

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills } from '../src/game/party.js';
import { createCombat, nextTurn, heroAct, enemyAct } from '../src/game/combat.js';
import { combatEfficiency, applyVictory, xpReward } from '../src/game/progression.js';
import { createEnemies } from '../src/game/enemies.js';
import { emptyMateria } from '../src/game/forge.js';
import { EFFICIENCY } from '../src/config.js';
import { learnPath } from './helpers.js';

beforeEach(() => setRandomSource(() => 0.5));

const fight = (turns, dealt = 0, healed = 0, extra = {}) => ({ dealt, healed, shielded: 0, taken: 0, turns, ...extra });

test('coefficient : entre min et max ; qui agit à chaque tour et apporte le plus a le maximum', () => {
  const party = [{ fight: fight(5, 1000) }, { fight: fight(5, 500) }, { fight: fight(2, 100) }, { fight: fight(0, 0) }];
  const coefs = combatEfficiency(party);
  assert.equal(coefs[0], EFFICIENCY.max);
  assert.equal(coefs[3], EFFICIENCY.min, 'tombé dès le début : le minimum');
  assert.ok(coefs[1] < coefs[0] && coefs[2] < coefs[1]);
  coefs.forEach((c) => assert.ok(c >= EFFICIENCY.min && c <= EFFICIENCY.max));
});

test('un soigneur qui agit à chaque tour, même avec peu à soigner, ne descend pas sous ×1', () => {
  const [, healer] = combatEfficiency([{ fight: fight(6, 3000) }, { fight: fight(6, 0, 40) }]);
  assert.ok(healer >= 1, `soigneur ×${healer}`);
});

test('sans suivi de combat, tout le monde a ×1', () => {
  assert.deepEqual(combatEfficiency([{}, {}]), [1, 1]);
});

test("l'XP de victoire suit le coefficient de chaque héros", () => {
  const party = createParty(['A', 'B'], ['guerrier', 'pretre']);
  const game = { party, bag: [], gold: 0, dungeonLvl: 1, materia: emptyMateria(), consumables: {} };
  const enemies = createEnemies(['gobelin', 'gobelin'], 5);
  const base = xpReward(5, enemies);
  const r = applyVictory(game, { level: 5, enemies, efficiency: [1.2, 0.8] });
  assert.equal(r.xpByHero[0].xp, Math.round(base * 1.2));
  assert.equal(r.xpByHero[1].xp, Math.round(base * 0.8));
  assert.match(r.message, /efficacité/);
});

test('suivi en combat : dégâts infligés, poison crédité à son lanceur, tours joués, soins', () => {
  const party = createParty(['Vif', 'Pieux'], ['voleur', 'pretre']);
  const [thief, priest] = party;
  thief.level = 30;
  priest.level = 30;
  learnPath(thief, 'empoisonneur', { upTo: 2 });
  learnPath(priest, 'clerc', { upTo: 0 });
  party.forEach((h) => { h.hp = getStats(h).pv; });
  const cb = createCombat({ party, enemies: ['gobelin'], level: 1 });
  cb.enemies[0].hp = cb.enemies[0].stats.pv = 99999;
  let poisoned = false;
  for (let i = 0; i < 40 && cb.round <= 4; i++) {
    const t = nextTurn(cb);
    if (!t) break;
    if (t.unit === thief) {
      const s = getSkills(thief).findIndex((sk) => sk.id === 'lame-empoisonnee');
      if (!poisoned && heroAct(cb, { type: 'skill', skill: s, target: 0 })) poisoned = true;
      else heroAct(cb, { type: 'attack', target: 0 });
      if (cb.acting?.unit === thief) heroAct(cb, { type: 'endTurn' });
    } else if (t.unit === priest) {
      thief.hp = Math.max(1, thief.hp - 50);
      heroAct(cb, { type: 'skill', skill: 0, target: 0 });
    } else enemyAct(cb);
  }
  assert.ok(thief.fight.dealt > 0 && thief.fight.turns > 0);
  assert.ok(priest.fight.healed > 0, 'soins comptés');
  const poison = cb.log.some((l) => /Poison \(-/.test(l.text));
  assert.ok(poison, 'le poison a agi');
  assert.ok(thief.fight.dealt > 0);
});
