// Variantes de couleurs des images du pack (zones, habitants) : chaque pixel passe par
// une fonction (teinte, saturation, luminosité) → nouvelle couleur, ou null pour le garder.
// Les formes restent celles du pack : la direction artistique reste cohérente.

import { image, isReady } from './sprites.js';

export function rgbToHsl(r, g, b) {
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

export function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
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

const cache = new Map();

/**
 * Image `key` recolorée par `fn(h, s, l)` → [h, s, l] | null ; `id` distingue les variantes
 * en cache. Retourne un canvas, ou null tant que l'image source n'est pas chargée.
 */
export function recolored(key, id, fn) {
  const cacheKey = `${key}|${id}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
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
    const out = fn(...rgbToHsl(px[i], px[i + 1], px[i + 2]));
    if (!out) continue;
    const [r, g, b] = hslToRgb(...out);
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
  ctx.putImageData(data, 0, 0);
  cache.set(cacheKey, canvas);
  return canvas;
}
