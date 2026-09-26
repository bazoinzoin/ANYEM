import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createParty, getStats } from '../src/game/party.js';
import { applyVictory, applyDefeat, restAtInn } from '../src/game/progression.js';

function newGame() {
  return { party: createParty(['Arthas']), gold: 50, dungeonLvl: 1 };
}

test('les noms saisis sont appliqués, un nom vide garde le nom de classe', () => {
  const party = createParty(['  Arthas ', '', undefined]);
  assert.deepEqual(party.map((h) => h.name), ['Arthas', 'Voleur', 'Prêtre', 'Mage']);
});

test("l'auberge soigne et relève les héros tombés", () => {
  const game = newGame();
  const hero = game.party[0];
  hero.alive = false;
  hero.hp = 0;
  hero.res = 0;
  restAtInn(game);
  assert.equal(hero.alive, true);
  assert.equal(hero.hp, getStats(hero).pv);
  assert.equal(hero.res, getStats(hero).resMax);
});

test('victoire : or, niveau de donjon et soin partiel des survivants', () => {
  const game = newGame();
  game.party[0].hp = 10;
  applyVictory(game);
  assert.equal(game.gold, 50 + 20 + 10);
  assert.equal(game.dungeonLvl, 2);
  assert.equal(game.party[0].hp, 10 + Math.round(130 * 0.15));
});

test("défaite : perte d'or, retour à mi-vie", () => {
  const game = newGame();
  game.party.forEach((h) => { h.alive = false; h.hp = 0; });
  applyDefeat(game);
  assert.equal(game.gold, 40);
  game.party.forEach((h) => {
    assert.equal(h.alive, true);
    assert.equal(h.hp, Math.round(getStats(h).pv * 0.5));
  });
});
