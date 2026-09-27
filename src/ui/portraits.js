// Portraits de personnages dans les menus : <canvas data-portrait="…"> dessinés de face
// par drawPortraits (redessinés tant que les planches se chargent). Références :
// « classe:guerrier » (apparence de départ de la classe), « look:… » (apparence d'un
// héros, voir heroPortrait) ou « ennemi:gobelin ».

import { CLASS_LOOKS } from '../data/appearance.js';
import { lookOf, lookKey } from '../game/appearance.js';
import { LOOK_PARTS } from '../data/appearance.js';
import { lookSprite } from './heroSprite.js';
import { enemySprite, spriteBounds } from './mobSprites.js';

function spriteOf(ref) {
  const [kind, key] = ref.split(/:(.*)/s);
  if (kind === 'classe') return lookSprite(CLASS_LOOKS[key]);
  if (kind === 'look') {
    const values = key.split('|');
    return lookSprite(Object.fromEntries(Object.keys(LOOK_PARTS).map((part, i) => [part, values[i]])));
  }
  return enemySprite(key);
}

// Canvas d'un portrait ; `scale` = agrandissement d'une zone de 24 × 32 px.
export function portrait(ref, scale = 2, extra = '') {
  return `<canvas class="portrait ${extra}" data-portrait="${ref}" width="${24 * scale}" height="${32 * scale}"></canvas>`;
}

export function heroPortrait(hero, scale = 2, extra = '') {
  return portrait(`look:${lookKey(lookOf(hero))}`, scale, extra);
}

// Dessine la première image d'attente de face : héros cadré sur la tête et le corps,
// monstre agrandi d'un facteur entier pour remplir le cadre.
function drawOne(canvas) {
  const sprite = spriteOf(canvas.dataset.portrait);
  if (!sprite) return true;
  const sheet = sprite.sheet('idle');
  if (!sheet || (sheet instanceof HTMLImageElement && !(sheet.complete && sheet.naturalWidth))) return false;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const col = sprite.cols('idle')[0];
  if (sprite.kind === 'hero') {
    ctx.drawImage(sheet, col * 48 + 12, 2, 24, 32, 0, 0, canvas.width, canvas.height);
    return true;
  }
  const b = spriteBounds(sprite, sheet);
  if (!b) return false;
  const k = Math.max(1, Math.floor(Math.min(canvas.width / b.w, canvas.height / b.h)));
  const w = b.w * k;
  const h = b.h * k;
  ctx.drawImage(sheet, col * sprite.frameW + b.x, b.y, b.w, b.h, Math.round((canvas.width - w) / 2), canvas.height - h, w, h);
  return true;
}

export function drawPortraits(root, tries = 30) {
  let pending = false;
  root.querySelectorAll('canvas[data-portrait]').forEach((canvas) => {
    if (!drawOne(canvas)) pending = true;
  });
  if (pending && tries > 0) setTimeout(() => drawPortraits(root, tries - 1), 100);
}
