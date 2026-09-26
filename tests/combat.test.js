import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats } from '../src/game/party.js';
import { createCombat, nextTurn, heroAct, enemyAct, targetsFor } from '../src/game/combat.js';

// Aléatoire déterministe : chaque jet vaut le milieu de sa fourchette.
beforeEach(() => setRandomSource(() => 0.5));

function newCombat() {
  const party = createParty();
  const cb = createCombat({ dungeonKey: 'foretMaudite', level: 1, party });
  return { party, cb };
}

const [guerrier, voleur, pretre, mage] = [0, 1, 2, 3];

// Joue les tours jusqu'à ce que le héros d'index `heroIndex` soit actif.
function playUntilHero(cb, heroIndex) {
  for (let i = 0; i < 50; i++) {
    const turn = nextTurn(cb);
    assert.ok(turn, 'le combat ne doit pas être terminé');
    if (turn.side === 'hero' && turn.unit === cb.party[heroIndex]) return turn;
    if (turn.side === 'hero') heroAct(cb, { type: 'defend' });
    else enemyAct(cb);
  }
  throw new Error('héros jamais actif');
}

test("l'ordre de jeu suit la vitesse, héros compris", () => {
  const { cb } = newCombat();
  nextTurn(cb);
  const speeds = cb.queue.map((t) => (t.side === 'hero' ? getStats(t.unit).vit : t.unit.stats.vit));
  assert.deepEqual(speeds, [...speeds].sort((a, b) => b - a));
  assert.equal(cb.queue[0].unit, cb.party[voleur]); // vitesse 15, la plus haute
});

test("l'attaque touche la cible choisie même si un ennemi précédent est mort", () => {
  const { cb } = newCombat();
  playUntilHero(cb, voleur);
  cb.enemies[0].alive = false;
  cb.enemies[0].hp = 0;
  const before = cb.enemies[1].hp;
  assert.ok(heroAct(cb, { type: 'attack', target: 1 }));
  assert.ok(cb.enemies[1].hp < before);
});

test('une cible morte ou invalide est refusée sans consommer le tour', () => {
  const { cb } = newCombat();
  playUntilHero(cb, voleur);
  cb.enemies[0].alive = false;
  assert.equal(heroAct(cb, { type: 'attack', target: 0 }), false);
  assert.equal(heroAct(cb, { type: 'attack', target: 9 }), false);
  assert.equal(cb.acting.unit, cb.party[voleur]);
});

test('le soin touche le bon allié quand un allié précédent est tombé', () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, pretre);
  cb.party[guerrier].alive = false;
  cb.party[guerrier].hp = 0;
  cb.party[mage].hp = 10;
  turn.unit.res = 80;
  assert.ok(heroAct(cb, { type: 'skill', skill: 0, target: mage }));
  assert.equal(cb.party[mage].hp, 10 + Math.round(getStats(turn.unit).magPower * 1.1));
  assert.equal(cb.party[guerrier].hp, 0);
});

test('Lacération fait saigner la cible à chaque fin de round', () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, voleur);
  assert.ok(heroAct(cb, { type: 'skill', skill: 1, target: 0 }));
  const target = cb.enemies[0];
  const bleed = target.statuses.find((s) => s.key === 'saignement');
  assert.equal(bleed.turns, 3);
  assert.equal(bleed.dot, Math.max(1, Math.round(getStats(turn.unit).physPower * 0.35)));
  const hpAfterHit = target.hp;
  // Termine le round en cours (héros en défense, ennemis ciblant les héros).
  while (cb.qIndex < cb.queue.length) {
    const t = nextTurn(cb);
    if (cb.round > 1) break;
    if (t.side === 'hero') heroAct(cb, { type: 'defend' });
    else enemyAct(cb);
  }
  nextTurn(cb);
  assert.equal(target.hp, hpAfterHit - bleed.dot);
  assert.equal(target.statuses.find((s) => s.key === 'saignement').turns, 2);
});

test('la garde se lève au tour suivant du héros', () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, guerrier);
  heroAct(cb, { type: 'defend' });
  assert.equal(turn.unit.guard, true);
  playUntilHero(cb, guerrier);
  assert.equal(cb.party[guerrier].guard, false);
});

test('les compétences de zone ne demandent pas de cible', () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, guerrier);
  assert.equal(targetsFor(cb, { type: 'skill', skill: 1 }), null);
  turn.unit.res = 100;
  const before = cb.enemies.map((e) => e.hp);
  assert.ok(heroAct(cb, { type: 'skill', skill: 1 }));
  cb.enemies.forEach((e, i) => assert.ok(e.hp < before[i]));
});

test('pas assez de ressource : compétence refusée', () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, guerrier);
  turn.unit.res = 0;
  assert.equal(heroAct(cb, { type: 'skill', skill: 0, target: 0 }), false);
});

test('le combat se termine par une victoire quand tous les ennemis tombent', () => {
  const { cb } = newCombat();
  cb.enemies.forEach((e) => { e.alive = false; e.hp = 0; });
  assert.equal(nextTurn(cb), null);
  assert.equal(cb.result, 'victory');
});

test('la défense de la cible réduit les dégâts', () => {
  const { cb } = newCombat();
  playUntilHero(cb, voleur);
  const [a, b] = cb.enemies;
  b.stats.def = 100; // dégâts divisés par deux
  const hpA = a.hp;
  const hpB = b.hp;
  heroAct(cb, { type: 'attack', target: 0 });
  playUntilHero(cb, voleur);
  heroAct(cb, { type: 'attack', target: 1 });
  assert.equal(hpB - b.hp, Math.round((hpA - a.hp) / 2) || 1);
});

test('esquive : le héros ne subit aucun dégât', () => {
  const { cb } = newCombat();
  cb.party.forEach((h) => { h.equipment = {}; });
  // esquive 100 % (plafonnée à 50 %) et jets à 0,4 : toujours esquivé
  setRandomSource(() => 0.4);
  cb.party.forEach((h) => { h.equipment.anneau1 = { stats: { esquive: 100 }, mandatory: [] }; });
  const hp = cb.party.map((h) => h.hp);
  for (let i = 0; i < 12; i++) {
    const turn = nextTurn(cb);
    if (turn.side === 'hero') heroAct(cb, { type: 'defend' });
    else enemyAct(cb);
  }
  assert.deepEqual(cb.party.map((h) => h.hp), hp);
  assert.ok(cb.log.some((l) => l.text.includes('esquive')));
});

test('Coup Vicieux est toujours critique', () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, voleur);
  turn.unit.res = 60;
  heroAct(cb, { type: 'skill', skill: 0, target: 0 });
  assert.ok(cb.log[0].text.includes('critique') || cb.log[1].text.includes('critique'));
});

test("l'attaque de base est physique : elle ignore l'Intelligence, même pour un mage", () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, mage);
  const target = cb.enemies[0];
  target.stats.def = 0;
  const hp = target.hp;
  heroAct(cb, { type: 'attack', target: 0 });
  const stats = getStats(turn.unit);
  assert.equal(stats.physPower, stats.atq + Math.round(stats.force * 0.5));
  assert.equal(hp - target.hp, Math.round(stats.physPower * (0.9 + 0.5 * 0.25)));
  turn.unit.equipment.anneau1 = { stats: { intelligence: 100 }, mandatory: [] };
  assert.equal(getStats(turn.unit).physPower, stats.physPower, "l'Intelligence ne change pas la puissance physique");
});

test("un sort est magique : il utilise l'Intelligence et la défense magique", () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, mage);
  const target = cb.enemies[0];
  Object.assign(target.stats, { def: 1000, defMag: 0 });
  turn.unit.res = 90;
  const hp = target.hp;
  heroAct(cb, { type: 'skill', skill: 0, target: 0 }); // Boule de Feu
  const stats = getStats(turn.unit);
  assert.equal(stats.magPower, stats.intelligence * 2);
  assert.equal(hp - target.hp, Math.round(stats.magPower * 2.1 * (0.9 + 0.5 * 0.25)));
});

test("la puissance physique du voleur dépend de l'Agilité, celle du guerrier de la Force", () => {
  const { cb } = newCombat();
  const v = getStats(cb.party[voleur]);
  const g = getStats(cb.party[guerrier]);
  assert.equal(v.physPower, v.atq + Math.round(v.agilite * 0.6));
  assert.equal(g.physPower, g.atq + Math.round(g.force * 0.5));
});

test("à stat principale et arme égales, le voleur frappe plus fort que le guerrier", () => {
  const { cb } = newCombat();
  const [g, v] = [cb.party[guerrier], cb.party[voleur]];
  for (const hero of [g, v]) hero.equipment = { anneau1: { stats: { force: 40, agilite: 40 }, mandatory: [] } };
  const gs = getStats(g);
  const vs = getStats(v);
  assert.ok(vs.physFromStat > gs.physFromStat);
  assert.ok(vs.physPower - vs.atq > gs.physPower - gs.atq);
});
