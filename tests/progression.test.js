import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createParty, getStats } from '../src/game/party.js';
import { applyVictory, applyDefeat, restAtInn } from '../src/game/progression.js';
import { createEnemies } from '../src/game/enemies.js';
import { generateItem } from '../src/game/items.js';
import { setRandomSource } from '../src/game/rng.js';

function newGame() {
  return { party: createParty(['Arthas']), bag: [], gold: 50, dungeonLvl: 1 };
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

const goblins = (n, level) => createEnemies(Array(n).fill('gobelin'), level);

test('victoire : or, plus haut niveau atteint et soin partiel des survivants', () => {
  const game = newGame();
  game.party[0].hp = 10;
  applyVictory(game, { level: 3, enemies: goblins(2, 3) });
  assert.equal(game.gold, 50 + 20 + 10 * 3);
  assert.equal(game.dungeonLvl, 3);
  assert.equal(game.party[0].level, 1);
  assert.equal(game.party[0].hp, 10 + Math.round(130 * 0.15));
  applyVictory(game, { level: 2, enemies: goblins(2, 2) });
  assert.equal(game.dungeonLvl, 3, 'ne redescend pas');
});

test('un boss rapporte plus d\'or et d\'XP, et un butin garanti plus rare', () => {
  setRandomSource(() => 0.99); // au-dessus de la chance de butin ordinaire
  const game = newGame();
  const normal = applyVictory(game, { level: 5, enemies: goblins(1, 5) });
  const boss = applyVictory(game, { level: 5, enemies: createEnemies(['chefGobelin'], 5) });
  assert.equal(normal.loot.length, 0);
  assert.equal(boss.loot.length, 1);
  assert.ok(['peuCommun', 'rare', 'epique', 'legendaire'].includes(boss.loot[0].rarity));
  assert.equal(boss.gold, normal.gold * 4);
  assert.equal(boss.xp, normal.xp * 5);
  const final = applyVictory(game, { level: 5, enemies: createEnemies(['reineSylvestre'], 5), final: true });
  assert.equal(final.loot.length, 2, 'le boss final laisse un objet de plus');
  setRandomSource(null);
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

test('victoire : le butin arrive dans le sac, au niveau du donjon', () => {
  setRandomSource(() => 0.1); // sous la chance de butin : chaque ennemi laisse un objet
  const game = newGame();
  const { loot } = applyVictory(game, { level: 7, enemies: goblins(2, 7) });
  assert.equal(loot.length, 2);
  assert.deepEqual(game.bag, loot);
  loot.forEach((item) => assert.equal(item.level, 7));
  setRandomSource(null);
});

test("défaite : une partie du sac est perdue, jamais l'équipement porté", () => {
  const game = newGame();
  const worn = game.party.map((h) => ({ ...h.equipment }));
  game.bag = [1, 2, 3, 4].map(() => generateItem({ level: 1 }));
  let n = 0;
  setRandomSource(() => (n++ % 2 ? 0.9 : 0.1)); // un objet sur deux perdu
  applyDefeat(game);
  setRandomSource(null);
  assert.equal(game.bag.length, 2);
  game.party.forEach((h, i) => assert.deepEqual(h.equipment, worn[i]));
});
