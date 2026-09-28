import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills, gainXp, xpToNext } from '../src/game/party.js';
import {
  branchesOf, pointsAvailable, cannotLearnReason, learn, resetTalents, resetCost, rankOf, tiersOf, tierRequirement, sanitizeTalents,
} from '../src/game/talents.js';
import { learnPath } from './helpers.js';
import { EFFECTS } from '../src/data/effects.js';
import { applyVictory, xpReward } from '../src/game/progression.js';
import { createEnemies } from '../src/game/enemies.js';
import { TALENTS, nodeSkills, CHOICE_RANKS, CHOICE_PICKS, SIGNATURE_TIER } from '../src/data/talents.js';
import { CLASSES } from '../src/data/classes.js';

beforeEach(() => setRandomSource(() => 0.5));

const newGame = () => ({ party: createParty(), bag: [], gold: 1000, dungeonLvl: 1 });

// Compétence d'un nœud qui inflige des dégâts sur la durée, soigne, protège…
const DOT_EFFECTS = ['poison', 'saignement', 'brulure', 'tenebres'];
const skillFlags = (s) => {
  const effects = [...(s.effects ?? []), ...(s.selfEffects ?? [])].map((e) => e.id);
  return {
    dot: effects.some((e) => DOT_EFFECTS.includes(e)),
    heal: s.kind === 'heal' || effects.includes('regeneration'),
    shield: effects.includes('bouclier'),
    debuff: effects.some((e) => EFFECTS[e]?.kind === 'debuff'),
    aoe: s.target === 'allEnemies',
    trap: effects.some((e) => EFFECTS[e]?.trap || e.startsWith('piege')),
    finisher: !!s.finisher,
  };
};
// Bonus de petit palier → ce que la branche doit déjà offrir pour qu'il ait un sens.
const NEEDS = { dotPct: 'dot', healPct: 'heal', shieldPct: 'shield', vsDebuffedPct: 'debuff', aoePct: 'aoe', trapPct: 'trap', finisherRefund: 'finisher' };

test('chaque orientation alterne gros paliers (obligatoires) et petits paliers (2 bonus sur 3), jusqu\'à la signature', () => {
  const names = (k) => TALENTS[k].map((b) => b.key);
  assert.deepEqual(names('guerrier'), ['gardien', 'berserker']);
  assert.deepEqual(names('voleur'), ['assassin', 'empoisonneur']);
  assert.deepEqual(names('pretre'), ['clerc', 'precheur', 'profane']);
  assert.deepEqual(names('mage'), ['feu', 'glace', 'foudre']);
  assert.deepEqual(names('chasseur'), ['oeilDeFaucon', 'traqueur']);
  assert.deepEqual(names('paladin'), ['templier', 'lumiere']);
  assert.deepEqual(Object.keys(TALENTS).sort(), Object.keys(CLASSES).sort());
  const ids = new Set();
  const all = Object.values(TALENTS).flat().flatMap((br) => br.nodes).flatMap(nodeSkills);
  for (const branches of Object.values(TALENTS)) {
    for (const b of branches) {
      assert.deepEqual(tiersOf(b), [...Array(SIGNATURE_TIER + 1).keys()], b.key);
      for (const t of tiersOf(b)) {
        const nodes = b.nodes.filter((n) => n.tier === t);
        if (t % 2) {
          assert.equal(nodes.length, 3, `${b.key} palier ${t} : 3 bonus au choix`);
          assert.ok(nodes.every((n) => n.kind === 'minor' && n.ranks === CHOICE_RANKS[t]), `${b.key} palier ${t}`);
        } else {
          assert.equal(nodes.length, 1, `${b.key} palier ${t} : un gros palier`);
          assert.equal(nodes[0].ranks, 1);
          assert.ok(t === 0 ? nodeSkills(nodes[0]).length : t === SIGNATURE_TIER ? nodes[0].kind === 'signature' : ['skill', 'passive'].includes(nodes[0].kind), `${b.key} palier ${t}`);
        }
      }
      assert.equal(tierRequirement(b, 99), 50, `${b.key} : 50 points (tous ceux du niveau maximum) pour l'orientation entière`);
      // Plus de gros nœuds qu'avant (8), et les petits paliers ne dominent plus l'arbre.
      assert.equal(b.nodes.filter((n) => n.kind !== 'minor').length, 8, b.key);
      assert.equal(CHOICE_PICKS, 2);
      // Logique : un bonus ne vient qu'après ce qu'il renforce (pas de bonus aux dégâts sur la
      // durée avant le premier sort qui en inflige…).
      const offered = {};
      for (const t of tiersOf(b)) {
        for (const n of b.nodes.filter((x) => x.tier === t)) {
          for (const key of Object.keys(n.passive ?? {})) {
            if (NEEDS[key]) assert.ok(offered[NEEDS[key]] || key === 'shieldPct' && offered.guardShield, `${b.key} : ${n.name} (${key}) avant la première compétence qui en profite`);
          }
        }
        for (const n of b.nodes.filter((x) => x.tier === t)) {
          for (const s of nodeSkills(n)) for (const [k, v] of Object.entries(skillFlags(s))) if (v) offered[k] = true;
          if (n.passive?.guardShieldPct) offered.guardShield = true;
        }
      }
      for (const n of b.nodes) {
        assert.ok(!ids.has(n.id), `id en double : ${n.id}`);
        ids.add(n.id);
        assert.ok(n.desc, n.id);
        for (const mod of [].concat(n.skillMod ?? [])) assert.ok(all.some((s) => s.id === mod.skill), `${n.id} vise une compétence inconnue`);
      }
    }
  }
});

test('1 point par niveau ; petits paliers : deux bonus sur trois ; gros paliers obligatoires', () => {
  const [guerrier] = createParty();
  assert.equal(pointsAvailable(guerrier), 1);
  assert.match(cannotLearnReason(guerrier, 'peau-de-fer'), /Cri de guerre/);
  assert.ok(learn(guerrier, 'depart-gardien'));
  assert.match(cannotLearnReason(guerrier, 'peau-de-fer'), /Aucun point/);
  guerrier.level = 10;
  assert.ok(learn(guerrier, 'peau-de-fer'));
  assert.ok(learn(guerrier, 'posture-defensive'), 'deuxième bonus du palier');
  assert.match(cannotLearnReason(guerrier, 'robustesse'), /Choix déjà faits : Peau de fer et Posture défensive/);
  assert.match(cannotLearnReason(guerrier, 'provocation'), /palier 1/);
  assert.ok(learn(guerrier, 'peau-de-fer'));
  assert.ok(learn(guerrier, 'peau-de-fer'));
  assert.match(cannotLearnReason(guerrier, 'peau-de-fer'), /maximum/);
  assert.match(cannotLearnReason(guerrier, 'provocation'), /palier 1/, 'les deux bonus au rang maximum');
  assert.ok(learn(guerrier, 'posture-defensive'));
  assert.ok(learn(guerrier, 'posture-defensive'));
  assert.match(cannotLearnReason(guerrier, 'endurance'), /Provocation/, 'le gros palier passe avant le suivant');
  assert.ok(learn(guerrier, 'provocation'));
  assert.equal(rankOf(guerrier, 'provocation'), 1);
  assert.ok(learn(guerrier, 'endurance'));
  assert.match(cannotLearnReason(guerrier, 'depart-berserker'), /Une seule orientation/, 'une seule orientation par héros');
  const [other] = createParty();
  assert.match(cannotLearnReason(other, 'soif-de-sang'), /Frappe brutale/, 'une orientation commence par son sort de départ');
});

test('les talents modifient les stats et ajoutent des compétences', () => {
  const [guerrier] = createParty();
  guerrier.level = 10;
  learn(guerrier, 'depart-gardien');
  const pv = getStats(guerrier).pv;
  learn(guerrier, 'peau-de-fer');
  assert.equal(getStats(guerrier).pv, Math.round(pv * 1.025));
  for (const id of ['peau-de-fer', 'peau-de-fer', 'posture-defensive', 'posture-defensive', 'posture-defensive', 'provocation']) assert.ok(learn(guerrier, id), id);
  assert.ok(getSkills(guerrier).some((s) => s.id === 'provocation'));
});

test("un gros palier peut améliorer une compétence existante (Clerc : Grâce)", () => {
  const [, , pretre] = createParty();
  pretre.level = 20;
  learnPath(pretre, 'clerc', { upTo: 4, pick: ['sagesse', 'ferveur'] });
  const soin = getSkills(pretre).find((s) => s.id === 'soin-majeur');
  assert.equal(soin.cost, 25);
  assert.equal(soin.power, 1.32);
  assert.equal(getStats(pretre).healPct, 15);
  assert.equal(getStats(pretre).resMax, 92);
});

test('réinitialiser rend tous les points contre de l\'or (et libère les choix)', () => {
  const game = newGame();
  const [guerrier] = game.party;
  guerrier.level = 4;
  learn(guerrier, 'depart-berserker');
  learn(guerrier, 'soif-de-sang');
  learn(guerrier, 'brutalite');
  assert.match(cannotLearnReason(guerrier, 'fureur'), /Choix déjà faits/);
  const cost = resetCost(guerrier);
  assert.ok(resetTalents(game, guerrier));
  assert.equal(game.gold, 1000 - cost);
  assert.equal(pointsAvailable(guerrier), 4);
  learn(guerrier, 'depart-berserker');
  assert.ok(learn(guerrier, 'fureur'));
  assert.equal(resetTalents(game, { ...guerrier, talents: {} }), false, 'rien à réinitialiser');
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
        // Classe qui paie en PV (Scarifié) : coût en % des PV max (un sacrifice coûte « tout sauf 1 »).
        if (CLASSES[classKey].resource.hp) assert.ok(s.sacrifice ? s.cost === 0 : s.cost > 0 && s.cost <= 30, `${s.id} coût (% PV)`);
        else assert.ok(s.cost > 0 && s.cost <= CLASSES[classKey].resource.max, `${s.id} coût`);
        if (s.kind !== 'support') assert.ok(s.power > 0, `${s.id} power`);
      }
    }
  }
  assert.ok(branchesOf({ classKey: 'mage' }).length === 3);
});

test('niveau maximum 50 : 50 points, exactement une orientation complète ; une seule orientation par héros', () => {
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
  assert.equal(rankOf(guerrier, 'dernier-rempart'), 1, 'la signature est atteinte avec le dernier point');
  assert.equal(pointsAvailable(guerrier), 0);
  guerrier.level = 60; // même avec des points en trop, pas de seconde orientation
  assert.equal(berserker.nodes.some((n) => learn(guerrier, n.id)), false);
});

test('un héros commence sans sort : le sort de départ est son premier point de talent (palier 0)', () => {
  const party = createParty();
  for (const hero of party) assert.deepEqual(getSkills(hero), [], hero.classKey);
  const [, voleur, pretre] = party;
  assert.ok(learn(voleur, 'depart-assassin'));
  assert.deepEqual(getSkills(voleur).map((s) => s.id), ['coup-vicieux', 'evisceration']);
  voleur.level = 2;
  assert.equal(learn(voleur, 'depart-empoisonneur'), false, 'une seule orientation');
  assert.ok(learn(pretre, 'depart-profane'));
  assert.deepEqual(getSkills(pretre).map((s) => s.id), ['trait-d-ombre']);
  for (const branches of Object.values(TALENTS)) {
    for (const b of branches) assert.ok(b.nodes.some((n) => n.tier === 0 && nodeSkills(n).length), `${b.key} : sort de départ au palier 0`);
  }
});

test('ancienne sauvegarde : talents inconnus retirés, rangs ramenés au maximum, arbre incohérent remboursé', () => {
  const [guerrier] = createParty();
  guerrier.level = 20;
  guerrier.talents = { 'depart-gardien': 1, 'peau-de-fer': 4, 'ancien-talent': 3 };
  assert.equal(sanitizeTalents(guerrier), false);
  assert.deepEqual(guerrier.talents, { 'depart-gardien': 1, 'peau-de-fer': 3 });
  guerrier.talents = { 'depart-gardien': 1, 'peau-de-fer': 2, provocation: 1 };
  assert.equal(sanitizeTalents(guerrier), true, 'Provocation sans palier 1 complet');
  assert.deepEqual(guerrier.talents, {});
  assert.equal(pointsAvailable(guerrier), 20);
  // Points répartis sur deux orientations (ancienne règle) : seule la plus investie reste.
  guerrier.talents = { 'depart-gardien': 1, 'peau-de-fer': 1, 'depart-berserker': 1 };
  sanitizeTalents(guerrier);
  assert.deepEqual(guerrier.talents, { 'depart-gardien': 1, 'peau-de-fer': 1 });
});
