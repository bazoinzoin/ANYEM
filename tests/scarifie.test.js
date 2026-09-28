import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills, hpCost } from '../src/game/party.js';
import { createCombat, nextTurn, heroAct, enemyAct, canUseSkill, effectiveSkill } from '../src/game/combat.js';
import { statsOf, damage } from '../src/game/units.js';
import { addStatus, makeStatus, hasStatus } from '../src/game/statuses.js';
import { castOutOfCombat } from '../src/game/field.js';
import { learnPath } from './helpers.js';

beforeEach(() => setRandomSource(() => 0.5));

// Équipe dont le 1er héros est un Scarifié de niveau 50 ayant suivi `branch` jusqu'au palier `upTo`.
function setup(branch, upTo = 14) {
  const party = createParty(['Sang', 'B', 'C', 'D'], ['scarifie', 'guerrier', 'pretre', 'mage']);
  const [hero] = party;
  hero.level = 50;
  learnPath(hero, branch, { upTo });
  hero.hp = getStats(hero).pv;
  const cb = createCombat({ enemies: ['gobelin', 'gobelin'], level: 1, party });
  for (let i = 0; i < 50; i++) {
    const turn = nextTurn(cb);
    if (turn.unit === hero) return { cb, hero, party };
    if (turn.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); } else enemyAct(cb);
    hero.hp = getStats(hero).pv;
  }
  throw new Error('pas de tour du Scarifié');
}
const skillIndex = (hero, id) => getSkills(hero).findIndex((s) => s.id === id);

test('Scarifié : pas de ressource, les compétences se paient en % des PV max, jamais le dernier PV', () => {
  const { cb, hero } = setup('acharne', 2);
  const s = getSkills(hero)[skillIndex(hero, 'entaille-rituelle')];
  const cost = hpCost(hero, s);
  assert.equal(cost, Math.round(getStats(hero).pv * 0.06));
  const before = hero.hp;
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'entaille-rituelle'), target: 0 }));
  assert.equal(hero.hp, before - cost, 'PV payés (la cible ne riposte pas ici)');
  hero.hp = cost;
  assert.equal(canUseSkill(cb, hero, s), false, 'pas avec exactement le coût : il resterait 0 PV');
  hero.hp = cost + 1;
  assert.equal(canUseSkill(cb, hero, s), true);
});

test('Scarifié : se relève une fois par combat (passif), pas deux', () => {
  const { hero } = setup('acharne', 12);
  const pv = getStats(hero).pv;
  const r = damage(hero, hero.hp + 50);
  assert.equal(r.fell, false);
  assert.ok(r.revived);
  assert.equal(hero.alive, true);
  assert.equal(hero.hp, Math.round(pv * 0.3));
  const again = damage(hero, hero.hp + 50);
  assert.equal(again.fell, true, 'une seule fois par combat');
  assert.equal(hero.alive, false);
});

test('Violent : après s\'être relevé, il perd son tour suivant', () => {
  const { hero } = setup('violent', 12);
  damage(hero, hero.hp + 10);
  assert.equal(hero.alive, true);
  assert.ok(hasStatus(hero, 'stun'), 'Étourdi un tour');
});

test('Dernier souffle : tombe à 1 PV, et frappe plus fort qu\'il a sacrifié de PV ; une fois par combat', () => {
  const { cb, hero } = setup('violent', 14);
  hero.row = 'ranged'; // arc du Violent
  const i = skillIndex(hero, 'dernier-souffle');
  const full = effectiveSkill(hero, getSkills(hero)[i]);
  assert.equal(full.power, +(1.5 + 8 * (hero.hp - 1) / getStats(hero).pv).toFixed(3));
  hero.hp = Math.round(getStats(hero).pv / 2);
  assert.ok(effectiveSkill(hero, getSkills(hero)[i]).power < full.power, 'moins de PV à sacrifier, moins de puissance');
  const before = hero.hp;
  assert.ok(heroAct(cb, { type: 'skill', skill: i, target: 0 }));
  // Tous les PV sauf un sont sacrifiés (le vol de vie peut ensuite en rendre un peu).
  assert.ok(cb.log.some((l) => (l.text ?? l) === `${hero.name} sacrifie ${before - 1} PV.`));
  assert.ok(hero.hp < before / 4);
  hero.hp = getStats(hero).pv;
  assert.equal(canUseSkill(cb, hero, getSkills(hero)[i]), false, 'une fois par combat');
});

test('Liens du sang : Sang partagé donne du vol de vie ; Pacte de sang relève l\'allié une fois', () => {
  const { cb, hero, party } = setup('liensDuSang', 10);
  const ally = party[1];
  assert.equal(statsOf(ally).lifestealPct ?? 0, 0);
  addStatus(ally, makeStatus('sang-partage', 2));
  assert.equal(statsOf(ally).lifestealPct, 25);
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'pacte-de-sang'), target: 1 }));
  assert.ok(ally.statuses.some((s) => s.key === 'pacte-de-sang'));
  const r = damage(ally, ally.hp + 100);
  assert.ok(r.revived);
  assert.equal(ally.hp, Math.round(getStats(ally).pv * 0.35));
  assert.ok(!ally.statuses.some((s) => s.key === 'pacte-de-sang'), 'le pacte est consommé');
  assert.equal(damage(ally, ally.hp + 100).fell, true);
});

test('Liens du sang : soigner hors combat coûte des PV', () => {
  const party = createParty(['Sang', 'B'], ['scarifie', 'guerrier']);
  const [hero, ally] = party;
  hero.level = 20;
  learnPath(hero, 'liensDuSang', { upTo: 0 });
  hero.hp = getStats(hero).pv;
  ally.hp = 1;
  const game = { party, expedition: { dungeonKey: 'foretMaudite', floor: 1 } };
  const before = hero.hp;
  const r = castOutOfCombat(game, 0, skillIndex(hero, 'transfusion'), 1);
  assert.ok(r.ok, r.message);
  assert.ok(hero.hp < before && ally.hp > 1);
  assert.match(r.message, /sacrifiant \d+ PV/);
});
