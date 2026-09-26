// Positions de combat : corps à corps ('melee') ou distance ('ranged').
//
// - hero.position : position choisie au village (écran Stratégie) ; chaque combat
//   commence avec unit.row = cette position. « Changer de position » en combat
//   modifie unit.row pour ce combat seulement.
// - Les ennemis ont leur position dans le bestiaire (`ranged`).
// - Une unité au corps à corps a plus de chances d'être ciblée (COMBAT.meleeTargetWeight).
// - Une arme ne sert que depuis sa position (WEAPON_TYPES[].range) : attaque simple et
//   compétences physiques (« à l'arme ») ; sorts, soins, pièges et objets restent possibles.
// - Riposte : une unité au corps à corps attaquée au corps à corps peut riposter
//   (chance = stat Riposte), en infligeant une part de sa puissance physique.

import { COMBAT } from '../config.js';
import { WEAPON_TYPES } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { isMultiAction } from './combo.js';

export const POSITIONS = ['melee', 'ranged'];

export function defaultPosition(classKey) {
  return CLASSES[classKey].position ?? 'melee';
}

// Portée de l'arme en main droite ('melee' sans arme : coups de poing).
export function weaponRange(hero) {
  const weapon = hero.equipment?.mainDroite;
  return weapon?.slotType === 'arme' ? WEAPON_TYPES[weapon.weaponType].range : 'melee';
}

// Compétence qui frappe avec l'arme : dégâts physiques directs.
export function usesWeapon(skill) {
  return skill.kind === 'damage' && !skill.magic;
}

// Le héros peut-il se servir de son arme depuis sa position actuelle ?
export function canUseWeapon(hero) {
  return weaponRange(hero) === hero.row;
}

// Pourquoi l'arme est inutilisable (texte), ou null.
export function weaponBlockedReason(hero) {
  if (canUseWeapon(hero)) return null;
  return weaponRange(hero) === 'ranged'
    ? 'Arme à distance : impossible de tirer au corps à corps. Changez de position.'
    : 'Arme de corps à corps : impossible de frapper à distance. Changez de position.';
}

// Changer de position : toujours possible pour une classe à une action ; une
// classe à Énergie ne peut plus le faire après avoir agi ce tour.
export function canChangePosition(hero) {
  return !(isMultiAction(hero) && hero.actedThisTurn);
}

export function otherRow(row) {
  return row === 'melee' ? 'ranged' : 'melee';
}

// Poids d'une unité dans le choix de cible d'un ennemi.
export function targetWeight(unit) {
  return unit.row === 'melee' ? COMBAT.meleeTargetWeight : 1;
}

// Stratégie (village) : position de départ d'un héros en combat.
export function setPosition(hero, position) {
  if (!POSITIONS.includes(position)) return false;
  hero.position = position;
  return true;
}
