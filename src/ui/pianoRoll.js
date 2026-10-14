// Piano roll : clavier, grille, notes et ligne des vélocités d'une région MIDI.

import { fitCanvas, roundRect, shade, isDoubleDown } from './dom.js';
import { ui, project, emit, commit, editorRegion } from './store.js';
import { ticksPerBar, ticksPerBeat, gridTicks, snap, PPQ } from '../core/time.js';
import { isBlackKey, noteName, inScale, chordPitches, makeNote, clampPitch, clampVel, drumName } from '../core/music.js';
import { previewNotes, liveNoteOn, liveNoteOff } from '../audio/engine.js';
import { setPlayhead, currentTick } from './transport.js';
import { showMenu } from './popup.js';

const KEY_W = 58;
const RULER = 22;
const VEL_H = 74;

let els = null;
let drag = null;
let lastLength = PPQ / 2;
let scrolledFor = null;
let held = null;

function gridSize() {
  return ui.snap === 'off' ? 1 : gridTicks(ui.snap, project());
}

function geom() {
  const W = els.scroller.clientWidth;
  const H = els.scroller.clientHeight;
  return { W, H, sx: els.scroller.scrollLeft, sy: els.scroller.scrollTop };
}

function xOf(tick, G) { return KEY_W + tick * ui.prZoom - G.sx; }
function tickOf(x, G) { return (x - KEY_W + G.sx) / ui.prZoom; }
function yOf(pitch, G) { return RULER + (127 - pitch) * ui.prKeyH - G.sy; }
function pitchOf(y, G) { return clampPitch(127 - Math.floor((y - RULER + G.sy) / ui.prKeyH)); }

function current() {
  const er = editorRegion();
  return er && er.region.type === 'midi' ? er : null;
}

function noteAt(region, x, y, G) {
  for (let i = region.notes.length - 1; i >= 0; i--) {
    const n = region.notes[i];
    const nx = xOf(n.start, G);
    const nw = Math.max(4, n.length * ui.prZoom);
    const ny = yOf(n.pitch, G);
    if (x >= nx && x <= nx + nw && y >= ny && y < ny + ui.prKeyH) {
      return { note: n, edge: x >= nx + nw - Math.min(7, nw / 3) ? 'right' : null };
    }
  }
  return null;
}

// ---- Dessin -------------------------------------------------------------------------------

export function drawPianoRoll() {
  if (!els) return;
  const er = current();
  const G = geom();
  const g = fitCanvas(els.canvas, G.W, G.H);
  g.fillStyle = '#14181e';
  g.fillRect(0, 0, G.W, G.H);
  if (!er) return;
  const { region, track } = er;
  const p = project();
  const drums = track.kind === 'drums';
  const total = region.length * (region.loops || 1);
  els.spacer.style.width = `${KEY_W + Math.max(total, region.length + ticksPerBar(p)) * ui.prZoom + 200}px`;
  els.spacer.style.height = `${RULER + 128 * ui.prKeyH}px`;
  if (scrolledFor !== region.id) {
    scrolledFor = region.id;
    const pitches = region.notes.map((n) => n.pitch);
    const center = pitches.length ? (Math.min(...pitches) + Math.max(...pitches)) / 2 : (drums ? 42 : 62);
    els.scroller.scrollTop = Math.max(0, (127 - center) * ui.prKeyH - G.H / 2);
    els.scroller.scrollLeft = 0;
    return drawPianoRoll();
  }
  // Lignes de hauteurs
  const pTop = pitchOf(RULER, G);
  const pBot = pitchOf(G.H, G);
  for (let pitch = pTop; pitch >= pBot; pitch--) {
    const y = yOf(pitch, G);
    const out = !drums && !inScale(pitch, p.key, p.scale);
    g.fillStyle = isBlackKey(pitch) ? (out ? '#101318' : '#13171d') : (out ? '#15191f' : '#1a1f27');
    if (!drums && !out && ((pitch - p.key) % 12 + 12) % 12 === 0) g.fillStyle = '#1e2530';
    g.fillRect(KEY_W, y, G.W, ui.prKeyH);
    if (pitch % 12 === 0) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(KEY_W, y + ui.prKeyH - 1, G.W, 1); }
  }
  // Grille verticale
  const bar = ticksPerBar(p);
  const beat = ticksPerBeat(p);
  const grid = gridSize();
  const t0 = Math.max(0, tickOf(KEY_W, G));
  const t1 = tickOf(G.W, G);
  const lines = (step, color) => {
    if (step * ui.prZoom < 5) return;
    g.strokeStyle = color;
    g.beginPath();
    for (let t = Math.floor(t0 / step) * step; t < t1; t += step) { const x = Math.round(xOf(t, G)) + 0.5; g.moveTo(x, RULER); g.lineTo(x, G.H); }
    g.stroke();
  };
  if (grid > 1) lines(grid, 'rgba(255,255,255,0.03)');
  lines(beat, 'rgba(255,255,255,0.07)');
  lines(bar, 'rgba(255,255,255,0.16)');
  // Hors région
  const endX = xOf(region.length, G);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  if (endX < G.W) g.fillRect(Math.max(KEY_W, endX), RULER, G.W - endX, G.H);
  // Notes (répétitions en fantôme)
  const loops = region.loops || 1;
  const nh = ui.prKeyH - 1;
  const moving = drag && (drag.type === 'move' || drag.type === 'resize') && drag.moved;
  for (let k = 1; k < loops; k++) {
    g.fillStyle = shade(track.color, -0.2, 0.25);
    for (const n of region.notes) {
      if (n.start >= region.length) continue;
      const x = xOf(n.start + k * region.length, G);
      if (x > G.W) continue;
      g.fillRect(x, yOf(n.pitch, G), Math.max(3, Math.min(n.length, region.length - n.start) * ui.prZoom - 1), nh);
    }
  }
  for (const n of region.notes) {
    let { start, pitch, length } = n;
    const sel = ui.selectedNotes.has(n.id);
    if (moving && sel) {
      if (drag.type === 'move') { start = Math.max(0, start + drag.dt); pitch = clampPitch(pitch + drag.dp); } else length = Math.max(grid > 1 ? grid / 2 : 10, length + drag.dl);
    }
    const x = xOf(start, G);
    const w = Math.max(3, length * ui.prZoom - 1);
    const y = yOf(pitch, G);
    if (x > G.W || x + w < KEY_W || y > G.H || y + nh < RULER) continue;
    const v = n.vel / 127;
    roundRect(g, x, y + 0.5, w, nh, 3);
    g.fillStyle = sel ? shade(track.color, 0.55, 1) : shade(track.color, -0.35 + v * 0.45, 1);
    g.fill();
    g.strokeStyle = sel ? '#fff' : shade(track.color, 0.4, 0.8);
    g.stroke();
    if (w > 34 && ui.prKeyH >= 12) {
      g.fillStyle = sel ? '#10141a' : 'rgba(255,255,255,0.85)';
      g.font = '10px Inter, system-ui, sans-serif';
      g.textBaseline = 'middle';
      g.fillText(drums ? drumName(pitch) : noteName(pitch, ui.noteNames), x + 4, y + nh / 2 + 1, w - 6);
    }
  }
  if (moving && drag.copy) {
    // Les originaux restent visibles lors d'une copie (déjà dessinés).
  }
  if (drag && drag.type === 'new') {
    g.fillStyle = shade(track.color, 0.3, 0.8);
    for (const pch of drag.pitches) g.fillRect(xOf(drag.start, G), yOf(pch, G), Math.max(3, drag.length * ui.prZoom), nh);
  }
  if (drag && drag.type === 'rubber' && drag.moved) {
    g.fillStyle = 'rgba(79,156,249,0.12)';
    g.strokeStyle = 'rgba(79,156,249,0.8)';
    const x = Math.min(drag.x0, drag.x1);
    const y = Math.min(drag.y0, drag.y1);
    g.fillRect(x, y, Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0));
    g.strokeRect(x + 0.5, y + 0.5, Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0));
  }
  // Clavier
  for (let pitch = pTop; pitch >= pBot; pitch--) {
    const y = yOf(pitch, G);
    const black = isBlackKey(pitch);
    g.fillStyle = held === pitch ? track.color : black ? '#23272e' : '#d9dde3';
    g.fillRect(0, y, black ? KEY_W * 0.62 : KEY_W, ui.prKeyH - (black ? 1 : 0));
    if (!black) { g.fillStyle = '#9aa1ab'; g.fillRect(0, y + ui.prKeyH - 1, KEY_W, 1); }
    if (drums || pitch % 12 === 0) {
      g.fillStyle = black ? '#d9dde3' : '#3b4049';
      g.font = `${drums ? 9 : 10}px Inter, system-ui, sans-serif`;
      g.textBaseline = 'middle';
      if (ui.prKeyH >= 9) g.fillText(drums ? drumName(pitch).slice(0, 10) : noteName(pitch, ui.noteNames), black ? 3 : 4, y + ui.prKeyH / 2, KEY_W - 6);
    }
  }
  g.fillStyle = '#0d1014';
  g.fillRect(KEY_W - 1, RULER, 1, G.H);
  // Règle
  g.fillStyle = '#1b2029';
  g.fillRect(0, 0, G.W, RULER);
  g.fillStyle = '#aab3c0';
  g.font = '10.5px Inter, system-ui, sans-serif';
  g.textBaseline = 'middle';
  for (let t = Math.floor(t0 / bar) * bar; t < t1; t += bar) {
    const x = xOf(t, G);
    if (x < KEY_W - 1) continue;
    g.fillRect(Math.round(x), 10, 1, RULER - 10);
    g.fillText(String(Math.round((region.start + t) / bar) + 1), x + 4, 11);
  }
  g.fillStyle = 'rgba(245,177,76,0.8)';
  g.fillRect(Math.max(KEY_W, xOf(0, G)), RULER - 3, Math.max(0, endX - Math.max(KEY_W, xOf(0, G))), 3);
  g.fillStyle = '#1b2029';
  g.fillRect(0, 0, KEY_W, RULER);
  // Tête de lecture
  const rel = currentTick() - region.start;
  if (rel >= 0 && rel <= total) {
    const x = xOf(rel, G);
    if (x >= KEY_W) { g.fillStyle = ui.recording ? '#ff4d5e' : '#f2f4f7'; g.fillRect(Math.round(x), 0, 1.5, G.H); }
  }
  drawVelocity(region, track, G);
}

function drawVelocity(region, track, G) {
  const W = G.W;
  const g = fitCanvas(els.vel, W, VEL_H);
  g.fillStyle = '#111419';
  g.fillRect(0, 0, W, VEL_H);
  g.fillStyle = '#1b2029';
  g.fillRect(0, 0, KEY_W, VEL_H);
  g.fillStyle = '#7b8594';
  g.font = '10px Inter, system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('Vélocité', 6, VEL_H / 2);
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  g.beginPath(); g.moveTo(KEY_W, VEL_H / 2 + 0.5); g.lineTo(W, VEL_H / 2 + 0.5); g.stroke();
  g.save();
  g.beginPath(); g.rect(KEY_W, 0, W - KEY_W, VEL_H); g.clip();
  for (const n of region.notes) {
    const x = xOf(n.start, G);
    if (x < KEY_W - 4 || x > W) continue;
    const sel = ui.selectedNotes.has(n.id);
    const h = (n.vel / 127) * (VEL_H - 8);
    g.fillStyle = sel ? '#ffffff' : shade(track.color, 0.1, 0.9);
    g.fillRect(x, VEL_H - 4 - h, 3, h);
    g.beginPath(); g.arc(x + 1.5, VEL_H - 4 - h, 3, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ---- Interactions ----------------------------------------------------------------------------

function local(e, el) {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function preview(track, pitches, vel = 100) {
  previewNotes(track.id, pitches, vel, 0.3);
}

function onDown(e) {
  const er = current();
  if (!er || e.button !== 0) return;
  const { region, track } = er;
  const G = geom();
  const { x, y } = local(e, els.scroller);
  if (x > G.W || y > G.H) return;
  els.scroller.focus({ preventScroll: true });
  ui.focusArea = 'editor';
  const dbl = isDoubleDown(e);
  // Clavier : écoute d'une note
  if (x < KEY_W && y > RULER) {
    held = pitchOf(y, G);
    liveNoteOn(track.id, held, 100);
    els.scroller.setPointerCapture(e.pointerId);
    drag = { type: 'key' };
    return;
  }
  // Règle : déplace la tête de lecture
  if (y < RULER) {
    setPlayhead(region.start + Math.max(0, snap(tickOf(x, G), gridSize())));
    return;
  }
  const hit = noteAt(region, x, y, G);
  const tool = ui.tool;
  if (hit) {
    const n = hit.note;
    if (tool === 'eraser') {
      eraseNote(n.id);
      els.scroller.setPointerCapture(e.pointerId);
      drag = { type: 'erase' };
      return;
    }
    if (dbl && tool !== 'pencil') { eraseNote(n.id); return; }
    if (e.shiftKey) {
      if (ui.selectedNotes.has(n.id)) ui.selectedNotes.delete(n.id); else ui.selectedNotes.add(n.id);
      emit('ui');
      return;
    }
    if (!ui.selectedNotes.has(n.id)) { ui.selectedNotes = new Set([n.id]); emit('ui'); }
    preview(track, [n.pitch], n.vel);
    els.scroller.setPointerCapture(e.pointerId);
    drag = { type: hit.edge ? 'resize' : 'move', x0: x, y0: y, dt: 0, dp: 0, dl: 0, moved: false, copy: e.altKey, anchor: n, lastPitch: n.pitch };
    return;
  }
  if (tool === 'eraser') {
    els.scroller.setPointerCapture(e.pointerId);
    drag = { type: 'erase' };
    return;
  }
  if (tool === 'pencil' || dbl) {
    const grid = gridSize();
    const start = Math.max(0, snap(tickOf(x, G), grid, 'floor'));
    const base = pitchOf(y, G);
    const p = project();
    const pitches = track.kind === 'drums' ? [base] : chordPitches(base, ui.chordMode, p.key, p.scale);
    preview(track, pitches, ui.velocity);
    els.scroller.setPointerCapture(e.pointerId);
    drag = { type: 'new', start, pitches, length: lastLength, x0: x, moved: false };
    return;
  }
  if (!e.shiftKey) ui.selectedNotes = new Set();
  els.scroller.setPointerCapture(e.pointerId);
  // Au doigt, glisser dans le vide fait défiler ; double-tap = nouvelle note.
  if (e.pointerType === 'touch') drag = { type: 'pan', cx: e.clientX, cy: e.clientY, sl: els.scroller.scrollLeft, st: els.scroller.scrollTop };
  else drag = { type: 'rubber', x0: x, y0: y, x1: x, y1: y, moved: false, base: new Set(ui.selectedNotes) };
  emit('ui');
}

function onMove(e) {
  const er = current();
  if (!er) return;
  const G = geom();
  const { x, y } = local(e, els.scroller);
  if (!drag) {
    const hit = x > KEY_W && y > RULER ? noteAt(er.region, x, y, G) : null;
    els.scroller.style.cursor = x < KEY_W ? 'pointer' : hit ? (hit.edge ? 'ew-resize' : ui.tool === 'eraser' ? 'not-allowed' : 'grab') : (ui.tool === 'pencil' ? 'crosshair' : 'default');
    return;
  }
  if (drag.type === 'pan') {
    els.scroller.scrollLeft = drag.sl - (e.clientX - drag.cx);
    els.scroller.scrollTop = drag.st - (e.clientY - drag.cy);
    return;
  }
  const grid = e.shiftKey ? 1 : gridSize();
  if (drag.type === 'key') {
    const p = pitchOf(y, G);
    if (p !== held) { liveNoteOff(er.track.id, held); held = p; liveNoteOn(er.track.id, p, 100); }
  } else if (drag.type === 'move') {
    if (!drag.moved && Math.abs(x - drag.x0) < 3 && Math.abs(y - drag.y0) < 3) return;
    drag.moved = true;
    const target = snap(drag.anchor.start + (x - drag.x0) / ui.prZoom, grid);
    drag.dt = target - drag.anchor.start;
    const sel = er.region.notes.filter((n) => ui.selectedNotes.has(n.id));
    const minStart = Math.min(...sel.map((n) => n.start));
    if (minStart + drag.dt < 0) drag.dt = -minStart;
    drag.dp = pitchOf(y, G) - drag.anchor.pitch;
    const np = clampPitch(drag.anchor.pitch + drag.dp);
    if (np !== drag.lastPitch) { drag.lastPitch = np; preview(er.track, [np], drag.anchor.vel); }
  } else if (drag.type === 'resize') {
    drag.moved = true;
    const end = snap(drag.anchor.start + drag.anchor.length + (x - drag.x0) / ui.prZoom, grid);
    drag.dl = end - (drag.anchor.start + drag.anchor.length);
  } else if (drag.type === 'new') {
    const end = snap(tickOf(x, G), grid, 'ceil');
    if (Math.abs(x - drag.x0) > 4) { drag.moved = true; drag.length = Math.max(grid > 1 ? grid : 10, end - drag.start); }
  } else if (drag.type === 'rubber') {
    drag.x1 = x; drag.y1 = y;
    if (Math.abs(x - drag.x0) > 3 || Math.abs(y - drag.y0) > 3) drag.moved = true;
    const sel = new Set(drag.base);
    const ta = tickOf(Math.min(drag.x0, x), G); const tb = tickOf(Math.max(drag.x0, x), G);
    const pa = pitchOf(Math.max(drag.y0, y), G); const pb = pitchOf(Math.min(drag.y0, y), G);
    for (const n of er.region.notes) if (n.start + n.length >= ta && n.start <= tb && n.pitch >= pa && n.pitch <= pb) sel.add(n.id);
    ui.selectedNotes = sel;
  } else if (drag.type === 'erase') {
    const hit = noteAt(er.region, x, y, G);
    if (hit) eraseNote(hit.note.id);
  }
  // Défilement automatique
  if (drag.type !== 'key') {
    if (x > G.W - 20) els.scroller.scrollLeft += 12;
    if (x < KEY_W + 10 && els.scroller.scrollLeft > 0) els.scroller.scrollLeft -= 12;
    if (y > G.H - 14) els.scroller.scrollTop += 8;
    if (y < RULER + 8 && els.scroller.scrollTop > 0) els.scroller.scrollTop -= 8;
  }
  drawPianoRoll();
}

function onUp() {
  const er = current();
  const d = drag;
  drag = null;
  if (!d || !er) { drawPianoRoll(); return; }
  if (d.type === 'key') { liveNoteOff(er.track.id, held); held = null; }
  if (d.type === 'move' && d.moved) {
    const newIds = [];
    commit(d.copy ? 'Copier des notes' : 'Déplacer des notes', () => {
      const region = current().region;
      const sel = region.notes.filter((n) => ui.selectedNotes.has(n.id));
      for (const n of sel) {
        const target = d.copy ? makeNote(n.pitch, n.start, n.length, n.vel) : n;
        target.start = Math.max(0, n.start + d.dt);
        target.pitch = clampPitch(n.pitch + d.dp);
        if (d.copy) { region.notes.push(target); newIds.push(target.id); }
      }
    });
    if (d.copy) ui.selectedNotes = new Set(newIds);
  } else if (d.type === 'resize' && d.moved) {
    commit('Durée des notes', () => {
      const grid = gridSize();
      for (const n of current().region.notes) if (ui.selectedNotes.has(n.id)) n.length = Math.max(grid > 1 ? grid / 2 : 10, n.length + d.dl);
    });
    const a = current().region.notes.find((n) => n.id === d.anchor.id);
    if (a) lastLength = a.length;
  } else if (d.type === 'new') {
    if (d.moved) lastLength = d.length;
    const created = d.pitches.map((pch) => makeNote(pch, d.start, d.length, ui.velocity));
    commit(created.length > 1 ? 'Ajouter un accord' : 'Ajouter une note', () => {
      const region = current().region;
      region.notes.push(...created);
      if (d.start + d.length > region.length) region.length = snap(d.start + d.length, ticksPerBar(project()), 'ceil');
    });
    ui.selectedNotes = new Set(created.map((n) => n.id));
  }
  emit('ui');
}

function eraseNote(id) {
  commit('Supprimer une note', () => {
    const region = current().region;
    region.notes = region.notes.filter((n) => n.id !== id);
  });
}

// Vélocité : glisser sur une barre (ou sur la sélection) pour la changer.
let velDrag = null;
function velDown(e) {
  const er = current();
  if (!er) return;
  const G = geom();
  const { x, y } = local(e, els.vel);
  const n = [...er.region.notes].reverse().find((nn) => Math.abs(xOf(nn.start, G) + 1.5 - x) < 5);
  if (!n) return;
  els.vel.setPointerCapture(e.pointerId);
  const ids = ui.selectedNotes.has(n.id) ? new Set(ui.selectedNotes) : new Set([n.id]);
  velDrag = { ids, y0: y, base: new Map(er.region.notes.filter((nn) => ids.has(nn.id)).map((nn) => [nn.id, nn.vel])), anchor: n.id, before: JSON.stringify(er.region.notes) };
  velMove(e);
}

function velMove(e) {
  if (!velDrag) return;
  const er = current();
  const { y } = local(e, els.vel);
  const target = clampVel(((VEL_H - 4 - y) / (VEL_H - 8)) * 127);
  const delta = target - velDrag.base.get(velDrag.anchor);
  for (const n of er.region.notes) if (velDrag.ids.has(n.id)) n.vel = clampVel(velDrag.base.get(n.id) + delta);
  drawPianoRoll();
}

function velUp() {
  if (!velDrag) return;
  const er = current();
  const after = er.region.notes.map((n) => n.vel);
  const before = JSON.parse(velDrag.before);
  velDrag = null;
  // Remet l'état d'avant puis applique en une étape annulable.
  er.region.notes.forEach((n, i) => { n.vel = before[i].vel; });
  commit('Vélocité', () => { current().region.notes.forEach((n, i) => { n.vel = after[i]; }); });
}

function onMenu(e) {
  e.preventDefault();
  const er = current();
  if (!er) return;
  const G = geom();
  const { x, y } = local(e, els.scroller);
  const hit = noteAt(er.region, x, y, G);
  if (hit && !ui.selectedNotes.has(hit.note.id)) { ui.selectedNotes = new Set([hit.note.id]); emit('ui'); }
  const has = ui.selectedNotes.size > 0;
  showMenu(e.clientX, e.clientY, [
    { label: 'Tout sélectionner', shortcut: 'Ctrl+A', action: () => { ui.selectedNotes = new Set(er.region.notes.map((n) => n.id)); emit('ui'); } },
    { label: 'Supprimer', shortcut: 'Suppr', disabled: !has, action: () => deleteSelectedNotes() },
    { label: 'Monter d\'une octave', disabled: !has, action: () => shiftSelected(0, 12) },
    { label: 'Descendre d\'une octave', disabled: !has, action: () => shiftSelected(0, -12) },
  ]);
}

export function deleteSelectedNotes() {
  if (!ui.selectedNotes.size || !current()) return;
  commit('Supprimer des notes', () => {
    const region = current().region;
    region.notes = region.notes.filter((n) => !ui.selectedNotes.has(n.id));
  });
}

export function shiftSelected(dt, dp) {
  const er = current();
  if (!er || !ui.selectedNotes.size) return;
  commit(dp ? 'Transposer des notes' : 'Déplacer des notes', () => {
    for (const n of current().region.notes) {
      if (!ui.selectedNotes.has(n.id)) continue;
      n.start = Math.max(0, n.start + dt);
      n.pitch = clampPitch(n.pitch + dp);
    }
  });
  if (dp) {
    const n = er.region.notes.find((nn) => ui.selectedNotes.has(nn.id));
    if (n) preview(er.track, [n.pitch]);
  }
}

export function selectAllNotes() {
  const er = current();
  if (!er) return;
  ui.selectedNotes = new Set(er.region.notes.map((n) => n.id));
  emit('ui');
}

export function copyNotes() {
  const er = current();
  if (!er || !ui.selectedNotes.size) return false;
  const sel = er.region.notes.filter((n) => ui.selectedNotes.has(n.id));
  const min = Math.min(...sel.map((n) => n.start));
  ui.clipboard = { kind: 'notes', notes: sel.map((n) => ({ ...n, start: n.start - min })) };
  return true;
}

export function pasteNotes() {
  const er = current();
  if (!er || !ui.clipboard || ui.clipboard.kind !== 'notes') return false;
  const at = Math.max(0, snap(currentTick() - er.region.start, gridSize()));
  const created = ui.clipboard.notes.map((n) => makeNote(n.pitch, at + n.start, n.length, n.vel));
  commit('Coller des notes', () => {
    const region = current().region;
    region.notes.push(...created);
    const end = Math.max(...created.map((n) => n.start + n.length));
    if (end > region.length) region.length = snap(end, ticksPerBar(project()), 'ceil');
  });
  ui.selectedNotes = new Set(created.map((n) => n.id));
  emit('ui');
  return true;
}

export function gridStep() {
  return gridSize() > 1 ? gridSize() : PPQ / 4;
}

export function mountPianoRoll(host) {
  host.innerHTML = `<div class="pr-host"><canvas class="pr-canvas"></canvas><div class="pr-scroll" tabindex="0" data-help="Crayon : cliquez pour ajouter une note (glissez pour sa durée). Pointeur : double-cliquez pour ajouter, glissez pour déplacer, bord droit pour allonger. Alt+glisser = copier."><div class="pr-spacer"></div></div></div>
    <div class="vel-host" data-help="Vélocité (force de frappe) : glissez une barre vers le haut ou le bas. Avec plusieurs notes sélectionnées, elles changent ensemble."><canvas class="vel-canvas"></canvas></div>`;
  els = {
    canvas: host.querySelector('.pr-canvas'),
    scroller: host.querySelector('.pr-scroll'),
    spacer: host.querySelector('.pr-spacer'),
    vel: host.querySelector('.vel-canvas'),
  };
  scrolledFor = null;
  const s = els.scroller;
  s.addEventListener('pointerdown', onDown);
  s.addEventListener('pointermove', onMove);
  s.addEventListener('pointerup', onUp);
  s.addEventListener('pointercancel', onUp);
  s.addEventListener('contextmenu', onMenu);
  s.addEventListener('scroll', drawPianoRoll);
  s.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const G = geom();
      const { x } = local(e, s);
      const t = tickOf(x, G);
      ui.prZoom = Math.max(0.02, Math.min(2, ui.prZoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      drawPianoRoll();
      s.scrollLeft = Math.max(0, t * ui.prZoom - (x - KEY_W));
    } else if (e.altKey) {
      e.preventDefault();
      ui.prKeyH = Math.max(8, Math.min(28, ui.prKeyH + (e.deltaY < 0 ? 1 : -1)));
      drawPianoRoll();
    }
  }, { passive: false });
  els.vel.addEventListener('pointerdown', velDown);
  els.vel.addEventListener('pointermove', velMove);
  els.vel.addEventListener('pointerup', velUp);
  new ResizeObserver(() => drawPianoRoll()).observe(s);
}

export function unmountPianoRoll() {
  els = null;
}
