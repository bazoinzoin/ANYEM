// Personnages sur les cartes (expédition, village) : sprites animés (marche pendant un
// pas, attente sinon) : planches RPG Maker 2003 (voir ui/spriteCatalog.js), ou héros du
// pack Fan-tasy (HERO) en variantes de couleurs.

import { image, isReady } from './sprites.js';
import { rgbToHsl, hslToRgb, recolored } from './recolor.js';

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

const RM_ROWS = { up: 0, right: 1, down: 2, left: 3 };

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
 * `sprite` : HERO (planches du pack, 4 directions, recolorables par `look`), ou
 * une planche RPG Maker 2003 (`kind: 'rm'`, voir ui/spriteCatalog.js).
 */
export function drawActor(ctx, { sx, sy, size, scale, dir = 'down', facing = 'right', moving = false, now, look = null, sprite = HERO, shadow = true }) {
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(sx + size / 2, sy + size * 0.88, size * 0.34, size * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  let sheet;
  let row;
  let frames;
  let ms;
  let flip;
  if (sprite.kind === 'rm') {
    // Planche RPG Maker 2003 : lignes haut, droite, bas, gauche ; marche = images 0-1-2-1.
    const t = sprite.tint;
    sheet = t
      ? recolored(sprite.key, `${t.hue}|${t.sat}|${t.light}`, (h, s, l) => (s < 0.1 ? null : [h + t.hue, s * t.sat, l * t.light]))
      : image(sprite.key);
    row = RM_ROWS[dir] ?? 2;
    frames = 1;
    ms = 1;
    flip = false;
  } else {
    sheet = tintedSheet(moving ? sprite.walk : sprite.idle, look);
    row = sprite.rows[dir];
    frames = sprite.frames;
    ms = moving ? 90 : 200;
    flip = dir === 'left';
  }
  if (!sheet || (sheet instanceof HTMLImageElement && !isReady(sheet))) return;
  const { frameW, frameH } = sprite;
  const frameIndex = sprite.kind === 'rm'
    ? (moving ? [0, 1, 2, 1][Math.floor(now / 120) % 4] : 1)
    : Math.floor(now / ms) % frames;
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
