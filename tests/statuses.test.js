import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills } from '../src/game/party.js';
import { learnPath } from './helpers.js';
import { createCombat, nextTurn, heroAct, enemyAct, targetsFor } from '../src/game/combat.js';
import { statsOf, damage } from '../src/game/units.js';
import { addStatus, tickStatuses, makeStatus } from '../src/game/statuses.js';
import { CLASSES } from '../src/data/classes.js';
import { TALENTS } from '../src/data/talents.js';
import { ENEMIES } from '../src/data/enemies.js';
import { LEGENDARIES } from '../src/data/items.js';
import { EFFECTS } from '../src/data/effects.js';
import { estimateHit, BASIC_ATTACK } from '../src/game/formulas.js';

beforeEach(() => setRandomSource(() => 0.5));

// Crée un combat où le héros d'index `heroIndex` (niveau 50) connaît tous les
// talents de l'orientation `branchKey` jusqu'au palier `maxTier`, et joue jusqu'à son tour.
function setup(heroIndex, branchKey, maxTier = 14, pick = []) {
  const party = createParty();
  const hero = party[heroIndex];
  hero.level = 50;
  learnPath(hero, branchKey, { upTo: maxTier, pick });
  hero.res = 999;
  const cb = createCombat({ enemies: ['gobelin', 'gobelin'], level: 1, party });
  for (let i = 0; i < 50; i++) {
    const turn = nextTurn(cb);
    if (turn.unit === hero) {
      hero.res = 999;
      return { cb, hero, party };
    }
    if (turn.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); }
    else enemyAct(cb);
  }
  throw new Error('héros jamais actif');
}

const skillIndex = (hero, id) => getSkills(hero).findIndex((s) => s.id === id);


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
  const { cb, hero } = setup(0, 'gardien', 2);
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'provocation') }));
  const others = cb.party.filter((h) => h !== hero).map((h) => h.hp);
  for (let i = 0; i < 6; i++) {
    const turn = nextTurn(cb);
    if (!turn) break;
    if (turn.side === 'enemy') enemyAct(cb);
    else { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); }
  }
  assert.deepEqual(cb.party.filter((h) => h !== hero).map((h) => h.hp), others);
});

test('Gardien : Mur de boucliers protège toute l\'équipe', () => {
  const { cb, hero } = setup(0, 'gardien');
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'mur-de-boucliers') });
  cb.party.forEach((h) => assert.ok(h.statuses.some((s) => s.shield > 0), h.name));
});

test('Gardien : Rempart ajoute un bouclier en défendant', () => {
  const { cb, hero } = setup(0, 'gardien', 4);
  heroAct(cb, { type: 'defend' });
  assert.equal(hero.statuses.find((s) => s.key === 'bouclier').shield, Math.round(getStats(hero).pv * 0.2));
});

test('Berserker : plus de PV manquants = plus de puissance physique', () => {
  const { hero } = setup(0, 'berserker', 4);
  hero.hp = getStats(hero).pv;
  const full = statsOf(hero).physPower;
  hero.hp = Math.round(getStats(hero).pv * 0.3);
  assert.equal(statsOf(hero).physPower, Math.round(full * (1 + 0.04 * 7)));
});

test('Assassin : Déluge de lames (finisher) frappe 4 fois ; Vivacité donne plus d\'Énergie', () => {
  const { cb, hero } = setup(1, 'assassin', 10, ['vivacite', 'souffle', 'second-souffle']);
  const target = cb.enemies[0];
  target.hp = target.stats.pv = 9999;
  assert.equal(getStats(hero).resMax, 108);
  assert.equal(getStats(hero).resRegen, 10);
  hero.combo = 3;
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'deluge-de-lames'), target: 0 }));
  assert.match(cb.log[0].text, /3 points de combo.*\d+\*? \+ \d+\*? \+ \d+\*? \+ \d+\*? dégâts/);
});

test('Assassin : Sceau du destin, un critique de générateur donne 1 point de combo de plus', () => {
  const { cb, hero } = setup(1, 'assassin');
  cb.enemies[0].hp = cb.enemies[0].stats.pv = 9999;
  setRandomSource(() => 0); // tous les jets critiques
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'taillade'), target: 0 }));
  assert.equal(hero.combo, 2);
});

test('Empoisonneur : Opportuniste renforce contre une cible affaiblie ; Fiole de peste à pleine puissance dès 3 combos', () => {
  const { cb, hero } = setup(1, 'empoisonneur', 10, ['opportuniste']);
  const a = statsOf(hero);
  const plain = { ...statsOf(cb.enemies[0]), debuffed: false };
  const slowed = { ...plain, debuffed: true };
  assert.ok(estimateHit(a, BASIC_ATTACK, slowed).lo > estimateHit(a, BASIC_ATTACK, plain).lo);
  hero.combo = 3;
  hero.res = 100;
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'fiole-de-peste') }));
  for (const e of cb.enemies.filter((x) => x.alive)) {
    const poison = e.statuses.find((s) => s.key === 'poison');
    // 3 points = la puissance de 5 points (0,05 par point).
    assert.equal(poison.dot, Math.max(1, Math.round(a.physPower * 0.25 * (1 + a.dotPct / 100))));
  }
});

test('Clerc : Résurrection ramène un allié tombé, uniquement s\'il y en a un', () => {
  const { cb, hero } = setup(2, 'clerc');
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
  const { cb, hero } = setup(2, 'clerc', 2);
  cb.party.forEach((h) => { h.hp = 10; });
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'priere-de-soins') });
  cb.party.forEach((h) => assert.ok(h.hp > 10, h.name));
});

test('Prêcheur : Rénovation soigne à chaque fin de round', () => {
  const { cb, hero } = setup(2, 'precheur', 2);
  const [g] = cb.party;
  g.hp = 10;
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'renovation'), target: 0 });
  const hot = g.statuses.find((s) => s.key === 'regeneration');
  assert.ok(hot.hot > 0);
  tickStatuses(g);
  assert.equal(g.statuses.find((s) => s.key === 'regeneration').turns, 3);
});

test('Profane : Confusion fait frapper un allié à l\'ennemi confus', () => {
  const { cb, hero } = setup(2, 'profane', 8);
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

test('Foudre : Onde de choc fait perdre son tour à la cible', () => {
  const { cb, hero } = setup(3, 'foudre', 6);
  const target = cb.enemies[0];
  target.hp = target.stats.pv = 9999;
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'onde-de-choc'), target: 0 });
  assert.ok(target.statuses.some((s) => s.stun));
  let skipped = false;
  for (let i = 0; i < 12; i++) {
    const turn = nextTurn(cb);
    if (cb.log[0].text.includes('étourdi')) skipped = true;
    if (turn.side === 'enemy') enemyAct(cb); else { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); }
    if (skipped) break;
  }
  assert.ok(skipped);
  assert.ok(!target.statuses.some((s) => s.stun), "l'étourdissement est consommé");
});

test('Glace : Éclat de glace ralentit la cible', () => {
  const { cb, hero } = setup(3, 'glace', 2);
  const target = cb.enemies[0];
  target.hp = target.stats.pv = 9999;
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'eclat-de-glace'), target: 0 });
  assert.equal(statsOf(target).vit, Math.round(target.stats.vit * 0.7));
});

test('Berserker : vol de vie et Exécution (dégâts doublés sous 30 % de PV)', () => {
  const { cb, hero } = setup(0, 'berserker', 10, ['vampirisme']);
  const target = cb.enemies[0];
  Object.assign(target.stats, { pv: 10000, def: 0 });
  target.hp = 10000;
  hero.hp = 50;
  heroAct(cb, { type: 'attack', target: 0 });
  assert.ok(hero.hp > 50, 'vol de vie');
  assert.match(cb.log[0].text, /vole \d+ PV/);
  const stats = statsOf(hero);
  const idx = skillIndex(hero, 'execution');
  const skill = getSkills(hero)[idx];
  const opts = { ...BASIC_ATTACK, power: skill.power, executePct: skill.executePct };
  const est = (hp, o) => { target.hp = hp; return estimateHit(stats, o, statsOf(target)).lo; };
  assert.equal(est(9000, opts), est(9000, { ...opts, executePct: 0 }), 'au-dessus de 30 % : pas de bonus');
  assert.ok(est(1000, opts) > est(1000, { ...opts, executePct: 0 }) * 1.7, 'sous 30 % : bonus d\'exécution');
});

test('Gardien : Garde de fer renforce la garde ; les boucliers donnés sont renforcés', () => {
  const { cb, hero } = setup(0, 'gardien', 14, ['bastion', 'protecteur', 'garde-de-fer']);
  assert.equal(statsOf(hero).guardBonus, 11);
  heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'mur-de-boucliers') });
  const shield = cb.party[2].statuses.find((s) => s.key === 'bouclier').shield;
  const base = Math.round(statsOf(hero).physPower * 0.9);
  assert.ok(shield > base * 1.4, `boucliers renforcés par Bastion et Protecteur (${shield} > ${base})`);
});

test("Assassin : Poussée d'adrénaline rend de l'Énergie, une seule fois par combat", () => {
  const { cb, hero } = setup(1, 'assassin');
  hero.res = 20;
  const idx = skillIndex(hero, 'poussee-d-adrenaline');
  assert.ok(heroAct(cb, { type: 'skill', skill: idx }));
  assert.equal(hero.res, 70);
  assert.equal(heroAct(cb, { type: 'skill', skill: idx }), false);
});

test('Clerc : Purification retire les effets négatifs', () => {
  const { cb, hero } = setup(2, 'clerc');
  const [g] = cb.party;
  addStatus(g, makeStatus('poison', 3, 5));
  addStatus(g, makeStatus('puissance', 3));
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'purification'), target: 0 }));
  assert.deepEqual(g.statuses.map((s) => s.key), ['puissance']);
});

test("les effets s'appliquent et se décomptent à la fin du tour de l'unité, pas du round", () => {
  const party = createParty();
  const cb = createCombat({ enemies: ['gobelin', 'gobelin'], level: 1, party });
  let turn = nextTurn(cb);
  while (turn.side !== 'hero' || turn.unit !== party[0]) {
    if (turn.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); } else enemyAct(cb);
    turn = nextTurn(cb);
  }
  const [g] = party;
  const goblin = cb.enemies[0];
  goblin.hp = goblin.stats.pv = 999;
  addStatus(goblin, makeStatus('poison', 2, 7));
  const hp = goblin.hp;
  heroAct(cb, { type: 'defend' }); // fin du tour du guerrier : le poison du gobelin ne bouge pas
  assert.equal(goblin.hp, hp);
  assert.equal(goblin.statuses[0].turns, 2);
  // Le bouclier de Défendre (talent) ou un buff posé sur soi dure bien jusqu'au tour suivant.
  let t = nextTurn(cb);
  while (t.unit !== goblin) { if (t.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); } else enemyAct(cb); t = nextTurn(cb); }
  cb.enemies[1].alive = false;
  g.hp = 999;
  enemyAct(cb); // fin du tour du gobelin : le poison s'applique
  assert.equal(goblin.hp, hp - 7);
  assert.equal(goblin.statuses.find((s) => s.key === 'poison').turns, 1);
});

test("un buff posé sur soi pendant son tour n'est pas décompté à la fin de ce même tour", () => {
  const { cb, hero } = setup(0, 'gardien', 2);
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'provocation') }));
  assert.equal(hero.statuses.find((s) => s.key === 'provocation').turns, 2);
});

test('poison : doses cumulables (3 au plus, les plus fortes) ; saignement : remplacé', () => {
  const unit = { statuses: [] };
  addStatus(unit, makeStatus('poison', 6, 10));
  addStatus(unit, makeStatus('poison', 5, 4));
  let p = unit.statuses.find((s) => s.key === 'poison');
  assert.equal(p.dot, 14);
  assert.equal(p.turns, 6, 'durée : la plus longue');
  addStatus(unit, makeStatus('poison', 5, 7));
  addStatus(unit, makeStatus('poison', 5, 2));
  p = unit.statuses.find((s) => s.key === 'poison');
  assert.deepEqual(p.doses, [10, 7, 4], '3 doses au plus, les plus fortes');
  assert.equal(p.dot, 21);
  addStatus(unit, makeStatus('saignement', 2, 20));
  addStatus(unit, makeStatus('saignement', 3, 12));
  const bleeds = unit.statuses.filter((s) => s.key === 'saignement');
  assert.equal(bleeds.length, 1);
  assert.equal(bleeds[0].dot, 12, 'une nouvelle entaille remplace la précédente');
});

test('Poison foudroyant : la cible subit tout de suite les dégâts restants de son poison', () => {
  const { cb, hero } = setup(1, 'empoisonneur', 12);
  const target = cb.enemies[0];
  target.hp = target.stats.pv = 1e6;
  addStatus(target, makeStatus('poison', 5, 30));
  addStatus(target, makeStatus('poison', 6, 20));
  const before = target.hp;
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'poison-foudroyant'), target: 0 }));
  assert.ok(!target.statuses.some((s) => s.key === 'poison'), 'le poison a disparu');
  assert.ok(before - target.hp >= 50 * 6, `au moins ${50 * 6} dégâts (${before - target.hp})`);
});

test("durées : le poison dure longtemps, le saignement peu, d'où qu'ils viennent (compétences, talents, légendaires, monstres)", () => {
  const sources = [];
  for (const cls of Object.values(CLASSES)) for (const s of cls.starterSkills) sources.push([s.name, s.effects]);
  for (const branches of Object.values(TALENTS)) {
    for (const b of branches) {
      for (const n of b.nodes) {
        if (n.skill) sources.push([n.skill.name, n.skill.effects]);
        for (const mod of [n.skillMod ?? []].flat()) sources.push([n.name, mod.addEffects]);
      }
    }
  }
  for (const e of Object.values(ENEMIES)) for (const a of e.abilities ?? []) sources.push([a.skill.name, a.skill.effects]);
  for (const leg of Object.values(LEGENDARIES)) for (const mod of [leg.power.skillMod ?? []].flat()) sources.push([leg.name, mod.addEffects]);
  let checked = 0;
  for (const [name, effects] of sources) {
    for (const e of effects ?? []) {
      const range = EFFECTS[e.id].turns;
      if (!range) continue;
      checked++;
      assert.ok(e.turns >= range[0] && e.turns <= range[1], `${name} : ${e.id} sur ${e.turns} tours (permis : ${range[0]} à ${range[1]})`);
    }
  }
  assert.ok(checked > 10);
});
