import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats } from '../src/game/party.js';
import { generateItem, itemStats } from '../src/game/items.js';
import { emptyMateria, decraft, upgradeCost, missingForUpgrade, canUpgrade, upgrade } from '../src/game/forge.js';
import { FORGE } from '../src/config.js';

beforeEach(() => setRandomSource(() => 0.5));

function newGame() {
  return { party: createParty(), bag: [], gold: 10000, materia: emptyMateria(), dungeonLvl: 1 };
}

test('décraft : 1 à 3 matéria de la rareté et du type de l\'objet', () => {
  const game = newGame();
  const sword = generateItem({ slotType: 'arme', weaponType: 'epee', rarity: 'rare', level: 3 });
  const ring = generateItem({ slotType: 'anneau', rarity: 'peuCommun', level: 3 });
  game.bag.push(sword, ring);
  setRandomSource(() => 0);
  assert.deepEqual(decraft(game, sword), { kind: 'arme', rarity: 'rare', amount: 1 });
  setRandomSource(() => 0.999);
  assert.deepEqual(decraft(game, ring), { kind: 'bijou', rarity: 'peuCommun', amount: 3 });
  assert.equal(game.materia.arme.rare, 1);
  assert.equal(game.materia.bijou.peuCommun, 3);
  assert.deepEqual(game.bag, []);
});

test('le décraft rapporte toujours entre 1 et 3 matéria', () => {
  setRandomSource(null);
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const game = newGame();
    const item = generateItem({ level: 1 });
    game.bag.push(item);
    const { amount } = decraft(game, item);
    assert.ok(amount >= 1 && amount <= 3);
    seen.add(amount);
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3]);
});

test('un objet porté ne peut pas être décrafté', () => {
  const game = newGame();
  const worn = game.party[0].equipment.mainDroite;
  assert.equal(decraft(game, worn), null);
  assert.equal(game.party[0].equipment.mainDroite, worn);
});

test("le coût d'amélioration demande chaque rareté jusqu'à celle de l'objet", () => {
  const rare = generateItem({ slotType: 'casque', armorType: 'lourde', rarity: 'rare', level: 4 });
  const cost = upgradeCost(rare);
  assert.equal(cost.plus, 1);
  assert.equal(cost.kind, 'armure');
  assert.deepEqual(Object.keys(cost.materia), ['commun', 'peuCommun', 'rare']);
  assert.equal(cost.gold, FORGE.goldBase + FORGE.goldPerLevel * 4);
  assert.deepEqual(cost.materia, { commun: 2, peuCommun: 2, rare: 2 });
  const expected = [2, 4, 6, 8, 10];
  for (let plus = 0; plus < 5; plus++) {
    rare.plus = plus;
    assert.deepEqual(upgradeCost(rare).materia, { commun: expected[plus], peuCommun: expected[plus], rare: expected[plus] });
  }
  rare.plus = 5;
  assert.equal(upgradeCost(rare), null, 'maximum +5');
});

test('améliorer consomme or et matéria, et refuse s\'il en manque', () => {
  const game = newGame();
  const item = game.party[0].equipment.mainDroite; // arme commune portée
  assert.equal(canUpgrade(game, item), false);
  assert.deepEqual(missingForUpgrade(game, item).materia, { commun: 2 });
  assert.equal(upgrade(game, item), false);
  assert.equal(item.plus, 0);

  game.materia.arme.commun = 3;
  const gold = game.gold;
  assert.ok(upgrade(game, item));
  assert.equal(item.plus, 1);
  assert.equal(game.materia.arme.commun, 1);
  assert.equal(game.gold, gold - upgradeCost({ ...item, plus: 0 }).gold);
});

test('les améliorations augmentent les stats de l\'objet et du héros qui le porte', () => {
  const game = newGame();
  const hero = game.party[0];
  const item = hero.equipment.plastron;
  const before = getStats(hero).def;
  const base = item.stats.armure;
  item.plus = 3;
  assert.equal(itemStats(item).armure, Math.max(Math.round(base * 1.3), base + 3));
  assert.equal(item.stats.armure, base, 'les stats de base ne changent pas');
  assert.ok(getStats(hero).def > before);
});
