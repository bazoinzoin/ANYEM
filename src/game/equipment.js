// Règles d'équipement : qui peut porter quoi, où, et échanges avec le sac.
//
// hero.equipment : { [slotKey]: item } (emplacement absent = vide)
// bag            : tableau d'objets partagé par toute l'équipe

import { SLOTS, SLOT_ORDER, WEAPON_TYPES } from '../data/items.js';
import { isTwoHanded } from './items.js';
import { getClass, clampToStats } from './party.js';

// Raison pour laquelle le héros ne peut pas porter cet objet (quel que soit
// l'emplacement), ou null s'il le peut.
export function cannotEquipReason(hero, item) {
  const cls = getClass(hero);
  if (item.legendary?.classKey && item.legendary.classKey !== hero.classKey) return 'Objet légendaire réservé à une autre classe';
  if (item.armorType && !cls.gear.armor.includes(item.armorType)) return `${cls.name} ne porte pas ce type d'armure`;
  if (item.slotType === 'bouclier' && !cls.gear.offHand.includes('bouclier')) return `${cls.name} ne manie pas le bouclier`;
  if (item.slotType === 'arme' && !cls.gear.weapons.includes(item.weaponType) && !cls.gear.offHand.includes(item.weaponType)) {
    return `${cls.name} ne manie pas ce type d'arme`;
  }
  return null;
}

// Emplacements où le héros peut placer cet objet (vide si aucun).
export function slotsFor(hero, item) {
  if (cannotEquipReason(hero, item)) return [];
  const gear = getClass(hero).gear;
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
