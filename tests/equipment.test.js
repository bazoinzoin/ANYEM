import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats, getSkills } from '../src/game/party.js';
import { generateItem } from '../src/game/items.js';
import { equip, unequip, slotsFor, cannotEquipReason } from '../src/game/equipment.js';
import { learn } from '../src/game/talents.js';
import { LEGENDARIES } from '../src/data/items.js';
import { CLASSES } from '../src/data/classes.js';
import { TALENTS, nodeSkills } from '../src/data/talents.js';

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
  const hammer = item({ slotType: 'arme', weaponType: 'masse2m' });
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
  const belt = generateItem({ level: 1, slotType: 'bottes', armorType: 'lourde', rarity: 'rare' });
  belt.bonus.pv = 50;
  const bag = [belt];
  equip(guerrier, bag, belt, 'bottes');
  guerrier.hp = getStats(guerrier).pv;
  assert.ok(unequip(guerrier, bag, 'bottes'));
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

test('un légendaire porté modifie la compétence visée (talent compris)', () => {
  const [, voleur] = party();
  voleur.level = 50;
  for (const id of ['depart-empoisonneur', 'toxines', 'toxines', 'opportuniste', 'opportuniste', 'lame-empoisonnee']) assert.ok(learn(voleur, id), id);
  const croc = generateItem({ legendary: 'crocSanglant' });
  const lame0 = getSkills(voleur).find((s) => s.id === 'lame-empoisonnee');
  assert.equal(lame0.effects[0].turns, 4);
  equip(voleur, [croc], croc, 'mainDroite');
  const lame = getSkills(voleur).find((s) => s.id === 'lame-empoisonnee');
  assert.equal(lame.effects[0].turns, 6);
  assert.equal(lame.boosted, true);
});

test('chaque légendaire vise une compétence de sa classe (sort de départ ou de talent) ; il y en a un par orientation', () => {
  for (const [key, leg] of Object.entries(LEGENDARIES)) {
    const skills = TALENTS[leg.classKey].flatMap((b) => b.nodes).flatMap(nodeSkills);
    assert.ok(skills.some((s) => s.id === leg.passive.skill), `${key} vise une compétence inconnue`);
    const item = generateItem({ legendary: key });
    const [hero] = createParty([], [leg.classKey]);
    assert.equal(cannotEquipReason(hero, item), null, `${key} doit être équipable par sa classe`);
  }
  for (const [classKey, branches] of Object.entries(TALENTS)) {
    const count = Object.values(LEGENDARIES).filter((l) => l.classKey === classKey).length;
    assert.equal(count, branches.length, `${classKey} : un légendaire par orientation`);
  }
});

test('Paladin : armes au corps à corps, bouclier, toutes les armures ; Chasseur : arc, armures moyenne et légère', () => {
  const [paladin, chasseur] = createParty([], ['paladin', 'chasseur']);
  assert.deepEqual(slotsFor(paladin, item({ slotType: 'arme', weaponType: 'masse', primary: 'intelligence' })), ['mainDroite']);
  assert.deepEqual(slotsFor(paladin, item({ slotType: 'bouclier' })), ['mainGauche']);
  assert.equal(cannotEquipReason(paladin, item({ slotType: 'plastron', armorType: 'legere' })), null);
  assert.equal(cannotEquipReason(paladin, item({ slotType: 'plastron', armorType: 'moyenne' })), null, 'qui peut le plus peut le moins');
  assert.equal(cannotEquipReason(chasseur, item({ slotType: 'plastron', armorType: 'legere' })), null);
  assert.ok(cannotEquipReason(chasseur, item({ slotType: 'plastron', armorType: 'lourde' })));
  assert.ok(cannotEquipReason(paladin, item({ slotType: 'arme', weaponType: 'arc' })));
  assert.equal(chasseur.equipment.mainDroite.weaponType, 'arc');
  assert.ok(cannotEquipReason(chasseur, item({ slotType: 'arme', weaponType: 'dague' })));
  assert.ok(cannotEquipReason(paladin, item({ slotType: 'arme', weaponType: 'baton' })));
});

test("la Vitesse est multipliée par le coefficient de vitesse d'attaque des armes", () => {
  const [guerrier, voleur] = party();
  const base = getStats(guerrier).vitBase;
  guerrier.equipment.mainDroite = item({ slotType: 'arme', weaponType: 'masse2m', primary: 'force' });
  assert.equal(getStats(guerrier).vit, Math.round(base * 0.8));
  guerrier.equipment.mainDroite = item({ slotType: 'arme', weaponType: 'epee', primary: 'force' });
  assert.equal(getStats(guerrier).vit, Math.round(base * 1.08));
  // Ambidextrie : moyenne des deux armes.
  voleur.equipment.mainDroite = item({ slotType: 'arme', weaponType: 'dague', primary: 'agilite' });
  voleur.equipment.mainGauche = item({ slotType: 'arme', weaponType: 'masse', primary: 'agilite' });
  assert.equal(getStats(voleur).weaponSpeed, 1.06);
  delete guerrier.equipment.mainDroite;
  assert.equal(getStats(guerrier).vit, base, 'sans arme : coefficient 1');
});

test("un légendaire sans classe (neutre) est équipable par toutes les classes", () => {
  for (const hero of createParty([], ['guerrier', 'paladin'])) {
    const ring = item({ slotType: 'anneau' });
    ring.rarity = 'legendaire';
    ring.legendary = { key: 'neutre', desc: 'Effet neutre' };
    assert.equal(cannotEquipReason(hero, ring), null, hero.classKey);
  }
});
