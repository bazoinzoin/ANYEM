import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills, gainXp, xpToNext } from '../src/game/party.js';
import {
  branchesOf, pointsAvailable, cannotLearnReason, learn, resetTalents, resetCost, rankOf,
} from '../src/game/talents.js';
import { applyVictory, xpReward } from '../src/game/progression.js';
import { createEnemies } from '../src/game/enemies.js';
import { TALENTS, nodeSkills } from '../src/data/talents.js';
import { CLASSES } from '../src/data/classes.js';

beforeEach(() => setRandomSource(() => 0.5));

const newGame = () => ({ party: createParty(), bag: [], gold: 1000, dungeonLvl: 1 });

test('chaque classe a ses orientations du design doc : 10 paliers, 50 rangs, une signature au palier 9', () => {
  const names = (k) => TALENTS[k].map((b) => b.key);
  assert.deepEqual(names('guerrier'), ['gardien', 'berserker']);
  assert.deepEqual(names('voleur'), ['assassin', 'empoisonneur']);
  assert.deepEqual(names('pretre'), ['clerc', 'precheur', 'profane']);
  assert.deepEqual(names('mage'), ['feu', 'glace', 'foudre']);
  assert.deepEqual(names('chasseur'), ['oeilDeFaucon', 'traqueur']);
  assert.deepEqual(names('paladin'), ['templier', 'lumiere']);
  assert.deepEqual(Object.keys(TALENTS).sort(), Object.keys(CLASSES).sort());
  const ids = new Set();
  for (const branches of Object.values(TALENTS)) {
    for (const b of branches) {
      assert.deepEqual([...new Set(b.nodes.map((n) => n.tier))], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], b.key);
      assert.equal(b.nodes.reduce((sum, n) => sum + n.ranks, 0), 50, `${b.key} : 50 rangs pour 50 niveaux`);
      const last = b.nodes.filter((n) => n.tier === 9);
      assert.ok(last.length === 1 && last[0].kind === 'signature' && last[0].skill, `${b.key} : signature au palier 9`);
      // Chaque palier est atteignable avec les rangs des paliers précédents.
      for (let t = 1; t <= 9; t++) {
        const before = b.nodes.filter((n) => n.tier < t).reduce((sum, n) => sum + n.ranks, 0);
        assert.ok(before >= t * 5, `${b.key} : palier ${t} inaccessible`);
      }
      for (const n of b.nodes) {
        assert.ok(!ids.has(n.id), `id en double : ${n.id}`);
        ids.add(n.id);
        if (n.kind === 'skill' || n.kind === 'signature') assert.ok(nodeSkills(n).length && nodeSkills(n).every((s) => s.id), `${n.id} doit accorder une compétence`);
        for (const mod of [].concat(n.skillMod ?? [])) {
          const all = Object.values(TALENTS).flat().flatMap((br) => br.nodes).flatMap(nodeSkills);
          assert.ok(all.some((s) => s.id === mod.skill), `${n.id} vise une compétence inconnue`);
        }
      }
    }
  }
});

test('1 point de talent par niveau ; les paliers se débloquent par points investis', () => {
  const [guerrier] = createParty();
  assert.equal(pointsAvailable(guerrier), 1);
  assert.match(cannotLearnReason(guerrier, 'provocation'), /5 points/);
  assert.ok(learn(guerrier, 'peau-de-fer'));
  assert.equal(pointsAvailable(guerrier), 0);
  assert.match(cannotLearnReason(guerrier, 'peau-de-fer'), /Aucun point/);
  guerrier.level = 6;
  for (const id of ['peau-de-fer', 'depart-gardien', 'posture-defensive']) assert.ok(learn(guerrier, id), id);
  assert.match(cannotLearnReason(guerrier, 'provocation'), /5 points/);
  learn(guerrier, 'posture-defensive');
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
  assert.equal(getStats(guerrier).pv, Math.round(pv * 1.04));
  for (const id of ['peau-de-fer', 'depart-gardien', 'posture-defensive', 'posture-defensive', 'provocation']) assert.ok(learn(guerrier, id), id);
  assert.ok(getSkills(guerrier).some((s) => s.id === 'provocation'));
});

test("un talent peut améliorer une compétence existante", () => {
  const [, , pretre] = createParty();
  pretre.level = 20;
  for (const id of ['depart-clerc', 'devotion', 'devotion', 'sagesse', 'sagesse', 'priere-de-soins', 'meditation', 'meditation', 'meditation', 'meditation',
    'lumiere-bienveillante', 'lumiere-bienveillante', 'lumiere-bienveillante', 'robustesse-sacree', 'robustesse-sacree', 'grace']) {
    assert.ok(learn(pretre, id), id);
  }
  const soin = getSkills(pretre).find((s) => s.id === 'soin-majeur');
  assert.equal(soin.cost, 25);
  assert.equal(soin.power, 1.32);
  assert.equal(getStats(pretre).healPct, 10);
  assert.equal(getStats(pretre).resMax, 100);
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

test('niveau maximum 50 : 50 points, de quoi compléter une seule orientation', () => {
  const [guerrier] = createParty();
  gainXp(guerrier, 10_000_000);
  assert.equal(guerrier.level, 50);
  assert.equal(guerrier.xp, 0);
  assert.equal(gainXp(guerrier, 1000), 0);
  assert.equal(guerrier.level, 50);
  assert.equal(pointsAvailable(guerrier), 50);
  const [gardien, berserker] = branchesOf(guerrier);
  let learned = true;
  while (learned) learned = gardien.nodes.some((n) => learn(guerrier, n.id));
  assert.equal(rankOf(guerrier, 'dernier-rempart'), 1, 'la signature est atteinte');
  assert.equal(pointsAvailable(guerrier), 0);
  assert.ok(berserker.nodes.every((n) => rankOf(guerrier, n.id) === 0));
});

test('un héros commence sans sort : le sort de départ est son premier point de talent (palier 0)', () => {
  const party = createParty();
  for (const hero of party) assert.deepEqual(getSkills(hero), [], hero.classKey);
  const [, voleur, pretre] = party;
  assert.ok(learn(voleur, 'depart-assassin'));
  assert.deepEqual(getSkills(voleur).map((s) => s.id), ['coup-vicieux', 'evisceration']);
  voleur.level = 2;
  assert.ok(learn(voleur, 'depart-empoisonneur'));
  assert.deepEqual(getSkills(voleur).map((s) => s.id), ['coup-vicieux', 'evisceration', 'laceration'], 'pas de doublon');
  assert.ok(learn(pretre, 'depart-profane'));
  assert.deepEqual(getSkills(pretre).map((s) => s.id), ['trait-d-ombre']);
  for (const branches of Object.values(TALENTS)) {
    for (const b of branches) assert.ok(b.nodes.some((n) => n.tier === 0 && nodeSkills(n).length), `${b.key} : sort de départ au palier 0`);
  }
});
