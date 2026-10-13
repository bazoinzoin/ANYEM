// Éditeur pas à pas pour la batterie : une ligne par élément, une case par double croche.
// Clic = poser / retirer un coup (glisser pour en poser plusieurs), Maj+clic = coup accentué,
// clic droit = changer la force du coup.

import { fitCanvas, roundRect, shade } from './dom.js';
import { ui, project, commit, editorRegion } from './store.js';
import { ticksPerBar, ticksPerBeat, PPQ } from '../core/time.js';
import { DRUM_MAP, makeNote } from '../core/music.js';
import { previewNotes } from '../audio/engine.js';
import { currentTick } from './transport.js';

const LABEL_W = 150;
const ROW_H = 28;
const TOP = 20;
const LEVELS = [127, 100, 70, 45];

let els = null;
let paint = null;

function stepTicks() {
  return ui.stepRes === '1/8' ? PPQ / 2 : ui.stepRes === '1/32' ? PPQ / 8 : PPQ / 4;
}

function cellW() {
  return ui.stepRes === '1/32' ? 16 : ui.stepRes === '1/8' ? 34 : 26;
}

function current() {
  const er = editorRegion();
  return er && er.region.type === 'midi' ? er : null;
}

function rows(region) {
  const used = new Set(region.notes.map((n) => n.pitch));
  const base = DRUM_MAP.map((d) => d.pitch);
  const extra = [...used].filter((p) => !base.includes(p)).sort((a, b) => b - a);
  return [...base, ...extra];
}

function noteIn(region, pitch, step) {
  const s = stepTicks();
  return region.notes.find((n) => n.pitch === pitch && n.start >= step * s && n.start < (step + 1) * s);
}

export function drawSteps() {
  if (!els) return;
  const er = current();
  const W = els.scroller.clientWidth;
  const H = els.scroller.clientHeight;
  const g = fitCanvas(els.canvas, W, H);
  g.fillStyle = '#14181e';
  g.fillRect(0, 0, W, H);
  if (!er) return;
  const { region, track } = er;
  const p = project();
  const s = stepTicks();
  const steps = Math.ceil(region.length / s);
  const cw = cellW();
  const pitches = rows(region);
  els.spacer.style.width = `${LABEL_W + steps * cw + 40}px`;
  els.spacer.style.height = `${TOP + pitches.length * ROW_H + 10}px`;
  const sx = els.scroller.scrollLeft;
  const sy = els.scroller.scrollTop;
  const perBeat = Math.max(1, Math.round(ticksPerBeat(p) / s));
  const perBar = Math.max(1, Math.round(ticksPerBar(p) / s));
  const playStep = Math.floor((currentTick() - region.start) / s);
  for (let r = 0; r < pitches.length; r++) {
    const y = TOP + r * ROW_H - sy;
    if (y > H || y + ROW_H < TOP) continue;
    for (let st = 0; st < steps; st++) {
      const x = LABEL_W + st * cw - sx;
      if (x + cw < LABEL_W || x > W) continue;
      const beatGroup = Math.floor(st / perBeat) % 2;
      g.fillStyle = beatGroup ? '#1a1f27' : '#1e242d';
      if (st === playStep % steps && playStep >= 0 && currentTick() < region.start + region.length * (region.loops || 1)) g.fillStyle = '#2a3340';
      roundRect(g, x + 1.5, y + 2, cw - 3, ROW_H - 4, 4);
      g.fill();
      const n = noteIn(region, pitches[r], st);
      if (n) {
        const v = n.vel / 127;
        g.fillStyle = shade(track.color, -0.4 + v * 0.6, 1);
        roundRect(g, x + 3, y + 4, cw - 6, ROW_H - 8, 3);
        g.fill();
        if (n.vel >= 120) { g.fillStyle = '#fff'; g.fillRect(x + 5, y + 6, cw - 10, 2); }
      }
      if (st % perBar === 0 && st > 0) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, 1, ROW_H); }
    }
  }
  // Étiquettes
  g.fillStyle = '#1b2029';
  g.fillRect(0, 0, LABEL_W, H);
  g.font = '12px Inter, system-ui, sans-serif';
  g.textBaseline = 'middle';
  for (let r = 0; r < pitches.length; r++) {
    const y = TOP + r * ROW_H - sy;
    if (y > H || y + ROW_H < TOP) continue;
    const d = DRUM_MAP.find((x) => x.pitch === pitches[r]);
    g.fillStyle = '#d0d6df';
    g.fillText(d ? d.name : `Note ${pitches[r]}`, 12, y + ROW_H / 2);
  }
  // Numéros de temps
  g.fillStyle = '#1b2029';
  g.fillRect(0, 0, W, TOP);
  g.fillStyle = '#8f99a8';
  g.font = '10.5px Inter, system-ui, sans-serif';
  for (let st = 0; st < steps; st += perBeat) {
    const x = LABEL_W + st * cw - sx;
    if (x < LABEL_W - 2 || x > W) continue;
    const bar = Math.floor(st / perBar) + 1;
    const beat = Math.floor((st % perBar) / perBeat) + 1;
    g.fillStyle = beat === 1 ? '#e6eaf0' : '#7f8896';
    g.fillText(beat === 1 ? `${bar}` : `${bar}.${beat}`, x + 4, TOP / 2);
  }
}

function hit(e) {
  const er = current();
  if (!er) return null;
  const r = els.scroller.getBoundingClientRect();
  const x = e.clientX - r.left + els.scroller.scrollLeft;
  const y = e.clientY - r.top + els.scroller.scrollTop;
  const pitches = rows(er.region);
  const row = Math.floor((y - TOP) / ROW_H);
  if (row < 0 || row >= pitches.length) return null;
  if (e.clientX - r.left < LABEL_W) return { label: true, pitch: pitches[row] };
  const step = Math.floor((x - LABEL_W) / cellW());
  const steps = Math.ceil(er.region.length / stepTicks());
  if (step < 0 || step >= steps) return null;
  return { pitch: pitches[row], step };
}

function setCell(pitch, step, on, vel) {
  const er = current();
  const region = er.region;
  const s = stepTicks();
  const existing = noteIn(region, pitch, step);
  if (on && !existing) {
    region.notes.push(makeNote(pitch, step * s, s, vel));
    previewNotes(er.track.id, [pitch], vel, 0.2);
  } else if (!on && existing) region.notes = region.notes.filter((n) => n !== existing);
}

function onDown(e) {
  const h = hit(e);
  if (!h) return;
  const er = current();
  ui.focusArea = 'editor';
  if (h.label) { previewNotes(er.track.id, [h.pitch], 110, 0.3); return; }
  const existing = noteIn(er.region, h.pitch, h.step);
  if (e.button === 2) {
    if (!existing) return;
    const idx = LEVELS.findIndex((l) => existing.vel >= l);
    const next = LEVELS[(Math.max(0, idx) + 1) % LEVELS.length];
    commit('Force du coup', () => { const n = noteIn(current().region, h.pitch, h.step); if (n) n.vel = next; });
    previewNotes(er.track.id, [h.pitch], next, 0.2);
    return;
  }
  els.scroller.setPointerCapture(e.pointerId);
  paint = { on: !existing, vel: e.shiftKey ? 127 : 100, before: JSON.stringify(er.region.notes), done: new Set() };
  paint.done.add(`${h.pitch}:${h.step}`);
  setCell(h.pitch, h.step, paint.on, paint.vel);
  drawSteps();
}

function onMove(e) {
  if (!paint) return;
  const h = hit(e);
  if (!h || h.label) return;
  const key = `${h.pitch}:${h.step}`;
  if (paint.done.has(key)) return;
  paint.done.add(key);
  setCell(h.pitch, h.step, paint.on, paint.vel);
  drawSteps();
}

function onUp() {
  if (!paint) return;
  const er = current();
  const after = JSON.stringify(er.region.notes);
  const before = paint.before;
  paint = null;
  if (after === before) return;
  er.region.notes = JSON.parse(before);
  commit('Pas de batterie', () => { current().region.notes = JSON.parse(after); });
}

export function mountSteps(host) {
  host.innerHTML = `<div class="pr-host"><canvas class="pr-canvas"></canvas><div class="pr-scroll" tabindex="0" data-help="Cliquez une case pour poser un coup, recliquez pour l'enlever ; glissez pour en poser plusieurs. Maj+clic : coup accentué. Clic droit : changer la force. Cliquez un nom pour l'écouter."><div class="pr-spacer"></div></div></div>`;
  els = { canvas: host.querySelector('.pr-canvas'), scroller: host.querySelector('.pr-scroll'), spacer: host.querySelector('.pr-spacer') };
  const s = els.scroller;
  s.addEventListener('pointerdown', onDown);
  s.addEventListener('pointermove', onMove);
  s.addEventListener('pointerup', onUp);
  s.addEventListener('pointercancel', onUp);
  s.addEventListener('contextmenu', (e) => e.preventDefault());
  s.addEventListener('scroll', drawSteps);
  new ResizeObserver(() => drawSteps()).observe(s);
}

export function unmountSteps() {
  els = null;
}
