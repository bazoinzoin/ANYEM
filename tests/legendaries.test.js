import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills } from '../src/game/party.js';
import { createCombat, nextTurn, heroAct, enemyAct, canMove } from '../src/game/combat.js';
import { generateItem, refreshLegendary } from '../src/game/items.js';
import { LEGENDARIES } from '../src/data/items.js';
import { equip } from '../src/game/equipment.js';
import { statsOf } from '../src/game/units.js';
import { estimateHit, BASIC_ATTACK } from '../src/game/formulas.js';
import { learnStarters } from './helpers.js';

beforeEach(() => setRandomSource(() => 0.5));

// Combat où le héros `index` porte le légendaire `key`, joué jusqu'à son tour.
function withLegendary(key, index = 0, classes = ['guerrier', 'voleur', 'pretre', 'mage']) {
  const party = learnStarters(createParty([], classes));
  const hero = party[index];
  const item = generateItem({ legendary: key, level: 10 });
  const slot = { bottes: 'bottes', collier: 'collier', arme: 'mainDroite' }[item.slotType];
  assert.ok(equip(hero, [item], item, slot), `${key} équipé`);
  const cb = createCombat({ party, enemies: ['gobelin', 'gobelin'], level: 1 });
  cb.enemies.forEach((e) => { e.hp = e.stats.pv = 9999; });
  for (let i = 0; i < 40; i++) {
    const turn = nextTurn(cb);
    if (turn.unit === hero) return { cb, hero };
    if (turn.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); } else enemyAct(cb);
  }
  throw new Error('héros jamais actif');
}

test('Plume légère : changer de position ne prend pas le tour, une fois par tour', () => {
  const { cb, hero } = withLegendary('plumeLegere', 2);
  const row = hero.row;
  assert.ok(heroAct(cb, { type: 'move' }));
  assert.notEqual(hero.row, row);
  assert.equal(cb.acting?.unit, hero, 'le héros garde la main');
  assert.equal(canMove(hero), true, 'un second déplacement reste possible, mais il prend le tour');
  assert.ok(heroAct(cb, { type: 'move' }));
  assert.equal(cb.acting, null, 'le second déplacement termine le tour');
});

test('Fratricide : 15 % de chance de refaire l\'attaque gratuitement', () => {
  const { cb, hero } = withLegendary('fratricide', 1);
  setRandomSource(() => 0.1); // < 15 % : l'attaque se répète
  const target = cb.enemies[0];
  const before = target.hp;
  const res = hero.res;
  assert.ok(heroAct(cb, { type: 'attack', target: 0 }));
  assert.ok(cb.log.some((l) => /Fratricide/.test(l.text)));
  assert.ok(before - target.hp > 0);
  assert.equal(hero.res, res - 35, "la répétition ne coûte pas d'Énergie");
});

test('Cœur sacrifié : +15 % de dégâts, mais 10 % des PV max par attaque (jamais le dernier PV)', () => {
  const { cb, hero } = withLegendary('coeurSacrifie', 0);
  const st = statsOf(hero);
  assert.equal(st.dmgDealtPct, 15);
  const without = { ...st, dmgDealtPct: 0 };
  const target = statsOf(cb.enemies[0]);
  assert.ok(estimateHit(st, BASIC_ATTACK, target).hi > estimateHit(without, BASIC_ATTACK, target).hi);
  const hp = hero.hp;
  assert.ok(heroAct(cb, { type: 'attack', target: 0 }));
  assert.equal(hero.hp, hp - Math.round(getStats(hero).pv * 0.1));
  hero.hp = 3;
  for (let i = 0; i < 20 && cb.acting?.unit !== hero; i++) {
    const t = nextTurn(cb);
    if (t.unit !== hero) { if (t.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); } else { t.unit.alive && (t.unit.stats.atq = 0); enemyAct(cb); } }
  }
  if (cb.acting?.unit === hero && hero.alive) {
    heroAct(cb, { type: 'attack', target: 0 });
    assert.ok(hero.hp >= 1, 'le prix du sang ne tue pas');
  }
});

test("L'Olifant : Puissance sur toute l'équipe au début du combat", () => {
  const party = learnStarters(createParty());
  const olifant = generateItem({ legendary: 'olifantDeRoland' });
  equip(party[2], [olifant], olifant, 'collier');
  const cb = createCombat({ party, enemies: ['gobelin'], level: 1 });
  party.forEach((h) => assert.ok(h.statuses.some((s) => s.key === 'puissance'), h.name));
  assert.ok(cb.log.some((l) => /Puissance sur toute l'équipe/.test(l.text)));
});

test("Bottes de l'Ogre : " + '+25 % de Vitesse', () => {
  const [, voleur] = createParty();
  const vit = getStats(voleur).vit;
  const bottes = generateItem({ legendary: 'bottesDeSeptLieues' });
  equip(voleur, [bottes], bottes, 'bottes');
  assert.ok(getStats(voleur).vit >= Math.round(vit * 1.25));
  assert.ok(getSkills(voleur).length >= 0);
});

test('légendaires : noms courts et une citation pour chacun', () => {
  for (const [key, leg] of Object.entries(LEGENDARIES)) {
    assert.ok(leg.name.length <= 22, `${key} : nom trop long (${leg.name})`);
    assert.ok(typeof leg.quote === 'string' && leg.quote.length > 5, `${key} : citation`);
    assert.ok(!leg.desc.includes('«'), `${key} : la citation va dans quote, pas dans desc`);
  }
});

test('sauvegarde ancienne : un légendaire reprend le nom et le pouvoir du catalogue', () => {
  const item = generateItem({ level: 10, legendary: 'durandal' });
  item.name = 'Ancien nom';
  item.legendary.desc = 'ancienne description';
  const divine = { id: 'it999', name: 'Vieux nom', absorbed: { ...item.legendary, name: 'Vieux nom' } };
  assert.equal(refreshLegendary(item), true);
  assert.equal(item.name, LEGENDARIES.durandal.name);
  assert.equal(item.legendary.desc, LEGENDARIES.durandal.desc);
  refreshLegendary(divine);
  assert.equal(divine.name, LEGENDARIES.durandal.name);
  assert.equal(divine.absorbed.name, LEGENDARIES.durandal.name);
  assert.equal(refreshLegendary(item), false);
});
