import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { learnPath } from './helpers.js';

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
  const croc = generateItem({ legendary: 'fleursDuMal' });
  assert.ok(cannotEquipReason(guerrier, croc));
  assert.equal(cannotEquipReason(voleur, croc), null);
  const commun = generateItem({ legendary: 'coeurSacrifie' });
  assert.equal(cannotEquipReason(guerrier, commun), null, 'un légendaire commun va à toutes les classes');
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
  const croc = generateItem({ legendary: 'fleursDuMal' });
  const lame0 = getSkills(voleur).find((s) => s.id === 'lame-empoisonnee');
  assert.equal(lame0.effects[0].turns, 4);
  equip(voleur, [croc], croc, 'mainDroite');
  const lame = getSkills(voleur).find((s) => s.id === 'lame-empoisonnee');
  assert.equal(lame.effects[0].turns, 6);
  assert.equal(lame.boosted, true);
  // Un pouvoir qui renforce un passif ne fait rien sans ce passif.
  const arsenic = generateItem({ legendary: 'arsenicDEmma' });
  equip(voleur, [arsenic], arsenic, 'anneau1');
  assert.ok(!getSkills(voleur).find((s) => s.id === 'lame-empoisonnee').effects.some((e) => e.id === 'ralenti'), 'sans Venin virulent');
  learnPath(voleur, 'empoisonneur', { upTo: 4 });
  assert.ok(getSkills(voleur).find((s) => s.id === 'lame-empoisonnee').effects.some((e) => e.id === 'ralenti'), 'avec Venin virulent');
});

test('trois légendaires par orientation, chacun renforçant un gros palier ; des légendaires communs à toutes les classes', () => {
  const allSkills = (classKey) => TALENTS[classKey].flatMap((b) => b.nodes).flatMap(nodeSkills);
  for (const [key, leg] of Object.entries(LEGENDARIES)) {
    const item = generateItem({ legendary: key });
    assert.equal(item.primary, leg.primary, `${key} : toujours la même stat principale`);
    if (!leg.classKey) {
      assert.ok(leg.power.passive || leg.power.pct || leg.power.startEffects, `${key} : pouvoir commun`);
      continue;
    }
    const branch = TALENTS[leg.classKey].find((b) => b.key === leg.branch);
    assert.ok(branch, `${key} : orientation inconnue`);
    const big = branch.nodes.filter((n) => n.kind !== 'minor' && n.tier > 0);
    const bigSkills = big.flatMap(nodeSkills).map((s) => s.id);
    for (const mod of [].concat(leg.power.skillMod ?? [])) {
      assert.ok(allSkills(leg.classKey).some((s) => s.id === mod.skill), `${key} vise une compétence inconnue`);
    }
    // Il renforce une compétence d'un gros palier, ou le passif d'un gros palier (requires).
    const targetsBig = leg.power.requires ? big.some((n) => n.id === leg.power.requires)
      : [].concat(leg.power.skillMod).every((m) => bigSkills.includes(m.skill));
    assert.ok(targetsBig, `${key} : doit renforcer un gros palier de ${branch.name}`);
    const [hero] = createParty([], [leg.classKey]);
    assert.equal(cannotEquipReason(hero, item), null, `${key} doit être équipable par sa classe`);
  }
  for (const [classKey, branches] of Object.entries(TALENTS)) {
    for (const b of branches) {
      const count = Object.values(LEGENDARIES).filter((l) => l.classKey === classKey && l.branch === b.key).length;
      assert.equal(count, 3, `${b.key} : trois légendaires`);
    }
  }
  const common = Object.keys(LEGENDARIES).filter((k) => !LEGENDARIES[k].classKey);
  for (const k of ['plumeLegere', 'fratricide', 'coeurSacrifie']) assert.ok(common.includes(k), k);
  assert.deepEqual([LEGENDARIES.plumeLegere.slotType, LEGENDARIES.plumeLegere.armorType, LEGENDARIES.plumeLegere.primary], ['bottes', 'legere', 'intelligence']);
  assert.deepEqual([LEGENDARIES.fratricide.weaponType, LEGENDARIES.fratricide.primary], ['dague', 'agilite']);
  assert.deepEqual([LEGENDARIES.coeurSacrifie.slotType, LEGENDARIES.coeurSacrifie.primary], ['collier', 'force']);
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

test('secondaire Mana : augmente la Mana maximum des classes à Mana, sans effet sur les autres', () => {
  const [mage, guerrier] = createParty(['M', 'G'], ['mage', 'guerrier']);
  for (const hero of [mage, guerrier]) {
    const before = getStats(hero);
    const ring = { ...generateItem({ level: 20, rarity: 'rare', slotType: 'anneau' }), bonus: { mana: 12 } };
    const bag = [ring];
    equip(hero, bag, ring, 'anneau1');
    const after = getStats(hero);
    if (hero === mage) {
      assert.equal(after.resMax, before.resMax + 12);
      assert.equal(after.resMaxItems, 12);
      assert.equal(after.resMaxBase, CLASSES.mage.resource.max);
    } else {
      assert.equal(after.resMax, before.resMax, 'la Rage ne change pas');
      assert.equal(after.resMaxItems, 0);
    }
  }
});
