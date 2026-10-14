// Opérations d'édition (toutes annulables) : pistes, régions, notes, import, boucles.

import {
  createTrack, createMidiRegion, createAudioRegion, cloneRegion, cloneTrack, splitRegion, joinRegions,
  regionEnd, regionUnit, uid, TRACK_COLORS, flattenLoops, dbToGain, gainToDb, createEffect,
} from '../core/project.js';
import { ticksPerBar, snap, gridTicks } from '../core/time.js';
import { quantizeNotes, transposeNotes, makeNote } from '../core/music.js';
import { instrumentDefaults } from '../core/defs.js';
import { findPreset, trackFromPreset, findLoop, loopRegion } from '../core/library.js';
import { readMidi } from '../core/smf.js';
import { peakLevel } from '../core/wav.js';
import { commit, project, ui, emit, findTrack, findRegion } from './store.js';
import { setBuffer, getBuffer, decodeAudio } from '../audio/engine.js';
import { toast } from './toast.js';

export function nextColor() {
  const used = project().tracks.map((t) => t.color);
  return TRACK_COLORS.find((c) => !used.includes(c)) || TRACK_COLORS[project().tracks.length % TRACK_COLORS.length];
}

function insertIndex() {
  const p = project();
  const i = p.tracks.findIndex((t) => t.id === ui.selectedTrackId);
  return i < 0 ? p.tracks.length : i + 1;
}

// ---- Pistes ------------------------------------------------------------------------------

export function addTrack(kind, opts = {}) {
  const track = opts.presetId ? trackFromPreset(opts.presetId, nextColor()) : createTrack(kind, { color: nextColor(), ...opts });
  if (kind === 'audio' && !opts.presetId) track.effects = [createEffect('eq'), createEffect('comp')];
  commit('Nouvelle piste', (p) => { p.tracks.splice(insertIndex(), 0, track); });
  ui.selectedTrackId = track.id;
  emit('ui');
  return track;
}

export function applyPreset(trackId, presetId) {
  const pr = findPreset(presetId);
  const track = findTrack(trackId);
  if (!pr || !track || track.kind === 'audio') return;
  commit(`Son « ${pr.name} »`, (p) => {
    const t = findTrack(trackId, p);
    t.instrument.type = pr.type;
    t.instrument.params = { ...instrumentDefaults(pr.type), ...pr.params };
    t.instrument.preset = pr.id;
    t.kind = pr.type === 'drums' ? 'drums' : 'instrument';
    const generic = ['Synthétiseur', 'Piano électrique & cloches', 'Orgue à tirettes', 'Boîte à rythmes', 'Échantillonneur', 'Batterie'];
    if (generic.includes(t.name) || findPreset(t.instrument.preset)) t.name = pr.name;
    if (pr.effects && !t.effects.length) t.effects = pr.effects.map((e) => (typeof e === 'string' ? createEffect(e) : createEffect(e.type, e.params)));
  });
}

export function setInstrumentType(trackId, type) {
  commit('Changer d\'instrument', (p) => {
    const t = findTrack(trackId, p);
    if (!t || !t.instrument) return;
    t.instrument.type = type;
    t.instrument.params = instrumentDefaults(type);
    t.instrument.preset = null;
    t.kind = type === 'drums' ? 'drums' : 'instrument';
  });
}

export function deleteTrack(id) {
  const t = findTrack(id);
  if (!t) return;
  commit(`Supprimer la piste « ${t.name} »`, (p) => { p.tracks = p.tracks.filter((x) => x.id !== id); });
}

export function duplicateTrack(id) {
  const t = findTrack(id);
  if (!t) return;
  const copy = cloneTrack(t);
  commit('Dupliquer la piste', (p) => {
    const i = p.tracks.findIndex((x) => x.id === id);
    p.tracks.splice(i + 1, 0, copy);
  });
  ui.selectedTrackId = copy.id;
  emit('ui');
}

export function moveTrack(id, dir) {
  commit('Déplacer la piste', (p) => {
    const i = p.tracks.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= p.tracks.length) return;
    const [t] = p.tracks.splice(i, 1);
    p.tracks.splice(j, 0, t);
  });
}

export function moveTrackTo(id, index) {
  commit('Déplacer la piste', (p) => {
    const i = p.tracks.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [t] = p.tracks.splice(i, 1);
    p.tracks.splice(Math.max(0, Math.min(p.tracks.length, index > i ? index - 1 : index)), 0, t);
  });
}

export function setTrackProp(id, key, value, label) {
  commit(label || 'Modifier la piste', (p) => {
    const t = findTrack(id, p);
    if (t) t[key] = value;
  });
}

export function toggleTrack(id, key) {
  const t = findTrack(id);
  if (!t) return;
  const labels = { mute: 'Silence', solo: 'Solo', arm: 'Armer pour l\'enregistrement' };
  commit(labels[key] || key, (p) => {
    const tr = findTrack(id, p);
    tr[key] = !tr[key];
    // Une piste audio armée à la fois (une seule entrée micro).
    if (key === 'arm' && tr.arm && tr.kind === 'audio') for (const o of p.tracks) if (o !== tr && o.kind === 'audio') o.arm = false;
  });
}

// ---- Régions -----------------------------------------------------------------------------

export function createRegionAt(trackId, tick, length) {
  const track = findTrack(trackId);
  if (!track || track.kind === 'audio') return null;
  const region = createMidiRegion(tick, length || ticksPerBar(project()), [], track.name);
  commit('Nouvelle région', (p) => { findTrack(trackId, p).regions.push(region); });
  ui.selectedRegions = new Set([region.id]);
  ui.selectedTrackId = trackId;
  emit('ui');
  return region;
}

export function openEditor(regionId) {
  const found = findRegion(regionId);
  if (!found) return;
  ui.editorRegionId = regionId;
  ui.selectedTrackId = found.track.id;
  ui.selectedNotes.clear();
  ui.bottom = 'editor';
  emit('ui');
}

export function deleteRegions(ids) {
  if (!ids.length) return;
  commit(ids.length > 1 ? 'Supprimer les régions' : 'Supprimer la région', (p) => {
    for (const t of p.tracks) t.regions = t.regions.filter((r) => !ids.includes(r.id));
  });
}

export function selectionBounds(ids) {
  const p = project();
  let start = Infinity;
  let end = -Infinity;
  for (const id of ids) {
    const f = findRegion(id);
    if (!f) continue;
    start = Math.min(start, f.region.start);
    end = Math.max(end, regionEnd(f.region, p.bpm));
  }
  return { start, end };
}

// Duplique les régions juste après la sélection (calé sur la mesure suivante).
export function duplicateRegions(ids) {
  if (!ids.length) return;
  const p = project();
  const { start, end } = selectionBounds(ids);
  const bar = ticksPerBar(p);
  const shift = Math.max(bar, Math.ceil((end - start) / bar) * bar);
  const created = [];
  commit('Dupliquer', (pp) => {
    for (const id of ids) {
      const f = findRegion(id, pp);
      if (!f) continue;
      const copy = cloneRegion(f.region, f.region.start + shift);
      f.track.regions.push(copy);
      created.push(copy.id);
    }
  });
  ui.selectedRegions = new Set(created);
  emit('ui');
}

export function splitAt(ids, tick) {
  const p = project();
  let count = 0;
  const created = [];
  commit('Couper la région', (pp) => {
    for (const id of ids) {
      const f = findRegion(id, pp);
      if (!f) continue;
      const parts = splitRegion(f.region, tick, p.bpm);
      if (!parts) continue;
      const i = f.track.regions.indexOf(f.region);
      f.track.regions.splice(i, 1, ...parts);
      created.push(parts[0].id, parts[1].id);
      count += 1;
    }
  });
  if (count) { ui.selectedRegions = new Set(created.slice(-1)); emit('ui'); }
  return count;
}

export function joinSelected(ids) {
  const byTrack = new Map();
  for (const id of ids) {
    const f = findRegion(id);
    if (!f || f.region.type !== 'midi') continue;
    if (!byTrack.has(f.track.id)) byTrack.set(f.track.id, []);
    byTrack.get(f.track.id).push(f.region);
  }
  let done = 0;
  const created = [];
  commit('Joindre les régions', (p) => {
    for (const [trackId, regions] of byTrack) {
      if (regions.length < 2) continue;
      const joined = joinRegions(regions);
      const t = findTrack(trackId, p);
      const rm = new Set(regions.map((r) => r.id));
      t.regions = t.regions.filter((r) => !rm.has(r.id));
      t.regions.push(joined);
      created.push(joined.id);
      done += 1;
    }
  });
  if (done) { ui.selectedRegions = new Set(created); emit('ui'); }
  return done;
}

export function toggleMuteRegions(ids) {
  commit('Silence sur la région', (p) => {
    for (const id of ids) { const f = findRegion(id, p); if (f) f.region.mute = !f.region.mute; }
  });
}

export function setRegionProp(id, key, value, label) {
  commit(label || 'Modifier la région', (p) => {
    const f = findRegion(id, p);
    if (f) f.region[key] = value;
  });
}

export function quantizeRegions(ids, gridId, opts = {}) {
  const grid = gridTicks(gridId, project());
  commit('Quantifier', (p) => {
    for (const id of ids) {
      const f = findRegion(id, p);
      if (!f || f.region.type !== 'midi') continue;
      const sel = ui.editorRegionId === id && ui.selectedNotes.size ? ui.selectedNotes : null;
      f.region.notes = f.region.notes.map((n) => (!sel || sel.has(n.id) ? quantizeNotes([n], grid, opts)[0] : n));
    }
  });
}

export function transposeRegions(ids, semis) {
  commit(`Transposer de ${semis > 0 ? '+' : ''}${semis}`, (p) => {
    for (const id of ids) {
      const f = findRegion(id, p);
      if (!f || f.region.type !== 'midi' || f.track.kind === 'drums') continue;
      const sel = ui.editorRegionId === id && ui.selectedNotes.size ? ui.selectedNotes : null;
      f.region.notes = f.region.notes.map((n) => (!sel || sel.has(n.id) ? transposeNotes([n], semis)[0] : n));
    }
  });
}

// ---- Presse-papiers ------------------------------------------------------------------------

export function copyRegions(ids) {
  const p = project();
  const items = [];
  const { start } = selectionBounds(ids);
  for (const id of ids) {
    const f = findRegion(id);
    if (!f) continue;
    items.push({ trackIndex: p.tracks.indexOf(f.track), offset: f.region.start - start, region: JSON.parse(JSON.stringify(f.region)) });
  }
  if (!items.length) return false;
  const minTrack = Math.min(...items.map((i) => i.trackIndex));
  for (const i of items) i.trackIndex -= minTrack;
  ui.clipboard = { kind: 'regions', items };
  return true;
}

export function pasteRegions(tick, trackId) {
  const clip = ui.clipboard;
  if (!clip || clip.kind !== 'regions') return false;
  const p = project();
  const base = Math.max(0, p.tracks.findIndex((t) => t.id === trackId));
  const created = [];
  commit('Coller', (pp) => {
    for (const item of clip.items) {
      const t = pp.tracks[base + item.trackIndex] || pp.tracks[base];
      if (!t) continue;
      const ok = item.region.type === 'audio' ? t.kind === 'audio' : t.kind !== 'audio';
      if (!ok) continue;
      const r = cloneRegion(item.region, tick + item.offset);
      t.regions.push(r);
      created.push(r.id);
    }
  });
  ui.selectedRegions = new Set(created);
  emit('ui');
  return created.length > 0;
}

// ---- Audio ---------------------------------------------------------------------------------

export function registerAudio(buffer, name) {
  const id = uid('snd');
  setBuffer(id, buffer);
  return { id, meta: { name, duration: buffer.duration, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels } };
}

// Importe des fichiers audio : sur la piste audio sélectionnée, sinon sur une nouvelle piste.
export async function importAudioFiles(files, { trackId = null, tick = null } = {}) {
  const p = project();
  let at = tick ?? snap(ui.playhead, ticksPerBar(p), 'floor');
  let target = trackId ? findTrack(trackId) : null;
  if (!target || target.kind !== 'audio') {
    const sel = findTrack(ui.selectedTrackId);
    target = sel && sel.kind === 'audio' && !trackId ? sel : null;
  }
  const decoded = [];
  for (const file of files) {
    try {
      const buffer = await decodeAudio(await file.arrayBuffer());
      decoded.push({ buffer, name: file.name.replace(/\.[^.]+$/, '') });
    } catch {
      toast(`Impossible de lire « ${file.name} » (format non pris en charge).`, 'error', 4000);
    }
  }
  if (!decoded.length) return;
  let newTrack = null;
  if (!target) {
    newTrack = createTrack('audio', { name: decoded[0].name, color: nextColor(), effects: ['eq', 'comp'] });
  }
  const regionIds = [];
  commit(decoded.length > 1 ? 'Importer des sons' : `Importer « ${decoded[0].name} »`, (pp) => {
    if (newTrack) pp.tracks.splice(insertIndex(), 0, newTrack);
    const t = findTrack(newTrack ? newTrack.id : target.id, pp);
    for (const d of decoded) {
      const { id, meta } = registerAudio(d.buffer, d.name);
      pp.audio[id] = meta;
      const r = createAudioRegion(id, at, d.buffer.duration, d.name);
      t.regions.push(r);
      regionIds.push(r.id);
      at = snap(regionEnd(r, pp.bpm), ticksPerBar(pp), 'ceil');
    }
  });
  ui.selectedTrackId = newTrack ? newTrack.id : target.id;
  ui.selectedRegions = new Set(regionIds);
  emit('ui');
  toast(decoded.length > 1 ? `${decoded.length} sons importés` : `« ${decoded[0].name} » importé`, 'ok');
}

// Ajoute un enregistrement audio terminé sur une piste : le son commence à `tick`, les
// `offset` premières secondes (décompte, latence) sont masquées.
export function addRecordedAudio(trackId, buffer, tick, offset, name) {
  const { id, meta } = registerAudio(buffer, name);
  let regionId = null;
  commit('Enregistrement audio', (p) => {
    p.audio[id] = meta;
    const t = findTrack(trackId, p);
    const r = createAudioRegion(id, Math.max(0, tick), Math.max(0.01, buffer.duration - offset), name);
    r.offset = Math.max(0, offset);
    t.regions.push(r);
    regionId = r.id;
  });
  ui.selectedRegions = new Set([regionId]);
  emit('ui');
}

export function normalizeRegion(id) {
  const f = findRegion(id);
  if (!f || f.region.type !== 'audio') return;
  const buffer = getBuffer(f.region.audioId);
  if (!buffer) return;
  const sr = buffer.sampleRate;
  const s = Math.floor(f.region.offset * sr);
  const e = Math.min(buffer.length, Math.floor((f.region.offset + f.region.duration) * sr));
  const chans = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c).subarray(s, e));
  const peak = peakLevel(chans);
  if (peak <= 0) return;
  const target = dbToGain(-0.3) / peak;
  setRegionProp(id, 'gain', Math.round(gainToDb(target) * 10) / 10, 'Normaliser');
}

// Transforme le son d'une région audio en instrument (échantillonneur) sur une nouvelle piste.
export function samplerFromRegion(id) {
  const f = findRegion(id);
  if (!f || f.region.type !== 'audio') return;
  const buffer = getBuffer(f.region.audioId);
  if (!buffer) return;
  const sr = buffer.sampleRate;
  const s = Math.floor(f.region.offset * sr);
  const len = Math.max(1, Math.min(buffer.length - s, Math.floor(f.region.duration * sr)));
  const ctxBuf = new AudioBuffer({ length: len, numberOfChannels: buffer.numberOfChannels, sampleRate: sr });
  for (let c = 0; c < buffer.numberOfChannels; c++) ctxBuf.copyToChannel(buffer.getChannelData(c).subarray(s, s + len), c);
  const { id: sid, meta } = registerAudio(ctxBuf, `${f.region.name} (échantillon)`);
  const track = createTrack('instrument', { name: `${f.region.name} (instrument)`, instrumentType: 'sampler', color: nextColor() });
  track.instrument.sampleId = sid;
  commit('Créer un instrument à partir du son', (p) => {
    p.audio[sid] = meta;
    p.tracks.splice(insertIndex(), 0, track);
  });
  ui.selectedTrackId = track.id;
  emit('ui');
  toast('Instrument créé : jouez ce son sur toutes les notes du clavier.', 'ok', 3500);
}

// ---- MIDI ----------------------------------------------------------------------------------

export async function importMidiFile(file) {
  let data;
  try { data = readMidi(new Uint8Array(await file.arrayBuffer())); } catch (err) {
    toast(err.message || 'Fichier MIDI illisible', 'error');
    return;
  }
  if (!data.tracks.length) { toast('Ce fichier MIDI ne contient aucune note.', 'error'); return; }
  const at = snap(ui.playhead, ticksPerBar(project()), 'floor');
  const p0 = project();
  const tracks = data.tracks.map((mt, i) => {
    const t = mt.drums ? trackFromPreset('kit808', TRACK_COLORS[(p0.tracks.length + i) % TRACK_COLORS.length])
      : trackFromPreset('epiano', TRACK_COLORS[(p0.tracks.length + i) % TRACK_COLORS.length]);
    t.name = mt.name;
    const end = Math.max(...mt.notes.map((n) => n.start + n.length));
    const bar = ticksPerBar(p0);
    const len = Math.max(bar, Math.ceil(end / bar) * bar);
    t.regions.push(createMidiRegion(at, len, mt.notes.map((n) => makeNote(n.pitch, n.start, n.length, n.vel)), mt.name));
    return t;
  });
  const empty = p0.tracks.every((t) => !t.regions.length);
  commit(`Importer « ${file.name} »`, (p) => {
    if (empty && at === 0) { p.bpm = data.bpm; p.sigNum = data.sigNum; p.sigDen = data.sigDen; }
    p.tracks.push(...tracks);
  });
  toast(`${tracks.length} piste(s) MIDI importée(s)`, 'ok');
}

// ---- Boucles de la bibliothèque -------------------------------------------------------------

export function addLoop(loopId, { trackId = null, tick = null } = {}) {
  const loop = findLoop(loopId);
  if (!loop) return;
  const p = project();
  const at = tick != null ? tick : snap(ui.playhead, ticksPerBar(p), 'floor');
  const region = loopRegion(p, loopId, at, ui.progression);
  let target = trackId ? findTrack(trackId) : null;
  const wantDrums = loop.category === 'Batterie';
  if (target && (target.kind === 'audio' || (target.kind === 'drums') !== wantDrums)) target = null;
  let newTrack = null;
  if (!target) newTrack = trackFromPreset(loop.preset, nextColor());
  commit(`Boucle « ${loop.name} »`, (pp) => {
    if (newTrack) pp.tracks.splice(insertIndex(), 0, newTrack);
    findTrack(newTrack ? newTrack.id : target.id, pp).regions.push(region);
  });
  ui.selectedTrackId = newTrack ? newTrack.id : target.id;
  ui.selectedRegions = new Set([region.id]);
  emit('ui');
}

// ---- Marqueurs -----------------------------------------------------------------------------

export function addMarker(tick, name) {
  const p = project();
  const n = name || `Repère ${p.markers.length + 1}`;
  commit('Ajouter un repère', (pp) => {
    pp.markers.push({ id: uid('mk'), tick: Math.max(0, Math.round(tick)), name: n });
    pp.markers.sort((a, b) => a.tick - b.tick);
  });
}

export function deleteMarker(id) {
  commit('Supprimer le repère', (p) => { p.markers = p.markers.filter((m) => m.id !== id); });
}

export function renameMarker(id, name) {
  commit('Renommer le repère', (p) => { const m = p.markers.find((x) => x.id === id); if (m) m.name = name; });
}

// ---- Divers ----------------------------------------------------------------------------------

export function regionLengthTicks(region) {
  return regionUnit(region, project().bpm);
}

export function flattenRegion(id) {
  commit('Matérialiser les répétitions', (p) => {
    const f = findRegion(id, p);
    if (!f) return;
    const i = f.track.regions.indexOf(f.region);
    f.track.regions[i] = flattenLoops(f.region);
  });
}
