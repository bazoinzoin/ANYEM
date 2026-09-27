import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats } from '../src/game/party.js';
import { recruit, swapWithReserve, reserveOf } from '../src/game/roster.js';
import { bankOf, moveGold, depositItem, withdrawItem, moveConsumable, moveMateria } from '../src/game/bank.js';
import { applyVictory, applyDefeat } from '../src/game/progression.js';
import { createEnemies } from '../src/game/enemies.js';
import { generateItem } from '../src/game/items.js';
import { emptyMateria } from '../src/game/forge.js';
import { MERCHANT } from '../src/config.js';

beforeEach(() => setRandomSource(() => 0.5));

const newGame = () => ({
  party: createParty(), reserve: [], bag: [], gold: 100, dungeonLvl: 1, dungeons: {}, expedition: null,
  consumables: { potion: 3 }, materia: emptyMateria(),
});

// ---- Auberge ----

test('recruter : le compagnon (niveau 1) prend la place du héros choisi, qui part à l\'auberge avec son équipement', () => {
  const game = newGame();
  const old = game.party[1];
  old.level = 7;
  const weapon = old.equipment.mainDroite;
  const hero = recruit(game, 'paladin', 'Aldric', 1);
  assert.equal(game.party[1], hero);
  assert.equal(hero.level, 1);
  assert.equal(hero.classKey, 'paladin');
  assert.equal(hero.name, 'Aldric');
  assert.ok(hero.equipment.mainDroite, 'équipement de départ');
  assert.equal(game.party.length, 4);
  assert.deepEqual(reserveOf(game), [old]);
  assert.equal(old.level, 7);
  assert.equal(old.equipment.mainDroite, weapon, "l'équipement reste sur le héros");
});

test("échanger un héros de l'équipe avec un héros de l'auberge", () => {
  const game = newGame();
  const [g] = game.party;
  recruit(game, 'chasseur', 'Sylas', 0);
  const hunter = game.party[0];
  assert.ok(swapWithReserve(game, 0, 0));
  assert.equal(game.party[0], g);
  assert.deepEqual(game.reserve, [hunter]);
  assert.equal(swapWithReserve(game, 0, 5), false);
});

test("les héros de l'auberge ne gagnent pas d'XP ; rien ne change pendant une expédition", () => {
  const game = newGame();
  recruit(game, 'mage', 'Ivy', 3);
  const resting = game.reserve[0];
  applyVictory(game, { level: 1, enemies: createEnemies(['gobelin'], 1) });
  assert.equal(resting.xp, 0);
  assert.ok(game.party[3].xp > 0);
  game.expedition = { dungeonKey: 'foretMaudite', floor: 2 };
  assert.equal(recruit(game, 'mage', 'X', 0), null);
  assert.equal(swapWithReserve(game, 0, 0), false);
});

// ---- Banque ----

test("banque : dépôt et retrait d'or, jamais plus que ce qu'on possède", () => {
  const game = newGame();
  assert.ok(moveGold(game, 60));
  assert.equal(game.gold, 40);
  assert.equal(bankOf(game).gold, 60);
  assert.equal(moveGold(game, 50), false);
  assert.equal(moveGold(game, -70), false);
  assert.ok(moveGold(game, -60));
  assert.equal(game.gold, 100);
});

test('banque : objets, consommables (place limitée dans le sac) et matéria', () => {
  const game = newGame();
  const item = generateItem({ level: 1, rarity: 'rare' });
  game.bag.push(item);
  assert.ok(depositItem(game, item.id));
  assert.deepEqual(game.bag, []);
  assert.deepEqual(bankOf(game).items, [item]);
  assert.ok(withdrawItem(game, item.id));
  assert.deepEqual(game.bag, [item]);

  assert.ok(moveConsumable(game, 'potion', 3));
  assert.equal(game.consumables.potion, 0);
  assert.equal(moveConsumable(game, 'potion', 1), false);
  bankOf(game).consumables.potion = 20;
  assert.equal(moveConsumable(game, 'potion', -(MERCHANT.maxConsumable + 1)), false, 'le sac est limité');
  assert.ok(moveConsumable(game, 'potion', -MERCHANT.maxConsumable));

  game.materia.arme.rare = 4;
  assert.ok(moveMateria(game, 'arme', 'rare', 4));
  assert.equal(game.materia.arme.rare, 0);
  assert.equal(bankOf(game).materia.arme.rare, 4);
  assert.equal(moveMateria(game, 'arme', 'rare', -5), false);
});

test("ce qui est à la banque ne se perd pas lors d'une défaite ; pas de banque pendant une expédition", () => {
  const game = newGame();
  setRandomSource(() => 0.1); // chaque objet du sac serait perdu
  const safe = generateItem({ level: 1 });
  game.bag.push(safe);
  depositItem(game, safe.id);
  moveGold(game, 100);
  game.bag.push(generateItem({ level: 1 }), generateItem({ level: 1 }));
  applyDefeat(game);
  assert.deepEqual(bankOf(game).items, [safe]);
  assert.equal(bankOf(game).gold, 100);
  assert.equal(game.bag.length, 1, 'jamais tout le sac');
  game.expedition = { dungeonKey: 'foretMaudite', floor: 1 };
  assert.equal(moveGold(game, -10), false);
  assert.equal(withdrawItem(game, safe.id), false);
  assert.ok(getStats(game.party[0]).pv > 0);
});
