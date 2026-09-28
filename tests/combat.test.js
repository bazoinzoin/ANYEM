import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { learnStarters } from './helpers.js';
import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats } from '../src/game/party.js';
import { createCombat, nextTurn, heroAct, enemyAct, targetsFor } from '../src/game/combat.js';
import { setPosition } from '../src/game/position.js';

// Aléatoire déterministe : chaque jet vaut le milieu de sa fourchette.
beforeEach(() => setRandomSource(() => 0.5));

function newCombat() {
  const party = learnStarters(createParty());
  const cb = createCombat({ enemies: ['gobelin', 'gobelin'], level: 1, party });
  return { party, cb };
}

const [guerrier, voleur, pretre, mage] = [0, 1, 2, 3];

// Joue les tours jusqu'à ce que le héros d'index `heroIndex` soit actif.
function playUntilHero(cb, heroIndex) {
  for (let i = 0; i < 50; i++) {
    const turn = nextTurn(cb);
    assert.ok(turn, 'le combat ne doit pas être terminé');
    if (turn.side === 'hero' && turn.unit === cb.party[heroIndex]) return turn;
    if (turn.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); }
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

test('Entaille venimeuse (finisher) empoisonne la cible à chaque fin de round, selon les points de combo (pleine puissance dès 3)', () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, voleur);
  turn.unit.combo = 2;
  assert.ok(heroAct(cb, { type: 'skill', skill: 2, target: 0 }));
  assert.equal(turn.unit.combo, 0, 'le finisher dépense tous les points');
  const target = cb.enemies[0];
  const bleed = target.statuses.find((s) => s.key === 'poison');
  assert.equal(bleed.turns, 6);
  // Pleine puissance dès 3 points : 2 points = 2 × 5/3 fois la puissance par point (0,07).
  assert.equal(bleed.dot, Math.max(1, Math.round(getStats(turn.unit).physPower * 0.233)));
  heroAct(cb, { type: 'endTurn' });
  const hpAfterHit = target.hp;
  // Termine le round en cours (héros en défense, ennemis ciblant les héros).
  while (cb.qIndex < cb.queue.length) {
    const t = nextTurn(cb);
    if (cb.round > 1) break;
    if (t.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); }
    else enemyAct(cb);
  }
  nextTurn(cb);
  assert.equal(target.hp, hpAfterHit - bleed.dot);
  assert.equal(target.statuses.find((s) => s.key === 'poison').turns, 5);
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
  assert.equal(targetsFor(cb, { type: 'skill', skill: 0 }), null);
  turn.unit.res = 100;
  const before = cb.enemies.map((e) => e.hp);
  assert.ok(heroAct(cb, { type: 'skill', skill: 0 }));
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
    if (turn.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); }
    else enemyAct(cb);
  }
  assert.deepEqual(cb.party.map((h) => h.hp), hp);
  assert.ok(cb.log.some((l) => l.text.includes('esquive')));
});

test('Coup Vicieux donne un point de combo (5 au maximum)', () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, voleur);
  assert.ok(heroAct(cb, { type: 'skill', skill: 0, target: 0 }));
  assert.equal(turn.unit.combo, 1);
  turn.unit.combo = 5;
  turn.unit.res = 100;
  heroAct(cb, { type: 'skill', skill: 0, target: 0 });
  assert.equal(turn.unit.combo, 5);
});

test("l'attaque de base est physique : elle ignore l'Intelligence, même pour un mage", () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, mage);
  const target = cb.enemies[0];
  target.stats.def = 0;
  const hp = target.hp;
  assert.equal(heroAct(cb, { type: 'attack', target: 0 }), false, 'à distance, le mage ne peut pas frapper avec son bâton');
  turn.unit.row = 'melee';
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
  assert.equal(hp - target.hp, Math.round(stats.magPower * 1.8 * (0.9 + 0.5 * 0.25)));
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

// ---- Classes à Énergie : plusieurs actions par tour, points de combo ----

test("le voleur enchaîne plusieurs actions dans le même tour, chacune coûte de l'Énergie", () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, voleur);
  const hero = turn.unit;
  cb.enemies.forEach((e) => { e.hp = e.stats.pv = 9999; });
  assert.equal(hero.res, 100, "Énergie pleine au début du combat");
  assert.ok(heroAct(cb, { type: 'attack', target: 0 }));
  assert.equal(hero.res, 65);
  assert.equal(cb.acting.unit, hero, 'il garde la main');
  assert.ok(heroAct(cb, { type: 'defend' }));
  assert.equal(hero.res, 45);
  assert.equal(heroAct(cb, { type: 'defend' }), false, 'une seule garde par tour');
  assert.ok(heroAct(cb, { type: 'skill', skill: 0, target: 1 }));
  assert.equal(hero.res, 20);
  assert.equal(cb.acting, null, "plus assez d'Énergie pour agir : fin du tour automatique");
});

test("finir son tour garde l'Énergie restante ; elle remonte en partie au tour suivant", () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, voleur);
  const hero = turn.unit;
  heroAct(cb, { type: 'attack', target: 0 });
  assert.ok(heroAct(cb, { type: 'endTurn' }));
  assert.equal(cb.acting, null);
  hero.res = 10;
  playUntilHero(cb, voleur);
  assert.equal(hero.res, 55, '+45 au début du tour, pas une recharge complète');
});

test("les autres classes n'ont qu'une action par tour, sans coût d'Énergie, et peuvent passer leur tour", () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, guerrier);
  const res = turn.unit.res;
  assert.ok(heroAct(cb, { type: 'attack', target: 0 }));
  assert.equal(cb.acting, null);
  assert.ok(turn.unit.res >= res, "l'attaque ne coûte pas de Rage");
  playUntilHero(cb, mage);
  const hp = cb.enemies.map((e) => e.hp);
  assert.ok(heroAct(cb, { type: 'endTurn' }));
  assert.equal(cb.acting, null);
  assert.deepEqual(cb.enemies.map((e) => e.hp), hp);
  assert.match(cb.log[0].text, /passe son tour/);
});

test("un finisher demande au moins 1 point de combo ; ses dégâts croissent avec les points", () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, voleur);
  const hero = turn.unit;
  assert.equal(heroAct(cb, { type: 'skill', skill: 1, target: 0 }), false, 'aucun point de combo');
  const target = cb.enemies[0];
  target.hp = target.stats.pv = 9999;
  target.stats.def = 0;
  const strike = (points) => {
    hero.combo = points;
    hero.res = 100;
    const hp = target.hp;
    heroAct(cb, { type: 'skill', skill: 1, target: 0 });
    return hp - target.hp;
  };
  const one = strike(1);
  const five = strike(5);
  const physPower = getStats(hero).physPower;
  assert.equal(one, Math.round(physPower * 0.55 * (0.9 + 0.5 * 0.25)));
  assert.equal(five, Math.round(physPower * 2.75 * (0.9 + 0.5 * 0.25)));
  assert.equal(hero.combo, 0);
});

test("un objet coûte de l'Énergie au voleur ; les combos repartent de zéro à chaque combat", () => {
  const party = learnStarters(createParty());
  party[voleur].combo = 4;
  const cb = createCombat({ enemies: ['gobelin'], level: 1, party, consumables: { potion: 2 } });
  assert.equal(party[voleur].combo, 0);
  const turn = playUntilHero(cb, voleur);
  turn.unit.hp -= 20;
  assert.ok(heroAct(cb, { type: 'item', item: 'potion', target: voleur }));
  assert.equal(turn.unit.res, 80);
  turn.unit.res = 10;
  assert.equal(heroAct(cb, { type: 'item', item: 'potion', target: voleur }), false, "pas assez d'Énergie");
});


// ---- Positions : corps à corps / distance ----

test("positions par défaut selon la classe ; une arme ne sert que depuis sa position", () => {
  const party = learnStarters(createParty([], ['guerrier', 'chasseur', 'pretre', 'paladin']));
  const cb = createCombat({ enemies: ['gobelin', 'gobelin'], level: 1, party });
  assert.deepEqual(cb.party.map((h) => h.row), ['melee', 'ranged', 'ranged', 'melee']);
  const chasseur = playUntilHero(cb, 1).unit;
  cb.enemies.forEach((e) => { e.hp = e.stats.pv = 9999; });
  chasseur.row = 'melee';
  assert.equal(heroAct(cb, { type: 'attack', target: 0 }), false, "pas de tir à l'arc au corps à corps");
  assert.equal(heroAct(cb, { type: 'skill', skill: 0, target: 0 }), false, 'Tir visé utilise l\'arc');
  chasseur.row = 'ranged';
  assert.ok(heroAct(cb, { type: 'attack', target: 0 }));
});

test("changer de position prend le tour ; une classe à Énergie ne peut plus le faire après avoir agi", () => {
  const { cb } = newCombat();
  const turn = playUntilHero(cb, voleur);
  cb.enemies.forEach((e) => { e.hp = e.stats.pv = 9999; });
  assert.ok(heroAct(cb, { type: 'attack', target: 0 }));
  assert.equal(heroAct(cb, { type: 'move' }), false, 'déjà agi ce tour');
  heroAct(cb, { type: 'endTurn' });
  playUntilHero(cb, voleur);
  assert.ok(heroAct(cb, { type: 'move' }));
  assert.equal(turn.unit.row, 'ranged');
  assert.equal(cb.acting, null, 'le tour est passé, même avec de l\'Énergie');
  const g = playUntilHero(cb, guerrier).unit;
  assert.ok(heroAct(cb, { type: 'move' }));
  assert.equal(g.row, 'ranged');
});

test('les ennemis ciblent plus souvent les héros au corps à corps', () => {
  const party = createParty();
  const counts = new Map(party.map((h) => [h, 0]));
  for (let i = 0; i < 400; i++) {
    setRandomSource(() => (i + 0.5) / 400);
    const cb = createCombat({ enemies: ['gobelin'], level: 1, party });
    party.forEach((h) => { h.hp = 999; h.guard = false; });
    cb.acting = { side: 'enemy', unit: cb.enemies[0] };
    const before = party.map((h) => h.hp);
    enemyAct(cb);
    party.forEach((h, j) => { if (h.hp < before[j]) counts.set(h, counts.get(h) + 1); });
  }
  const [g, v, p, m] = party.map((h) => counts.get(h));
  assert.ok(g > p * 2 && v > m * 2, `corps à corps ${g}, ${v} ; distance ${p}, ${m}`);
});

test('riposte : un héros au corps à corps frappé au corps à corps peut contre-attaquer', () => {
  const party = createParty();
  const cb = createCombat({ enemies: ['gobelin'], level: 1, party });
  const [g] = party;
  party.slice(1).forEach((h) => { h.alive = false; });
  g.equipment.anneau1 = { stats: { riposte: 100 }, mandatory: [] };
  const enemy = cb.enemies[0];
  enemy.hp = enemy.stats.pv = 999;
  setRandomSource(() => 0.6); // pas d'esquive ni de blocage, riposte (plafond 50 %) ratée
  cb.acting = { side: 'enemy', unit: enemy };
  enemyAct(cb);
  assert.equal(enemy.hp, 999);
  setRandomSource(() => 0.3); // riposte réussie (< 50 %) ; esquive 2 % et blocage 3 % ratés
  cb.acting = { side: 'enemy', unit: enemy };
  enemyAct(cb);
  assert.ok(enemy.hp < 999);
  assert.ok(cb.log.some((l) => l.text.includes('riposte')));
  g.row = 'ranged';
  enemy.hp = 999;
  cb.acting = { side: 'enemy', unit: enemy };
  enemyAct(cb);
  assert.equal(enemy.hp, 999, 'à distance : pas de riposte');
});

test('Stratégie : la position choisie au village sert de départ à chaque combat', () => {
  const party = createParty();
  assert.equal(setPosition(party[pretre], 'melee'), true);
  assert.equal(setPosition(party[pretre], 'ailleurs'), false);
  const cb = createCombat({ enemies: ['gobelin'], level: 1, party });
  assert.equal(party[pretre].row, 'melee');
  party[pretre].row = 'ranged'; // déplacé pendant le combat
  createCombat({ enemies: ['gobelin'], level: 1, party });
  assert.equal(party[pretre].row, 'melee', 'le combat suivant repart de la position choisie');
  assert.equal(cb.enemies[0].row, 'melee');
  assert.equal(createCombat({ enemies: ['spectre'], level: 1, party }).enemies[0].row, 'ranged');
});
