import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { rollLoot } from '../src/game/loot.js';
import { generateItem } from '../src/game/items.js';
import { createEnemies } from '../src/game/enemies.js';
import { createParty } from '../src/game/party.js';
import { applyVictory } from '../src/game/progression.js';
import { emptyMateria } from '../src/game/forge.js';
import { LOOT, MERCHANT } from '../src/config.js';
import { RARITY_ORDER } from '../src/data/items.js';

beforeEach(() => setRandomSource(null));

const goblins = (n) => createEnemies(Array(n).fill('gobelin'), 5);

test('un ennemi peut tout laisser à la fois : équipement, matéria et consommable', () => {
  setRandomSource(() => 0.05); // sous toutes les chances
  const loot = rollLoot(5, goblins(1));
  assert.equal(loot.items.length, 1);
  assert.equal(loot.materia.length, 1);
  assert.equal(loot.consumables.length, 1);
});

test('un ennemi peut ne rien laisser', () => {
  setRandomSource(() => 0.99);
  assert.deepEqual(rollLoot(5, goblins(3)), { items: [], materia: [], consumables: [] });
});

test('les trois tirages sont indépendants', () => {
  let seed = 7;
  setRandomSource(() => ((seed = (seed * 16807) % 2147483647) / 2147483647));
  const combos = new Set();
  for (let i = 0; i < 2000; i++) {
    const l = rollLoot(5, goblins(1));
    combos.add(`${l.items.length}${l.materia.length}${l.consumables.length}`);
  }
  // Les 8 combinaisons possibles (rien, un seul type, deux, les trois) apparaissent.
  assert.equal(combos.size, 8, [...combos].join(' '));
});

test('les matéria sont moins rares que les équipements', () => {
  let seed = 11;
  setRandomSource(() => ((seed = (seed * 16807) % 2147483647) / 2147483647));
  const share = { items: {}, materia: {} };
  let nItems = 0;
  let nMateria = 0;
  for (let i = 0; i < 4000; i++) {
    const l = rollLoot(5, goblins(1));
    l.items.forEach((it) => { share.items[it.rarity] = (share.items[it.rarity] ?? 0) + 1; nItems++; });
    l.materia.forEach((m) => { share.materia[m.rarity] = (share.materia[m.rarity] ?? 0) + 1; nMateria++; });
  }
  const aboveCommon = (s, n) => (n - (s.commun ?? 0)) / n;
  assert.ok(aboveCommon(share.materia, nMateria) > aboveCommon(share.items, nItems));
  // Poids configurés : chaque rareté au-dessus de commun est plus fréquente en matéria.
  for (const r of RARITY_ORDER.slice(1)) {
    const pct = (w) => w[r] / Object.values(w).reduce((a, b) => a + b, 0);
    assert.ok(pct(LOOT.materiaRarityWeights) > pct(LOOT.rarityWeights), r);
  }
});

test('un boss laisse toujours équipement et matéria, de meilleure rareté', () => {
  setRandomSource(() => 0.99);
  const loot = rollLoot(5, createEnemies(['chefGobelin'], 5));
  assert.equal(loot.items.length, 1);
  assert.equal(loot.materia.length, 1);
  assert.ok(loot.materia[0].amount >= LOOT.bossMateriaAmount.min);
  assert.notEqual(loot.materia[0].rarity, 'commun');
});

test('la victoire range matéria et consommables ; au-delà du maximum, le consommable est perdu', () => {
  setRandomSource(() => 0.05);
  const game = { party: createParty(), bag: [], gold: 0, dungeonLvl: 1, materia: emptyMateria(), consumables: {} };
  const r = applyVictory(game, { level: 5, enemies: goblins(1) });
  const total = Object.values(game.materia).flatMap((m) => Object.values(m)).reduce((a, b) => a + b, 0);
  assert.equal(total, r.materia[0].amount);
  assert.equal(Object.values(game.consumables).reduce((a, b) => a + b, 0), 1);
  assert.match(r.message, /Matéria/);
  const key = r.consumables[0];
  game.consumables[key] = MERCHANT.maxConsumable;
  const r2 = applyVictory(game, { level: 5, enemies: goblins(1) });
  assert.deepEqual(r2.consumables, [], 'même tirage (aléatoire fixe) : consommable déjà au maximum');
  assert.equal(game.consumables[key], MERCHANT.maxConsumable);
  assert.match(r2.message, /faute de place/);
});

test("n'importe quel légendaire peut tomber, quelle que soit l'équipe", () => {
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    setRandomSource(() => (i + 0.5) / 60);
    seen.add(generateItem({ rarity: 'legendaire' }).legendary.classKey);
  }
  assert.deepEqual([...seen].sort(), ['chasseur', 'guerrier', 'mage', 'paladin', 'pretre', 'voleur']);
});
