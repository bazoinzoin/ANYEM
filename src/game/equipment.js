// Règles d'équipement : qui peut porter quoi, où, et échanges avec le sac.
//
// hero.equipment : { [slotKey]: item } (emplacement absent = vide)
// bag            : tableau d'objets partagé par toute l'équipe

import { SLOTS, SLOT_ORDER, WEAPON_TYPES, ARMOR_TYPES } from '../data/items.js';
import { isTwoHanded } from './items.js';
import { getClass, clampToStats } from './party.js';
import { mainBranch } from './talents.js';

/**
 * Équipement permis : celui de la classe, restreint par l'orientation du héros (une seule, voir mainBranch) si elle en
 * fixe (`gear` de data/talents.js : Impassible Gardien = armure lourde, Berserker = moyenne ;
 * Macabre : armes et armure de chaque orientation). Sans point de talent, rien n'est restreint.
 * Retourne { armor, weapons, offHand }.
 */
export function allowedGear(hero) {
  const cls = getClass(hero);
  const g = mainBranch(hero)?.gear ?? {};
  const keep = (list, only) => (only ? list.filter((x) => only.includes(x)) : list);
  return {
    armor: keep(cls.gear.armor, g.armor),
    weapons: keep(cls.gear.weapons, g.weapons),
    offHand: keep(cls.gear.offHand, g.offHand),
  };
}

export function allowedArmor(hero) {
  return allowedGear(hero).armor;
}

// Liste lisible : « hache à deux mains ou masse à deux mains ».
function orList(labels) {
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} ou ${labels[labels.length - 1]}` : labels[0] ?? 'rien';
}

// Raison pour laquelle le héros ne peut pas porter cet objet (quel que soit
// l'emplacement), ou null s'il le peut.
export function cannotEquipReason(hero, item) {
  const cls = getClass(hero);
  if (item.legendary?.classKey && item.legendary.classKey !== hero.classKey) return 'Objet légendaire réservé à une autre classe';
  if (item.armorType && !cls.gear.armor.includes(item.armorType)) return `Les ${cls.plural} ne portent pas ce type d'armure`;
  if (item.slotType === 'bouclier' && !cls.gear.offHand.includes('bouclier')) return `Les ${cls.plural} ne manient pas le bouclier`;
  if (item.slotType === 'arme' && !cls.gear.weapons.includes(item.weaponType) && !cls.gear.offHand.includes(item.weaponType)) {
    return `Les ${cls.plural} ne manient pas ce type d'arme`;
  }
  // Restrictions de l'orientation principale.
  const gear = allowedGear(hero);
  const branch = mainBranch(hero)?.name;
  if (item.armorType && !gear.armor.includes(item.armorType)) {
    return `Orientation ${branch} : ${orList(gear.armor.map((a) => ARMOR_TYPES[a].label.toLowerCase()))} seulement`;
  }
  if (item.slotType === 'bouclier' && !gear.offHand.includes('bouclier')) return `Orientation ${branch} : pas de bouclier`;
  if (item.slotType === 'arme' && !gear.weapons.includes(item.weaponType) && !gear.offHand.includes(item.weaponType)) {
    return `Orientation ${branch} : ${orList(gear.weapons.map((w) => WEAPON_TYPES[w].name.toLowerCase()))} seulement`;
  }
  return null;
}

// Emplacements où le héros peut placer cet objet (vide si aucun).
export function slotsFor(hero, item) {
  if (cannotEquipReason(hero, item)) return [];
  const gear = allowedGear(hero);
  return SLOT_ORDER.filter((slot) => {
    if (!SLOTS[slot].accepts.includes(item.slotType)) return false;
    if (item.slotType !== 'arme') return true;
    if (slot === 'mainDroite') return gear.weapons.includes(item.weaponType);
    // Main gauche : arme à une main seulement, si la classe est ambidextre pour ce type.
    return !WEAPON_TYPES[item.weaponType].twoHanded && gear.offHand.includes(item.weaponType);
  });
}

export function equippedItems(hero) {
  return SLOT_ORDER.map((slot) => hero.equipment[slot]).filter(Boolean);
}

/**
 * Équipe `item` (présent dans `bag`) sur `slot`. Les objets déplacés retournent au sac :
 * l'ancien objet de l'emplacement, et l'autre main si une arme à deux mains est en jeu.
 * Retourne false sans rien modifier si l'opération est impossible.
 */
export function equip(hero, bag, item, slot) {
  const index = bag.indexOf(item);
  if (index === -1 || !slotsFor(hero, item).includes(slot)) return false;

  bag.splice(index, 1);
  const displaced = [hero.equipment[slot]];
  if (slot === 'mainDroite' && isTwoHanded(item)) {
    displaced.push(hero.equipment.mainGauche);
    delete hero.equipment.mainGauche;
  }
  if (slot === 'mainGauche' && hero.equipment.mainDroite && isTwoHanded(hero.equipment.mainDroite)) {
    displaced.push(hero.equipment.mainDroite);
    delete hero.equipment.mainDroite;
  }
  hero.equipment[slot] = item;
  bag.push(...displaced.filter(Boolean));
  clampToStats(hero);
  return true;
}

/**
 * Retire les objets qu'un héros ne peut plus porter (règles changées depuis la sauvegarde)
 * et les range dans le sac. Retourne les objets retirés.
 */
export function returnForbiddenGear(hero, bag) {
  const removed = [];
  for (const [slot, item] of Object.entries(hero.equipment ?? {})) {
    if (item && cannotEquipReason(hero, item)) {
      unequip(hero, bag, slot);
      removed.push(item);
    }
  }
  return removed;
}

/**
 * Remplit les emplacements vides avec ce que le sac a de mieux parmi ce que le héros peut
 * porter (niveau d'objet, puis stat conseillée de l'orientation principale). Sert après un
 * changement d'orientation principale. Retourne les objets équipés.
 */
export function refillGear(hero, bag) {
  const stat = mainBranch(hero)?.gear?.stat;
  const score = (it) => (it.level ?? 1) * 10 + (it.primary === stat ? 5 : 0) + (RARITY_RANK[it.rarity] ?? 0);
  const equipped = [];
  for (const slot of SLOT_ORDER) {
    if (hero.equipment[slot]) continue;
    if (slot === 'mainGauche' && hero.equipment.mainDroite && isTwoHanded(hero.equipment.mainDroite)) continue;
    const best = bag.filter((it) => slotsFor(hero, it).includes(slot)).sort((a, b) => score(b) - score(a))[0];
    if (best && equip(hero, bag, best, slot)) equipped.push(best);
  }
  return equipped;
}
const RARITY_RANK = { commun: 0, peuCommun: 1, rare: 2, epique: 3, legendaire: 4, divin: 5 };

export function unequip(hero, bag, slot) {
  const item = hero.equipment[slot];
  if (!item) return false;
  delete hero.equipment[slot];
  bag.push(item);
  clampToStats(hero);
  return true;
}

// Aperçu : copie du héros avec l'objet équipé (pour comparer les stats).
export function previewEquip(hero, item, slot) {
  const copy = { ...hero, equipment: { ...hero.equipment } };
  const bag = [item];
  return equip(copy, bag, item, slot) ? copy : null;
}
