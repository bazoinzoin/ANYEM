// Bibliothèque : préréglages d'instruments, boucles prêtes à l'emploi (générées dans la
// tonalité du projet) et modèles de projets.

import { PPQ, ticksPerBar } from './time.js';
import { degreeChord, makeNote, SCALES } from './music.js';
import { createProject, createTrack, createMidiRegion, createEffect, TRACK_COLORS } from './project.js';

export const PRESET_CATEGORIES = ['Claviers', 'Orgues', 'Synthés', 'Nappes', 'Cordes', 'Basses', 'Batteries'];

const preset = (id, name, category, type, params = {}, extra = {}) => ({ id, name, category, type, params, ...extra });

export const PRESETS = [
  preset('epiano', 'Piano électrique', 'Claviers', 'keys', { ratio: 1, index: 2.2, modDecay: 0.9, tine: 0.35, decay: 3, sustain: 0.1, tremolo: 0.15 }),
  preset('softpiano', 'Piano doux', 'Claviers', 'keys', { ratio: 1, index: 1.2, modDecay: 0.4, tine: 0.1, decay: 2.5, sustain: 0.05, release: 0.6 }),
  preset('bells', 'Cloches', 'Claviers', 'keys', { ratio: 3.5, index: 4, modDecay: 2.5, tine: 0.6, decay: 4, sustain: 0, release: 2 }),
  preset('marimba', 'Marimba', 'Claviers', 'keys', { ratio: 4, index: 2, modDecay: 0.08, tine: 0, decay: 0.5, sustain: 0, release: 0.3 }),
  preset('vibes', 'Vibraphone', 'Claviers', 'keys', { ratio: 4, index: 1.2, modDecay: 0.3, tine: 0.5, decay: 3, sustain: 0, release: 1.2, tremolo: 0.5 }),
  preset('clav', 'Clavinet', 'Claviers', 'synth', { osc1: 'square', osc2: 'sawtooth', oscMix: 0.3, cutoff: 2500, resonance: 6, envAmount: 0.6, fDecay: 0.15, attack: 0.001, decay: 0.3, sustain: 0.2, release: 0.08 }),
  preset('jazzorgan', 'Orgue jazz', 'Orgues', 'organ', { d1: 8, d2: 8, d3: 8, d4: 0, d5: 0, d6: 0, d7: 0, d8: 0, d9: 0, perc: 0.6, rotary: 0.5 }),
  preset('rockorgan', 'Orgue rock', 'Orgues', 'organ', { d1: 8, d2: 8, d3: 8, d4: 8, d5: 6, d6: 4, d7: 0, d8: 2, d9: 6, perc: 0.2, rotary: 0.8, rotarySpeed: 5.5 }),
  preset('church', 'Orgue d\'église', 'Orgues', 'organ', { d1: 8, d2: 4, d3: 8, d4: 7, d5: 4, d6: 6, d7: 2, d8: 3, d9: 4, perc: 0, click: 0, rotary: 0, attack: 0.08, release: 0.5 }),
  preset('sawlead', 'Lead scintillant', 'Synthés', 'synth', { osc1: 'sawtooth', osc2: 'sawtooth', osc2Semi: 12, detune: 12, cutoff: 5000, resonance: 3, envAmount: 0.3, attack: 0.005, sustain: 0.8, release: 0.25, vibrato: 12, glide: 0.04 }),
  preset('squarelead', 'Lead carré', 'Synthés', 'synth', { osc1: 'square', osc2: 'square', osc2Semi: -12, detune: 5, cutoff: 3500, resonance: 2, envAmount: 0.2, sustain: 0.9, release: 0.15, vibrato: 8 }),
  preset('brass', 'Cuivres synthé', 'Synthés', 'synth', { osc1: 'sawtooth', osc2: 'sawtooth', detune: 9, cutoff: 900, resonance: 1, envAmount: 0.7, fAttack: 0.08, fDecay: 0.6, attack: 0.04, sustain: 0.8, release: 0.3 }),
  preset('pluck', 'Pluck', 'Synthés', 'synth', { osc1: 'sawtooth', osc2: 'square', detune: 8, cutoff: 600, resonance: 4, envAmount: 0.8, fDecay: 0.25, attack: 0.001, decay: 0.35, sustain: 0, release: 0.3 }),
  preset('chip', 'Chiptune', 'Synthés', 'synth', { osc1: 'square', osc2: 'square', oscMix: 0, detune: 0, cutoff: 18000, resonance: 0, envAmount: 0, attack: 0.001, decay: 0.1, sustain: 0.7, release: 0.05 }),
  preset('warmpad', 'Nappe chaleureuse', 'Nappes', 'synth', { osc1: 'sawtooth', osc2: 'triangle', detune: 14, cutoff: 1400, resonance: 1, envAmount: 0.2, fAttack: 0.8, attack: 0.9, decay: 1, sustain: 0.85, release: 2.2, vibrato: 4, lfoRate: 0.5 }, { effects: ['chorus'] }),
  preset('airpad', 'Nappe aérienne', 'Nappes', 'synth', { osc1: 'triangle', osc2: 'sawtooth', osc2Semi: 12, detune: 20, oscMix: 0.35, noise: 0.05, cutoff: 3500, resonance: 2, envAmount: 0.15, attack: 1.6, sustain: 0.9, release: 3.5 }, { effects: ['chorus'], reverb: 0.5 }),
  preset('darkpad', 'Nappe sombre', 'Nappes', 'synth', { osc1: 'sawtooth', osc2: 'sawtooth', osc2Semi: -12, detune: 18, cutoff: 500, resonance: 3, envAmount: 0.3, fAttack: 1.5, fDecay: 3, attack: 1.2, sustain: 0.9, release: 3 }),
  preset('strings', 'Ensemble de cordes', 'Cordes', 'synth', { osc1: 'sawtooth', osc2: 'sawtooth', detune: 16, cutoff: 2600, resonance: 0.5, envAmount: 0.1, attack: 0.35, decay: 0.5, sustain: 0.9, release: 0.8, vibrato: 6, lfoRate: 5.5 }, { effects: ['chorus'], reverb: 0.35 }),
  preset('slowstrings', 'Cordes lentes', 'Cordes', 'synth', { osc1: 'sawtooth', osc2: 'triangle', detune: 10, cutoff: 1800, envAmount: 0.05, attack: 1.2, sustain: 1, release: 1.8, vibrato: 5, lfoRate: 4.5 }, { reverb: 0.45 }),
  preset('pizz', 'Pizzicato', 'Cordes', 'keys', { ratio: 1, index: 1.5, modDecay: 0.1, tine: 0, decay: 0.35, sustain: 0, release: 0.15 }),
  preset('roundbass', 'Basse ronde', 'Basses', 'synth', { osc1: 'sawtooth', osc2: 'square', osc2Semi: -12, oscMix: 0.4, detune: 3, sub: 0.5, cutoff: 700, resonance: 2, envAmount: 0.35, fDecay: 0.25, attack: 0.003, decay: 0.4, sustain: 0.6, release: 0.12, volume: -6 }),
  preset('subbass', 'Sous-basse', 'Basses', 'synth', { osc1: 'sine', osc2: 'triangle', oscMix: 0.2, detune: 0, sub: 0.3, cutoff: 400, resonance: 0, envAmount: 0, attack: 0.005, sustain: 1, release: 0.1, volume: -4 }),
  preset('acidbass', 'Basse acide', 'Basses', 'synth', { osc1: 'sawtooth', osc2: 'sawtooth', oscMix: 0, detune: 0, cutoff: 350, resonance: 16, envAmount: 0.85, fDecay: 0.2, attack: 0.001, decay: 0.2, sustain: 0.5, release: 0.06, glide: 0.06, volume: -8 }),
  preset('funkbass', 'Basse funk', 'Basses', 'synth', { osc1: 'square', osc2: 'sawtooth', oscMix: 0.5, sub: 0.4, cutoff: 900, resonance: 5, envAmount: 0.55, fDecay: 0.12, attack: 0.001, decay: 0.25, sustain: 0.3, release: 0.08, volume: -6 }),
  preset('bass808', 'Basse 808', 'Basses', 'synth', { osc1: 'sine', osc2: 'sine', oscMix: 0, sub: 0, cutoff: 2000, resonance: 0, envAmount: 0, attack: 0.002, decay: 1.5, sustain: 0.35, release: 0.4, glide: 0.05, volume: -2 }, { effects: [{ type: 'distortion', params: { drive: 0.25, mix: 0.6 } }] }),
  preset('kit808', 'Kit 808', 'Batteries', 'drums', { kit: '808' }),
  preset('kitacoustic', 'Kit acoustique', 'Batteries', 'drums', { kit: 'acoustic', decay: 1.1 }, { reverb: 0.15 }),
  preset('kitelectro', 'Kit électro', 'Batteries', 'drums', { kit: 'electro', punch: 0.8 }),
  preset('kitlofi', 'Kit lo-fi', 'Batteries', 'drums', { kit: 'lofi', tone: 0.3 }, { effects: [{ type: 'lofi', params: { bits: 10, tone: 5000 } }] }),
];

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}

// Crée une piste réglée sur un préréglage.
export function trackFromPreset(presetId, color) {
  const pr = findPreset(presetId);
  if (!pr) return createTrack('instrument', { color });
  const kind = pr.type === 'drums' ? 'drums' : 'instrument';
  const effects = (pr.effects || []).map((e) => (typeof e === 'string' ? createEffect(e) : createEffect(e.type, e.params)));
  return createTrack(kind, { name: pr.name, instrumentType: pr.type, params: pr.params, preset: pr.id, color, effects, reverb: pr.reverb ?? (kind === 'drums' ? 0.05 : 0.15) });
}

// ---- Boucles ---------------------------------------------------------------------------

const DRUM_PITCH = { k: 36, s: 38, c: 39, h: 42, o: 46, r: 51, x: 49, t: 50, m: 47, l: 43, b: 56, z: 70, i: 37 };

const DRUM_PATTERNS = {
  boombap: { name: 'Boom bap', lines: { k: 'x.........x.x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
  trap: { name: 'Trap', lines: { k: 'x......x..x.....', s: '........x.......', h: 'xxxxxxxxxxx.xxxx', o: '...........x....' } },
  house: { name: 'House', lines: { k: 'x...x...x...x...', c: '....x.......x...', h: '..x...x...x...x.', o: '..............x.' } },
  pop: { name: 'Pop rock', lines: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
  funk: { name: 'Funk', lines: { k: 'x..x......x..x..', s: '....x..x.x..x...', h: 'xxxxxxxxxxxxxxxx', o: '.......x........' } },
  reggaeton: { name: 'Reggaeton', lines: { k: 'x...x...x...x...', s: '...x..x....x..x.', h: 'x.x.x.x.x.x.x.x.' } },
  lofi: { name: 'Lo-fi', lines: { k: 'x......x..x.....', s: '....x.......x...', h: 'x.xxx.x.x.xxx.x.', z: '..x...x...x...x.' } },
  dnb: { name: 'Drum & bass', lines: { k: 'x.........x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', r: '..x...x...x...x.' } },
  afro: { name: 'Afro', lines: { k: 'x..x..x...x..x..', i: '...x..x....x..x.', h: 'x.x.x.x.x.x.x.x.', b: 'x..x..x...x.x...' } },
  ballad: { name: 'Ballade', lines: { k: 'x.......x.......', i: '....x.......x...', h: 'x...x...x...x...' } },
  fill: { name: 'Roulement', lines: { k: 'x...............', s: '........x.xxxxxx', t: '....xx..........', m: '......xx........', x: 'x...............' } },
};

// Une ligne de 16 cases = une mesure en 4/4 (double croches) ; accent sur les temps.
export function drumPatternNotes(id, bars = 1) {
  const pat = DRUM_PATTERNS[id];
  if (!pat) return [];
  const step = PPQ / 4;
  const notes = [];
  for (let b = 0; b < bars; b++) {
    for (const [piece, line] of Object.entries(pat.lines)) {
      for (let i = 0; i < line.length; i++) {
        if (line[i] !== 'x') continue;
        const accent = i % 4 === 0 ? 112 : 88;
        const vel = piece === 'h' ? accent - 15 : accent;
        notes.push(makeNote(DRUM_PITCH[piece], b * 16 * step + i * step, step, vel));
      }
    }
  }
  return notes;
}

const PROGRESSIONS = {
  pop: { name: 'I – V – vi – IV', degrees: [0, 4, 5, 3] },
  sensitive: { name: 'vi – IV – I – V', degrees: [5, 3, 0, 4] },
  fifties: { name: 'I – vi – IV – V', degrees: [0, 5, 3, 4] },
  jazz: { name: 'ii – V – I – I', degrees: [1, 4, 0, 0] },
  epic: { name: 'i – VI – III – VII', degrees: [0, 5, 2, 6] },
  sad: { name: 'i – iv – v – i', degrees: [0, 3, 4, 0] },
};

export const PROGRESSION_LIST = Object.entries(PROGRESSIONS).map(([id, p]) => ({ id, name: p.name }));

function progressionChords(project, progId, size = 3, octaveBase = 48) {
  const prog = PROGRESSIONS[progId] || PROGRESSIONS.pop;
  const scale = SCALES[project.scale] && SCALES[project.scale].steps.length === 7 ? project.scale : (project.scale === 'pentaMinor' || project.scale === 'blues' ? 'minor' : 'major');
  return prog.degrees.map((d) => degreeChord(project.key, scale, d, size, octaveBase));
}

// Styles de jeu pour une grille d'accords (une mesure par accord, 4 mesures).
export function chordPatternNotes(project, progId, style) {
  const bar = ticksPerBar(project);
  const beat = bar / project.sigNum;
  const notes = [];
  const chords = progressionChords(project, progId, style === 'arp' ? 3 : 4, 48);
  chords.forEach((chord, i) => {
    const t0 = i * bar;
    if (style === 'pad') for (const p of chord) notes.push(makeNote(p + 12, t0, bar, 85));
    else if (style === 'stabs') {
      for (let b = 0; b < project.sigNum; b++) for (const p of chord) notes.push(makeNote(p + 12, t0 + b * beat + beat / 2, beat / 4, 95));
    } else if (style === 'piano') {
      notes.push(makeNote(chord[0], t0, bar, 90));
      for (let b = 0; b < project.sigNum; b++) for (const p of chord.slice(1)) notes.push(makeNote(p + 12, t0 + b * beat, beat * 0.9, b === 0 ? 90 : 72));
    } else if (style === 'arp') {
      const seq = [chord[0], chord[1], chord[2], chord[0] + 12, chord[2], chord[1]];
      const step = PPQ / 4;
      for (let s = 0; s < bar / step; s++) notes.push(makeNote(seq[s % seq.length] + 12, t0 + s * step, step * 0.9, s % 4 === 0 ? 100 : 80));
    }
  });
  return notes;
}

export function bassPatternNotes(project, progId, style) {
  const bar = ticksPerBar(project);
  const beat = bar / project.sigNum;
  const eighth = PPQ / 2;
  const notes = [];
  const roots = progressionChords(project, progId, 3, 36).map((c) => c[0]);
  roots.forEach((root, i) => {
    const t0 = i * bar;
    if (style === 'whole') notes.push(makeNote(root, t0, bar * 0.95, 100));
    else if (style === 'pulse') for (let s = 0; s < bar / eighth; s++) notes.push(makeNote(root, t0 + s * eighth, eighth * 0.8, s % 2 ? 80 : 100));
    else if (style === 'octave') for (let s = 0; s < bar / eighth; s++) notes.push(makeNote(root + (s % 2 ? 12 : 0), t0 + s * eighth, eighth * 0.7, 95));
    else if (style === 'funk') {
      const rhythm = [[0, 2], [3, 1], [6, 1], [8, 2], [11, 1], [14, 1]];
      const step = PPQ / 4;
      rhythm.forEach(([s, l], k) => notes.push(makeNote(root + (k === 2 ? 12 : k === 4 ? 7 : 0), t0 + s * step, l * step * 0.9, k === 0 ? 110 : 90)));
    } else if (style === '808') {
      notes.push(makeNote(root, t0, beat * 1.5, 110));
      notes.push(makeNote(root, t0 + beat * 2.5, beat, 100));
    }
  });
  return notes;
}

// Catalogue des boucles proposées dans la bibliothèque.
export const LOOPS = [
  ...Object.entries(DRUM_PATTERNS).map(([id, p]) => ({ id: `drums-${id}`, name: `Rythme ${p.name}`, category: 'Batterie', bars: id === 'fill' ? 1 : 2, preset: id === 'house' || id === 'trap' ? 'kit808' : id === 'lofi' ? 'kitlofi' : id === 'pop' || id === 'ballad' || id === 'funk' ? 'kitacoustic' : 'kit808', kind: 'drums', build: () => drumPatternNotes(id, id === 'fill' ? 1 : 2) })),
  { id: 'bass-whole', name: 'Basse tenue', category: 'Basse', bars: 4, preset: 'subbass', build: (p, prog) => bassPatternNotes(p, prog, 'whole') },
  { id: 'bass-pulse', name: 'Basse pulsée', category: 'Basse', bars: 4, preset: 'roundbass', build: (p, prog) => bassPatternNotes(p, prog, 'pulse') },
  { id: 'bass-octave', name: 'Basse disco (octaves)', category: 'Basse', bars: 4, preset: 'roundbass', build: (p, prog) => bassPatternNotes(p, prog, 'octave') },
  { id: 'bass-funk', name: 'Basse funk', category: 'Basse', bars: 4, preset: 'funkbass', build: (p, prog) => bassPatternNotes(p, prog, 'funk') },
  { id: 'bass-808', name: 'Basse 808', category: 'Basse', bars: 4, preset: 'bass808', build: (p, prog) => bassPatternNotes(p, prog, '808') },
  { id: 'chords-pad', name: 'Accords tenus', category: 'Accords', bars: 4, preset: 'warmpad', build: (p, prog) => chordPatternNotes(p, prog, 'pad') },
  { id: 'chords-piano', name: 'Accords au piano', category: 'Accords', bars: 4, preset: 'epiano', build: (p, prog) => chordPatternNotes(p, prog, 'piano') },
  { id: 'chords-stabs', name: 'Accords syncopés', category: 'Accords', bars: 4, preset: 'brass', build: (p, prog) => chordPatternNotes(p, prog, 'stabs') },
  { id: 'chords-arp', name: 'Arpège', category: 'Accords', bars: 4, preset: 'pluck', build: (p, prog) => chordPatternNotes(p, prog, 'arp') },
];

export const LOOP_CATEGORIES = ['Batterie', 'Basse', 'Accords'];

export function findLoop(id) {
  return LOOPS.find((l) => l.id === id) || null;
}

export function loopRegion(project, loopId, start, progId = 'pop') {
  const loop = findLoop(loopId);
  const notes = loop.build(project, progId);
  const region = createMidiRegion(start, ticksPerBar(project) * loop.bars, notes, loop.name);
  return region;
}

// ---- Modèles de projets ----------------------------------------------------------------

export const TEMPLATES = [
  { id: 'empty', name: 'Projet vide', help: 'Une piste d\'instrument, rien d\'autre : à vous de jouer.' },
  { id: 'beat', name: 'Beat hip-hop', help: 'Batterie boom bap, basse et piano électrique, 90 BPM.' },
  { id: 'pop', name: 'Chanson pop', help: 'Batterie, basse, piano, nappe et une piste voix prête à enregistrer.' },
  { id: 'electro', name: 'Électro / house', help: 'Rythme house, basse pulsée et arpège, 124 BPM.' },
  { id: 'lofi', name: 'Lo-fi chill', help: 'Rythme lo-fi, accords jazz au piano, ambiance feutrée, 78 BPM.' },
  { id: 'voice', name: 'Enregistrement voix / instrument', help: 'Deux pistes audio prêtes pour le micro, métronome actif.' },
];

export function createFromTemplate(id) {
  const color = (i) => TRACK_COLORS[i % TRACK_COLORS.length];
  const add = (project, track) => { track.color = color(project.tracks.length); project.tracks.push(track); return track; };
  const withLoop = (project, track, loopId, prog, bars = 8) => {
    const loop = findLoop(loopId);
    const region = loopRegion(project, loopId, 0, prog);
    region.loops = Math.max(1, Math.round(bars / loop.bars));
    track.regions.push(region);
  };
  let project;
  switch (id) {
    case 'beat': {
      project = createProject({ name: 'Beat hip-hop', bpm: 90, key: 9, scale: 'minor' });
      withLoop(project, add(project, trackFromPreset('kit808')), 'drums-boombap');
      withLoop(project, add(project, trackFromPreset('roundbass')), 'bass-pulse', 'sad');
      withLoop(project, add(project, trackFromPreset('epiano')), 'chords-piano', 'sad');
      break;
    }
    case 'pop': {
      project = createProject({ name: 'Chanson pop', bpm: 110, key: 0, scale: 'major' });
      withLoop(project, add(project, trackFromPreset('kitacoustic')), 'drums-pop');
      withLoop(project, add(project, trackFromPreset('roundbass')), 'bass-whole', 'pop');
      withLoop(project, add(project, trackFromPreset('epiano')), 'chords-piano', 'pop');
      withLoop(project, add(project, trackFromPreset('warmpad')), 'chords-pad', 'pop');
      add(project, createTrack('audio', { name: 'Voix', reverb: 0.25, effects: ['eq', 'comp'] }));
      break;
    }
    case 'electro': {
      project = createProject({ name: 'Électro', bpm: 124, key: 5, scale: 'minor' });
      withLoop(project, add(project, trackFromPreset('kitelectro')), 'drums-house');
      withLoop(project, add(project, trackFromPreset('acidbass')), 'bass-pulse', 'epic');
      withLoop(project, add(project, trackFromPreset('pluck')), 'chords-arp', 'epic');
      withLoop(project, add(project, trackFromPreset('airpad')), 'chords-pad', 'epic');
      break;
    }
    case 'lofi': {
      project = createProject({ name: 'Lo-fi', bpm: 78, key: 2, scale: 'dorian' });
      withLoop(project, add(project, trackFromPreset('kitlofi')), 'drums-lofi');
      withLoop(project, add(project, trackFromPreset('subbass')), 'bass-whole', 'jazz');
      const keys = add(project, trackFromPreset('softpiano'));
      keys.effects.push(createEffect('lofi', { bits: 12, wobble: 0.4, tone: 4500 }));
      withLoop(project, keys, 'chords-piano', 'jazz');
      break;
    }
    case 'voice': {
      project = createProject({ name: 'Enregistrement', bpm: 100 });
      project.metronome.on = true;
      add(project, createTrack('audio', { name: 'Voix', reverb: 0.25, effects: ['eq', 'comp'] }));
      add(project, createTrack('audio', { name: 'Instrument', reverb: 0.15, effects: ['eq'] }));
      project.tracks[0].arm = true;
      break;
    }
    default: {
      project = createProject({ name: 'Sans titre' });
      add(project, trackFromPreset('epiano'));
    }
  }
  project.loop = { on: id !== 'empty' && id !== 'voice', start: 0, end: ticksPerBar(project) * (id === 'empty' || id === 'voice' ? 4 : 8) };
  return project;
}
