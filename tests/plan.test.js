import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PPQ } from '../src/core/time.js';
import { createProject, createTrack, createMidiRegion, createAudioRegion } from '../src/core/project.js';
import { makeNote } from '../src/core/music.js';
import { buildPlan, eventsIn, metronomeBeats, automationAt } from '../src/core/plan.js';
import { chainSignature, STRUCTURAL } from '../src/audio/effects.js';
import { createEffect } from '../src/core/project.js';
import { EFFECTS } from '../src/core/defs.js';

test('plan : notes en secondes, régions muettes ignorées, répétitions', () => {
  const p = createProject({ bpm: 120 });
  const t = createTrack('instrument');
  const r = createMidiRegion(PPQ * 4, PPQ * 4, [makeNote(60, 0, PPQ, 100)]);
  r.loops = 2;
  const muted = createMidiRegion(0, PPQ, [makeNote(62, 0, PPQ)]);
  muted.mute = true;
  t.regions.push(r, muted);
  const a = createTrack('audio');
  a.regions.push(createAudioRegion('snd', PPQ * 2, 1.5));
  a.automation.volume = [{ tick: 0, value: -6 }, { tick: PPQ * 4, value: 0 }];
  p.tracks.push(t, a);
  const plan = buildPlan(p);
  assert.deepEqual(plan.tracks[0].notes.map((n) => [n.t, n.d, n.pitch]), [[2, 0.5, 60], [4, 0.5, 60]]);
  assert.equal(plan.tracks[1].audio[0].t, 1);
  assert.equal(plan.tracks[1].audio[0].d, 1.5);
  assert.deepEqual(plan.tracks[1].automation.volume, [{ t: 0, value: -6 }, { t: 2, value: 0 }]);
  assert.equal(automationAt(plan.tracks[1].automation.volume, 1), -3);
  assert.deepEqual(eventsIn(plan.tracks[0].notes, 2, 4).map((n) => n.t), [2]);
  assert.deepEqual(eventsIn(plan.tracks[0].notes, 2.1, 10).map((n) => n.t), [4]);
});

test('plan : l\'arpégiateur transforme les accords, pas la batterie', () => {
  const p = createProject({ bpm: 120 });
  const t = createTrack('instrument');
  t.instrument.arp = { on: true, mode: 'up', rate: '1/8', octaves: 1, gate: 1 };
  t.regions.push(createMidiRegion(0, PPQ, [makeNote(60, 0, PPQ), makeNote(64, 0, PPQ)]));
  const d = createTrack('drums');
  d.instrument.arp = { on: true, mode: 'up', rate: '1/8', octaves: 1, gate: 1 };
  d.regions.push(createMidiRegion(0, PPQ, [makeNote(36, 0, 120), makeNote(42, 0, 120)]));
  p.tracks.push(t, d);
  const plan = buildPlan(p);
  assert.deepEqual(plan.tracks[0].notes.map((n) => n.pitch), [60, 64]);
  assert.deepEqual(plan.tracks[0].notes.map((n) => n.t), [0, 0.25]);
  assert.equal(plan.tracks[1].notes.length, 2);
  assert.ok(plan.tracks[1].notes.every((n) => n.t === 0));
});

test('métronome : temps forts au début de chaque mesure', () => {
  const p = createProject({ bpm: 120, sigNum: 3 });
  const beats = metronomeBeats(p, 0, 3);
  assert.deepEqual(beats.map((b) => b.t), [0, 0.5, 1, 1.5, 2, 2.5]);
  assert.deepEqual(beats.map((b) => b.accent), [true, false, false, true, false, false]);
  const pre = metronomeBeats(p, -1.5, 0);
  assert.deepEqual(pre.map((b) => b.accent), [true, false, false], 'le décompte commence aussi par un temps fort');
});

test('effets : la chaîne n\'est reconstruite que si sa structure change', () => {
  const eq = createEffect('eq');
  const delay = createEffect('delay');
  const sig = chainSignature([eq, delay]);
  delay.params.mix = 0.9;
  assert.equal(chainSignature([eq, delay]), sig, 'un réglage ne change pas la structure');
  delay.params.pingpong = 'off';
  assert.notEqual(chainSignature([eq, delay]), sig);
  eq.on = false;
  assert.ok(!chainSignature([eq, delay]).includes(eq.id), 'effet éteint retiré de la chaîne');
  for (const [type, keys] of Object.entries(STRUCTURAL)) {
    for (const k of keys) assert.ok(EFFECTS[type].params.some((d) => d.key === k), `${type}.${k}`);
  }
});
