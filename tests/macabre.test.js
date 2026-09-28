import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills, soulsOf, gainSouls, restoreFully, starterSpares, getClass } from '../src/game/party.js';
import { createCombat, nextTurn, heroAct, enemyAct, canUseSkill, effectiveSkill } from '../src/game/combat.js';
import { damage } from '../src/game/units.js';
import { backlashPct, soulBacklash } from '../src/game/souls.js';
import { allowedGear, cannotEquipReason, returnForbiddenGear, refillGear } from '../src/game/equipment.js';
import { generateItem } from '../src/game/items.js';
import { isValidTarget } from '../src/game/consumables.js';
import { learn } from '../src/game/talents.js';
import { SOULS } from '../src/config.js';
import { learnPath } from './helpers.js';

beforeEach(() => setRandomSource(() => 0.5));

// Équipe dont le 1er héros est un Macabre de niveau 50 ayant suivi `branch` jusqu'au palier `upTo` ;
// le combat est arrêté à son premier tour.
function setup(branch, upTo = 14, enemies = ['gobelin', 'gobelin']) {
  const party = createParty(['Os', 'B', 'C', 'D'], ['macabre', 'guerrier', 'pretre', 'mage']);
  const [hero] = party;
  hero.level = 50;
  learnPath(hero, branch, { upTo });
  hero.hp = getStats(hero).pv;
  const cb = createCombat({ enemies, level: 1, party });
  for (let i = 0; i < 50; i++) {
    const turn = nextTurn(cb);
    if (turn.unit === hero) return { cb, hero, party };
    if (turn.side === 'hero') heroAct(cb, { type: 'defend' }); else enemyAct(cb);
    hero.hp = getStats(hero).pv;
  }
  throw new Error('pas de tour du Macabre');
}
const skillIndex = (hero, id) => getSkills(hero).findIndex((s) => s.id === id);

test("Macabre : il absorbe l'âme des ennemis qui meurent (3 au plus), les garde entre les combats, les perd au repos", () => {
  const { cb, hero, party } = setup('soldat', 2);
  assert.equal(soulsOf(hero), 0);
  cb.enemies[0].hp = 1;
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'coup-decharne'), target: 0 }));
  assert.equal(cb.enemies[0].alive, false);
  assert.equal(soulsOf(hero), 1, 'une âme absorbée');
  assert.ok(cb.log.some((l) => /absorbe l'âme/.test(l.text)));
  gainSouls(hero, 5);
  assert.equal(soulsOf(hero), 3, 'plafond de 3 âmes');
  createCombat({ enemies: ['gobelin'], level: 1, party });
  assert.equal(soulsOf(hero), 3, 'gardées au combat suivant');
  restoreFully(hero);
  assert.equal(soulsOf(hero), 0, 'le repos libère les âmes');
  gainSouls(hero, 2);
  damage(hero, 1e6);
  assert.equal(hero.alive, false);
  assert.equal(soulsOf(hero), 0, 'tombé : ses âmes s\'échappent');
});

test('Macabre : chaque âme renforce le Soldat décharné (puissance physique, critique) et le Mur d\'os (défense)', () => {
  const { hero } = setup('soldat', 0);
  const base = getStats(hero);
  gainSouls(hero, 2);
  const two = getStats(hero);
  assert.equal(two.physPower, Math.round(base.physPower * 1.2));
  assert.equal(two.critChance, base.critChance + 4);
  const { hero: wall } = setup('murDOs', 0);
  const w0 = getStats(wall);
  gainSouls(wall, 3);
  assert.equal(getStats(wall).def, Math.round(w0.def * 1.24));
});

test('Macabre : contrecoup de plus en plus fort (âmes², temps au maximum) ; au maximum, les alliés en souffrent sans en mourir', () => {
  const stats = { soulMax: 3 };
  assert.deepEqual(backlashPct(stats, 0), { self: 0, allies: 0 });
  assert.equal(backlashPct(stats, 1).self, SOULS.drain);
  assert.equal(backlashPct(stats, 2).self, SOULS.drain * 4);
  assert.equal(backlashPct(stats, 2).allies, 0, 'pas de débordement sous le maximum');
  assert.equal(backlashPct(stats, 3).allies, SOULS.spill);
  assert.ok(backlashPct(stats, 3, 2).self > backlashPct(stats, 3, 0).self, 'garder le maximum coûte de plus en plus');
  assert.ok(backlashPct({ soulMax: 3, soulWard: 30 }, 3).self < backlashPct(stats, 3).self, 'le Mur d\'os en souffre moins');

  const { cb, hero, party } = setup('soldat', 2);
  gainSouls(hero, 3);
  const ally = party[1];
  ally.hp = 2;
  const before = hero.hp;
  assert.ok(heroAct(cb, { type: 'defend' }));
  assert.ok(hero.hp < before, 'le Macabre perd des PV à la fin de son tour');
  assert.equal(ally.hp, 1, 'un allié perd des PV, jamais le dernier');
  assert.ok(cb.log.some((l) => /débordent/.test(l.text)));
  const held = hero.soulHeld;
  soulBacklash(hero, party);
  assert.equal(hero.soulHeld, held + 1);
  // Le contrecoup peut le tuer.
  hero.hp = 1;
  const { cb: cb2, hero: h2 } = setup('soldat', 2);
  gainSouls(h2, 3);
  h2.hp = 1;
  heroAct(cb2, { type: 'defend' });
  assert.equal(h2.alive, false);
  assert.equal(soulsOf(h2), 0);
});

test('Macabre : Déchaînement dépense toutes les âmes, puissance par âme ; impossible sans âme', () => {
  const { cb, hero } = setup('soldat', 2);
  Object.assign(cb.enemies[0], { hp: 1e7 }); // la cible survit : pas d'âme regagnée
  const base = getSkills(hero)[skillIndex(hero, 'dechainement')];
  assert.equal(canUseSkill(cb, hero, base), false, 'sans âme');
  gainSouls(hero, 3);
  assert.ok(canUseSkill(cb, hero, base));
  const s = effectiveSkill(hero, base);
  assert.equal(s.power, +(base.power * 3).toFixed(3));
  assert.equal(s.soulCost, 3);
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'dechainement'), target: 0 }));
  assert.equal(soulsOf(hero), 0);
  assert.ok(cb.log.some((l) => /libère 3 âmes/.test(l.text)));
});

test('Macabre : Frappe d\'outre-tombe coûte une âme ; les coups de base aucune', () => {
  const { cb, hero } = setup('soldat', 8);
  Object.assign(cb.enemies[0], { hp: 1e7 });
  gainSouls(hero, 2);
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'frappe-d-outre-tombe'), target: 0 }));
  assert.equal(soulsOf(hero), 1);
  const free = getSkills(hero).find((s) => s.id === 'coup-decharne');
  assert.equal(free.soulCost, undefined, 'coup de base : sans âme');
});

test("Macabre : l'orientation impose armes et armure ; sans point, tout l'équipement de la classe", () => {
  const [hero] = createParty(['Os'], ['macabre']);
  hero.level = 50;
  assert.deepEqual(allowedGear(hero).armor, ['lourde', 'moyenne', 'legere']);
  const starterGear = { ...hero.equipment };
  learnPath(hero, 'necromancien', { upTo: 2 });
  hero.equipment = starterGear; // équipement de départ (hache à deux mains, armure moyenne)
  assert.deepEqual(allowedGear(hero), { armor: ['legere'], weapons: ['baton'], offHand: [] });
  const axe = generateItem({ level: 10, rarity: 'commun', slotType: 'arme', weaponType: 'hache2m', primary: 'force' });
  assert.match(cannotEquipReason(hero, axe), /Nécromancien/);
  const bag = [...starterSpares('macabre')];
  assert.equal(bag.length, 5);
  const removed = returnForbiddenGear(hero, bag);
  assert.equal(removed.length, 2, 'hache à deux mains et armure moyenne au sac');
  const added = refillGear(hero, bag);
  assert.equal(hero.equipment.mainDroite.weaponType, 'baton');
  assert.equal(hero.equipment.plastron.armorType, 'legere');
  assert.equal(added.length, 2);

  const [wall] = createParty(['Mur'], ['macabre']);
  wall.level = 50;
  learnPath(wall, 'murDOs', { upTo: 2 });
  assert.deepEqual(allowedGear(wall), { armor: ['lourde'], weapons: ['hache', 'masse'], offHand: ['bouclier'] });
  const [soldier] = createParty(['Sol'], ['macabre']);
  soldier.level = 50;
  learnPath(soldier, 'soldat', { upTo: 2 });
  assert.deepEqual(allowedGear(soldier), { armor: ['moyenne'], weapons: ['hache2m', 'masse2m'], offHand: [] });
  assert.equal(returnForbiddenGear(soldier, []).length, 0, 'son équipement de départ lui convient');
  // Aucun point : tout est permis ; un seul arbre ensuite.
  const [fresh] = createParty(['Neuf'], ['macabre']);
  fresh.level = 2;
  assert.equal(allowedGear(fresh).armor.length, 3);
  assert.ok(learn(fresh, 'depart-soldat'));
  assert.equal(learn(fresh, 'depart-necro'), false);
});

test("Macabre : classe à Mana, les âmes sont une jauge à part ; certaines compétences coûtent Mana et âmes", () => {
  const { cb, hero } = setup('soldat', 8);
  Object.assign(cb.enemies[0], { hp: 1e7 });
  assert.equal(getClass(hero).resource.name, 'Mana');
  assert.equal(hero.res, getStats(hero).resMax, 'Mana plein');
  gainSouls(hero, 1);
  const strike = getSkills(hero).find((s) => s.id === 'frappe-d-outre-tombe');
  const mana = hero.res;
  assert.ok(heroAct(cb, { type: 'skill', skill: skillIndex(hero, 'frappe-d-outre-tombe'), target: 0 }));
  assert.equal(soulsOf(hero), 0, 'une âme dépensée');
  assert.equal(hero.res, mana - strike.cost, 'et son Mana');
  hero.res = 0;
  assert.equal(canUseSkill(cb, hero, getSkills(hero).find((s) => s.id === 'coup-decharne')), false, 'sans Mana');
  const [w, mac] = createParty(['W', 'M'], ['guerrier', 'macabre']);
  assert.equal(isValidTarget('elixir', mac), true, "l'élixir lui rend du Mana");
  assert.ok(w);
});

test('Macabre : Libération des âmes, apprise avec le premier point de chaque orientation, relâche toutes les âmes sans autre effet', () => {
  for (const branch of ['soldat', 'murDOs', 'necromancien']) {
    const { cb, hero } = setup(branch, 0);
    const i = skillIndex(hero, 'liberation-des-ames');
    assert.ok(i >= 0, `${branch} : appris au palier 0`);
    assert.equal(canUseSkill(cb, hero, getSkills(hero)[i]), false, 'sans âme : rien à libérer');
    gainSouls(hero, 3);
    const hp = cb.enemies.map((e) => e.hp);
    assert.ok(heroAct(cb, { type: 'skill', skill: i }));
    assert.equal(soulsOf(hero), 0);
    assert.deepEqual(cb.enemies.map((e) => e.hp), hp, 'aucun dégât');
  }
});
