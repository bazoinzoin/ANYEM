import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { generateItem } from '../src/game/items.js';
import { emptyMateria, materiaKind, craftCost, craftProblem, craft, craftLegendaries } from '../src/game/forge.js';
import { rerollCost, rerollPool, rerollProblem, rerollSecondary } from '../src/game/runes.js';
import { LEGENDARIES, SECONDARY_STATS } from '../src/data/items.js';
import { RUNES } from '../src/config.js';

beforeEach(() => setRandomSource(() => 0.5));

function newGame() {
  const materia = emptyMateria();
  for (const kind of Object.keys(materia)) for (const r of Object.keys(materia[kind])) materia[kind][r] = 100;
  return { bag: [], gold: 1000, materia, dungeonLvl: 12 };
}

test('matéria : une sorte par catégorie (arme, armure et bouclier, bijou)', () => {
  assert.equal(materiaKind(generateItem({ slotType: 'arme', weaponType: 'epee' })), 'arme');
  assert.equal(materiaKind(generateItem({ slotType: 'bouclier' })), 'armure');
  assert.equal(materiaKind(generateItem({ slotType: 'gants', armorType: 'lourde' })), 'armure');
  assert.equal(materiaKind(generateItem({ slotType: 'collier' })), 'bijou');
});

test('fabrication : 20 matéria de la rareté, +10 par filtre', () => {
  assert.equal(craftCost({ kind: 'arme', rarity: 'rare' }).amount, 20);
  assert.equal(craftCost({ kind: 'arme', rarity: 'rare', weaponType: 'arc' }).amount, 30);
  assert.equal(craftCost({ kind: 'armure', rarity: 'rare', slotType: 'casque', armorType: 'legere', primary: 'force' }).amount, 50);
  assert.equal(craftCost({ kind: 'bijou', rarity: 'rare', slotType: 'anneau', primary: 'agilite' }).amount, 40);
});

test('fabrication : objet conforme à la commande, au plus haut niveau atteint, matéria payées', () => {
  const game = newGame();
  const item = craft(game, { kind: 'armure', rarity: 'epique', slotType: 'bottes', armorType: 'moyenne', primary: 'agilite' });
  assert.equal(item.slotType, 'bottes');
  assert.equal(item.armorType, 'moyenne');
  assert.equal(item.primary, 'agilite');
  assert.equal(item.rarity, 'epique');
  assert.equal(item.level, 12);
  assert.equal(game.materia.armure.epique, 50);
  assert.deepEqual(game.bag, [item]);

  const ring = craft(game, { kind: 'bijou', rarity: 'commun' });
  assert.ok(['anneau', 'collier'].includes(ring.slotType));
  assert.equal(game.materia.bijou.commun, 80);
  const bow = craft(game, { kind: 'arme', rarity: 'rare', weaponType: 'arc' });
  assert.equal(bow.weaponType, 'arc');
  assert.equal(game.materia.arme.rare, 70);
});

test("fabrication : sans filtre, tout peut sortir ; un type d'armure imposé exclut le bouclier", () => {
  for (let i = 0; i < 20; i++) {
    setRandomSource(() => i / 20);
    const game = newGame();
    const item = craft(game, { kind: 'armure', rarity: 'rare', armorType: 'lourde' });
    assert.notEqual(item.slotType, 'bouclier');
    assert.equal(item.armorType, 'lourde');
    const agi = craft(game, { kind: 'armure', rarity: 'rare', primary: 'agilite' });
    assert.notEqual(agi.slotType, 'bouclier');
  }
});

test('fabrication : commandes impossibles refusées sans rien payer', () => {
  const game = newGame();
  game.materia.arme.rare = 25;
  assert.match(craftProblem(game, { kind: 'arme', rarity: 'rare', weaponType: 'arc' }), /manque 5/);
  assert.equal(craft(game, { kind: 'arme', rarity: 'rare', weaponType: 'arc' }), null);
  assert.equal(game.materia.arme.rare, 25);
  assert.ok(craftProblem(game, { kind: 'armure', rarity: 'rare', slotType: 'bouclier', armorType: 'lourde' }));
  assert.ok(craftProblem(game, { kind: 'armure', rarity: 'rare', slotType: 'bouclier', primary: 'agilite' }));
  assert.ok(craftProblem(game, { kind: 'arme', rarity: 'rare', weaponType: 'fourchette' }));
  assert.equal(game.bag.length, 0);
});

test('fabrication légendaire : un légendaire de la catégorie qui respecte les filtres', () => {
  const game = newGame();
  const weapons = craftLegendaries({ kind: 'arme', rarity: 'legendaire' });
  assert.ok(weapons.length > 1);
  weapons.forEach((k) => assert.equal(LEGENDARIES[k].slotType, 'arme'));
  assert.deepEqual(craftLegendaries({ kind: 'arme', rarity: 'legendaire', weaponType: 'arc' }), ['serreDuFaucon']);
  const item = craft(game, { kind: 'arme', rarity: 'legendaire', weaponType: 'arc' });
  assert.equal(item.legendary.key, 'serreDuFaucon');
  assert.equal(game.materia.arme.legendaire, 70);
  assert.match(craftProblem(game, { kind: 'bijou', rarity: 'legendaire', slotType: 'anneau' }), /Aucun légendaire/);
  // Toute la liste est couverte par les trois catégories.
  const all = ['arme', 'armure', 'bijou'].flatMap((kind) => craftLegendaries({ kind, rarity: 'legendaire' }));
  assert.equal(all.length, Object.keys(LEGENDARIES).length);
});

test('Runomancien : prix selon la rareté, rien à relancer sur un objet commun', () => {
  assert.equal(rerollCost(generateItem({ rarity: 'commun' })), null);
  assert.equal(rerollCost(generateItem({ rarity: 'rare' })), RUNES.price.rare);
  assert.ok(RUNES.price.legendaire > RUNES.price.epique && RUNES.price.epique > RUNES.price.rare && RUNES.price.rare > RUNES.price.peuCommun);
});

test('Runomancien : relance une seule secondaire, sans doublon, en payant', () => {
  for (let i = 0; i < 20; i++) {
    setRandomSource(() => i / 20);
    const game = newGame();
    const item = generateItem({ rarity: 'epique', level: 10, slotType: 'arme', weaponType: 'epee' });
    const keys = Object.keys(item.bonus);
    const target = keys[1];
    const others = keys.filter((k) => k !== target).map((k) => [k, item.bonus[k]]);
    const pool = rerollPool(item, target);
    assert.ok(pool.includes(target));
    others.forEach(([k]) => assert.ok(!pool.includes(k)));
    assert.ok(!pool.includes('atq'), "l'Attaque obligatoire de l'arme ne peut pas sortir");

    const r = rerollSecondary(game, item, target);
    assert.equal(game.gold, 1000 - RUNES.price.epique);
    assert.equal(r.from.stat, target);
    assert.ok(SECONDARY_STATS[r.to.stat]);
    const after = Object.keys(item.bonus);
    assert.equal(after.length, 3);
    assert.equal(after[1], r.to.stat, "la ligne reste à sa place");
    others.forEach(([k, v]) => assert.equal(item.bonus[k], v, 'les autres secondaires ne bougent pas'));
  }
});

test("Runomancien : refus sans or ou pour une stat qui n'est pas secondaire", () => {
  const game = newGame();
  const item = generateItem({ rarity: 'rare', slotType: 'anneau', level: 5 });
  assert.ok(rerollProblem(game, item, item.primary));
  game.gold = 10;
  const stat = Object.keys(item.bonus)[0];
  assert.match(rerollProblem(game, item, stat), /manque/);
  assert.equal(rerollSecondary(game, item, stat), null);
  assert.equal(game.gold, 10);
});
