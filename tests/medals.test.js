import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty } from '../src/game/party.js';
import { progressOf, startExpedition } from '../src/game/dungeon.js';
import { medalDifficulties, medalRank, zoneMedals, awardMedal, hasMedal } from '../src/game/medals.js';
import { DIFFICULTY_ORDER, MEDALS } from '../src/config.js';
import { DUNGEONS } from '../src/data/dungeons.js';
import { medalPixels, medalMetal, MEDAL_W, MEDAL_H } from '../src/ui/medals.js';
import { clearFloor } from './helpers.js';

beforeEach(() => setRandomSource(() => 0.5));

const newGame = (difficulty) => ({ party: createParty(), bag: [], gold: 100, dungeonLvl: 1, dungeons: {}, expedition: null, difficulty });

// Joue la dernière sous-zone et bat le dernier boss.
function beatLastBoss(game, key) {
  const first = DUNGEONS[key].floors - 4;
  progressOf(game, key).checkpoint = first - 1;
  assert.ok(startExpedition(game, key, first));
  let r = null;
  while (game.expedition) r = clearFloor(game);
  return r;
}

test('médailles : une par difficulté à partir de Horreur, la dernière est la majeure', () => {
  const list = medalDifficulties();
  assert.deepEqual(list, DIFFICULTY_ORDER.slice(DIFFICULTY_ORDER.indexOf(MEDALS.from)));
  assert.deepEqual(list, ['horreur', 'cauchemar', 'insanie']);
  assert.equal(medalRank('guerre'), null);
  assert.deepEqual(medalRank('horreur'), { rank: 0, count: 3, major: false });
  assert.deepEqual(medalRank('insanie'), { rank: 2, count: 3, major: true });
});

test('battre le dernier boss en Horreur donne la médaille de la zone, une seule fois ; pas en Guerre', () => {
  const war = newGame('guerre');
  const r0 = beatLastBoss(war, 'foretMaudite');
  assert.equal(r0.cleared, true);
  assert.equal(r0.medal, null);
  assert.ok(zoneMedals(war, 'foretMaudite').every((m) => !m.won));

  const game = newGame('horreur');
  const r1 = beatLastBoss(game, 'foretMaudite');
  assert.equal(r1.medal, 'horreur');
  assert.ok(hasMedal(game, 'foretMaudite', 'horreur'));
  assert.equal(hasMedal(game, 'catacombes', 'horreur'), false);
  const r2 = beatLastBoss(game, 'foretMaudite');
  assert.equal(r2.medal, null, 'déjà gagnée');
  assert.deepEqual(zoneMedals(game, 'foretMaudite').map((m) => m.won), [true, false, false]);
  assert.equal(awardMedal(game, 'foretMaudite', 'insanie'), 'insanie');
  assert.deepEqual(progressOf(game, 'foretMaudite').medals, ['horreur', 'insanie']);
});

test('dessin : métal de plus en plus précieux avec le rang, zones différentes, emplacement vide sans emblème', () => {
  assert.ok(medalMetal(0, 3) < medalMetal(1, 3) && medalMetal(1, 3) < medalMetal(2, 3));
  assert.equal(medalMetal(0, 1), medalMetal(4, 5), 'une seule médaille : la plus précieuse');
  const low = medalPixels('foretMaudite', medalRank('horreur'));
  const top = medalPixels('foretMaudite', medalRank('insanie'));
  for (const m of [low, top]) {
    assert.equal(m.w, MEDAL_W);
    assert.equal(m.h, MEDAL_H);
    assert.ok(m.px.every(([x, y]) => x >= 0 && y >= 0 && x < MEDAL_W && y < MEDAL_H));
  }
  assert.ok(top.px.length > low.px.length, 'la majeure a plus d’ornements (rayons, laurier)');
  assert.ok(top.sparks.length > low.sparks.length);
  const other = medalPixels('picsGeles', medalRank('horreur'));
  assert.notDeepEqual(other.px, low.px);
  const empty = medalPixels('foretMaudite', medalRank('horreur'), true);
  assert.equal(empty.sparks.length, 0);
});
