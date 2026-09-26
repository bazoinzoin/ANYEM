import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills } from '../src/game/party.js';
import { generateItem } from '../src/game/items.js';
import { equip, unequip, slotsFor, cannotEquipReason } from '../src/game/equipment.js';

beforeEach(() => setRandomSource(() => 0.5));

const party = () => createParty();
const item = (opts) => generateItem({ level: 1, rarity: 'commun', ...opts });

test('chaque héros démarre avec une arme et un plastron communs', () => {
  for (const hero of party()) {
    assert.equal(hero.equipment.mainDroite.rarity, 'commun');
    assert.equal(hero.equipment.plastron.rarity, 'commun');
    assert.equal(hero.hp, getStats(hero).pv);
  }
});

test('les maîtrises de classe sont respectées', () => {
  const [guerrier, voleur, pretre, mage] = party();
  const lourde = item({ slotType: 'casque', armorType: 'lourde' });
  assert.equal(cannotEquipReason(guerrier, lourde), null);
  assert.ok(cannotEquipReason(voleur, lourde));
  assert.ok(cannotEquipReason(mage, item({ slotType: 'arme', weaponType: 'dague', primary: 'intelligence' })));
  assert.equal(cannotEquipReason(pretre, item({ slotType: 'arme', weaponType: 'dague', primary: 'intelligence' })), null);
  assert.deepEqual(slotsFor(guerrier, item({ slotType: 'bouclier' })), ['mainGauche']);
  assert.deepEqual(slotsFor(voleur, item({ slotType: 'bouclier' })), []);
  assert.deepEqual(slotsFor(mage, item({ slotType: 'anneau', primary: 'intelligence' })), ['anneau1', 'anneau2']);
});

test('ambidextrie : le voleur peut tenir une dague dans chaque main, pas le guerrier', () => {
  const [guerrier, voleur] = party();
  assert.deepEqual(slotsFor(voleur, item({ slotType: 'arme', weaponType: 'dague' })), ['mainDroite', 'mainGauche']);
  assert.deepEqual(slotsFor(guerrier, item({ slotType: 'arme', weaponType: 'epee' })), ['mainDroite']);
});

test("un légendaire d'une autre classe est refusé", () => {
  const [guerrier, voleur] = party();
  const croc = generateItem({ legendary: 'crocSanglant' });
  assert.ok(cannotEquipReason(guerrier, croc));
  assert.equal(cannotEquipReason(voleur, croc), null);
});

test("équiper remplace l'objet en place, qui retourne au sac, et met à jour les stats", () => {
  const [guerrier] = party();
  const oldWeapon = guerrier.equipment.mainDroite;
  const axe = item({ slotType: 'arme', weaponType: 'hache', level: 10, primary: 'force' });
  const bag = [axe];
  const before = getStats(guerrier).physPower;
  assert.ok(equip(guerrier, bag, axe, 'mainDroite'));
  assert.equal(guerrier.equipment.mainDroite, axe);
  assert.deepEqual(bag, [oldWeapon]);
  assert.ok(getStats(guerrier).physPower > before);
});

test("une arme à deux mains libère la main gauche, et inversement", () => {
  const [guerrier] = party();
  const shield = item({ slotType: 'bouclier' });
  const hammer = item({ slotType: 'arme', weaponType: 'marteau2m' });
  const bag = [shield, hammer];
  equip(guerrier, bag, shield, 'mainGauche');
  const sword = guerrier.equipment.mainDroite;
  assert.ok(equip(guerrier, bag, hammer, 'mainDroite'));
  assert.equal(guerrier.equipment.mainGauche, undefined);
  assert.ok(bag.includes(shield) && bag.includes(sword));
  assert.ok(equip(guerrier, bag, shield, 'mainGauche'));
  assert.equal(guerrier.equipment.mainDroite, undefined);
  assert.ok(bag.includes(hammer));
});

test('équipement impossible : rien ne change', () => {
  const [, voleur] = party();
  const helm = item({ slotType: 'casque', armorType: 'lourde' });
  const bag = [helm];
  assert.equal(equip(voleur, bag, helm, 'casque'), false);
  assert.deepEqual(bag, [helm]);
  assert.equal(voleur.equipment.casque, undefined);
  assert.equal(equip(voleur, [], helm, 'casque'), false, "l'objet doit venir du sac");
});

test('retirer un objet le range dans le sac et ramène les PV sous le nouveau maximum', () => {
  const [guerrier] = party();
  const belt = generateItem({ level: 1, slotType: 'ceinture', armorType: 'lourde', rarity: 'rare' });
  belt.bonus.pv = 50;
  const bag = [belt];
  equip(guerrier, bag, belt, 'ceinture');
  guerrier.hp = getStats(guerrier).pv;
  assert.ok(unequip(guerrier, bag, 'ceinture'));
  assert.deepEqual(bag, [belt]);
  assert.equal(guerrier.hp, getStats(guerrier).pv);
});

test("l'arme en main gauche ne compte qu'à moitié pour l'attaque", () => {
  const [, voleur] = party();
  const dagger = item({ slotType: 'arme', weaponType: 'dague', primary: 'agilite', level: 10 });
  const before = getStats(voleur);
  equip(voleur, [dagger], dagger, 'mainGauche');
  const after = getStats(voleur);
  assert.equal(after.atq - before.atq, Math.round(dagger.stats.atq * 0.5));
});

test('un légendaire porté modifie la compétence visée', () => {
  const [, voleur] = party();
  const croc = generateItem({ legendary: 'crocSanglant' });
  assert.equal(getSkills(voleur)[1].effects[0].turns, 3);
  equip(voleur, [croc], croc, 'mainDroite');
  const laceration = getSkills(voleur)[1];
  assert.equal(laceration.effects[0].turns, 5);
  assert.equal(laceration.boosted, true);
});
