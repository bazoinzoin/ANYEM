// Fenêtre d'arrangement : en-têtes de pistes, règle (repères, boucle, mesures), régions,
// automation, tête de lecture. Outils : pointeur, crayon, gomme, ciseaux, colle, silence.

import { esc, fitCanvas, roundRect, shade, $, isDoubleDown } from './dom.js';
import { icon } from './icons.js';
import { ui, project, emit, commit, findTrack, findRegion, beginGesture, endGesture, touch } from './store.js';
import { ticksPerBar, ticksPerBeat, gridTicks, snap, secondsToTicks, ticksToSeconds, PPQ } from '../core/time.js';
import { regionUnit, projectEnd, AUTOMATION_PARAMS, dbToFader, faderToDb, uid, TRACK_COLORS } from '../core/project.js';
import {
  createRegionAt, openEditor, deleteRegions, splitAt, joinSelected, toggleMuteRegions, duplicateRegions,
  copyRegions, pasteRegions, toggleTrack, deleteTrack, duplicateTrack, moveTrack, moveTrackTo, setTrackProp,
  importAudioFiles, importMidiFile, addLoop, applyPreset, addTrack, quantizeRegions, setRegionProp,
  normalizeRegion, samplerFromRegion, flattenRegion, deleteMarker, renameMarker, addMarker,
} from './ops.js';
import { setPlayhead, currentTick, recordingNotes } from './transport.js';
import { drawWave } from './peaks.js';
import { showMenu, promptText } from './popup.js';
import { isPlaying, getBuffer, meterLevels } from '../audio/engine.js';
import { trackFromPreset } from '../core/library.js';

export const RULER_H = 46;
export const AUTO_H = 70;
const EDGE = 7;
const COLOR_NAMES = ['Bleu', 'Vert', 'Orange', 'Rouge', 'Violet', 'Cyan', 'Mandarine', 'Anis', 'Rose', 'Ocre'];

let els = null;
let drag = null;
let hoverInfo = null;
let dirty = true;

export function invalidate() {
  dirty = true;
}

// ---- Géométrie -----------------------------------------------------------------------------

function scrollX() { return els.scroller.scrollLeft; }
function scrollY() { return els.scroller.scrollTop; }
function xOf(tick) { return tick * ui.zoom - scrollX(); }
function tickOf(x) { return (x + scrollX()) / ui.zoom; }

export function rowsLayout() {
  let y = 0;
  return project().tracks.map((track, index) => {
    const h = ui.trackH + (track.showAutomation ? AUTO_H : 0);
    const row = { track, index, top: y, h };
    y += h;
    return row;
  });
}

function rowAtY(y) {
  const yy = y + scrollY();
  for (const r of rowsLayout()) if (yy >= r.top && yy < r.top + r.h) return { ...r, inAuto: yy - r.top >= ui.trackH, localY: yy - r.top };
  return null;
}

export function arrGrid() {
  if (ui.snap === 'off') return 1;
  let g = gridTicks(ui.snap, project());
  const min = 8 / ui.zoom;
  while (g < min) g *= 2;
  return g;
}

function contentSize() {
  const p = project();
  const bar = ticksPerBar(p);
  const endTicks = Math.max(projectEnd(p), p.loop.end, ui.playhead) + bar * 32;
  const rows = rowsLayout();
  const h = (rows.length ? rows[rows.length - 1].top + rows[rows.length - 1].h : 0) + 160;
  return { w: endTicks * ui.zoom, h };
}

function regionRect(region, row) {
  const p = project();
  const unit = regionUnit(region, p.bpm);
  const x = xOf(region.start);
  const w = Math.max(4, unit * (region.loops || 1) * ui.zoom);
  return { x, y: row.top - scrollY() + 2, w, h: ui.trackH - 4, unitW: unit * ui.zoom };
}

function hitRegion(x, y) {
  const row = rowAtY(y);
  if (!row || row.inAuto) return { row, region: null };
  const regions = row.track.regions;
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    const rect = regionRect(r, row);
    if (x >= rect.x - 2 && x <= rect.x + rect.w + 2) {
      let edge = null;
      if (x >= rect.x + rect.w - EDGE) edge = (y - rect.y < rect.h / 2 && r.type === 'midi') ? 'loop' : 'resize';
      else if (x <= rect.x + EDGE && rect.w > EDGE * 3) edge = 'trim';
      return { row, region: r, edge, rect };
    }
  }
  return { row, region: null };
}

// ---- En-têtes de pistes --------------------------------------------------------------------

const KIND_ICON = { instrument: 'piano', drums: 'drum', audio: 'wave' };

export function headersHtml() {
  const p = project();
  return rowsLayout().map(({ track: t, h }) => `
    <div class="th${t.id === ui.selectedTrackId ? ' selected' : ''}" data-track="${t.id}" draggable="true" style="height:${h}px;--c:${t.color}">
      <div class="th-color"></div>
      <div class="th-main" style="height:${ui.trackH}px">
        <div class="th-row1">
          <span class="th-icon">${icon(KIND_ICON[t.kind], 17)}</span>
          <span class="th-name" data-help="Double-cliquez pour renommer la piste.">${esc(t.name)}</span>
        </div>
        <div class="th-row2">
          <button class="tbtn tb-m${t.mute ? ' on' : ''}" data-act="mute" data-help="Silence (M) : coupe le son de cette piste.">M</button>
          <button class="tbtn tb-s${t.solo ? ' on' : ''}" data-act="solo" data-help="Solo (S) : n'écouter que cette piste (et les autres en solo).">S</button>
          <button class="tbtn tb-r${t.arm ? ' on' : ''}" data-act="arm" data-help="Armer pour l'enregistrement : cette piste enregistrera quand vous appuierez sur ●.">${icon('record', 11)}</button>
          <button class="tbtn tb-a${t.showAutomation ? ' on' : ''}" data-act="auto" data-help="Automation : dessinez l'évolution du volume, du panoramique ou des envois dans le temps.">${icon('automation', 13)}</button>
          <div class="th-meter"><div class="th-meter-fill" data-meter="${t.id}"></div></div>
        </div>
      </div>
      ${t.showAutomation ? `<div class="th-auto" style="height:${AUTO_H}px">
        <select data-auto-param="${t.id}" data-help="Réglage dessiné sur cette ligne d'automation.">
          ${Object.entries(AUTOMATION_PARAMS).map(([k, d]) => `<option value="${k}"${k === t.automationParam ? ' selected' : ''}>${esc(d.label)}${(t.automation[k] || []).length ? ' •' : ''}</option>`).join('')}
        </select>
        <button class="btn small" data-act="autoclear" data-help="Efface tous les points de ce réglage.">Effacer</button>
      </div>` : ''}
    </div>`).join('') + `<div class="th-add" style="height:${Math.max(80, 0)}px">
      <button class="btn add-track" data-act="newtrack" data-help="Ajoute une piste : instrument, batterie ou audio (micro).">${icon('plus', 16)} Nouvelle piste</button>
      ${p.tracks.length ? '' : '<p class="muted small">Glissez ici un son de la bibliothèque, un fichier audio ou MIDI.</p>'}
    </div>`;
}

// ---- Dessin ----------------------------------------------------------------------------------

function drawGrid(g, W, H, p) {
  const bar = ticksPerBar(p);
  const beat = ticksPerBeat(p);
  const barPx = bar * ui.zoom;
  const t0 = Math.max(0, tickOf(0));
  const t1 = tickOf(W);
  // Lignes de temps et de doubles croches si la place le permet.
  if (barPx > 120) {
    const sub = barPx > 480 ? PPQ / 4 : beat;
    g.strokeStyle = 'rgba(255,255,255,0.035)';
    g.beginPath();
    for (let t = Math.floor(t0 / sub) * sub; t < t1; t += sub) { const x = Math.round(xOf(t)) + 0.5; g.moveTo(x, 0); g.lineTo(x, H); }
    g.stroke();
  }
  let every = 1;
  while (barPx * every < 24) every *= 2;
  g.strokeStyle = 'rgba(255,255,255,0.09)';
  g.beginPath();
  for (let t = Math.floor(t0 / (bar * every)) * bar * every; t < t1; t += bar * every) { const x = Math.round(xOf(t)) + 0.5; g.moveTo(x, 0); g.lineTo(x, H); }
  g.stroke();
}

function drawRegion(g, region, track, row, opts = {}) {
  const p = project();
  const rect = regionRect(region, row);
  let { x, y, w, h } = rect;
  if (opts.dx) x += opts.dx;
  if (opts.dy) y += opts.dy;
  if (opts.w != null) w = opts.w;
  if (x > g.canvas.clientWidth || x + w < 0) return;
  const selected = ui.selectedRegions.has(region.id);
  const muted = region.mute;
  const base = muted ? '#5d6470' : track.color;
  const unitW = opts.unitW || rect.unitW;
  const loops = opts.loops || region.loops || 1;
  g.save();
  g.globalAlpha = opts.ghost ? 0.55 : 1;
  for (let k = 0; k < loops; k++) {
    const lx = x + k * unitW;
    const lw = Math.min(unitW, x + w - lx);
    if (lw <= 0) break;
    roundRect(g, lx + 0.5, y + 0.5, lw - 1, h - 1, 5);
    g.fillStyle = shade(base, -0.45, k === 0 ? 0.95 : 0.6);
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = shade(base, k === 0 ? -0.1 : -0.3, 1);
    g.fillRect(lx, y, lw, 15);
    if (region.type === 'midi') drawMidiContent(g, region, track, lx + 2, y + 17, Math.min(lw, unitW) - 4, h - 20, base);
    else drawAudioContent(g, region, lx, y + 16, lw, h - 17, base);
    g.restore();
    if (k > 0) {
      g.strokeStyle = shade(base, 0.2, 0.5);
      g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(lx + 0.5, y + 2); g.lineTo(lx + 0.5, y + h - 2); g.stroke();
      g.setLineDash([]);
    }
  }
  roundRect(g, x + 0.5, y + 0.5, w - 1, h - 1, 5);
  g.lineWidth = selected ? 2 : 1;
  g.strokeStyle = selected ? '#ffffff' : shade(base, 0.25, 0.9);
  g.stroke();
  g.lineWidth = 1;
  // Nom de la région
  g.fillStyle = muted ? '#cfd3da' : '#0d1015';
  g.font = '600 11px Inter, system-ui, sans-serif';
  g.textBaseline = 'middle';
  const label = `${muted ? '(muet) ' : ''}${region.name}`;
  g.save();
  g.beginPath(); g.rect(x + 4, y, Math.max(0, Math.min(w, unitW) - 8), 15); g.clip();
  g.fillText(label, Math.max(x + 6, 6), y + 8);
  g.restore();
  // Poignée de boucle (coin supérieur droit) au survol
  if (hoverInfo && hoverInfo.region === region.id && region.type === 'midi') {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    const cx = x + w - 6;
    g.arc(cx, y + 8, 3.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawMidiContent(g, region, track, x, y, w, h, color) {
  const notes = region.notes;
  if (!notes.length || w <= 2) return;
  let lo = 127;
  let hi = 0;
  for (const n of notes) { if (n.pitch < lo) lo = n.pitch; if (n.pitch > hi) hi = n.pitch; }
  const range = Math.max(hi - lo, track.kind === 'drums' ? 14 : 10) + 1;
  const nh = Math.max(1.5, Math.min(4, h / range));
  const mid = (lo + hi) / 2;
  g.fillStyle = shade(color, 0.45, 0.95);
  for (const n of notes) {
    if (n.start < 0 || n.start >= region.length) continue;
    const nx = x + n.start * ui.zoom;
    if (nx > x + w) continue;
    const nw = Math.max(1.5, Math.min(n.length, region.length - n.start) * ui.zoom - 0.5);
    const ny = y + h / 2 - ((n.pitch - mid) / range) * (h - nh) - nh / 2;
    g.fillRect(nx, ny, Math.min(nw, x + w - nx), nh);
  }
}

function drawAudioContent(g, region, x, y, w, h, color) {
  if (!getBuffer(region.audioId)) {
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.font = '11px Inter, system-ui, sans-serif';
    g.fillText('Son manquant', x + 6, y + h / 2);
    return;
  }
  drawWave(g, region.audioId, region.offset, region.duration, x, y, w, h, shade(color, 0.5, 0.9), region.reverse);
  // Fondus
  const p = project();
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  if (region.fadeIn > 0) {
    const fw = secondsToTicks(region.fadeIn, p.bpm) * ui.zoom;
    g.moveTo(x, y + h); g.lineTo(x + fw, y);
  }
  if (region.fadeOut > 0) {
    const fw = secondsToTicks(region.fadeOut, p.bpm) * ui.zoom;
    g.moveTo(x + w - fw, y); g.lineTo(x + w, y + h);
  }
  g.stroke();
}

function autoNorm(param, value) {
  const d = AUTOMATION_PARAMS[param];
  if (param === 'volume') return dbToFader(value);
  return (value - d.min) / (d.max - d.min);
}

function autoValue(param, norm) {
  const d = AUTOMATION_PARAMS[param];
  const n = Math.max(0, Math.min(1, norm));
  if (param === 'volume') return Math.round(faderToDb(n) * 10) / 10;
  return Math.round((d.min + n * (d.max - d.min)) * 100) / 100;
}

function trackParamValue(track, param) {
  if (param === 'volume') return track.volume;
  if (param === 'pan') return track.pan;
  if (param === 'send0') return track.sends[0];
  if (param === 'send1') return track.sends[1];
  return 0;
}

function drawAutomation(g, row, W) {
  const t = row.track;
  const param = t.automationParam || 'volume';
  const top = row.top - scrollY() + ui.trackH;
  const h = AUTO_H;
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, top, W, h);
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  g.beginPath(); g.moveTo(0, top + 0.5); g.lineTo(W, top + 0.5); g.stroke();
  const pts = drag && drag.type === 'autoPoint' && drag.trackId === t.id ? drag.points : (t.automation[param] || []);
  const yOf = (v) => top + 6 + (1 - autoNorm(param, v)) * (h - 12);
  g.strokeStyle = shade(t.color, 0.3, 1);
  g.lineWidth = 2;
  g.beginPath();
  if (!pts.length) {
    const y = yOf(trackParamValue(t, param));
    g.setLineDash([4, 4]);
    g.moveTo(0, y); g.lineTo(W, y);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.font = '11px Inter, system-ui, sans-serif';
    g.fillText(`${AUTOMATION_PARAMS[param].label} : cliquez pour ajouter des points`, 10, top + h - 10);
  } else {
    g.moveTo(0, yOf(pts[0].value));
    for (const pt of pts) g.lineTo(xOf(pt.tick), yOf(pt.value));
    g.lineTo(W, yOf(pts[pts.length - 1].value));
    g.stroke();
    for (const pt of pts) {
      const x = xOf(pt.tick);
      if (x < -6 || x > W + 6) continue;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x, yOf(pt.value), 4, 0, Math.PI * 2); g.fill();
    }
  }
  g.lineWidth = 1;
}

export function draw() {
  if (!els) return;
  const p = project();
  const W = els.scroller.clientWidth;
  const H = els.scroller.clientHeight;
  const size = contentSize();
  els.spacer.style.width = `${Math.max(size.w, W)}px`;
  els.spacer.style.height = `${Math.max(size.h, H)}px`;
  const g = fitCanvas(els.canvas, W, H);
  g.fillStyle = '#161a21';
  g.fillRect(0, 0, W, H);
  const rows = rowsLayout();
  for (const row of rows) {
    const y = row.top - scrollY();
    if (y > H || y + row.h < 0) continue;
    g.fillStyle = row.track.id === ui.selectedTrackId ? '#1d232c' : (row.index % 2 ? '#181c23' : '#171b21');
    g.fillRect(0, y, W, ui.trackH);
    g.fillStyle = '#10141a';
    g.fillRect(0, y + row.h - 1, W, 1);
  }
  drawGrid(g, W, H, p);
  // Boucle
  if (p.loop.on) {
    g.fillStyle = 'rgba(245,177,76,0.06)';
    g.fillRect(xOf(p.loop.start), 0, (p.loop.end - p.loop.start) * ui.zoom, H);
  }
  // Repères
  g.strokeStyle = 'rgba(167,123,243,0.35)';
  for (const m of p.markers) { const x = Math.round(xOf(m.tick)) + 0.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  const moving = drag && drag.type === 'move' && drag.moved;
  for (const row of rows) {
    const y = row.top - scrollY();
    if (y > H || y + row.h < 0) continue;
    for (const region of row.track.regions) {
      if (moving && drag.ids.includes(region.id) && !drag.copy) continue;
      if (drag && drag.id === region.id && (drag.type === 'resize' || drag.type === 'loop' || drag.type === 'trim')) continue;
      drawRegion(g, region, row.track, row);
    }
    if (row.track.showAutomation) drawAutomation(g, row, W);
  }
  // Régions en cours de déplacement / redimensionnement
  if (moving) {
    for (const id of drag.ids) {
      const f = findRegion(id);
      if (!f) continue;
      const fromRow = rows.find((r) => r.track.id === f.track.id);
      const target = rows[fromRow.index + drag.dTrack] && compatible(f.track, rows[fromRow.index + drag.dTrack].track) ? rows[fromRow.index + drag.dTrack] : fromRow;
      drawRegion(g, f.region, target.track, target, { dx: drag.dTicks * ui.zoom, ghost: false });
    }
  }
  if (drag && (drag.type === 'resize' || drag.type === 'loop' || drag.type === 'trim')) {
    const f = findRegion(drag.id);
    if (f) {
      const row = rows.find((r) => r.track.id === f.track.id);
      const preview = { ...f.region, ...drag.preview };
      drawRegion(g, preview, f.track, row);
    }
  }
  if (drag && drag.type === 'create') {
    const row = rows.find((r) => r.track.id === drag.trackId);
    if (row) {
      const s = Math.min(drag.start, drag.end);
      const e = Math.max(drag.start, drag.end);
      g.fillStyle = shade(row.track.color, -0.2, 0.6);
      roundRect(g, xOf(s), row.top - scrollY() + 2, (e - s) * ui.zoom, ui.trackH - 4, 5);
      g.fill();
    }
  }
  // Enregistrement en cours
  if (ui.recording && ui.recordingInfo) {
    const info = ui.recordingInfo;
    const now = Math.max(info.startTick, currentTick());
    const ids = [...info.midi, info.audioTrackId].filter(Boolean);
    const notes = recordingNotes();
    for (const row of rows) {
      if (!ids.includes(row.track.id)) continue;
      const y = row.top - scrollY() + 2;
      g.fillStyle = 'rgba(232,72,85,0.35)';
      roundRect(g, xOf(info.startTick), y, (now - info.startTick) * ui.zoom, ui.trackH - 4, 5);
      g.fill();
      g.fillStyle = '#ffd9dc';
      for (const n of notes.filter((x) => x.trackId === row.track.id)) {
        g.fillRect(xOf(n.start), y + ui.trackH - 8 - ((n.pitch % 36) / 36) * (ui.trackH - 22), Math.max(2, n.length * ui.zoom), 3);
      }
    }
  }
  // Rectangle de sélection
  if (drag && drag.type === 'rubber' && drag.moved) {
    const x = Math.min(drag.x0, drag.x1);
    const y = Math.min(drag.y0, drag.y1);
    g.fillStyle = 'rgba(79,156,249,0.12)';
    g.strokeStyle = 'rgba(79,156,249,0.8)';
    g.fillRect(x, y, Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0));
    g.strokeRect(x + 0.5, y + 0.5, Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0));
  }
  // Tête de lecture
  const ph = xOf(currentTick());
  if (ph >= -2 && ph <= W + 2) {
    g.fillStyle = ui.recording ? '#ff4d5e' : '#f2f4f7';
    g.fillRect(Math.round(ph), 0, 1.5, H);
  }
  drawRuler();
  dirty = false;
}

function drawRuler() {
  const p = project();
  const W = els.ruler.parentElement.clientWidth;
  const g = fitCanvas(els.ruler, W, RULER_H);
  g.fillStyle = '#1b2029';
  g.fillRect(0, 0, W, RULER_H);
  g.fillStyle = '#20262f';
  g.fillRect(0, 15, W, 12);
  const bar = ticksPerBar(p);
  const barPx = bar * ui.zoom;
  let every = 1;
  while (barPx * every < 36) every *= 2;
  const t0 = Math.max(0, Math.floor(tickOf(0) / (bar * every)) * bar * every);
  const t1 = tickOf(W);
  g.font = '11px Inter, system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.fillStyle = '#aab3c0';
  for (let t = t0; t < t1; t += bar * every) {
    const x = Math.round(xOf(t)) + 0.5;
    g.beginPath(); g.moveTo(x, 28); g.lineTo(x, RULER_H); g.stroke();
    g.fillText(String(Math.round(t / bar) + 1), x + 4, 37);
    if (barPx * every > 140) {
      g.save();
      g.strokeStyle = 'rgba(255,255,255,0.1)';
      for (let b = 1; b < p.sigNum * every; b++) {
        const bx = Math.round(xOf(t + b * ticksPerBeat(p))) + 0.5;
        g.beginPath(); g.moveTo(bx, 38); g.lineTo(bx, RULER_H); g.stroke();
      }
      g.restore();
    }
  }
  // Zone de boucle
  const lx = xOf(p.loop.start);
  const lw = (p.loop.end - p.loop.start) * ui.zoom;
  if (lw > 0) {
    g.fillStyle = p.loop.on ? 'rgba(245,177,76,0.85)' : 'rgba(245,177,76,0.22)';
    roundRect(g, lx, 16, lw, 10, 3);
    g.fill();
  }
  // Repères
  for (const m of p.markers) {
    const x = xOf(m.tick);
    if (x < -200 || x > W) continue;
    g.font = '600 10.5px Inter, system-ui, sans-serif';
    const tw = g.measureText(m.name).width + 10;
    g.fillStyle = '#7d5cc4';
    roundRect(g, x, 1, tw, 13, 3);
    g.fill();
    g.fillStyle = '#fff';
    g.fillText(m.name, x + 5, 8);
  }
  const ph = xOf(currentTick());
  if (ph >= -6 && ph <= W + 6) {
    g.fillStyle = ui.recording ? '#ff4d5e' : '#f2f4f7';
    g.beginPath();
    g.moveTo(ph - 6, 28); g.lineTo(ph + 6, 28); g.lineTo(ph, 36);
    g.closePath(); g.fill();
    g.fillRect(Math.round(ph), 34, 1.5, RULER_H - 34);
  }
}

// ---- Interactions ----------------------------------------------------------------------------

function compatible(from, to) {
  return (from.kind === 'audio') === (to.kind === 'audio');
}

function localPos(e, el) {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function selectOnly(ids) {
  ui.selectedRegions = new Set(ids);
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  els.scroller.focus({ preventScroll: true });
  const { x, y } = localPos(e, els.scroller);
  if (x > els.scroller.clientWidth || y > els.scroller.clientHeight) return; // barres de défilement
  const dbl = isDoubleDown(e);
  const hit = hitRegion(x, y);
  const row = hit.row;
  const tick = tickOf(x);
  if (row) ui.selectedTrackId = row.track.id;

  if (row && row.inAuto) { autoPointerDown(e, row, x, y, dbl); return; }

  const tool = e.altKey && ui.tool === 'pointer' ? 'pointer' : ui.tool;
  if (hit.region) {
    const region = hit.region;
    if (tool === 'eraser') { deleteRegions(ui.selectedRegions.has(region.id) ? [...ui.selectedRegions] : [region.id]); return; }
    if (tool === 'scissors') { splitAt(ui.selectedRegions.has(region.id) ? [...ui.selectedRegions] : [region.id], snap(tick, arrGrid())); return; }
    if (tool === 'mute') { toggleMuteRegions(ui.selectedRegions.has(region.id) ? [...ui.selectedRegions] : [region.id]); return; }
    if (tool === 'glue') {
      const ids = new Set(ui.selectedRegions);
      ids.add(region.id);
      if (!joinSelected([...ids])) { selectOnly([region.id]); emit('ui'); }
      return;
    }
    if (e.shiftKey) {
      if (ui.selectedRegions.has(region.id)) ui.selectedRegions.delete(region.id); else ui.selectedRegions.add(region.id);
      emit('ui');
      return;
    }
    if (!ui.selectedRegions.has(region.id)) selectOnly([region.id]);
    if (ui.editorRegionId && ui.editorRegionId !== region.id && ui.bottom === 'editor') ui.editorRegionId = region.id;
    emit('ui');
    els.scroller.setPointerCapture(e.pointerId);
    if (hit.edge) {
      drag = { type: hit.edge === 'trim' ? 'trim' : hit.edge, id: region.id, x0: x, preview: {}, orig: JSON.parse(JSON.stringify(region)) };
    } else {
      drag = {
        type: 'move', ids: [...ui.selectedRegions], x0: x, y0: y, dTicks: 0, dTrack: 0, moved: false,
        copy: e.altKey || e.ctrlKey || e.metaKey, anchorStart: region.start, rowIndex: row.index,
      };
    }
    return;
  }
  // Zone vide
  if (!row) {
    selectOnly([]);
    emit('ui');
    return;
  }
  if (tool === 'pencil' && row.track.kind !== 'audio') {
    els.scroller.setPointerCapture(e.pointerId);
    const s = snap(tick, ticksPerBar(project()), 'floor');
    drag = { type: 'create', trackId: row.track.id, start: s, end: s + ticksPerBar(project()) };
    return;
  }
  if (!e.shiftKey) selectOnly([]);
  els.scroller.setPointerCapture(e.pointerId);
  drag = { type: 'rubber', x0: x, y0: y, x1: x, y1: y, moved: false, base: new Set(ui.selectedRegions) };
  emit('ui');
}

function onPointerMove(e) {
  const { x, y } = localPos(e, els.scroller);
  if (!drag) {
    const hit = hitRegion(x, y);
    const id = hit.region ? hit.region.id : null;
    let cursor = 'default';
    if (hit.row && hit.row.inAuto) cursor = 'crosshair';
    else if (hit.region) {
      if (ui.tool === 'pencil' || ui.tool === 'pointer') cursor = hit.edge === 'loop' ? 'alias' : hit.edge ? 'ew-resize' : 'grab';
      if (ui.tool === 'scissors') cursor = 'col-resize';
      if (ui.tool === 'eraser') cursor = 'not-allowed';
      if (ui.tool === 'glue' || ui.tool === 'mute') cursor = 'pointer';
    } else if (ui.tool === 'pencil' && hit.row) cursor = 'crosshair';
    els.scroller.style.cursor = cursor;
    const helpText = hit.edge === 'loop' ? 'Glissez vers la droite pour répéter la région en boucle.'
      : hit.edge === 'resize' ? 'Glissez pour allonger ou raccourcir la région.'
        : hit.edge === 'trim' ? 'Glissez pour rogner le début de la région.'
          : hit.region ? 'Glissez pour déplacer (Alt = copier). Double-clic : ouvrir dans l\'éditeur.' : null;
    if (helpText) els.scroller.dataset.help = helpText; else delete els.scroller.dataset.help;
    if ((hoverInfo && hoverInfo.region) !== id) { hoverInfo = { region: id }; dirty = true; }
    return;
  }
  const p = project();
  const grid = e.shiftKey && drag.type !== 'rubber' ? 1 : arrGrid();
  if (drag.type === 'move') {
    if (!drag.moved && Math.abs(x - drag.x0) < 4 && Math.abs(y - drag.y0) < 4) return;
    drag.moved = true;
    const target = snap(drag.anchorStart + (x - drag.x0) / ui.zoom, grid);
    drag.dTicks = Math.max(target, 0) - drag.anchorStart;
    // Pas avant le début du morceau
    const minStart = Math.min(...drag.ids.map((id) => (findRegion(id) ? findRegion(id).region.start : 0)));
    if (minStart + drag.dTicks < 0) drag.dTicks = -minStart;
    const row = rowAtY(Math.max(0, Math.min(y, els.scroller.clientHeight - 1)));
    drag.dTrack = row ? row.index - drag.rowIndex : drag.dTrack;
  } else if (drag.type === 'resize' || drag.type === 'loop' || drag.type === 'trim') {
    const r = drag.orig;
    const t = tickOf(x);
    if (drag.type === 'resize') {
      const end = Math.max(r.start + grid, snap(t, grid));
      if (r.type === 'midi') {
        if ((r.loops || 1) > 1) drag.preview = { loops: Math.max(1, Math.round((end - r.start) / r.length)) };
        else drag.preview = { length: Math.max(grid, end - r.start) };
      } else {
        const buffer = getBuffer(r.audioId);
        const max = buffer ? buffer.duration - r.offset : r.duration;
        drag.preview = { duration: Math.max(0.05, Math.min(max, ticksToSeconds(end - r.start, p.bpm))) };
      }
    } else if (drag.type === 'loop') {
      const loops = Math.max(1, Math.round((t - r.start) / r.length));
      drag.preview = { loops };
    } else {
      let ns = snap(t, grid);
      if (r.type === 'midi') {
        ns = Math.max(0, Math.min(ns, r.start + r.length - grid));
        const d = ns - r.start;
        drag.preview = { start: ns, length: r.length - d, notes: r.notes.map((n) => ({ ...n, start: n.start - d })) };
      } else {
        const minStart = r.start - secondsToTicks(r.offset, p.bpm);
        ns = Math.max(Math.max(0, minStart), Math.min(ns, r.start + secondsToTicks(r.duration, p.bpm) - grid));
        const dSec = ticksToSeconds(ns - r.start, p.bpm);
        drag.preview = { start: ns, offset: Math.max(0, r.offset + dSec), duration: Math.max(0.05, r.duration - dSec) };
      }
    }
  } else if (drag.type === 'create') {
    drag.end = Math.max(drag.start + ticksPerBar(p), snap(tickOf(x), ticksPerBar(p), 'ceil'));
  } else if (drag.type === 'rubber') {
    drag.x1 = x; drag.y1 = y;
    if (Math.abs(x - drag.x0) > 3 || Math.abs(y - drag.y0) > 3) drag.moved = true;
    if (drag.moved) {
      const sel = new Set(drag.base);
      const xa = Math.min(drag.x0, x); const xb = Math.max(drag.x0, x);
      const ya = Math.min(drag.y0, y); const yb = Math.max(drag.y0, y);
      for (const row of rowsLayout()) {
        const top = row.top - scrollY();
        if (top + ui.trackH < ya || top > yb) continue;
        for (const r of row.track.regions) {
          const rect = regionRect(r, row);
          if (rect.x + rect.w >= xa && rect.x <= xb) sel.add(r.id);
        }
      }
      ui.selectedRegions = sel;
    }
  } else if (drag.type === 'autoPoint') autoPointerMove(x, y);
  autoScroll(x, y);
  dirty = true;
}

function autoScroll(x, y) {
  const s = els.scroller;
  if (x > s.clientWidth - 30) s.scrollLeft += 14;
  else if (x < 20 && s.scrollLeft > 0) s.scrollLeft -= 14;
  if (y > s.clientHeight - 20) s.scrollTop += 10;
  else if (y < 10 && s.scrollTop > 0) s.scrollTop -= 10;
}

function onPointerUp() {
  if (!drag) return;
  const d = drag;
  drag = null;
  dirty = true;
  if (d.type === 'move' && d.moved && (d.dTicks !== 0 || d.dTrack !== 0 || d.copy)) {
    const created = [];
    commit(d.copy ? 'Copier les régions' : 'Déplacer les régions', (p) => {
      for (const id of d.ids) {
        const f = findRegion(id, p);
        if (!f) continue;
        const fromIndex = p.tracks.indexOf(f.track);
        const target = p.tracks[fromIndex + d.dTrack];
        const dest = target && compatible(f.track, target) ? target : f.track;
        let region = f.region;
        if (d.copy) {
          region = JSON.parse(JSON.stringify(f.region));
          region.id = uid('rg');
          if (region.notes) region.notes = region.notes.map((n) => ({ ...n, id: uid('n') }));
        } else f.track.regions = f.track.regions.filter((r) => r.id !== id);
        region.start = Math.max(0, f.region.start + d.dTicks);
        dest.regions.push(region);
        created.push(region.id);
      }
    });
    ui.selectedRegions = new Set(created);
    emit('ui');
  } else if ((d.type === 'resize' || d.type === 'loop' || d.type === 'trim') && Object.keys(d.preview).length) {
    commit(d.type === 'loop' ? 'Boucler la région' : d.type === 'trim' ? 'Rogner la région' : 'Redimensionner la région', (p) => {
      const f = findRegion(d.id, p);
      if (f) Object.assign(f.region, d.preview);
    });
  } else if (d.type === 'create') {
    const r = createRegionAt(d.trackId, Math.min(d.start, d.end), Math.abs(d.end - d.start));
    if (r) openEditor(r.id);
  } else if (d.type === 'autoPoint') {
    autoCommit(d);
  } else emit('ui');
}

function onDoubleClick(e) {
  const { x, y } = localPos(e, els.scroller);
  const hit = hitRegion(x, y);
  if (hit.row && hit.row.inAuto) return;
  if (hit.region) { openEditor(hit.region.id); return; }
  if (hit.row && hit.row.track.kind !== 'audio') {
    const bar = ticksPerBar(project());
    const r = createRegionAt(hit.row.track.id, snap(tickOf(x), bar, 'floor'), bar);
    if (r) openEditor(r.id);
  }
}

// ---- Automation -------------------------------------------------------------------------------

function autoPointerDown(e, row, x, y, dbl) {
  const t = row.track;
  const param = t.automationParam || 'volume';
  const pts = (t.automation[param] || []).map((p) => ({ ...p }));
  const top = row.top - scrollY() + ui.trackH;
  const norm = 1 - (y - top - 6) / (AUTO_H - 12);
  const yOf = (v) => top + 6 + (1 - autoNorm(param, v)) * (AUTO_H - 12);
  let idx = pts.findIndex((p) => Math.abs(xOf(p.tick) - x) < 7 && Math.abs(yOf(p.value) - y) < 7);
  if (ui.tool === 'eraser' || dbl) {
    if (idx >= 0) {
      pts.splice(idx, 1);
      commit('Supprimer un point d\'automation', (p) => { findTrack(t.id, p).automation[param] = pts; });
    }
    return;
  }
  if (idx < 0) {
    const tick = Math.max(0, snap(tickOf(x), arrGrid()));
    pts.push({ tick, value: autoValue(param, norm) });
    pts.sort((a, b) => a.tick - b.tick);
    idx = pts.findIndex((p) => p.tick === tick);
  }
  els.scroller.setPointerCapture(e.pointerId);
  drag = { type: 'autoPoint', trackId: t.id, param, points: pts, index: idx, top };
  dirty = true;
}

function autoPointerMove(x, y) {
  const d = drag;
  const pt = d.points[d.index];
  const prev = d.points[d.index - 1];
  const next = d.points[d.index + 1];
  let tick = Math.max(0, snap(tickOf(x), arrGrid()));
  if (prev) tick = Math.max(prev.tick, tick);
  if (next) tick = Math.min(next.tick, tick);
  pt.tick = tick;
  pt.value = autoValue(d.param, 1 - (y - d.top - 6) / (AUTO_H - 12));
}

function autoCommit(d) {
  commit('Automation', (p) => { findTrack(d.trackId, p).automation[d.param] = d.points; });
}

// ---- Règle --------------------------------------------------------------------------------------

let rulerDrag = null;

function rulerDown(e) {
  if (e.button !== 0) return;
  const { x, y } = localPos(e, els.ruler);
  const p = project();
  const tick = tickOf(x);
  const bar = ticksPerBar(p);
  els.ruler.setPointerCapture(e.pointerId);
  const dbl = isDoubleDown(e);
  if (y < 15) {
    const m = [...p.markers].reverse().find((mk) => x >= xOf(mk.tick) - 2 && x <= xOf(mk.tick) + 90);
    if (m) {
      if (dbl) { rulerDrag = null; promptText('Renommer le repère', m.name).then((n) => { if (n) renameMarker(m.id, n); }); return; }
      rulerDrag = { type: 'marker', id: m.id, x0: x, moved: false };
      setPlayhead(m.tick);
      return;
    }
    rulerDrag = null;
    return;
  }
  if (y < 28) {
    const inLoop = tick >= p.loop.start && tick <= p.loop.end && p.loop.end > p.loop.start;
    if (inLoop) rulerDrag = { type: 'loopMove', x0: x, start: p.loop.start, end: p.loop.end, moved: false };
    else rulerDrag = { type: 'loopNew', from: snap(tick, bar, 'floor'), moved: false };
    beginGesture('Zone de boucle');
    return;
  }
  rulerDrag = { type: 'scrub' };
  setPlayhead(snap(tick, e.shiftKey ? 1 : arrGrid()));
}

function rulerMove(e) {
  const { x } = localPos(e, els.ruler);
  if (!rulerDrag) {
    els.ruler.style.cursor = 'pointer';
    return;
  }
  const p = project();
  const bar = ticksPerBar(p);
  const tick = tickOf(x);
  if (rulerDrag.type === 'scrub') setPlayhead(snap(Math.max(0, tick), e.shiftKey ? 1 : arrGrid()));
  else if (rulerDrag.type === 'loopNew') {
    const t = snap(tick, bar, tick < rulerDrag.from ? 'floor' : 'ceil');
    if (Math.abs(t - rulerDrag.from) >= bar) {
      rulerDrag.moved = true;
      p.loop.start = Math.max(0, Math.min(rulerDrag.from, t));
      p.loop.end = Math.max(rulerDrag.from, t);
      p.loop.on = true;
      touch();
    }
  } else if (rulerDrag.type === 'loopMove') {
    const d = snap((x - rulerDrag.x0) / ui.zoom, bar);
    if (d !== 0) rulerDrag.moved = true;
    const len = rulerDrag.end - rulerDrag.start;
    p.loop.start = Math.max(0, rulerDrag.start + d);
    p.loop.end = p.loop.start + len;
    touch();
  } else if (rulerDrag.type === 'marker') {
    if (Math.abs(x - rulerDrag.x0) > 3) {
      rulerDrag.moved = true;
      const m = p.markers.find((mk) => mk.id === rulerDrag.id);
      if (m) { m.tick = Math.max(0, snap(tick, arrGrid())); touch(); }
    }
  }
  dirty = true;
}

function rulerUp() {
  if (!rulerDrag) return;
  const d = rulerDrag;
  rulerDrag = null;
  const p = project();
  if (d.type === 'loopMove' && !d.moved) p.loop.on = !p.loop.on;
  if (d.type === 'loopNew' && !d.moved) {
    const bar = ticksPerBar(p);
    p.loop.start = d.from;
    p.loop.end = d.from + bar * 4;
    p.loop.on = true;
  }
  if (d.type === 'loopNew' || d.type === 'loopMove') endGesture();
  if (d.type === 'marker' && d.moved) {
    const m = p.markers.find((mk) => mk.id === d.id);
    const tick = m ? m.tick : 0;
    commit('Déplacer le repère', (pp) => { const mm = pp.markers.find((mk) => mk.id === d.id); if (mm) mm.tick = tick; pp.markers.sort((a, b) => a.tick - b.tick); });
  }
  dirty = true;
}

function rulerMenu(e) {
  e.preventDefault();
  const { x, y } = localPos(e, els.ruler);
  const p = project();
  const tick = snap(tickOf(x), ticksPerBar(p), 'floor');
  const m = y < 15 ? [...p.markers].reverse().find((mk) => x >= xOf(mk.tick) - 2 && x <= xOf(mk.tick) + 90) : null;
  const items = [{ label: 'Ajouter un repère ici', icon: 'marker', action: () => promptText('Nom du repère', 'Couplet', { label: 'Exemples : Intro, Couplet, Refrain, Pont, Fin.' }).then((n) => { if (n) addMarker(tick, n); }) }];
  if (m) {
    items.push({ label: `Renommer « ${m.name} »`, action: () => promptText('Renommer le repère', m.name).then((n) => { if (n) renameMarker(m.id, n); }) });
    items.push({ label: `Supprimer « ${m.name} »`, icon: 'trash', action: () => deleteMarker(m.id) });
  }
  items.push('-', { label: p.loop.on ? 'Désactiver la boucle' : 'Activer la boucle', icon: 'cycle', action: () => commit('Boucle', (pp) => { pp.loop.on = !pp.loop.on; }) });
  showMenu(e.clientX, e.clientY, items);
}

// ---- Menus contextuels ------------------------------------------------------------------------

function regionMenu(e, region, track) {
  const ids = ui.selectedRegions.has(region.id) ? [...ui.selectedRegions] : [region.id];
  if (!ui.selectedRegions.has(region.id)) { selectOnly([region.id]); emit('ui'); }
  const tick = currentTick();
  const items = [
    { label: 'Ouvrir dans l\'éditeur', icon: 'editor', action: () => openEditor(region.id) },
    { label: 'Renommer…', action: () => promptText('Renommer la région', region.name).then((n) => { if (n) setRegionProp(region.id, 'name', n, 'Renommer la région'); }) },
    '-',
    { label: 'Couper à la tête de lecture', icon: 'scissors', shortcut: 'Ctrl+T', action: () => splitAt(ids, snap(tick, 1)) },
    { label: 'Dupliquer', icon: 'copy', shortcut: 'Ctrl+D', action: () => duplicateRegions(ids) },
    { label: 'Copier', shortcut: 'Ctrl+C', action: () => copyRegions(ids) },
    { label: region.mute ? 'Réactiver le son' : 'Rendre muette', icon: 'muteTool', shortcut: 'M', action: () => toggleMuteRegions(ids) },
  ];
  if (region.type === 'midi') {
    items.push({ label: 'Joindre les régions sélectionnées', icon: 'glue', shortcut: 'Ctrl+J', disabled: ids.length < 2, action: () => joinSelected(ids) });
    items.push({ label: 'Quantifier (double croche)', shortcut: 'Q', action: () => quantizeRegions(ids, '1/16') });
    if ((region.loops || 1) > 1) items.push({ label: 'Transformer les répétitions en notes', action: () => flattenRegion(region.id) });
    items.push({ label: 'Répéter ×2', action: () => setRegionProp(region.id, 'loops', (region.loops || 1) * 2, 'Boucler la région') });
  } else {
    items.push({ label: 'Normaliser le volume', action: () => normalizeRegion(region.id) });
    items.push({ label: region.reverse ? 'Remettre à l\'endroit' : 'Lire à l\'envers', action: () => setRegionProp(region.id, 'reverse', !region.reverse, 'Inverser le son') });
    items.push({ label: 'Créer un instrument avec ce son', icon: 'piano', action: () => samplerFromRegion(region.id) });
  }
  items.push('-', { label: 'Supprimer', icon: 'trash', shortcut: 'Suppr', action: () => deleteRegions(ids) });
  void track;
  showMenu(e.clientX, e.clientY, items);
}

function laneMenu(e, row, tick) {
  const bar = ticksPerBar(project());
  const at = snap(tick, bar, 'floor');
  const items = [];
  if (row && row.track.kind !== 'audio') items.push({ label: 'Créer une région vide', icon: 'pencil', action: () => { const r = createRegionAt(row.track.id, at, bar); if (r) openEditor(r.id); } });
  items.push({ label: 'Coller ici', shortcut: 'Ctrl+V', disabled: !ui.clipboard, action: () => pasteRegions(at, row ? row.track.id : null) });
  items.push({ label: 'Placer la tête de lecture ici', action: () => setPlayhead(at) });
  items.push({ label: 'Ajouter un repère ici', icon: 'marker', action: () => promptText('Nom du repère', 'Refrain').then((n) => { if (n) addMarker(at, n); }) });
  showMenu(e.clientX, e.clientY, items);
}

export function trackMenu(x, y, track, { onNewTrack } = {}) {
  const items = [
    { label: 'Renommer…', action: () => promptText('Renommer la piste', track.name).then((n) => { if (n) setTrackProp(track.id, 'name', n, 'Renommer la piste'); }) },
    { header: 'Couleur' },
    ...TRACK_COLORS.map((c, i) => ({ label: COLOR_NAMES[i], checked: track.color === c, action: () => setTrackProp(track.id, 'color', c, 'Couleur de la piste') })),
    '-',
    { label: 'Monter', icon: 'up', action: () => moveTrack(track.id, -1) },
    { label: 'Descendre', icon: 'down', action: () => moveTrack(track.id, 1) },
    { label: 'Dupliquer la piste', icon: 'copy', action: () => duplicateTrack(track.id) },
    { label: 'Nouvelle piste…', icon: 'plus', action: () => onNewTrack && onNewTrack() },
    '-',
    { label: 'Supprimer la piste', icon: 'trash', action: () => deleteTrack(track.id) },
  ];
  showMenu(x, y, items, { minWidth: 220 });
}

// ---- Glisser-déposer (bibliothèque, fichiers) ----------------------------------------------------

function onDragOver(e) {
  const types = [...(e.dataTransfer.types || [])];
  if (types.includes('Files') || types.includes('application/x-onde-loop') || types.includes('application/x-onde-preset')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
}

async function onDrop(e) {
  e.preventDefault();
  const { x, y } = localPos(e, els.scroller);
  const row = rowAtY(y);
  const p = project();
  const tick = snap(Math.max(0, tickOf(x)), ticksPerBar(p), 'floor');
  const loopId = e.dataTransfer.getData('application/x-onde-loop');
  const presetId = e.dataTransfer.getData('application/x-onde-preset');
  if (loopId) { addLoop(loopId, { trackId: row ? row.track.id : null, tick }); return; }
  if (presetId) {
    if (row && row.track.kind !== 'audio') applyPreset(row.track.id, presetId);
    else {
      const t = trackFromPreset(presetId);
      addTrack(t.kind, { presetId });
    }
    return;
  }
  const files = [...e.dataTransfer.files];
  const midi = files.filter((f) => /\.midi?$/i.test(f.name));
  const audio = files.filter((f) => !/\.midi?$/i.test(f.name) && !/\.onde$/i.test(f.name));
  for (const f of midi) await importMidiFile(f);
  if (audio.length) await importAudioFiles(audio, { trackId: row && row.track.kind === 'audio' ? row.track.id : null, tick });
}

// ---- Installation ----------------------------------------------------------------------------------

export function initArrange(root, { onNewTrack }) {
  els = {
    scroller: $('#arrScroll', root),
    spacer: $('#arrSpacer', root),
    canvas: $('#arrCanvas', root),
    ruler: $('#ruler', root),
    headers: $('#trackHeaders', root),
  };
  const s = els.scroller;
  s.tabIndex = 0;
  s.addEventListener('pointerdown', onPointerDown);
  s.addEventListener('pointermove', onPointerMove);
  s.addEventListener('pointerup', onPointerUp);
  s.addEventListener('pointercancel', onPointerUp);
  s.addEventListener('pointerleave', () => { if (hoverInfo) { hoverInfo = null; dirty = true; } });
  s.addEventListener('dblclick', onDoubleClick);
  s.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const { x, y } = localPos(e, s);
    const hit = hitRegion(x, y);
    if (hit.region) regionMenu(e, hit.region, hit.row.track);
    else laneMenu(e, hit.row, tickOf(x));
  });
  s.addEventListener('scroll', () => {
    els.headers.firstElementChild && (els.headers.firstElementChild.style.transform = `translateY(${-s.scrollTop}px)`);
    dirty = true;
  });
  s.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const { x } = localPos(e, s);
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, x);
    }
  }, { passive: false });
  s.addEventListener('dragover', onDragOver);
  s.addEventListener('drop', onDrop);
  els.ruler.addEventListener('pointerdown', rulerDown);
  els.ruler.addEventListener('pointermove', rulerMove);
  els.ruler.addEventListener('pointerup', rulerUp);
  els.ruler.addEventListener('contextmenu', rulerMenu);
  els.ruler.addEventListener('wheel', (e) => {
    e.preventDefault();
    const { x } = localPos(e, els.ruler);
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, x);
  }, { passive: false });

  // En-têtes
  const h = els.headers;
  h.addEventListener('click', (e) => {
    const th = e.target.closest('.th');
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'newtrack') { onNewTrack(); return; }
    if (!th) return;
    const id = th.dataset.track;
    if (act) {
      const a = act.dataset.act;
      if (a === 'mute' || a === 'solo' || a === 'arm') toggleTrack(id, a);
      else if (a === 'auto') {
        commit('Afficher l\'automation', (p) => { const t = findTrack(id, p); t.showAutomation = !t.showAutomation; });
      } else if (a === 'autoclear') {
        commit('Effacer l\'automation', (p) => { const t = findTrack(id, p); t.automation[t.automationParam || 'volume'] = []; });
      }
      return;
    }
    if (e.target.closest('select')) return;
    if (ui.selectedTrackId !== id) { ui.selectedTrackId = id; emit('ui'); }
  });
  h.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-auto-param]');
    if (sel) setTrackProp(sel.dataset.autoParam, 'automationParam', sel.value, 'Réglage d\'automation');
  });
  h.addEventListener('dblclick', (e) => {
    const name = e.target.closest('.th-name');
    if (!name) return;
    const id = name.closest('.th').dataset.track;
    const t = findTrack(id);
    promptText('Renommer la piste', t.name).then((n) => { if (n) setTrackProp(id, 'name', n, 'Renommer la piste'); });
  });
  h.addEventListener('contextmenu', (e) => {
    const th = e.target.closest('.th');
    if (!th) return;
    e.preventDefault();
    const t = findTrack(th.dataset.track);
    ui.selectedTrackId = t.id;
    emit('ui');
    trackMenu(e.clientX, e.clientY, t, { onNewTrack });
  });
  h.addEventListener('dragstart', (e) => {
    const th = e.target.closest('.th');
    if (!th) return;
    e.dataTransfer.setData('application/x-onde-track', th.dataset.track);
    e.dataTransfer.effectAllowed = 'move';
  });
  h.addEventListener('dragover', (e) => {
    const types = [...e.dataTransfer.types];
    if (types.includes('application/x-onde-track') || types.includes('application/x-onde-preset') || types.includes('application/x-onde-loop') || types.includes('Files')) e.preventDefault();
  });
  h.addEventListener('drop', (e) => {
    e.preventDefault();
    const th = e.target.closest('.th');
    const trackId = e.dataTransfer.getData('application/x-onde-track');
    const presetId = e.dataTransfer.getData('application/x-onde-preset');
    const loopId = e.dataTransfer.getData('application/x-onde-loop');
    const p = project();
    if (trackId) {
      let index = p.tracks.length;
      if (th) {
        const r = th.getBoundingClientRect();
        index = p.tracks.findIndex((t) => t.id === th.dataset.track) + (e.clientY > r.top + r.height / 2 ? 1 : 0);
      }
      moveTrackTo(trackId, index);
    } else if (presetId) {
      const t = th ? findTrack(th.dataset.track) : null;
      if (t && t.kind !== 'audio') applyPreset(t.id, presetId);
      else addTrack('instrument', { presetId });
    } else if (loopId) addLoop(loopId, { trackId: th ? th.dataset.track : null });
    else if (e.dataTransfer.files.length) onDrop(e);
  });
  h.addEventListener('wheel', (e) => { s.scrollTop += e.deltaY; }, { passive: true });

  new ResizeObserver(() => { dirty = true; }).observe(s);
}

export function renderHeaders() {
  if (!els) return;
  els.headers.innerHTML = `<div class="th-list" style="transform:translateY(${-els.scroller.scrollTop}px)">${headersHtml()}</div>`;
  dirty = true;
}

export function zoomAt(factor, x = 0) {
  const tick = tickOf(x);
  ui.zoom = Math.max(0.004, Math.min(1.2, ui.zoom * factor));
  draw();
  els.scroller.scrollLeft = Math.max(0, tick * ui.zoom - x);
  dirty = true;
  emit('view');
}

export function zoomToFit() {
  const p = project();
  const end = Math.max(projectEnd(p), ticksPerBar(p) * 8);
  ui.zoom = Math.max(0.004, Math.min(1.2, (els.scroller.clientWidth - 40) / end));
  els.scroller.scrollLeft = 0;
  dirty = true;
  emit('view');
}

// Appelé à chaque image : suit la tête de lecture, redessine si nécessaire, met à jour les vu-mètres.
export function frame() {
  if (!els) return;
  if (isPlaying()) {
    const x = xOf(currentTick());
    const W = els.scroller.clientWidth;
    if (!drag && (x > W - 40 || x < 0)) els.scroller.scrollLeft = Math.max(0, currentTick() * ui.zoom - 60);
    dirty = true;
  }
  if (dirty) draw();
  const levels = meterLevels();
  if (levels) {
    for (const el of els.headers.querySelectorAll('[data-meter]')) {
      const v = levels.tracks[el.dataset.meter] || 0;
      el.style.width = `${Math.min(100, Math.max(0, (1 + Math.log10(Math.max(1e-4, v)) / 3) * 100))}%`;
      el.classList.toggle('clip', v > 1);
    }
  }
}

export function visibleStartTick() {
  return els ? tickOf(0) : 0;
}
