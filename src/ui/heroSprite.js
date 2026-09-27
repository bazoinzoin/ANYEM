// Planches des héros personnalisés (canvas composés une fois par apparence, voir
// ui/heroCompose.js) et description de sprite pour drawActor.

import { BODIES, TOPS } from '../data/appearance.js';
import { lookOf, lookKey, sanitizeLook } from '../game/appearance.js';
import { image, isReady } from './sprites.js';
import { HERO_FRAMES } from './heroHeads.js';
import { composeHero } from './heroCompose.js';

const sheets = new Map(); // clé d'apparence → canvas

function sheetFor(look) {
  const key = lookKey(look);
  if (sheets.has(key)) return sheets.get(key);
  const src = image(BODIES[TOPS[look.top].body].sheet);
  if (!isReady(src)) return null;
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  composeHero(data.data, canvas.width, look);
  ctx.putImageData(data, 0, 0);
  sheets.set(key, canvas);
  return canvas;
}

// Sprite d'une apparence : planche de 48 px, pieds à la ligne 31 de l'image.
export function lookSprite(look) {
  const clean = sanitizeLook(look);
  return {
    kind: 'hero',
    frameW: 48,
    frameH: 48,
    footOffset: 16,
    rows: { down: 0, left: 1, right: 2, up: 3 },
    sheet: () => sheetFor(clean),
    cols: (anim) => HERO_FRAMES[anim] ?? HERO_FRAMES.idle,
  };
}

const heroSprites = new Map();
// Sprite d'un héros (son apparence, ou celle de sa classe).
export function heroSprite(hero) {
  const look = lookOf(hero);
  const key = lookKey(look);
  if (!heroSprites.has(key)) heroSprites.set(key, lookSprite(look));
  return heroSprites.get(key);
}
