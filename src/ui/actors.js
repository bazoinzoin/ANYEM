// Personnages sur les cartes et en combat : planches du pack Franuka (héros personnalisés,
// monstres, villageois), animées image par image (attente, marche pendant un pas,
// attaque, sort, dégâts, mort).

import { isReady } from './sprites.js';

// Direction d'un déplacement d'une case (from → to), ou null s'il n'y en a pas.
export function dirBetween(from, to) {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  if (dx) return dx > 0 ? 'right' : 'left';
  if (dy) return dy > 0 ? 'down' : 'up';
  return null;
}

/**
 * Dessine un personnage pieds au bas de la case dont le coin haut-gauche est (sx, sy)
 * (pixels d'écran, case de `size` px, zoom `scale`), avec son ombre.
 * `sprite` : héros (ui/heroSprite.js), monstre ou villageois (ui/mobSprites.js,
 * ui/spriteCatalog.js).
 * `stride` : numéro du pas en cours, `progress` : avancement du pas (0 à 1).
 * Sprites du pack Franuka (`kind: 'hero'` / `'mob'`) : `anim` choisit l'animation
 * (défaut : marche ou attente) et `animT` (0 à 1) son avancement pour une animation
 * jouée une fois (attaque, dégâts, sort, mort).
 */
export function drawActor(ctx, { sx, sy, size, scale, dir = 'down', moving = false, stride = 0, progress = 0, now, sprite, shadow = true, anim = null, animT = 0 }) {
  if (!sprite) return;
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(sx + size / 2, sy + size * 0.88, size * 0.34, size * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawPackActor(ctx, sprite, { sx, sy, size, scale, dir, moving, stride, progress, now, anim, animT });
}

// Image d'une animation du pack Franuka : colonne à afficher.
export function packFrame(cols, { anim, moving, stride, progress, now, animT }) {
  if (anim === 'walk' && moving) return cols[((stride % 2) * 2 + (progress < 0.5 ? 0 : 1)) % cols.length];
  if (anim === 'walk' || anim === 'idle') return cols[Math.floor(now / (anim === 'walk' ? 150 : 200)) % cols.length];
  return cols[Math.min(cols.length - 1, Math.floor(animT * cols.length))];
}

// Héros personnalisés et monstres du pack Franuka (images de taille variable, lignes =
// directions bas, gauche, droite, haut ; pieds `footOffset` px au-dessus du bas de l'image).
function drawPackActor(ctx, sprite, o) {
  const anim = o.anim ?? (o.moving ? 'walk' : 'idle');
  const sheet = sprite.sheet(anim);
  if (!sheet || (sheet instanceof HTMLImageElement && !isReady(sheet))) return;
  const cols = sprite.cols(anim);
  if (!cols?.length) return;
  const col = packFrame(cols, { ...o, anim });
  const row = sprite.rows[o.dir] ?? 0;
  const { frameW, frameH } = sprite;
  const w = frameW * o.scale;
  const h = frameH * o.scale;
  const dx = Math.round(o.sx + o.size / 2 - w / 2);
  const dy = Math.round(o.sy + o.size - h + sprite.footOffset * o.scale);
  ctx.drawImage(sheet, col * frameW, row * frameH, frameW, frameH, dx, dy, w, h);
}
