// Personnages sur les cartes (expédition, village) : sprite du pack Fan-tasy animé
// (marche pendant un pas, attente sinon), et variantes de couleurs pour les habitants.

import { image, isReady } from './sprites.js';

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

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

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

/**
 * Dessine un personnage pieds au bas de la case dont le coin haut-gauche est (sx, sy)
 * (pixels d'écran, case de `size` px, zoom `scale`), avec son ombre.
 */
export function drawActor(ctx, { sx, sy, size, scale, dir = 'down', moving = false, now, look = null }) {
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(sx + size / 2, sy + size * 0.88, size * 0.34, size * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  const sheet = tintedSheet(moving ? HERO.walk : HERO.idle, look);
  if (!sheet || (sheet instanceof HTMLImageElement && !isReady(sheet))) return;
  const { frameW, frameH, frames, rows } = HERO;
  const frameIndex = Math.floor(now / (moving ? 90 : 200)) % frames;
  const row = rows[dir];
  const w = frameW * scale;
  const h = frameH * scale;
  const dx = Math.round(sx + size / 2 - w / 2);
  const dy = Math.round(sy + size - h + HERO.footOffset * scale);
  ctx.save();
  if (dir === 'left') {
    ctx.translate(dx + w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, frameIndex * frameW, row * frameH, frameW, frameH, 0, 0, w, h);
  } else {
    ctx.drawImage(sheet, frameIndex * frameW, row * frameH, frameW, frameH, dx, dy, w, h);
  }
  ctx.restore();
}
