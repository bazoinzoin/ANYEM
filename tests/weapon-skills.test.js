// Compétences à l'arme (coups, sorts, soins) : une arme de leur orientation en main ;
// compétences neutres (buffs, provocations, pièges) : n'importe quelle arme.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getSkills, getStats } from '../src/game/party.js';
import { createCombat, nextTurn, heroAct, enemyAct, canUseSkill } from '../src/game/combat.js';
import { skillWeaponProblem } from '../src/game/position.js';
import { allowedGear, cannotEquipReason } from '../src/game/equipment.js';
import { generateItem } from '../src/game/items.js';
import { TALENTS, nodeSkills, isWeaponSkill } from '../src/data/talents.js';
import { CLASSES } from '../src/data/classes.js';
import { learnPath } from './helpers.js';

beforeEach(() => setRandomSource(() => 0.5));

const weapon = (weaponType, primary = 'force') => generateItem({ level: 1, rarity: 'commun', slotType: 'arme', weaponType, primary });
const skill = (hero, id) => getSkills(hero).find((s) => s.id === id);

// Combat arrêté au premier tour du héros n° 0.
function combatFor(party) {
  const cb = createCombat({ enemies: ['gobelin'], level: 1, party });
  for (let i = 0; i < 40; i++) {
    const t = nextTurn(cb);
    if (t.unit === party[0]) return cb;
    if (t.side === 'hero') heroAct(cb, { type: 'defend' }); else enemyAct(cb);
    party[0].hp = getStats(party[0]).pv;
  }
  throw new Error('pas de tour');
}

test("chaque compétence à l'arme connaît les armes de son orientation (qui sont permises à la classe)", () => {
  for (const [classKey, branches] of Object.entries(TALENTS)) {
    for (const branch of branches) {
      assert.ok(branch.gear?.weapons?.length, `${branch.key} : armes de l'orientation`);
      for (const w of branch.gear.weapons) assert.ok(CLASSES[classKey].gear.weapons.includes(w), `${branch.key} : ${w} hors de la classe`);
      for (const node of branch.nodes) {
        for (const sk of nodeSkills(node)) {
          if (isWeaponSkill(sk)) assert.deepEqual(sk.weapons, branch.gear.weapons, `${sk.id} : armes`);
          else assert.equal(sk.weapons, undefined, `${sk.id} : compétence neutre`);
        }
      }
    }
  }
});

test('Vénateur : au corps à corps, ni attaque à l\'arc ni tir ; ses pièges restent possibles', () => {
  const party = createParty(['Arc', 'B'], ['chasseur', 'guerrier']);
  const [hero] = party;
  hero.level = 30;
  learnPath(hero, 'traqueur', { upTo: 4 });
  const cb = combatFor(party);
  hero.row = 'melee';
  assert.equal(canUseSkill(cb, hero, skill(hero, 'tir-rapide')), false);
  assert.match(skillWeaponProblem(hero, skill(hero, 'tir-rapide')), /distance/);
  assert.equal(canUseSkill(cb, hero, skill(hero, 'piege-a-machoires')), true, 'piège : neutre');
  hero.row = 'ranged';
  assert.equal(canUseSkill(cb, hero, skill(hero, 'tir-rapide')), true);
});

test("Dissimulé : l'Assassin ne porte que des dagues, l'Empoisonneur dagues ou épées ; sans la bonne arme, pas de coup", () => {
  const [assassin] = createParty(['A'], ['voleur']);
  assassin.level = 30;
  learnPath(assassin, 'assassin', { upTo: 2 });
  assert.deepEqual(allowedGear(assassin).weapons, ['dague']);
  assert.match(cannotEquipReason(assassin, weapon('epee', 'agilite')), /Assassin/);
  assassin.equipment.mainDroite = weapon('epee', 'agilite'); // épée gardée d'avant
  assert.match(skillWeaponProblem(assassin, skill(assassin, 'coup-vicieux')), /Arme requise : dague/);

  const [poison] = createParty(['P'], ['voleur']);
  poison.level = 30;
  learnPath(poison, 'empoisonneur', { upTo: 2 });
  assert.deepEqual(allowedGear(poison).weapons, ['epee', 'dague']);
  poison.equipment.mainDroite = weapon('epee', 'agilite');
  poison.row = 'melee';
  assert.equal(skillWeaponProblem(poison, skill(poison, 'laceration')), null);
});

test('Gardien : Coup de bouclier demande un bouclier ; Provocation (neutre) part avec n\'importe quelle arme', () => {
  const party = createParty(['G', 'B'], ['guerrier', 'pretre']);
  const [hero] = party;
  hero.level = 30;
  learnPath(hero, 'gardien', { upTo: 6 });
  assert.equal(hero.equipment.mainGauche?.slotType, 'bouclier');
  const cb = combatFor(party);
  assert.equal(canUseSkill(cb, hero, skill(hero, 'coup-de-bouclier')), true);
  delete hero.equipment.mainGauche;
  assert.equal(canUseSkill(cb, hero, skill(hero, 'coup-de-bouclier')), false);
  assert.match(skillWeaponProblem(hero, skill(hero, 'coup-de-bouclier')), /bouclier/);
  hero.equipment.mainDroite = weapon('hache2m');
  assert.equal(canUseSkill(cb, hero, skill(hero, 'provocation')), true);
});

test('Élémentaliste : ses sorts demandent un bâton, mais se lancent depuis n\'importe quelle position', () => {
  const party = createParty(['M', 'B'], ['mage', 'guerrier']);
  const [hero] = party;
  hero.level = 10;
  learnPath(hero, 'feu', { upTo: 0 });
  const cb = combatFor(party);
  hero.row = 'ranged'; // bâton = arme de corps à corps, mais un sort n'est pas un coup d'arme
  assert.equal(canUseSkill(cb, hero, skill(hero, 'boule-de-feu')), true);
  delete hero.equipment.mainDroite;
  assert.match(skillWeaponProblem(hero, skill(hero, 'boule-de-feu')), /bâton/);
});
