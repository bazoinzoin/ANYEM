// Modèle d'un projet : pistes, régions, notes, bus d'effets, sortie, marqueurs.
// Tout est sérialisable en JSON ; les sons enregistrés ou importés sont référencés par
// identifiant (`audioId`) et stockés à part (réserve audio).

import { PPQ, ticksPerBar, ticksToSeconds, secondsToTicks } from './time.js';
import { instrumentDefaults, effectDefaults, INSTRUMENTS, EFFECTS } from './defs.js';
import { makeNote } from './music.js';

export const PROJECT_VERSION = 1;

export const TRACK_COLORS = ['#4f9cf9', '#43c59e', '#f5b14c', '#e8667a', '#a77bf3', '#58c7e0', '#f08a4b', '#9bcf53', '#e27fd0', '#c9b458'];

export const TRACK_KINDS = {
  instrument: { label: 'Instrument logiciel' },
  drums: { label: 'Batterie' },
  audio: { label: 'Audio' },
};

let idCounter = 0;
export function uid(prefix = 'id') {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function createEffect(type, params = {}) {
  return { id: uid('fx'), type, on: true, params: { ...effectDefaults(type), ...params } };
}

export function createBus(name, effects) {
  return { id: uid('bus'), name, volume: 0, pan: 0, mute: false, effects };
}

export function createProject(opts = {}) {
  const project = {
    version: PROJECT_VERSION,
    name: opts.name || 'Sans titre',
    bpm: opts.bpm || 120,
    sigNum: opts.sigNum || 4,
    sigDen: opts.sigDen || 4,
    key: opts.key ?? 0,
    scale: opts.scale || 'major',
    loop: { on: false, start: 0, end: 0 },
    metronome: { on: false, countIn: true, volume: 0.6 },
    tracks: [],
    buses: [
      createBus('Réverbe', [createEffect('reverb', { mix: 1, size: 2.4 })]),
      createBus('Écho', [createEffect('delay', { mix: 1, feedback: 0.4 })]),
    ],
    master: { volume: 0, effects: [createEffect('comp', { threshold: -12, ratio: 2, makeup: 1 }), createEffect('limiter')] },
    markers: [],
    audio: {},
  };
  project.loop.end = ticksPerBar(project) * 4;
  return project;
}

export function createTrack(kind, opts = {}) {
  const type = opts.instrumentType || (kind === 'drums' ? 'drums' : 'synth');
  const track = {
    id: uid('tr'),
    name: opts.name || (kind === 'audio' ? 'Audio' : kind === 'drums' ? 'Batterie' : INSTRUMENTS[type].label),
    kind,
    color: opts.color || TRACK_COLORS[0],
    volume: opts.volume ?? 0,
    pan: opts.pan ?? 0,
    mute: false,
    solo: false,
    arm: false,
    sends: [opts.reverb ?? 0, 0],
    effects: (opts.effects || []).map((e) => (typeof e === 'string' ? createEffect(e) : e)),
    automation: { volume: [], pan: [], send0: [], send1: [] },
    showAutomation: false,
    automationParam: 'volume',
    regions: [],
  };
  if (kind !== 'audio') {
    track.instrument = {
      type,
      preset: opts.preset || null,
      params: { ...instrumentDefaults(type), ...(opts.params || {}) },
      sampleId: null,
      arp: { on: false, mode: 'up', rate: '1/16', octaves: 1, gate: 0.8 },
    };
  }
  return track;
}

export function createMidiRegion(start, length, notes = [], name = 'Région') {
  return { id: uid('rg'), type: 'midi', name, start: Math.max(0, Math.round(start)), length: Math.max(1, Math.round(length)), loops: 1, mute: false, notes };
}

export function createAudioRegion(audioId, start, duration, name = 'Audio') {
  return { id: uid('rg'), type: 'audio', name, start: Math.max(0, Math.round(start)), audioId, offset: 0, duration, gain: 0, fadeIn: 0, fadeOut: 0, loops: 1, mute: false };
}

// Longueur d'une répétition de la région, en ticks (les régions audio durent un temps fixe).
export function regionUnit(region, bpm) {
  return region.type === 'audio' ? secondsToTicks(region.duration, bpm) : region.length;
}

export function regionEnd(region, bpm) {
  return region.start + regionUnit(region, bpm) * (region.loops || 1);
}

export function projectEnd(project) {
  let end = 0;
  for (const t of project.tracks) for (const r of t.regions) end = Math.max(end, regionEnd(r, project.bpm));
  return end;
}

// Notes d'une région MIDI, répétitions comprises, en ticks absolus.
export function regionNotes(region) {
  const out = [];
  const loops = region.loops || 1;
  for (let k = 0; k < loops; k++) {
    const off = region.start + k * region.length;
    for (const n of region.notes) {
      if (n.start < 0 || n.start >= region.length) continue;
      const len = Math.min(n.length, region.length - n.start);
      out.push({ ...n, start: off + n.start, length: len, loop: k });
    }
  }
  return out;
}

// Transforme les répétitions d'une région en notes réelles.
export function flattenLoops(region) {
  if (region.type !== 'midi' || (region.loops || 1) === 1) return region;
  const notes = regionNotes(region).map((n) => ({ ...n, id: undefined, start: n.start - region.start }));
  return { ...region, length: region.length * region.loops, loops: 1, notes: notes.map((n) => makeNote(n.pitch, n.start, n.length, n.vel)) };
}

// Coupe une région à la position `tick` (absolue) → [gauche, droite] ou null.
export function splitRegion(region, tick, bpm) {
  const r = flattenLoops(region);
  if (r.type === 'audio' && (r.loops || 1) > 1) return null;
  const rel = tick - r.start;
  if (rel <= 0 || tick >= regionEnd(r, bpm)) return null;
  if (r.type === 'midi') {
    const left = { ...r, id: uid('rg'), length: rel, notes: [] };
    const right = { ...r, id: uid('rg'), start: tick, length: r.length - rel, notes: [] };
    for (const n of r.notes) {
      if (n.start < rel) left.notes.push({ ...n, length: Math.min(n.length, rel - n.start) });
      else right.notes.push({ ...n, start: n.start - rel });
    }
    return [left, right];
  }
  const sec = ticksToSeconds(rel, bpm);
  const left = { ...r, id: uid('rg'), duration: sec, fadeOut: 0 };
  const right = { ...r, id: uid('rg'), start: tick, offset: r.offset + sec, duration: r.duration - sec, fadeIn: 0 };
  return [left, right];
}

// Réunit des régions MIDI d'une même piste en une seule.
export function joinRegions(regions) {
  const midi = regions.filter((r) => r.type === 'midi').map(flattenLoops);
  if (midi.length < 2) return null;
  const start = Math.min(...midi.map((r) => r.start));
  const end = Math.max(...midi.map((r) => r.start + r.length));
  const notes = [];
  for (const r of midi) for (const n of r.notes) if (n.start < r.length) notes.push({ ...n, start: n.start + r.start - start });
  return { ...midi[0], id: uid('rg'), start, length: end - start, loops: 1, notes };
}

export function cloneRegion(region, start) {
  const copy = JSON.parse(JSON.stringify(region));
  copy.id = uid('rg');
  if (start != null) copy.start = Math.max(0, Math.round(start));
  if (copy.notes) copy.notes = copy.notes.map((n) => ({ ...n, id: makeNote(0, 0, 1).id }));
  return copy;
}

export function cloneTrack(track) {
  const copy = JSON.parse(JSON.stringify(track));
  copy.id = uid('tr');
  copy.name = `${track.name} (copie)`;
  copy.solo = false;
  copy.arm = false;
  copy.regions = copy.regions.map((r) => cloneRegion(r));
  copy.effects = copy.effects.map((e) => ({ ...e, id: uid('fx') }));
  return copy;
}

// Une piste s'entend-elle ? (muette, ou une autre piste est en solo)
export function isAudible(track, tracks) {
  if (track.mute) return false;
  const anySolo = tracks.some((t) => t.solo);
  return !anySolo || track.solo;
}

export function dbToGain(db) {
  return db <= -60 ? 0 : 10 ** (db / 20);
}

export function gainToDb(gain) {
  return gain <= 0.001 ? -60 : 20 * Math.log10(gain);
}

// Fader : position 0-1 ↔ dB (0,75 = 0 dB, sommet = +6 dB, bas = silence).
export function faderToDb(pos) {
  const x = Math.max(0, Math.min(1, pos));
  if (x >= 0.75) return ((x - 0.75) / 0.25) * 6;
  if (x <= 0) return -60;
  return -60 * (1 - x / 0.75) ** 2.2;
}

export function dbToFader(db) {
  if (db >= 0) return 0.75 + (Math.min(6, db) / 6) * 0.25;
  if (db <= -60) return 0;
  return 0.75 * (1 - (-db / 60) ** (1 / 2.2));
}

// Automation : valeur d'une courbe à une position (interpolation linéaire, constante aux bords).
export function automationValue(points, tick, fallback) {
  if (!points || !points.length) return fallback;
  if (tick <= points[0].tick) return points[0].value;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (tick <= b.tick) {
      const span = b.tick - a.tick;
      return span <= 0 ? b.value : a.value + ((b.value - a.value) * (tick - a.tick)) / span;
    }
  }
  return points[points.length - 1].value;
}

export const AUTOMATION_PARAMS = {
  volume: { label: 'Volume', min: -60, max: 6, unit: 'dB', def: 0 },
  pan: { label: 'Panoramique', min: -1, max: 1, unit: '', def: 0 },
  send0: { label: 'Envoi réverbe', min: 0, max: 1, unit: '', def: 0 },
  send1: { label: 'Envoi écho', min: 0, max: 1, unit: '', def: 0 },
};

// Remet d'aplomb un projet chargé (fichier ancien ou abîmé) : champs manquants complétés.
export function normalizeProject(raw) {
  const base = createProject();
  const p = { ...base, ...raw };
  p.loop = { ...base.loop, ...(raw.loop || {}) };
  p.metronome = { ...base.metronome, ...(raw.metronome || {}) };
  p.audio = raw.audio || {};
  p.markers = Array.isArray(raw.markers) ? raw.markers : [];
  p.buses = Array.isArray(raw.buses) && raw.buses.length === 2 ? raw.buses : base.buses;
  p.master = { ...base.master, ...(raw.master || {}) };
  for (const bus of p.buses) bus.effects = (bus.effects || []).filter((e) => EFFECTS[e.type]).map(fixEffect);
  p.master.effects = (p.master.effects || []).filter((e) => EFFECTS[e.type]).map(fixEffect);
  p.tracks = (raw.tracks || []).map((t, i) => {
    const kind = TRACK_KINDS[t.kind] ? t.kind : 'instrument';
    const knownType = t.instrument && INSTRUMENTS[t.instrument.type] ? t.instrument.type : undefined;
    const fresh = createTrack(kind, { instrumentType: knownType, color: TRACK_COLORS[i % TRACK_COLORS.length] });
    const track = { ...fresh, ...t, kind };
    track.automation = { ...fresh.automation, ...(t.automation || {}) };
    track.sends = Array.isArray(t.sends) ? [t.sends[0] || 0, t.sends[1] || 0] : [0, 0];
    track.effects = (t.effects || []).filter((e) => EFFECTS[e.type]).map(fixEffect);
    if (kind !== 'audio') {
      const type = t.instrument && INSTRUMENTS[t.instrument.type] ? t.instrument.type : fresh.instrument.type;
      track.instrument = {
        ...fresh.instrument,
        ...(t.instrument || {}),
        type,
        params: { ...instrumentDefaults(type), ...((t.instrument && t.instrument.params) || {}) },
        arp: { ...fresh.instrument.arp, ...((t.instrument && t.instrument.arp) || {}) },
      };
    } else delete track.instrument;
    track.regions = (t.regions || []).filter((r) => (kind === 'audio' ? r.type === 'audio' : r.type === 'midi'))
      .map((r) => ({ loops: 1, mute: false, ...r, notes: r.type === 'midi' ? (r.notes || []).map((n) => ({ id: n.id || makeNote(0, 0, 1).id, ...n })) : undefined }));
    return track;
  });
  p.version = PROJECT_VERSION;
  return p;
}

function fixEffect(e) {
  return { id: e.id || uid('fx'), type: e.type, on: e.on !== false, params: { ...effectDefaults(e.type), ...(e.params || {}) } };
}

export function defaultRegionLength(project) {
  return ticksPerBar(project);
}

export const QUARTER = PPQ;
