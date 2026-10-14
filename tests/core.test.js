import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PPQ, ticksPerBar, ticksToSeconds, secondsToTicks, formatPosition, formatTime, gridTicks, snap } from '../src/core/time.js';
import {
  noteName, inScale, snapToScale, chordPitches, degreeChord, quantizeNotes, transposeNotes,
  changeVelocity, legatoNotes, arpeggiate, tapTempo, makeNote, fitNotesToScale, humanizeNotes,
} from '../src/core/music.js';
import {
  createProject, createTrack, createMidiRegion, createAudioRegion, regionEnd, regionNotes, splitRegion,
  joinRegions, flattenLoops, isAudible, faderToDb, dbToFader, automationValue, normalizeProject, cloneTrack, projectEnd,
} from '../src/core/project.js';
import { INSTRUMENTS, EFFECTS, instrumentDefaults, paramToNorm, normToParam, formatParam } from '../src/core/defs.js';
import { createHistory } from '../src/core/history.js';
import { encodeWav, decodeWav, peakLevel, bytesToBase64, base64ToBytes } from '../src/core/wav.js';
import { writeMidi, readMidi } from '../src/core/smf.js';
import { makeReverbIR, computePeaks, makeDriveCurve, makeCrushCurve } from '../src/core/dsp.js';
import { PRESETS, LOOPS, TEMPLATES, createFromTemplate, trackFromPreset, loopRegion, drumPatternNotes } from '../src/core/library.js';

const project4 = () => createProject({ bpm: 120 });

test('temps : conversions ticks ↔ secondes et affichage', () => {
  const p = project4();
  assert.equal(ticksPerBar(p), PPQ * 4);
  assert.equal(ticksToSeconds(PPQ, 120), 0.5);
  assert.equal(secondsToTicks(0.5, 120), PPQ);
  assert.equal(formatPosition(0, p), '1.1.1');
  assert.equal(formatPosition(PPQ * 4 + PPQ + PPQ / 4, p), '2.2.2');
  assert.equal(formatTime(65.25), '1:05.250');
  const p34 = createProject({ sigNum: 3, sigDen: 4 });
  assert.equal(ticksPerBar(p34), PPQ * 3);
  const p68 = createProject({ sigNum: 6, sigDen: 8 });
  assert.equal(ticksPerBar(p68), PPQ * 3);
});

test('temps : grille de magnétisme', () => {
  const p = project4();
  assert.equal(gridTicks('1/16', p), 120);
  assert.equal(snap(130, 120), 120);
  assert.equal(snap(190, 120), 240);
  assert.equal(snap(190, 120, 'floor'), 120);
  assert.equal(snap(37, 1), 37);
});

test('musique : noms, gammes, accords', () => {
  assert.equal(noteName(60), 'Do3');
  assert.equal(noteName(69, 'en'), 'A3');
  assert.ok(inScale(64, 0, 'major'));
  assert.ok(!inScale(63, 0, 'major'));
  assert.equal(snapToScale(61, 0, 'major'), 60);
  assert.deepEqual(chordPitches(60, 'major', 0, 'major'), [60, 64, 67]);
  assert.deepEqual(chordPitches(62, 'diatonic', 0, 'major'), [62, 65, 69]);
  assert.deepEqual(degreeChord(0, 'major', 4, 3, 48), [55, 59, 62]);
  assert.deepEqual(degreeChord(9, 'minor', 0, 3, 48), [57, 60, 64]);
});

test('musique : quantification, transposition, vélocité, legato', () => {
  const notes = [makeNote(60, 10, 100, 90), makeNote(62, 250, 50, 90)];
  const q = quantizeNotes(notes, 120);
  assert.deepEqual(q.map((n) => n.start), [0, 240]);
  const half = quantizeNotes(notes, 120, { strength: 0.5 });
  assert.deepEqual(half.map((n) => n.start), [5, 245]);
  const swung = quantizeNotes([makeNote(60, 118, 10)], 120, { swing: 1 });
  assert.equal(swung[0].start, 180);
  assert.deepEqual(transposeNotes(notes, 12).map((n) => n.pitch), [72, 74]);
  assert.equal(transposeNotes([makeNote(125, 0, 1)], 12)[0].pitch, 127);
  assert.deepEqual(changeVelocity(notes, { set: 200 }).map((n) => n.vel), [127, 127]);
  assert.deepEqual(changeVelocity(notes, { add: -100 }).map((n) => n.vel), [1, 1]);
  assert.deepEqual(legatoNotes(notes).map((n) => n.length), [240, 50]);
  assert.deepEqual(fitNotesToScale([makeNote(61, 0, 1)], 0, 'major').map((n) => n.pitch), [60]);
  const h = humanizeNotes(notes, () => 1, { time: 10, vel: 0 });
  assert.deepEqual(h.map((n) => n.start), [20, 260]);
});

test('musique : arpégiateur', () => {
  const chord = [makeNote(60, 0, PPQ, 100), makeNote(64, 0, PPQ, 100), makeNote(67, 0, PPQ, 100)];
  const up = arpeggiate(chord, { mode: 'up', rate: '1/16', octaves: 1, gate: 0.5 });
  assert.deepEqual(up.map((n) => n.pitch), [60, 64, 67, 60]);
  assert.deepEqual(up.map((n) => n.start), [0, 120, 240, 360]);
  assert.equal(up[0].length, 60);
  const down = arpeggiate(chord, { mode: 'down', rate: '1/8', octaves: 2 });
  assert.deepEqual(down.map((n) => n.pitch), [79, 76]);
  const updown = arpeggiate(chord, { mode: 'updown', rate: '1/16' });
  assert.deepEqual(updown.map((n) => n.pitch), [60, 64, 67, 64]);
  assert.equal(arpeggiate(chord, { mode: 'chord', rate: '1/4' }).length, 3);
  assert.deepEqual(arpeggiate([], { mode: 'up' }), []);
});

test('musique : tempo par frappes', () => {
  assert.equal(tapTempo([0]), null);
  assert.equal(tapTempo([0, 0.5, 1, 1.5]), 120);
});

test('projet : régions, répétitions, coupe et jonction', () => {
  const r = createMidiRegion(PPQ * 4, PPQ * 4, [makeNote(60, 0, PPQ), makeNote(62, PPQ * 3, PPQ * 2)]);
  r.loops = 2;
  assert.equal(regionEnd(r, 120), PPQ * 12);
  const all = regionNotes(r);
  assert.equal(all.length, 4);
  assert.equal(all[1].length, PPQ, 'note coupée à la fin de la région');
  assert.equal(all[2].start, PPQ * 8);
  const flat = flattenLoops(r);
  assert.equal(flat.loops, 1);
  assert.equal(flat.length, PPQ * 8);
  assert.equal(flat.notes.length, 4);

  const [a, b] = splitRegion(createMidiRegion(0, PPQ * 4, [makeNote(60, 0, PPQ * 2), makeNote(62, PPQ * 3, PPQ)]), PPQ, 120);
  assert.equal(a.length, PPQ);
  assert.equal(a.notes[0].length, PPQ);
  assert.equal(b.start, PPQ);
  assert.equal(b.notes[0].start, PPQ * 2);
  assert.equal(splitRegion(a, 0, 120), null);

  const joined = joinRegions([a, b]);
  assert.equal(joined.start, 0);
  assert.equal(joined.length, PPQ * 4);
  assert.equal(joined.notes.length, 2);

  const au = createAudioRegion('snd', 0, 2);
  const [l, rr] = splitRegion(au, PPQ, 120);
  assert.equal(l.duration, 0.5);
  assert.equal(rr.offset, 0.5);
  assert.equal(rr.duration, 1.5);
});

test('projet : solo et muet, fader, automation', () => {
  const t1 = createTrack('instrument');
  const t2 = createTrack('audio');
  assert.ok(isAudible(t1, [t1, t2]));
  t2.solo = true;
  assert.ok(!isAudible(t1, [t1, t2]));
  assert.ok(isAudible(t2, [t1, t2]));
  t2.mute = true;
  assert.ok(!isAudible(t2, [t1, t2]));
  assert.equal(faderToDb(0.75), 0);
  assert.equal(faderToDb(1), 6);
  assert.equal(faderToDb(0), -60);
  for (const db of [-40, -12, -3, 0, 3]) assert.ok(Math.abs(faderToDb(dbToFader(db)) - db) < 1e-6);
  const pts = [{ tick: 0, value: 0 }, { tick: 100, value: 10 }];
  assert.equal(automationValue(pts, 50, 3), 5);
  assert.equal(automationValue(pts, 500, 3), 10);
  assert.equal(automationValue([], 50, 3), 3);
});

test('projet : chargement d\'un fichier incomplet', () => {
  const p = normalizeProject({ name: 'X', tracks: [{ kind: 'instrument', instrument: { type: 'inconnu' }, regions: [{ type: 'midi', start: 0, length: 10, notes: [{ pitch: 60, start: 0, length: 5, vel: 90 }] }, { type: 'audio' }] }] });
  assert.equal(p.tracks[0].instrument.type, 'synth');
  assert.equal(p.tracks[0].regions.length, 1);
  assert.ok(p.tracks[0].regions[0].notes[0].id);
  assert.equal(p.buses.length, 2);
  const copy = cloneTrack(p.tracks[0]);
  assert.notEqual(copy.id, p.tracks[0].id);
  assert.notEqual(copy.regions[0].id, p.tracks[0].regions[0].id);
  assert.equal(projectEnd(p), 10);
});

test('catalogue : paramètres cohérents et conversions de bouton', () => {
  for (const [type, inst] of Object.entries(INSTRUMENTS)) {
    for (const d of inst.params) {
      if (d.options) assert.ok(d.options.some((o) => o.value === d.def), `${type}.${d.key}`);
      else assert.ok(d.def >= d.min && d.def <= d.max, `${type}.${d.key} hors bornes`);
    }
    for (const k of inst.smart) assert.ok(inst.params.some((d) => d.key === k), `${type} : commande rapide ${k}`);
    assert.ok(instrumentDefaults(type).volume != null);
  }
  for (const [type, fx] of Object.entries(EFFECTS)) {
    for (const d of fx.params) {
      if (d.options) assert.ok(d.options.some((o) => o.value === d.def), `${type}.${d.key}`);
      else {
        assert.ok(d.def >= d.min && d.def <= d.max, `${type}.${d.key} hors bornes`);
        const n = paramToNorm(d, d.def);
        assert.ok(Math.abs(normToParam({ ...d, step: 0 }, n) - d.def) < 1e-6 * Math.max(1, d.max), `${type}.${d.key} aller-retour`);
      }
      assert.equal(typeof formatParam(d, d.def), 'string');
    }
  }
});

test('historique : annuler / rétablir', () => {
  const h = createHistory(2);
  h.push('A', 'un');
  h.push('B', 'deux');
  h.push('C', 'trois');
  assert.equal(h.undo('D').snapshot, 'C');
  assert.equal(h.undo('C').snapshot, 'B');
  assert.equal(h.undo('B'), null, 'limite respectée');
  assert.equal(h.redo('B').snapshot, 'C');
  h.push('X', 'nouveau');
  assert.ok(!h.canRedo);
});

test('WAV : écriture et relecture 16 / 24 / 32 bits', () => {
  const l = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const r = new Float32Array([0.25, -0.25, 0, 0, 0.1]);
  for (const bits of [16, 24, 32]) {
    const bytes = encodeWav([l, r], 44100, bits);
    assert.equal(bytes.length, 44 + 5 * 2 * bits / 8);
    const back = decodeWav(bytes);
    assert.equal(back.sampleRate, 44100);
    assert.equal(back.channels.length, 2);
    for (let i = 0; i < 5; i++) assert.ok(Math.abs(back.channels[0][i] - l[i]) < 1e-3);
  }
  assert.equal(peakLevel([l, r]), 1);
  const bytes = new Uint8Array([0, 1, 2, 250, 255]);
  assert.deepEqual([...base64ToBytes(bytesToBase64(bytes))], [...bytes]);
});

test('MIDI : export puis import d\'un projet', () => {
  const p = createProject({ bpm: 98, sigNum: 3 });
  const t = createTrack('instrument', { name: 'Piano' });
  t.regions.push(createMidiRegion(PPQ, PPQ * 3, [makeNote(60, 0, PPQ, 100), makeNote(64, PPQ, PPQ * 2, 80)]));
  const d = createTrack('drums');
  d.regions.push(createMidiRegion(0, PPQ * 3, [makeNote(36, 0, 120, 110)]));
  p.tracks.push(t, d, createTrack('audio'));
  const back = readMidi(writeMidi(p));
  assert.equal(back.bpm, 98);
  assert.equal(back.sigNum, 3);
  assert.equal(back.tracks.length, 2);
  assert.equal(back.tracks[0].name, 'Piano');
  assert.deepEqual(back.tracks[0].notes.map((n) => [n.pitch, n.start, n.length, n.vel]), [[60, PPQ, PPQ, 100], [64, PPQ * 2, PPQ * 2, 80]]);
  assert.ok(back.tracks[1].drums);
  assert.throws(() => readMidi(new Uint8Array([1, 2, 3, 4])));
});

test('DSP : réverbe, saturation, aperçu de forme d\'onde', () => {
  const ir = makeReverbIR(8000, 1, 0.5, 0.01);
  assert.equal(ir.length, 2);
  assert.equal(ir[0].length, 8080);
  const head = ir[0].slice(100, 900).reduce((a, x) => a + Math.abs(x), 0);
  const tail = ir[0].slice(7000, 7800).reduce((a, x) => a + Math.abs(x), 0);
  assert.ok(head > tail * 5, 'la réverbe décroît');
  const curve = makeDriveCurve(0.5);
  assert.ok(Math.abs(curve[curve.length - 1] - 1) < 1e-6);
  assert.ok(curve[0] < 0);
  assert.equal(new Set(makeCrushCurve(2)).size, 5);
  const peaks = computePeaks(new Float32Array([0, 1, -1, 0.5]), 2);
  assert.deepEqual([...peaks], [0, 1, -1, 0.5]);
});

test('bibliothèque : préréglages, boucles et modèles valides', () => {
  for (const pr of PRESETS) {
    const inst = INSTRUMENTS[pr.type];
    assert.ok(inst, pr.id);
    for (const k of Object.keys(pr.params)) assert.ok(inst.params.some((d) => d.key === k), `${pr.id}.${k}`);
    const t = trackFromPreset(pr.id);
    assert.equal(t.instrument.type, pr.type);
  }
  const p = createProject({ key: 2, scale: 'minor' });
  for (const loop of LOOPS) {
    const r = loopRegion(p, loop.id, 0, 'pop');
    assert.ok(r.notes.length > 0, loop.id);
    for (const n of r.notes) {
      assert.ok(n.start >= 0 && n.start < r.length, `${loop.id} : note hors région`);
      assert.ok(n.pitch >= 0 && n.pitch <= 127);
    }
  }
  assert.equal(drumPatternNotes('house', 1).filter((n) => n.pitch === 36).length, 4);
  for (const tpl of TEMPLATES) {
    const proj = createFromTemplate(tpl.id);
    assert.ok(proj.tracks.length > 0, tpl.id);
    assert.ok(proj.bpm > 0);
  }
});
