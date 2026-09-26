import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty } from '../src/game/party.js';
import { setDifficulty, difficultyOf, lootRules, enemyPower } from '../src/game/difficulty.js';
import { startExpedition, floorCombat } from '../src/game/dungeon.js';
import { createCombat } from '../src/game/combat.js';
import { createEnemies } from '../src/game/enemies.js';
import { rollLoot } from '../src/game/loot.js';
import { DIFFICULTIES, DIFFICULTY_ORDER, LOOT } from '../src/config.js';
import { RARITY_ORDER } from '../src/data/items.js';

beforeEach(() => setRandomSource(() => 0.5));

const newGame = () => ({ party: createParty(), bag: [], gold: 100, dungeonLvl: 1, dungeons: {}, expedition: null });

test('4 difficultés, de plus en plus dures ; Balade = réglage de base', () => {
  assert.deepEqual(DIFFICULTY_ORDER, ['balade', 'aventure', 'guerre', 'horreur']);
  assert.equal(enemyPower('balade'), 1);
  assert.deepEqual(lootRules('balade'), LOOT);
  for (let i = 1; i < DIFFICULTY_ORDER.length; i++) {
    const [a, b] = [DIFFICULTY_ORDER[i - 1], DIFFICULTY_ORDER[i]];
    assert.ok(enemyPower(b) > enemyPower(a), b);
    const [la, lb] = [lootRules(a), lootRules(b)];
    assert.ok(lb.dropChance > la.dropChance && lb.materiaChance > la.materiaChance, b);
    const best = (w) => (w.epique ?? 0) + (w.legendaire ?? 0);
    assert.ok(best(lb.rarityWeights) > best(la.rarityWeights) && best(lb.bossRarityWeights) > best(la.bossRarityWeights), b);
    assert.ok(best(lb.materiaRarityWeights) > best(la.materiaRarityWeights), b);
  }
  for (const d of Object.values(DIFFICULTIES)) {
    for (const w of ['rarityWeights', 'materiaRarityWeights']) {
      if (d.loot[w]) assert.equal(Object.values(d.loot[w]).reduce((s, v) => s + v, 0), 100, `${d.name} ${w}`);
    }
  }
});

test('la difficulté se choisit au village, pas pendant une expédition', () => {
  const game = newGame();
  assert.equal(difficultyOf(game), 'balade');
  assert.ok(setDifficulty(game, 'horreur'));
  assert.equal(difficultyOf(game), 'horreur');
  assert.equal(setDifficulty(game, 'inconnue'), false);
  startExpedition(game, 'foretMaudite');
  assert.equal(setDifficulty(game, 'balade'), false);
});

test('les ennemis sont plus puissants selon la difficulté', () => {
  const game = newGame();
  setDifficulty(game, 'guerre');
  startExpedition(game, 'foretMaudite');
  game.expedition.engaged = game.expedition.map.mobs[0].id;
  const params = floorCombat(game);
  assert.equal(params.power, 1.7);
  const cb = createCombat({ party: game.party, ...params });
  const base = createEnemies(params.enemies, params.level);
  cb.enemies.forEach((e, i) => {
    assert.equal(e.stats.pv, Math.round(base[i].stats.pv * 1.7));
    assert.equal(e.stats.atq, Math.round(base[i].stats.atq * 1.7));
  });
});

test('plus la difficulté est haute, plus le butin est abondant et rare', () => {
  const run = (difficulty) => {
    let n = 0;
    setRandomSource(() => ((n++ * 0.6180339) % 1));
    const enemies = createEnemies(Array(300).fill('gobelin'), 5);
    const loot = rollLoot(5, enemies, { difficulty });
    const score = loot.items.reduce((s, it) => s + RARITY_ORDER.indexOf(it.rarity), 0);
    return { items: loot.items.length, score };
  };
  const easy = run('balade');
  const hard = run('horreur');
  assert.ok(hard.items > easy.items, `${hard.items} > ${easy.items}`);
  assert.ok(hard.score / hard.items > easy.score / easy.items);
});
