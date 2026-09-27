// Composition d'un héros personnalisé, sans DOM (testable) : on part de la planche d'un
// corps du pack (tête retirée), on recolore la tenue (haut, bas, mains), puis on pose la
// tête dessinée (ui/heroHeads.js) à la position de la tête d'origine dans chaque image.
// Pixels : tableau RGBA (ImageData.data) d'une planche de 14 × 4 images de 48 px.

import { BODIES, TOPS, BOTTOMS, SKINS, HAIR_COLORS, EYES } from '../data/appearance.js';
import { HEADS, HEAD_OFFSETS } from './heroHeads.js';

export const FRAME = 48;
export const SHEET_COLS = 14;
export const LEGS_FROM = 29; // lignes de l'image à partir desquelles commence le bas du corps
const OUTLINE = '#52333f';
const PACK_SKIN = ['#ffc2a1', '#d09c8e'];

const hex = (r, g, b) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Couleurs de l'œil (haut, bas) selon sa forme.
function eyeColors(eyes, skin) {
  if (eyes.shape === 'plisses') return [skin[0], OUTLINE];
  if (eyes.shape === 'clos') return [skin[0], skin[1]];
  return eyes.colors;
}

// Palette d'une tête : symbole des dessins → couleur.
export function headPalette(look) {
  const hair = HAIR_COLORS[look.hairColor].ramp;
  const skin = SKINS[look.skin].ramp;
  const [e, E] = eyeColors(EYES[look.eyes], skin);
  return { o: OUTLINE, 1: hair[0], 2: hair[1], 3: hair[2], s: skin[0], S: skin[1], e, E };
}

// Nouvelle couleur d'un pixel du corps (ou null pour le garder).
export function bodyColor(color, y, look) {
  const top = TOPS[look.top];
  const body = BODIES[top.body];
  const skin = SKINS[look.skin].ramp;
  const s = PACK_SKIN.indexOf(color);
  if (s >= 0) return skin[s];
  if (!body.robe && y >= LEGS_FROM && body.bottom[color]) {
    const bottom = BOTTOMS[look.bottom];
    const role = body.bottom[color];
    return { light: bottom.pants[0], mid: bottom.pants[1], dark: bottom.pants[2], bootLight: bottom.boots[0], bootDark: bottom.boots[1] }[role];
  }
  return top.map[color] ?? null;
}

/**
 * Compose la planche d'un héros. `pixels` : planche du corps (modifiée sur place).
 * Retourne `pixels`.
 */
export function composeHero(pixels, width, look) {
  const top = TOPS[look.top];
  const bodyKey = top.body;
  const body = BODIES[bodyKey];
  const heads = HEADS[look.hair];
  const palette = headPalette(look);
  const colorCache = new Map();
  const put = (x, y, h) => {
    const [r, g, b] = rgb(h);
    const i = (y * width + x) * 4;
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255;
  };

  // 1. Tenue et mains.
  const height = pixels.length / 4 / width;
  for (let y = 0; y < height; y++) {
    const fy = y % FRAME;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!pixels[i + 3]) continue;
      const c = hex(pixels[i], pixels[i + 1], pixels[i + 2]);
      const key = `${c}|${fy >= LEGS_FROM}`;
      if (!colorCache.has(key)) colorCache.set(key, bodyColor(c, fy, look));
      const to = colorCache.get(key);
      if (to) put(x, y, to);
    }
  }

  // 2. Têtes : posées sur chaque image, puis les pixels du corps qui dépassent au-dessus
  // du cou (bras, armes levés) repassent devant.
  const bodyAbove = new Uint8ClampedArray(pixels);
  for (let row = 0; row < 4; row++) {
    const view = row === 0 ? 'f' : row === 3 ? 'b' : 'l';
    const head = heads[view];
    const mirror = row === 2;
    for (let col = 0; col < SHEET_COLS && (col + 1) * FRAME <= width; col++) {
      const [dx, dy] = HEAD_OFFSETS[bodyKey][row][col];
      const chinY = body.cut - 1 + dy;
      const fx = col * FRAME;
      const fy = row * FRAME;
      head.rows.forEach((line, i) => {
        const y = chinY + (i - head.chin);
        if (y < 0 || y >= FRAME) return;
        for (let j = 0; j < line.length; j++) {
          const ch = line[j];
          if (ch === '.') continue;
          const x = 16 + dx + (mirror ? 15 - j : j);
          if (x < 0 || x >= FRAME) continue;
          put(fx + x, fy + y, palette[ch]);
        }
      });
      for (let y = 0; y <= chinY - 1; y++) {
        for (let x = 0; x < FRAME; x++) {
          const i = ((fy + y) * width + fx + x) * 4;
          if (bodyAbove[i + 3]) { pixels[i] = bodyAbove[i]; pixels[i + 1] = bodyAbove[i + 1]; pixels[i + 2] = bodyAbove[i + 2]; pixels[i + 3] = 255; }
        }
      }
    }
  }
  return pixels;
}
