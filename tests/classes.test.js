import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills } from '../src/game/party.js';
import { learnPath } from './helpers.js';
import { createCombat, nextTurn, heroAct, enemyAct } from '../src/game/combat.js';
import { statsOf, damage } from '../src/game/units.js';
import { addStatus, makeStatus } from '../src/game/statuses.js';
import { isMultiAction } from '../src/game/combo.js';

beforeEach(() => setRandomSource(() => 0.5));

// Équipe [Guerrier, Chasseur, Prêtre, Paladin] ; le héros `heroIndex` (niveau 50)
// connaît l'orientation `branchKey` jusqu'au palier `maxTier` ; on joue jusqu'à son tour.
function setup(heroIndex, branchKey, maxTier = 10, pick = []) {
  const party = createParty([], ['guerrier', 'chasseur', 'pretre', 'paladin']);
  const hero = party[heroIndex];
  hero.level = 50;
  learnPath(hero, branchKey, { upTo: maxTier, pick });
  const cb = createCombat({ enemies: ['gobelin', 'gobelin'], level: 1, party });
  cb.enemies.forEach((e) => { e.hp = e.stats.pv = 9999; });
  for (let i = 0; i < 50; i++) {
    const turn = nextTurn(cb);
    if (turn.unit === hero) {
      hero.res = getStats(hero).resMax;
      return { cb, hero, party };
    }
    if (turn.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); }
    else enemyAct(cb);
  }
  throw new Error('héros jamais actif');
}

const skillIndex = (hero, id) => getSkills(hero).findIndex((s) => s.id === id);

test("l'équipe se compose librement parmi les 6 classes", () => {
  const party = createParty(['A', 'B'], ['chasseur', 'paladin', 'paladin', 'mage']);
  assert.deepEqual(party.map((h) => h.classKey), ['chasseur', 'paladin', 'paladin', 'mage']);
  assert.equal(party[0].name, 'A');
  assert.equal(party[2].name, 'Paladin');
});

test("Chasseur : classe à Énergie à l'arc, dégâts physiques sur l'Agilité, sans points de combo", () => {
  const [chasseur] = createParty([], ['chasseur']);
  assert.ok(isMultiAction(chasseur));
  const stats = getStats(chasseur);
  assert.equal(stats.physPower, stats.atq + Math.round(stats.agilite * 0.6));
  assert.ok(getSkills(chasseur).every((s) => !s.comboGain && !s.finisher));
});

test('Traqueur : le Piège à mâchoires se referme au tour de la cible (dégâts, puis elle perd ce tour)', () => {
  const { cb, hero } = setup(1, 'traqueur', 2);
  const target = cb.enemies[0];
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'piege-a-machoires'), target: 0 }));
  const trap = target.statuses.find((s) => s.key === 'piege');
  assert.ok(trap.trap > 0);
  const hp = target.hp;
  heroAct(cb, { type: 'endTurn' });
  let sprung = false;
  for (let i = 0; i < 12 && !sprung; i++) {
    const turn = nextTurn(cb);
    if (cb.log.some((l) => l.text.includes('se referme'))) sprung = true;
    if (turn.side === 'enemy') enemyAct(cb); else { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); }
  }
  assert.ok(sprung);
  assert.equal(target.hp, hp - trap.trap);
  assert.ok(cb.log.some((l) => l.text.includes(`${target.name} est étourdi`)), 'la cible perd son tour');
  assert.ok(!target.statuses.some((s) => s.key === 'piege'));
});

test('Templier : Intercession reporte la moitié des dégâts de l\'allié sur le Paladin', () => {
  const { cb, hero } = setup(3, 'templier', 2);
  const ally = cb.party[2];
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'intercession'), target: 2 }));
  hero.statuses = hero.statuses.filter((s) => !s.shield);
  const [allyHp, palHp] = [ally.hp, hero.hp];
  const r = damage(ally, 40);
  assert.equal(r.redirected, 20);
  assert.equal(ally.hp, allyHp - 20);
  assert.equal(hero.hp, palHp - 20);
});

test('Templier : Sceau de vie soigne sur la Force (puissance physique)', () => {
  const { cb, hero } = setup(3, 'templier', 4);
  hero.hp = 10;
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'sceau-de-vie') }));
  const stats = statsOf(hero);
  assert.equal(hero.hp, 10 + Math.round(stats.physPower * 1.0 * (1 + (stats.healPct ?? 0) / 100)));
  assert.ok(hero.statuses.some((s) => s.key === 'regeneration'));
});

test("Lumière : Lumière de l'aube soigne toute l'équipe", () => {
  const { cb, hero } = setup(3, 'lumiere', 2);
  cb.party.forEach((h) => { h.hp = Math.round(h.hp / 2); });
  const before = cb.party.map((h) => h.hp);
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'lumiere-de-l-aube') }));
  cb.party.forEach((h, i) => assert.ok(h.hp > before[i], h.name));
});

test("Œil de Faucon : Tir fatal est un critique garanti ; l'Énergie limite les gros tirs", () => {
  const { cb, hero } = setup(1, 'oeilDeFaucon');
  hero.res = 100;
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'tir-fatal'), target: 0 }));
  assert.ok(cb.log.some((l) => /Tir fatal.*critiques/.test(l.text)));
  assert.equal(hero.res, 10);
  assert.equal(cb.acting, null, "plus assez d'Énergie : fin du tour");
  assert.match(cb.log[0].text, /plus assez d'Énergie/);
});
