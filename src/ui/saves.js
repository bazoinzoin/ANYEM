// Emplacements de sauvegarde (1 à SAVE_SLOTS) dans le stockage du navigateur, et options
// du joueur. Le contenu d'une sauvegarde est fabriqué par game/save.js.

import { state } from '../state.js';
import { makeSave, applySave, SAVE_SLOTS } from '../game/save.js';

const KEY = (slot) => `anyem.save.${slot}`;
const OPTIONS_KEY = 'anyem.options';

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const SLOTS = Array.from({ length: SAVE_SLOTS }, (_, i) => i + 1);

// Sauvegarde d'un emplacement (ou null s'il est vide ou illisible).
export function readSlot(slot) {
  try {
    const raw = storage()?.getItem(KEY(slot));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Écrit l'aventure en cours dans son emplacement. Retourne true si c'est fait.
export function saveGame(slot = state.saveSlot) {
  if (!slot) return false;
  try {
    storage().setItem(KEY(slot), JSON.stringify(makeSave(state)));
    state.saveSlot = slot;
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot) {
  const save = readSlot(slot);
  if (!applySave(state, save)) return false;
  state.saveSlot = slot;
  return true;
}

export function deleteSlot(slot) {
  try {
    storage()?.removeItem(KEY(slot));
  } catch {
    // stockage indisponible : rien à effacer
  }
}

// ---- Options ----

export const OPTION_CHOICES = {
  enemySpeed: { label: 'Tours ennemis', choices: { lent: ['Lents', 1.5], normal: ['Normaux', 1], rapide: ['Rapides', 0.6] } },
};

const DEFAULT_OPTIONS = { enemySpeed: 'normal' };

export function getOptions() {
  try {
    return { ...DEFAULT_OPTIONS, ...JSON.parse(storage()?.getItem(OPTIONS_KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function setOption(key, value) {
  const options = { ...getOptions(), [key]: value };
  try {
    storage()?.setItem(OPTIONS_KEY, JSON.stringify(options));
  } catch {
    // stockage indisponible : l'option ne dure que jusqu'au rechargement
  }
  cached = options;
}

let cached = null;
// Multiplicateur des délais des tours ennemis (jamais instantanés : au moins 0,6).
export function enemyDelayFactor() {
  cached ??= getOptions();
  return OPTION_CHOICES.enemySpeed.choices[cached.enemySpeed]?.[1] ?? 1;
}
