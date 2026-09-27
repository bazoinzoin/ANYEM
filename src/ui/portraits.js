// Portraits de personnages dans les menus : <canvas data-portrait="classe:guerrier"> ou
// "ennemi:gobelin", dessinés de face par drawPortraits (redessinés tant que les planches
// se chargent).

import { drawActor } from './actors.js';
import { CLASS_SPRITES, ENEMY_SPRITES } from './spriteCatalog.js';

function spriteOf(ref) {
  const [kind, key] = ref.split(':');
  return kind === 'classe' ? CLASS_SPRITES[key] ?? CLASS_SPRITES.paladin : ENEMY_SPRITES[key] ?? null;
}

// Canvas d'un portrait ; `scale` = agrandissement des images 24 × 32 px.
export function portrait(ref, scale = 2, extra = '') {
  return `<canvas class="portrait ${extra}" data-portrait="${ref}" width="${24 * scale}" height="${32 * scale}"></canvas>`;
}

export function drawPortraits(root, tries = 20) {
  let pending = false;
  root.querySelectorAll('canvas[data-portrait]').forEach((canvas) => {
    const sprite = spriteOf(canvas.dataset.portrait);
    if (!sprite) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / 24;
    drawActor(ctx, { sx: 0, sy: (8 - sprite.footOffset) * scale, size: canvas.width, scale, dir: 'down', now: 0, sprite, shadow: false });
    // Rien de dessiné : la planche n'est pas encore chargée.
    if (!ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((v, i) => i % 4 === 3 && v)) pending = true;
  });
  if (pending && tries > 0) setTimeout(() => drawPortraits(root, tries - 1), 100);
}
