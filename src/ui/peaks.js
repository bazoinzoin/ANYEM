// Aperçus de forme d'onde des sons (calculés une fois par son, 200 tranches par seconde).

import { computePeaks } from '../core/dsp.js';
import { getBuffer } from '../audio/engine.js';

export const PEAKS_PER_SECOND = 200;
const cache = new Map();

export function peaksOf(audioId) {
  if (cache.has(audioId)) return cache.get(audioId);
  const buffer = getBuffer(audioId);
  if (!buffer) return null;
  const buckets = Math.max(1, Math.ceil(buffer.duration * PEAKS_PER_SECOND));
  const chans = [];
  for (let c = 0; c < Math.min(2, buffer.numberOfChannels); c++) chans.push(computePeaks(buffer.getChannelData(c), buckets));
  const data = chans[0];
  if (chans[1]) {
    for (let i = 0; i < data.length; i += 2) {
      data[i] = Math.min(data[i], chans[1][i]);
      data[i + 1] = Math.max(data[i + 1], chans[1][i + 1]);
    }
  }
  const entry = { data, buckets, duration: buffer.duration };
  cache.set(audioId, entry);
  return entry;
}

export function forgetPeaks(audioId) {
  cache.delete(audioId);
}

// Dessine la forme d'onde de [offset, offset + duration] (secondes du son) dans un rectangle.
export function drawWave(g, audioId, offset, duration, x, y, w, h, color, reverse = false) {
  const pk = peaksOf(audioId);
  if (!pk || w <= 0) return;
  const mid = y + h / 2;
  g.fillStyle = color;
  g.beginPath();
  const step = Math.max(1, Math.floor(w / 2000));
  for (let px = 0; px < w; px += step) {
    let s = offset + (px / w) * duration;
    if (reverse) s = offset + duration - (px / w) * duration;
    const b = Math.floor(s * PEAKS_PER_SECOND);
    if (b < 0 || b >= pk.buckets) continue;
    const lo = pk.data[b * 2];
    const hi = pk.data[b * 2 + 1];
    const top = mid - hi * h * 0.48;
    const bot = mid - lo * h * 0.48;
    g.rect(x + px, top, step, Math.max(1, bot - top));
  }
  g.fill();
}
