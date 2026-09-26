import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills } from '../src/game/party.js';
import { learn } from '../src/game/talents.js';
import { createCombat, nextTurn, heroAct, enemyAct, targetsFor } from '../src/game/combat.js';
import { statsOf, damage } from '../src/game/units.js';
import { addStatus, tickStatuses } from '../src/game/statuses.js';
import { estimateHit, BASIC_ATTACK } from '../src/game/formulas.js';

beforeEach(() => setRandomSource(() => 0.5));

// Crée un combat où le héros d'index `heroIndex` connaît les talents donnés,
// et joue jusqu'à son tour.
function setup(heroIndex, talents = []) {
  const party = createParty();
  const hero = party[heroIndex];
  hero.level = 20;
  for (const id of talents) assert.ok(learn(hero, id), id);
  hero.res = 999;
  const cb = createCombat({ dungeonKey: 'foretMaudite', level: 1, party });
  for (let i = 0; i < 50; i++) {
    const turn = nextTurn(cb);
    if (turn.unit === hero) {
      hero.res = 999;
      return { cb, hero, party };
    }
    if (turn.side === 'hero') heroAct(cb, { type: 'defend' });
    else enemyAct(cb);
  }
  throw new Error('héros jamais actif');
}

const skillIndex = (hero, id) => getSkills(hero).findIndex((s) => s.id === id);

const PATH = {
  gardien: ['peau-de-fer', 'peau-de-fer', 'peau-de-fer', 'provocation', 'maitrise-bouclier', 'maitrise-bouclier', 'maitrise-bouclier', 'rempart', 'mur-de-boucliers'],
  berserker: ['soif-de-sang', 'soif-de-sang', 'soif-de-sang', 'frappe-sauvage', 'furie', 'furie', 'furie', 'berserk', 'dechainement'],
  assassin: ['precision', 'precision', 'precision', 'taillade', 'lames-aiguisees', 'lames-aiguisees', 'lames-aiguisees', 'opportuniste', 'deluge-de-lames'],
  clerc: ['devotion', 'devotion', 'devotion', 'priere-de-soins', 'meditation', 'meditation', 'meditation', 'grace', 'resurrection'],
  profane: ['ombre', 'ombre', 'ombre', 'mot-de-douleur', 'esprit-sombre', 'esprit-sombre', 'esprit-sombre', 'confusion', 'fleau'],
  glace: ['givre', 'givre', 'givre', 'eclat-de-glace', 'hiver', 'hiver', 'hiver', 'nova-de-givre', 'prison-de-glace'],
  precheur: ['foi', 'foi', 'foi', 'renovation', 'lumiere-interieure', 'lumiere-interieure', 'lumiere-interieure', 'bouclier-sacre', 'benediction'],
};

test('bouclier : absorbe les dégâts avant les PV puis disparaît', () => {
  const [g] = createParty();
  addStatus(g, { key: 'b', name: 'B', kind: 'buff', turns: 2, shield: 10 });
  const hp = g.hp;
  assert.deepEqual(damage(g, 6), { taken: 0, absorbed: 6, fell: false });
  assert.deepEqual(damage(g, 7), { taken: 3, absorbed: 4, fell: false });
  assert.equal(g.hp, hp - 3);
  assert.equal(g.statuses.length, 0);
});

test('les statuts expirent après leur durée ; les modificateurs changent les stats de combat', () => {
  const [g] = createParty();
  addStatus(g, { key: 'lent', name: 'Ralenti', kind: 'debuff', turns: 2, mods: { vit: -50 } });
  assert.equal(statsOf(g).vit, Math.round(getStats(g).vit * 0.5));
  assert.equal(statsOf(g).debuffed, true);
  tickStatuses(g);
  assert.equal(g.statuses.length, 1);
  tickStatuses(g);
  assert.equal(g.statuses.length, 0);
  assert.equal(statsOf(g).vit, getStats(g).vit);
});

test('Gardien : Provocation force les ennemis à attaquer le guerrier', () => {
  const { cb, hero } = setup(0, PATH.gardien.slice(0, 4));
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'provocation') }));
  const others = cb.party.filter((h) => h !== hero).map((h) => h.hp);
  for (let i = 0; i < 6; i++) {
    const turn = nextTurn(cb);
    if (!turn) break;
    if (turn.side === 'enemy') enemyAct(cb);
    else heroAct(cb, { type: 'defend' });
  }
  assert.deepEqual(cb.party.filter((h) => h !== hero).map((h) => h.hp), others);
});

test('Gardien : Mur de boucliers protège toute l\'équipe', () => {
  const { cb, hero } = setup(0, PATH.gardien);
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'mur-de-boucliers') });
  cb.party.forEach((h) => assert.ok(h.statuses.some((s) => s.shield > 0), h.name));
});

test('Gardien : Rempart ajoute un bouclier en défendant', () => {
  const { cb, hero } = setup(0, PATH.gardien.slice(0, 8));
  heroAct(cb, { type: 'defend' });
  assert.equal(hero.statuses.find((s) => s.key === 'rempart').shield, Math.round(getStats(hero).pv * 0.15));
});

test('Berserker : plus de PV manquants = plus de puissance physique', () => {
  const { hero } = setup(0, PATH.berserker.slice(0, 8));
  hero.hp = getStats(hero).pv;
  const full = statsOf(hero).physPower;
  hero.hp = Math.round(getStats(hero).pv * 0.3);
  assert.equal(statsOf(hero).physPower, Math.round(full * (1 + 0.03 * 7)));
});

test('Assassin : Déluge de lames frappe 4 fois ; Opportuniste renforce contre une cible ralentie', () => {
  const { cb, hero } = setup(1, PATH.assassin);
  const target = cb.enemies[0];
  target.hp = target.stats.pv = 9999;
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'deluge-de-lames'), target: 0 });
  assert.match(cb.log[0].text, /\d+\*? \+ \d+\*? \+ \d+\*? \+ \d+\*? dégâts/);
  const a = statsOf(hero);
  const plain = { ...statsOf(target), debuffed: false };
  const slowed = { ...plain, debuffed: true };
  assert.ok(estimateHit(a, BASIC_ATTACK, slowed).lo > estimateHit(a, BASIC_ATTACK, plain).lo);
});

test('Clerc : Résurrection ramène un allié tombé, uniquement s\'il y en a un', () => {
  const { cb, hero } = setup(2, PATH.clerc);
  const idx = skillIndex(hero, 'resurrection');
  assert.equal(heroAct(cb, { type: 'skill', skill: idx, target: 0 }), false, 'personne à relever');
  const [g] = cb.party;
  g.alive = false;
  g.hp = 0;
  assert.deepEqual(targetsFor(cb, { type: 'skill', skill: idx }).units, [g]);
  assert.ok(heroAct(cb, { type: 'skill', skill: idx, target: 0 }));
  assert.equal(g.alive, true);
  assert.equal(g.hp, Math.round(getStats(g).pv * 0.4));
});

test('Clerc : Prière de soins soigne toute l\'équipe', () => {
  const { cb, hero } = setup(2, PATH.clerc.slice(0, 4));
  cb.party.forEach((h) => { h.hp = 10; });
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'priere-de-soins') });
  cb.party.forEach((h) => assert.ok(h.hp > 10, h.name));
});

test('Prêcheur : Rénovation soigne à chaque fin de round', () => {
  const { cb, hero } = setup(2, PATH.precheur.slice(0, 4));
  const [g] = cb.party;
  g.hp = 10;
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'renovation'), target: 0 });
  const hot = g.statuses.find((s) => s.key === 'renovation');
  assert.ok(hot.hot > 0);
  tickStatuses(g);
  assert.equal(g.statuses.find((s) => s.key === 'renovation').turns, 3);
});

test('Profane : Confusion fait frapper un allié à l\'ennemi confus', () => {
  const { cb, hero } = setup(2, PATH.profane.slice(0, 8));
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'confusion'), target: 0 });
  const [confused, other] = cb.enemies;
  assert.ok(confused.statuses.some((s) => s.confuse));
  setRandomSource(() => 0.1); // < 0,5 : frappe un allié
  const hp = other.hp;
  cb.acting = { side: 'enemy', unit: confused };
  enemyAct(cb);
  assert.ok(other.hp < hp);
  assert.match(cb.log[0].text, /confus/);
});

test('Glace : Prison de glace fait perdre son tour à la cible', () => {
  const { cb, hero } = setup(3, PATH.glace);
  const target = cb.enemies[0];
  target.hp = target.stats.pv = 9999;
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'prison-de-glace'), target: 0 });
  assert.ok(target.statuses.some((s) => s.stun));
  let skipped = false;
  for (let i = 0; i < 12; i++) {
    const turn = nextTurn(cb);
    if (cb.log[0].text.includes('étourdi')) skipped = true;
    if (turn.side === 'enemy') enemyAct(cb); else heroAct(cb, { type: 'defend' });
    if (skipped) break;
  }
  assert.ok(skipped);
  assert.ok(!target.statuses.some((s) => s.stun), "l'étourdissement est consommé");
});

test('Glace : Éclat de glace ralentit la cible', () => {
  const { cb, hero } = setup(3, PATH.glace.slice(0, 4));
  const target = cb.enemies[0];
  target.hp = target.stats.pv = 9999;
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'eclat-de-glace'), target: 0 });
  assert.equal(statsOf(target).vit, Math.round(target.stats.vit * 0.7));
});
