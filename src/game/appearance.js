// Apparence des héros : valeurs par défaut par classe, validation, tirage au hasard et
// passage au choix suivant (écran de création). Catalogue : data/appearance.js.

import { LOOK_PARTS, CLASS_LOOKS } from '../data/appearance.js';
import { pick } from './rng.js';

const FALLBACK = CLASS_LOOKS.guerrier;

export function defaultLook(classKey) {
  return { ...(CLASS_LOOKS[classKey] ?? FALLBACK) };
}

// Apparence complète et valide (champ absent ou inconnu → valeur de la classe).
export function sanitizeLook(look, classKey) {
  const base = defaultLook(classKey);
  const out = {};
  for (const part of Object.keys(LOOK_PARTS)) {
    out[part] = look && LOOK_PARTS[part][look[part]] ? look[part] : base[part];
  }
  return out;
}

export function randomLook() {
  return Object.fromEntries(Object.entries(LOOK_PARTS).map(([part, options]) => [part, pick(Object.keys(options))]));
}

// Choix suivant (step = 1) ou précédent (step = -1) d'une partie, en boucle.
export function cycleLook(look, part, step = 1) {
  const keys = Object.keys(LOOK_PARTS[part]);
  const i = keys.indexOf(look[part]);
  return { ...look, [part]: keys[((i < 0 ? 0 : i) + step + keys.length) % keys.length] };
}

// Clé stable d'une apparence (cache des images composées).
export function lookKey(look) {
  return Object.keys(LOOK_PARTS).map((part) => look[part]).join('|');
}

// Apparence d'un héros (celle choisie à la création, sinon celle de sa classe).
export function lookOf(hero) {
  return sanitizeLook(hero?.look, hero?.classKey);
}
