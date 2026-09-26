import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills, gainXp, xpToNext } from '../src/game/party.js';
import {
  branchesOf, pointsAvailable, cannotLearnReason, learn, resetTalents, resetCost, rankOf,
} from '../src/game/talents.js';
import { applyVictory, xpReward } from '../src/game/progression.js';
import { createEnemies } from '../src/game/enemies.js';
import { TALENTS } from '../src/data/talents.js';
import { CLASSES } from '../src/data/classes.js';

beforeEach(() => setRandomSource(() => 0.5));

const newGame = () => ({ party: createParty(), bag: [], gold: 1000, dungeonLvl: 1 });

test('chaque classe a ses orientations du design doc, avec 5 paliers', () => {
  const names = (k) => TALENTS[k].map((b) => b.key);
  assert.deepEqual(names('guerrier'), ['gardien', 'berserker']);
  assert.deepEqual(names('voleur'), ['assassin', 'empoisonneur']);
  assert.deepEqual(names('pretre'), ['clerc', 'precheur', 'profane']);
  assert.deepEqual(names('mage'), ['feu', 'glace', 'foudre']);
  const ids = new Set();
  for (const branches of Object.values(TALENTS)) {
    for (const b of branches) {
      assert.deepEqual(b.nodes.map((n) => n.tier), [0, 1, 2, 3, 4]);
      for (const n of b.nodes) {
        assert.ok(!ids.has(n.id), `id en double : ${n.id}`);
        ids.add(n.id);
        if (n.kind === 'skill') assert.ok(n.skill?.id, `${n.id} doit accorder une compétence`);
        if (n.skillMod) {
          const all = [...Object.values(CLASSES).flatMap((c) => c.skills), ...Object.values(TALENTS).flat().flatMap((br) => br.nodes).map((x) => x.skill).filter(Boolean)];
          assert.ok(all.some((s) => s.id === n.skillMod.skill), `${n.id} vise une compétence inconnue`);
        }
      }
    }
  }
});

test('1 point de talent par niveau ; les paliers se débloquent par points investis', () => {
  const [guerrier] = createParty();
  assert.equal(pointsAvailable(guerrier), 1);
  assert.match(cannotLearnReason(guerrier, 'provocation'), /2 points/);
  assert.ok(learn(guerrier, 'peau-de-fer'));
  assert.equal(pointsAvailable(guerrier), 0);
  assert.match(cannotLearnReason(guerrier, 'peau-de-fer'), /Aucun point/);
  guerrier.level = 3;
  learn(guerrier, 'peau-de-fer');
  assert.equal(cannotLearnReason(guerrier, 'provocation'), null);
  assert.ok(learn(guerrier, 'provocation'));
  assert.equal(rankOf(guerrier, 'provocation'), 1);
  assert.match(cannotLearnReason(guerrier, 'provocation'), /maximum/);
});

test('les talents modifient les stats et ajoutent des compétences', () => {
  const [guerrier] = createParty();
  guerrier.level = 10;
  const pv = getStats(guerrier).pv;
  learn(guerrier, 'peau-de-fer');
  assert.equal(getStats(guerrier).pv, Math.round(pv * 1.05));
  learn(guerrier, 'peau-de-fer');
  learn(guerrier, 'provocation');
  assert.ok(getSkills(guerrier).some((s) => s.id === 'provocation'));
});

test("un talent peut améliorer une compétence existante", () => {
  const [, , pretre] = createParty();
  pretre.level = 10;
  for (const id of ['devotion', 'devotion', 'devotion', 'priere-de-soins', 'meditation', 'meditation', 'grace']) {
    assert.ok(learn(pretre, id), id);
  }
  const soin = getSkills(pretre).find((s) => s.id === 'soin-majeur');
  assert.equal(soin.cost, 25);
  assert.equal(soin.power, 1.32);
  assert.equal(getStats(pretre).healPct, 18);
});

test('réinitialiser rend tous les points contre de l\'or', () => {
  const game = newGame();
  const [guerrier] = game.party;
  guerrier.level = 4;
  learn(guerrier, 'soif-de-sang');
  learn(guerrier, 'soif-de-sang');
  const cost = resetCost(guerrier);
  assert.ok(resetTalents(game, guerrier));
  assert.equal(game.gold, 1000 - cost);
  assert.equal(pointsAvailable(guerrier), 4);
  assert.equal(resetTalents(game, guerrier), false, 'rien à réinitialiser');
});

test("l'XP fait monter de niveau, avec les PV qui augmentent", () => {
  const [guerrier] = createParty();
  const pv = getStats(guerrier).pv;
  assert.equal(gainXp(guerrier, xpToNext(1) - 1), 0);
  assert.equal(gainXp(guerrier, 1), 1);
  assert.equal(guerrier.level, 2);
  assert.equal(guerrier.xp, 0);
  assert.equal(getStats(guerrier).pv, pv + CLASSES.guerrier.growth.pv);
  assert.equal(guerrier.hp, getStats(guerrier).pv);
  assert.equal(pointsAvailable(guerrier), 2);
});

test('une victoire donne de l\'XP à chaque héros', () => {
  const game = newGame();
  const enemies = createEnemies(['gobelin', 'gobelin'], 1);
  const xp = xpReward(1, enemies);
  applyVictory(game, { level: 1, enemies });
  game.party.forEach((h) => assert.equal(h.xp, xp));
});

test('toutes les compétences de talents sont définies correctement', () => {
  for (const [classKey, branches] of Object.entries(TALENTS)) {
    for (const b of branches) {
      for (const n of b.nodes.filter((x) => x.skill)) {
        const s = n.skill;
        assert.ok(['damage', 'heal', 'revive', 'support'].includes(s.kind), `${classKey}/${s.id} kind`);
        assert.ok(['enemy', 'ally', 'allEnemies', 'allAllies', 'self', 'deadAlly'].includes(s.target), `${s.id} target`);
        assert.ok(s.cost > 0 && s.cost <= CLASSES[classKey].resource.max, `${s.id} coût`);
        if (s.kind !== 'support') assert.ok(s.power > 0, `${s.id} power`);
      }
    }
  }
  assert.ok(branchesOf({ classKey: 'mage' }).length === 3);
});
