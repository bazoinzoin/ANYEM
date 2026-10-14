// Théorie musicale et transformations de notes (fonctions pures).
// Une note : { id, pitch (0-127, 60 = Do3), start (ticks depuis le début de la région),
// length (ticks), vel (1-127) }.

import { PPQ, noteValueTicks } from './time.js';

const NAMES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const KEY_ROOTS = NAMES_FR.map((name, i) => ({ id: i, label: name, en: NAMES_EN[i] }));

// Convention française (et celle des logiciels de musique) : 60 = Do3.
export function noteName(pitch, style = 'fr') {
  const names = style === 'en' ? NAMES_EN : NAMES_FR;
  return `${names[((pitch % 12) + 12) % 12]}${Math.floor(pitch / 12) - 2}`;
}

export function isBlackKey(pitch) {
  return [1, 3, 6, 8, 10].includes(((pitch % 12) + 12) % 12);
}

export function midiToFreq(pitch) {
  return 440 * 2 ** ((pitch - 69) / 12);
}

export const SCALES = {
  major: { label: 'Majeur', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Mineur', steps: [0, 2, 3, 5, 7, 8, 10] },
  harmonicMinor: { label: 'Mineur harmonique', steps: [0, 2, 3, 5, 7, 8, 11] },
  dorian: { label: 'Dorien', steps: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { label: 'Mixolydien', steps: [0, 2, 4, 5, 7, 9, 10] },
  pentaMajor: { label: 'Pentatonique majeure', steps: [0, 2, 4, 7, 9] },
  pentaMinor: { label: 'Pentatonique mineure', steps: [0, 3, 5, 7, 10] },
  blues: { label: 'Blues', steps: [0, 3, 5, 6, 7, 10] },
  chromatic: { label: 'Chromatique', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};

export function inScale(pitch, root, scale) {
  const steps = (SCALES[scale] || SCALES.chromatic).steps;
  return steps.includes((((pitch - root) % 12) + 12) % 12);
}

// Ramène une hauteur à la note de la gamme la plus proche (vers le bas en cas d'égalité).
export function snapToScale(pitch, root, scale) {
  for (let d = 0; d < 12; d++) {
    if (inScale(pitch - d, root, scale)) return pitch - d;
    if (inScale(pitch + d, root, scale)) return pitch + d;
  }
  return pitch;
}

export const CHORD_TYPES = {
  single: { label: 'Note seule', intervals: [0] },
  major: { label: 'Accord majeur', intervals: [0, 4, 7] },
  minor: { label: 'Accord mineur', intervals: [0, 3, 7] },
  sus4: { label: 'Suspendu 4', intervals: [0, 5, 7] },
  maj7: { label: 'Majeur 7', intervals: [0, 4, 7, 11] },
  min7: { label: 'Mineur 7', intervals: [0, 3, 7, 10] },
  dom7: { label: 'Septième', intervals: [0, 4, 7, 10] },
  power: { label: 'Quinte (power chord)', intervals: [0, 7, 12] },
  octave: { label: 'Octave', intervals: [0, 12] },
  diatonic: { label: 'Accord de la gamme', intervals: null },
};

// Accord construit sur une note : intervalles fixes, ou empilement de tierces de la gamme.
export function chordPitches(pitch, type, root, scale) {
  const def = CHORD_TYPES[type] || CHORD_TYPES.single;
  if (def.intervals) return def.intervals.map((i) => pitch + i).filter((p) => p >= 0 && p <= 127);
  const base = snapToScale(pitch, root, scale);
  return diatonicStack(base, root, scale, 3);
}

function diatonicStack(base, root, scale, count) {
  const steps = (SCALES[scale] || SCALES.major).steps;
  if (steps.length < 7) return [base, base + 4, base + 7].filter((p) => p <= 127);
  const rel = (((base - root) % 12) + 12) % 12;
  const degree = steps.indexOf(rel);
  const out = [];
  for (let k = 0; k < count; k++) {
    const idx = degree + k * 2;
    const oct = Math.floor(idx / steps.length);
    out.push(base - rel + steps[idx % steps.length] + 12 * oct);
  }
  return out.filter((p) => p <= 127);
}

// Accord diatonique d'un degré (0 = I) de la tonalité, à partir de l'octave donnée.
export function degreeChord(root, scale, degree, size = 3, octaveBase = 48) {
  const steps = SCALES[scale] && SCALES[scale].steps.length === 7 ? SCALES[scale].steps : SCALES.major.steps;
  const d = ((degree % 7) + 7) % 7;
  const base = octaveBase + root + steps[d];
  const out = [];
  for (let k = 0; k < size; k++) {
    const idx = d + k * 2;
    out.push(octaveBase + root + steps[idx % 7] + 12 * Math.floor(idx / 7));
  }
  return out.length ? out : [base];
}

let noteCounter = 0;
export function noteId() {
  noteCounter += 1;
  return `n${Date.now().toString(36)}${noteCounter.toString(36)}`;
}

export function makeNote(pitch, start, length, vel = 100) {
  return { id: noteId(), pitch: clampPitch(pitch), start: Math.max(0, Math.round(start)), length: Math.max(1, Math.round(length)), vel: clampVel(vel) };
}

export function clampPitch(p) {
  return Math.max(0, Math.min(127, Math.round(p)));
}

export function clampVel(v) {
  return Math.max(1, Math.min(127, Math.round(v)));
}

// Quantification : ramène le début (et en option la fin) des notes sur la grille.
// strength 0-1 (1 = pile sur la grille), swing 0-1 décale une case sur deux.
export function quantizeNotes(notes, grid, { strength = 1, swing = 0, ends = false } = {}) {
  if (grid <= 1) return notes.map((n) => ({ ...n }));
  return notes.map((n) => {
    const idx = Math.round(n.start / grid);
    let target = idx * grid;
    if (swing > 0 && idx % 2 === 1) target += grid * swing * 0.5;
    const start = Math.max(0, Math.round(n.start + (target - n.start) * strength));
    let length = n.length;
    if (ends) {
      const end = Math.max(start + grid, Math.round((n.start + n.length) / grid) * grid);
      length = end - start;
    }
    return { ...n, start, length: Math.max(1, length) };
  });
}

export function transposeNotes(notes, semitones) {
  return notes.map((n) => ({ ...n, pitch: clampPitch(n.pitch + semitones) }));
}

// Vélocité : fixe (set) ou décalée (add) ; scale multiplie.
export function changeVelocity(notes, { set, add = 0, scale = 1 } = {}) {
  return notes.map((n) => ({ ...n, vel: clampVel(set != null ? set : n.vel * scale + add) }));
}

// Humanisation : petits écarts de placement et de vélocité (rng = fonction 0-1).
export function humanizeNotes(notes, rng, { time = 12, vel = 10 } = {}) {
  return notes.map((n) => ({
    ...n,
    start: Math.max(0, Math.round(n.start + (rng() * 2 - 1) * time)),
    vel: clampVel(n.vel + (rng() * 2 - 1) * vel),
  }));
}

// Legato : chaque note dure jusqu'au début de la suivante (accords conservés).
export function legatoNotes(notes) {
  const starts = [...new Set(notes.map((n) => n.start))].sort((a, b) => a - b);
  return notes.map((n) => {
    const next = starts.find((s) => s > n.start);
    return next != null ? { ...n, length: next - n.start } : { ...n };
  });
}

export function fitNotesToScale(notes, root, scale) {
  return notes.map((n) => ({ ...n, pitch: snapToScale(n.pitch, root, scale) }));
}

// Arpégiateur : chaque groupe de notes tenues est rejoué note par note au rythme choisi.
// settings : { mode: up | down | updown | random | chord, rate: '1/16', octaves: 1-3, gate: 0-1 }
export function arpeggiate(notes, settings, rng = Math.random) {
  if (!notes.length) return [];
  const step = noteValueTicks(settings.rate || '1/16');
  const gate = Math.max(0.05, Math.min(1, settings.gate ?? 0.8));
  const octaves = Math.max(1, Math.min(4, settings.octaves || 1));
  const mode = settings.mode || 'up';
  const out = [];
  const startTick = Math.floor(Math.min(...notes.map((n) => n.start)) / step) * step;
  const endTick = Math.max(...notes.map((n) => n.start + n.length));
  let i = 0;
  for (let t = startTick; t < endTick; t += step) {
    const held = notes.filter((n) => n.start <= t + step / 2 && n.start + n.length > t + 1)
      .sort((a, b) => a.pitch - b.pitch);
    if (!held.length) { i = 0; continue; }
    const seq = [];
    for (let o = 0; o < octaves; o++) for (const n of held) seq.push({ pitch: n.pitch + 12 * o, vel: n.vel });
    let picks;
    if (mode === 'chord') picks = seq;
    else if (mode === 'random') picks = [seq[Math.floor(rng() * seq.length)]];
    else {
      let order = seq;
      if (mode === 'down') order = [...seq].reverse();
      if (mode === 'updown') order = seq.length > 1 ? [...seq, ...seq.slice(1, -1).reverse()] : seq;
      picks = [order[i % order.length]];
    }
    for (const p of picks) {
      if (p.pitch > 127) continue;
      out.push({ id: `arp${out.length}`, pitch: p.pitch, start: Math.max(0, t), length: Math.max(1, Math.round(step * gate)), vel: p.vel });
    }
    i += 1;
  }
  return out;
}

// Tempo à partir de frappes (secondes) : moyenne des derniers écarts.
export function tapTempo(times) {
  if (times.length < 2) return null;
  const recent = times.slice(-6);
  const gaps = [];
  for (let i = 1; i < recent.length; i++) gaps.push(recent[i] - recent[i - 1]);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avg <= 0) return null;
  return Math.max(30, Math.min(300, Math.round(60 / avg)));
}

export const DRUM_MAP = [
  { pitch: 36, name: 'Grosse caisse' },
  { pitch: 38, name: 'Caisse claire' },
  { pitch: 39, name: 'Clap' },
  { pitch: 37, name: 'Rimshot' },
  { pitch: 42, name: 'Charleston fermé' },
  { pitch: 46, name: 'Charleston ouvert' },
  { pitch: 50, name: 'Tom aigu' },
  { pitch: 47, name: 'Tom médium' },
  { pitch: 43, name: 'Tom basse' },
  { pitch: 49, name: 'Cymbale crash' },
  { pitch: 51, name: 'Cymbale ride' },
  { pitch: 56, name: 'Cloche' },
  { pitch: 70, name: 'Shaker' },
];

export function drumName(pitch) {
  const d = DRUM_MAP.find((x) => x.pitch === pitch);
  return d ? d.name : noteName(pitch);
}

export const SIXTEENTH = PPQ / 4;
