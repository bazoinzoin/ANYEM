// Habitants du village (par id, data/village.js) : villageois du pack « Fantasy RPG
// Character pack » (Franuka, images de 16 × 24 px, lignes = directions bas, gauche, droite,
// haut ; 4 images d'attente et 4 de marche), deux personnages du pack de monstres (le
// vieux mage, le paladin de garde) et l'Oracle composé comme un héros.

import { lookSprite } from './heroSprite.js';
import { sheetSprite } from './mobSprites.js';
import { image } from './sprites.js';

function townsfolk(name) {
  return {
    kind: 'mob',
    key: name,
    frameW: 16,
    frameH: 24,
    footOffset: 0,
    body: [1, 4, 14, 20],
    rows: { down: 0, left: 1, right: 2, up: 3 },
    sheet: (anim) => image(`townsfolk/${name}_${anim === 'walk' ? 'walk' : 'idle'}`),
    cols: () => [0, 1, 2, 3],
  };
}

export const NPC_SPRITES = {
  inn: townsfolk('Barmaid'),
  forge: townsfolk('Blacksmith'),
  bank: townsfolk('Merchant'),
  shop: townsfolk('Bartender'),
  runes: townsfolk('Alchemist'),
  hunter: townsfolk('Farmer'),
  fisher: townsfolk('Fisherman'),
  kid1: townsfolk('Kid01'),
  kid2: townsfolk('Kid02'),
  master: sheetSprite('Wizard'),
  guard: sheetSprite('Paladin'),
  oracle: lookSprite({ hair: 'longs', hairColor: 'blanc', eyes: 'clos', skin: 'pale', top: 'necro', bottom: 'lin' }),
};
