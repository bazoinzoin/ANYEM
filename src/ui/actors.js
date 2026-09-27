// Personnages sur les cartes (expédition, village) : sprites animés (marche pendant un
// pas, attente sinon). Joueur : paladin (PLAYER) ; habitants : héros du pack Fan-tasy
// (HERO) en variantes de couleurs.

import { image, isReady } from './sprites.js';
import { rgbToHsl, hslToRgb } from './recolor.js';

// Planches du pack : 4 images par ligne, 40 × 48 px. Lignes : 0 = profil (vers la droite,
// retourné pour la gauche), 2 = dos, 3 = face.
export const HERO = {
  walk: 'fantasy/Character_Walk',
  idle: 'fantasy/Character_Idle',
  frameW: 40,
  frameH: 48,
  frames: 4,
  rows: { right: 0, left: 0, up: 2, down: 3 },
  footOffset: 6,
};

// ---- Couleurs des habitants ----

const tintCache = new Map();

/**
 * Planche recolorée : la tunique jaune prend la teinte `look.shirt`, les cheveux bruns
 * la teinte `look.hair` (degrés). Retourne un canvas, ou null tant que l'image n'est pas prête.
 */
export function tintedSheet(key, look) {
  if (!look) return image(key);
  const id = `${key}|${look.shirt}|${look.hair}`;
  if (tintCache.has(id)) return tintCache.get(id);
  const src = image(key);
  if (!isReady(src)) return null;
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
    let nh = null;
    if (h >= 36 && h <= 62 && s > 0.35 && l > 0.3) nh = look.shirt;             // tunique jaune
    else if (h >= 8 && h < 36 && s > 0.25 && l < 0.5 && l > 0.12) nh = look.hair; // cheveux bruns
    if (nh === null) continue;
    const [r, g, b] = hslToRgb(nh, Math.min(1, s * 1.05), l);
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
  ctx.putImageData(data, 0, 0);
  tintCache.set(id, canvas);
  return canvas;
}

// Personnage du joueur : paladin en pixel art (planche 32 × 32, de profil uniquement :
// retourné vers la gauche, il garde son dernier profil quand il monte ou descend).
export const PLAYER = {
  sheet: 'custom/paladin_spritesheet',
  frameW: 32,
  frameH: 32,
  sideOnly: true,
  anims: { idle: { row: 0, frames: 4, ms: 200 }, walk: { row: 1, frames: 6, ms: 100 } },
  footOffset: -1,
};

/**
 * Dessine un personnage pieds au bas de la case dont le coin haut-gauche est (sx, sy)
 * (pixels d'écran, case de `size` px, zoom `scale`), avec son ombre.
 * `sprite` : PLAYER, ou HERO (planches du pack, 4 directions, recolorables par `look`).
 * `facing` : dernier profil ('left' | 'right') pour un sprite de profil uniquement.
 */
export function drawActor(ctx, { sx, sy, size, scale, dir = 'down', facing = 'right', moving = false, now, look = null, sprite = HERO }) {
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(sx + size / 2, sy + size * 0.88, size * 0.34, size * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  let sheet;
  let row;
  let frames;
  let ms;
  let flip;
  if (sprite.sideOnly) {
    sheet = image(sprite.sheet);
    ({ row, frames, ms } = sprite.anims[moving ? 'walk' : 'idle']);
    flip = (dir === 'left' || dir === 'right' ? dir : facing) === 'left';
  } else {
    sheet = tintedSheet(moving ? sprite.walk : sprite.idle, look);
    row = sprite.rows[dir];
    frames = sprite.frames;
    ms = moving ? 90 : 200;
    flip = dir === 'left';
  }
  if (!sheet || (sheet instanceof HTMLImageElement && !isReady(sheet))) return;
  const { frameW, frameH } = sprite;
  const frameIndex = Math.floor(now / ms) % frames;
  const w = frameW * scale;
  const h = frameH * scale;
  const dx = Math.round(sx + size / 2 - w / 2);
  const dy = Math.round(sy + size - h + sprite.footOffset * scale);
  ctx.save();
  if (flip) {
    ctx.translate(dx + w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, frameIndex * frameW, row * frameH, frameW, frameH, 0, 0, w, h);
  } else {
    ctx.drawImage(sheet, frameIndex * frameW, row * frameH, frameW, frameH, dx, dy, w, h);
  }
  ctx.restore();
}
