// Éditeur audio : forme d'onde du son entier, partie utilisée par la région, fondus et gain.

import { fitCanvas, shade } from './dom.js';
import { editorRegion, project } from './store.js';
import { drawWave } from './peaks.js';
import { getBuffer } from '../audio/engine.js';
import { secondsToTicks } from '../core/time.js';
import { currentTick } from './transport.js';
import { dbToGain } from '../core/project.js';

let els = null;

export function drawAudioEditor() {
  if (!els) return;
  const er = editorRegion();
  const W = els.host.clientWidth;
  const H = els.host.clientHeight;
  const g = fitCanvas(els.canvas, W, H);
  g.fillStyle = '#14181e';
  g.fillRect(0, 0, W, H);
  if (!er || er.region.type !== 'audio') return;
  const { region, track } = er;
  const buffer = getBuffer(region.audioId);
  if (!buffer) {
    g.fillStyle = '#9aa3b0';
    g.font = '13px Inter, system-ui, sans-serif';
    g.fillText('Le son de cette région est introuvable.', 20, 30);
    return;
  }
  const total = buffer.duration;
  const pad = 16;
  const w = W - pad * 2;
  const xOf = (sec) => pad + (sec / total) * w;
  const gain = Math.min(4, dbToGain(region.gain || 0));
  // Son entier (grisé), puis la partie utilisée
  drawWave(g, region.audioId, 0, total, pad, 24, w, H - 40, 'rgba(255,255,255,0.14)');
  const a = xOf(region.offset);
  const b = xOf(region.offset + region.duration);
  g.fillStyle = shade(track.color, -0.55, 0.6);
  g.fillRect(a, 20, b - a, H - 32);
  g.save();
  drawWave(g, region.audioId, region.offset, region.duration, a, 24 + (H - 40) * (1 - Math.min(1, gain)) / 2, b - a, (H - 40) * Math.min(1, gain), shade(track.color, 0.35, 1), region.reverse);
  g.restore();
  // Fondus
  g.strokeStyle = '#fff';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(a, H - 12);
  g.lineTo(xOf(region.offset + Math.min(region.fadeIn || 0, region.duration)), 22);
  g.lineTo(xOf(region.offset + region.duration - Math.min(region.fadeOut || 0, region.duration)), 22);
  g.lineTo(b, H - 12);
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = shade(track.color, 0.4, 1);
  g.strokeRect(a + 0.5, 20.5, b - a - 1, H - 33);
  // Graduation en secondes
  g.fillStyle = '#8f99a8';
  g.font = '10.5px Inter, system-ui, sans-serif';
  const step = total > 60 ? 10 : total > 20 ? 5 : total > 5 ? 1 : 0.5;
  for (let t = 0; t <= total; t += step) {
    const x = xOf(t);
    g.fillRect(x, 0, 1, 6);
    g.fillText(`${t.toFixed(step < 1 ? 1 : 0)} s`, x + 3, 12);
  }
  // Tête de lecture
  const p = project();
  const rel = currentTick() - region.start;
  const relSec = (rel / secondsToTicks(1, p.bpm));
  if (relSec >= 0 && relSec <= region.duration) {
    g.fillStyle = '#f2f4f7';
    g.fillRect(xOf(region.offset + relSec), 16, 1.5, H - 20);
  }
}

export function mountAudioEditor(host) {
  host.innerHTML = '<div class="ae-host" data-help="Forme d\'onde du son : la partie claire est celle jouée par la région. Réglez gain et fondus à gauche ; rognez la région dans l\'arrangement."><canvas></canvas></div>';
  els = { host: host.querySelector('.ae-host'), canvas: host.querySelector('canvas') };
  new ResizeObserver(() => drawAudioEditor()).observe(els.host);
}

export function unmountAudioEditor() {
  els = null;
}
