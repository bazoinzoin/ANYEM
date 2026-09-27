import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getSkills } from '../src/game/party.js';
import { generateItem, secondaryRange } from '../src/game/items.js';
import { emptyMateria, decraft, upgradeCost, absorbProblem, absorbLegendary } from '../src/game/forge.js';
import { lootRules } from '../src/game/difficulty.js';
import { rollLoot } from '../src/game/loot.js';
import { createEnemies } from '../src/game/enemies.js';
import { equip } from '../src/game/equipment.js';
import { learnStarters, learnPath } from './helpers.js';
import { RARITIES, MATERIA_RARITIES, LEGENDARIES } from '../src/data/items.js';
import { DIFFICULTY_ORDER } from '../src/config.js';

beforeEach(() => setRandomSource(() => 0.5));

test('Divin : 5 secondaires, fourchette au-dessus du légendaire', () => {
  assert.equal(RARITIES.divin.secondaries, 5);
  assert.ok(RARITIES.divin.range[0] >= RARITIES.legendaire.range[1]);
  assert.ok(RARITIES.divin.mult > RARITIES.legendaire.mult);
  const item = generateItem({ rarity: 'divin', level: 20, slotType: 'arme', weaponType: 'epee' });
  assert.equal(Object.keys(item.bonus).length, 5);
  assert.equal(item.legendary, undefined);
  const leg = secondaryRange('pv', 20, RARITIES.legendaire.range);
  const div = secondaryRange('pv', 20, RARITIES.divin.range);
  assert.ok(div.lo >= leg.hi);
});

test('Divin : uniquement sur les boss, 0 % en Balade et Aventure, 1 % en Guerre, 5 % en Horreur', () => {
  const bossChance = (key) => {
    const w = lootRules(key).bossRarityWeights;
    return (w.divin ?? 0) / Object.values(w).reduce((a, b) => a + b, 0);
  };
  assert.equal(bossChance('balade'), 0);
  assert.equal(bossChance('aventure'), 0);
  assert.equal(bossChance('guerre'), 0.01);
  assert.equal(bossChance('horreur'), 0.05);
  for (const key of DIFFICULTY_ORDER) {
    const r = lootRules(key);
    for (const w of [r.rarityWeights, r.materiaRarityWeights, r.bossMateriaRarityWeights]) assert.equal(w.divin, undefined, key);
  }
  // Un boss en Horreur finit par en laisser un ; un monstre ordinaire jamais.
  let seed = 7;
  setRandomSource(() => ((seed = (seed * 16807) % 2147483647) / 2147483647));
  let bossDivine = 0;
  let normalDivine = 0;
  for (let i = 0; i < 2000; i++) {
    bossDivine += rollLoot(10, createEnemies(['chefGobelin'], 10), { difficulty: 'horreur' }).items.filter((it) => it.rarity === 'divin').length;
    normalDivine += rollLoot(10, createEnemies(['gobelin', 'loup', 'gobelin'], 10), { difficulty: 'horreur' }).items.filter((it) => it.rarity === 'divin').length;
  }
  assert.ok(bossDivine > 50 && bossDivine < 160, `${bossDivine}`);
  assert.equal(normalDivine, 0);
});

test('Divin : pas de matéria divine ; décraft et amélioration en matéria légendaires', () => {
  assert.ok(!MATERIA_RARITIES.includes('divin'));
  assert.equal(emptyMateria().arme.divin, undefined);
  const game = { bag: [], materia: emptyMateria() };
  const item = generateItem({ rarity: 'divin', slotType: 'anneau', level: 5 });
  assert.deepEqual(Object.keys(upgradeCost(item).materia), MATERIA_RARITIES);
  game.bag.push(item);
  const gain = decraft(game, item);
  assert.equal(gain.rarity, 'legendaire');
  assert.equal(game.materia.bijou.legendaire, gain.amount);
});

test("Forge divine : l'objet divin absorbe le pouvoir d'un légendaire du sac, qui est détruit", () => {
  const game = { party: learnStarters(createParty(['P', 'G', 'Pr', 'M'], ['paladin', 'guerrier', 'pretre', 'mage'])), bag: [] };
  const [paladin, warrior] = game.party;
  learnPath(paladin, 'lumiere', { upTo: 2 });
  const divine = generateItem({ rarity: 'divin', slotType: 'anneau', level: 10 });
  const leg = generateItem({ legendary: 'demainDesLAube', level: 10 });
  const other = generateItem({ legendary: 'fleursDuMal', level: 10 });
  game.bag.push(divine, leg, other);

  assert.ok(absorbProblem(game, leg, other), 'seul un divin absorbe');
  assert.ok(absorbProblem(game, divine, generateItem({ rarity: 'epique' })), 'il faut un légendaire');
  assert.equal(absorbLegendary(game, divine, leg), null);
  assert.equal(divine.absorbed.key, 'demainDesLAube');
  assert.equal(divine.absorbed.name, LEGENDARIES.demainDesLAube.name);
  assert.equal(divine.name, LEGENDARIES.demainDesLAube.name, 'le divin prend le nom du légendaire…');
  assert.equal(divine.rarity, 'divin', '… mais reste divin, avec ses stats');
  assert.ok(!game.bag.includes(leg));

  // Le pouvoir agit sur le héros qui porte l'objet divin, comme un légendaire.
  const skillId = LEGENDARIES.demainDesLAube.power.skillMod.skill;
  const before = getSkills(paladin).find((s) => s.id === skillId);
  assert.ok(before);
  assert.ok(equip(paladin, game.bag, divine, 'anneau1'));
  assert.notDeepEqual(getSkills(paladin).find((s) => s.id === skillId), before);

  // L'objet divin n'est pas réservé à une classe ; un nouveau pouvoir remplace l'ancien.
  assert.ok(equip(warrior, game.bag, generateItem({ rarity: 'divin', slotType: 'anneau' }), 'anneau1') === false, 'pas dans le sac');
  assert.equal(absorbLegendary(game, divine, other).key, 'demainDesLAube');
  assert.equal(divine.absorbed.key, 'fleursDuMal');
  assert.equal(divine.name, 'Les Fleurs du Mal');
  assert.ok(absorbProblem(game, divine, leg), 'déjà détruit');
  game.bag.push(divine);
  paladin.equipment.anneau1 = null;
  assert.ok(equip(warrior, game.bag, divine, 'anneau1'), "un Guerrier peut porter un divin au pouvoir de Voleur");
});

test('améliorer un objet divin coûte 10 / 10 / 10 / 20 / 30 matéria à chaque niveau', () => {
  for (const plus of [0, 4]) {
    const divine = generateItem({ level: 40, rarity: 'divin' });
    divine.plus = plus;
    assert.deepEqual(upgradeCost(divine).materia, { commun: 10, peuCommun: 10, rare: 10, epique: 20, legendaire: 30 });
  }
});
