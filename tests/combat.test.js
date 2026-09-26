import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats } from '../src/game/party.js';
import { createCombat, nextTurn, heroAct, enemyAct, targetsFor } from '../src/game/combat.js';
import { COMBAT } from '../src/config.js';

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
  assert.equal(cb.party[mage].hp, 10 + Math.round(9 * 2.6));
  assert.equal(cb.party[guerrier].hp, 0);
});

test('Lacération fait saigner la cible à chaque fin de round', () => {
  const { cb } = newCombat();
  playUntilHero(cb, voleur);
  assert.ok(heroAct(cb, { type: 'skill', skill: 1, target: 0 }));
  const target = cb.enemies[0];
  assert.equal(target.bleed, 3);
  const hpAfterHit = target.hp;
  // Termine le round en cours : le saignement s'applique avant le suivant.
  while (cb.qIndex < cb.queue.length) {
    const turn = nextTurn(cb);
    if (cb.round > 1) break;
    if (turn.side === 'hero') heroAct(cb, { type: 'defend' });
    else enemyAct(cb);
  }
  nextTurn(cb);
  assert.equal(target.hp, hpAfterHit - COMBAT.bleedDamage);
  assert.equal(target.bleed, 2);
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
