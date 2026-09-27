// Images du jeu (assets/, intégrées par tools/assets.mjs) : chargement et cache.

import { ASSET_DATA } from './assetData.js';

const cache = new Map();

// Image d'une clé d'asset (ex. « rm2k3/chip_forest ») ; chargée à la première demande.
export function image(key) {
  if (!cache.has(key)) {
    const img = new Image();
    img.src = ASSET_DATA[key];
    cache.set(key, img);
  }
  return cache.get(key);
}

export function isReady(img) {
  return img.complete && img.naturalWidth > 0;
}

// Promesse résolue quand toutes les images demandées sont prêtes.
export function preload(keys) {
  return Promise.all(keys.map((k) => image(k).decode().catch(() => null)));
}
