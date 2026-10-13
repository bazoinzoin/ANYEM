// Moteur audio : transport (lecture, boucle, métronome, décompte), programmation des notes
// et des sons un peu en avance (« lookahead »), jeu en direct, vu-mètres et rendu hors ligne
// (export WAV) avec exactement le même graphe que la lecture.

import { createMixer, peakOf } from './mixer.js';
import { createInstrument } from './instruments.js';
import { buildPlan, eventsIn, metronomeBeats, automationAt } from '../core/plan.js';
import { ticksToSeconds, secondsToTicks, ticksPerBar } from '../core/time.js';

const LOOKAHEAD = 0.15;
const INTERVAL = 25;

let ctx = null;
let mixer = null;
let metroGain = null;
let project = null;
let plan = null;
let planDirty = true;
const buffers = new Map();
const reversed = new Map();

const transport = {
  playing: false,
  segments: [],
  nextSong: 0,
  timer: null,
  sources: new Set(),
  forceMetronome: false,
  ignoreLoop: false,
  countInUntil: -Infinity,
};

export function audioContext() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    mixer = createMixer(ctx, ctx.destination, { getBuffer, meters: true });
    metroGain = ctx.createGain();
    metroGain.connect(ctx.destination);
    if (project) mixer.sync(project);
  }
  return ctx;
}

export async function resumeAudio() {
  const c = audioContext();
  if (c.state !== 'running') await c.resume();
  return c;
}

export function getBuffer(id) {
  return buffers.get(id) || null;
}

export function setBuffer(id, buffer) {
  buffers.set(id, buffer);
  reversed.delete(id);
}

export function hasBuffer(id) {
  return buffers.has(id);
}

export function bufferIds() {
  return [...buffers.keys()];
}

function reversedBuffer(c, id) {
  const key = `${id}@${c.sampleRate}`;
  if (reversed.has(key)) return reversed.get(key);
  const src = buffers.get(id);
  if (!src) return null;
  const out = c.createBuffer(src.numberOfChannels, src.length, src.sampleRate);
  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    const d = src.getChannelData(ch).slice().reverse();
    out.copyToChannel(d, ch);
  }
  reversed.set(key, out);
  return out;
}

// À appeler après chaque modification du projet.
export function setProject(next) {
  project = next;
  planDirty = true;
  if (mixer) mixer.sync(project);
  if (metroGain && project) metroGain.gain.value = project.metronome.volume ?? 0.6;
}

function currentPlan() {
  if (planDirty || !plan) { plan = buildPlan(project); planDirty = false; }
  return plan;
}

// ---- Programmation ------------------------------------------------------------------------

function click(c, dest, t, accent, sources) {
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = accent ? 1760 : 1175;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(accent ? 0.35 : 0.22, t + 0.001);
  g.gain.setTargetAtTime(0, t + 0.002, 0.012);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.08);
  if (sources) {
    sources.add(o);
    o.onended = () => { sources.delete(o); g.disconnect(); };
  }
}

function startAudio(m, item, at, from, sources) {
  const c = m.ctx;
  const strip = m.strips.get(item.trackId);
  const buffer = item.reverse ? reversedBuffer(c, item.audioId) : buffers.get(item.audioId);
  if (!strip || !buffer) return;
  const skip = Math.max(0, from);
  const dur = item.d - skip;
  if (dur <= 0.001) return;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  src.connect(g).connect(strip.input);
  // Fondus d'entrée et de sortie (en secondes à partir du début de la région).
  const t0 = at - skip;
  g.gain.setValueAtTime(item.fadeIn > skip ? item.gain * (skip / item.fadeIn) : item.gain, at);
  if (item.fadeIn > skip) g.gain.linearRampToValueAtTime(item.gain, t0 + item.fadeIn);
  if (item.fadeOut > 0) {
    const fs = Math.max(at, t0 + item.d - item.fadeOut);
    g.gain.setValueAtTime(item.gain, fs);
    g.gain.linearRampToValueAtTime(0, t0 + item.d);
  }
  const offset = item.reverse ? Math.max(0, buffer.duration - item.offset - item.d) + skip : item.offset + skip;
  src.start(at, offset, dur);
  if (sources) {
    sources.add(src);
    src.onended = () => { sources.delete(src); g.disconnect(); };
  }
}

// Programme tout ce qui commence dans [s0, s1) (secondes du morceau). `toCtx` convertit vers
// l'horloge audio. `jump` = on arrive à s0 par un saut (début, boucle) : sons déjà commencés
// repris en cours de route, automation remise à sa valeur.
function scheduleRange(m, proj, pl, s0, s1, toCtx, opts) {
  const loopEnd = opts.loopEnd;
  for (const tp of pl.tracks) {
    const strip = m.strips.get(tp.trackId);
    if (!strip) continue;
    if (strip.instrument) {
      for (const n of eventsIn(tp.notes, s0, s1)) {
        let d = n.d;
        if (loopEnd != null && n.t + d > loopEnd) d = Math.max(0.01, loopEnd - n.t);
        strip.instrument.play(n.pitch, n.vel, toCtx(n.t), d);
      }
    }
    if (opts.jump) {
      for (const a of tp.audio) {
        if (a.t < s0 && a.t + a.d > s0) startAudio(m, { ...a, trackId: tp.trackId }, toCtx(s0), s0 - a.t, opts.sources);
      }
    }
    for (const a of eventsIn(tp.audio, s0, s1)) startAudio(m, { ...a, trackId: tp.trackId }, toCtx(a.t), 0, opts.sources);
    for (const [param, points] of Object.entries(tp.automation)) {
      const target = m.automationParam(strip, param);
      if (!target) continue;
      strip.automated[param] = true;
      if (opts.jump) {
        target.param.cancelScheduledValues(toCtx(s0));
        target.param.setValueAtTime(target.map(automationAt(points, s0)), toCtx(s0));
      }
      for (const p of points) {
        if (p.t >= s0 && p.t < s1) target.param.linearRampToValueAtTime(target.map(p.value), toCtx(p.t));
      }
    }
  }
  if (opts.metronome) {
    for (const b of metronomeBeats(proj, s0, s1)) click(m.ctx, opts.metroDest, toCtx(b.t), b.accent, opts.sources);
  }
}

function loopBounds() {
  if (!project.loop.on || transport.ignoreLoop) return null;
  const a = ticksToSeconds(project.loop.start, project.bpm);
  const b = ticksToSeconds(project.loop.end, project.bpm);
  return b - a > 0.05 ? [a, b] : null;
}

function pump() {
  if (!transport.playing) return;
  const horizon = ctx.currentTime + LOOKAHEAD;
  const pl = currentPlan();
  let guard = 0;
  while (guard++ < 16) {
    const seg = transport.segments[transport.segments.length - 1];
    const toCtx = (s) => seg.ctx + (s - seg.song);
    let s0 = transport.nextSong;
    if (toCtx(s0) >= horizon) break;
    let s1 = s0 + (horizon - toCtx(s0));
    // Décompte : seulement le métronome, la musique attend la fin du décompte.
    if (s0 < transport.countInUntil) {
      const e = Math.min(s1, transport.countInUntil);
      for (const b of metronomeBeats(project, s0, e)) click(ctx, metroGain, toCtx(b.t), b.accent, transport.sources);
      if (s1 <= transport.countInUntil) { transport.nextSong = s1; continue; }
      s0 = transport.countInUntil;
    }
    const loop = loopBounds();
    const opts = { sources: transport.sources, metronome: project.metronome.on || transport.forceMetronome, metroDest: metroGain, loopEnd: loop ? loop[1] : null };
    if (loop && s0 < loop[1] && s1 >= loop[1]) {
      s1 = loop[1];
      scheduleRange(mixer, project, pl, s0, s1, toCtx, opts);
      transport.segments.push({ ctx: toCtx(loop[1]), song: loop[0] });
      if (transport.segments.length > 8) transport.segments.splice(0, transport.segments.length - 8);
      transport.nextSong = loop[0];
      const seg2 = transport.segments[transport.segments.length - 1];
      scheduleRange(mixer, project, pl, loop[0], loop[0], (s) => seg2.ctx + (s - seg2.song), { ...opts, jump: true, metronome: false });
    } else {
      scheduleRange(mixer, project, pl, s0, s1, toCtx, opts);
      transport.nextSong = s1;
    }
  }
}

// ---- Transport ------------------------------------------------------------------------------

// Lance la lecture à `fromTick`. countInBars > 0 : décompte au métronome avant.
export async function play(fromTick, { countInBars = 0, ignoreLoop = false } = {}) {
  await resumeAudio();
  if (transport.playing) stop();
  mixer.sync(project);
  const startSong = ticksToSeconds(fromTick, project.bpm);
  const pre = countInBars > 0 ? ticksToSeconds(ticksPerBar(project) * countInBars, project.bpm) : 0;
  const t0 = ctx.currentTime + 0.06;
  transport.ignoreLoop = ignoreLoop;
  transport.countInUntil = pre > 0 ? startSong : -Infinity;
  transport.segments = [{ ctx: t0 + pre, song: startSong }];
  transport.nextSong = startSong - pre;
  transport.playing = true;
  const pl = currentPlan();
  const seg = transport.segments[0];
  scheduleRange(mixer, project, pl, startSong, startSong, (s) => seg.ctx + (s - seg.song), { jump: true, sources: transport.sources, loopEnd: null });
  pump();
  transport.timer = setInterval(pump, INTERVAL);
}

export function stop() {
  if (!ctx) return;
  transport.playing = false;
  clearInterval(transport.timer);
  transport.timer = null;
  const now = ctx.currentTime;
  for (const s of transport.sources) { try { s.stop(now + 0.02); } catch { /* déjà arrêté */ } }
  transport.sources.clear();
  for (const strip of mixer.strips.values()) {
    if (strip.instrument) strip.instrument.allOff(now);
    for (const param of Object.keys(strip.automated)) {
      const target = mixer.automationParam(strip, param);
      if (target) target.param.cancelScheduledValues(now);
    }
    strip.automated = {};
  }
  mixer.sync(project);
}

export function isPlaying() {
  return transport.playing;
}

// Position actuelle de la lecture (secondes du morceau), décompte compris (négatif).
export function playheadSeconds() {
  if (!transport.playing || !ctx) return null;
  const now = ctx.currentTime;
  let seg = transport.segments[0];
  for (const s of transport.segments) if (s.ctx <= now) seg = s;
  return seg.song + (now - seg.ctx);
}

// Position du morceau à un instant de l'horloge audio (calage des enregistrements).
export function songSecondsAt(ctxTime) {
  if (!transport.segments.length) return null;
  let seg = transport.segments[0];
  for (const s of transport.segments) if (s.ctx <= ctxTime) seg = s;
  return seg.song + (ctxTime - seg.ctx);
}

export function playheadTicks() {
  const s = playheadSeconds();
  return s == null ? null : secondsToTicks(s, project.bpm);
}

// Latence de sortie (pour caler les enregistrements).
export function outputLatency() {
  if (!ctx) return 0;
  return (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
}

// ---- Jeu en direct --------------------------------------------------------------------------

function stripOf(trackId) {
  audioContext();
  return mixer.strips.get(trackId) || null;
}

export function liveNoteOn(trackId, pitch, vel = 100) {
  const s = stripOf(trackId);
  if (s && s.instrument) { resumeAudio(); s.instrument.noteOn(pitch, vel); }
}

export function liveNoteOff(trackId, pitch) {
  const s = stripOf(trackId);
  if (s && s.instrument) s.instrument.noteOff(pitch);
}

// Écoute rapide (clic sur le clavier du piano roll, boucles de la bibliothèque).
export function previewNotes(trackId, pitches, vel = 100, dur = 0.4) {
  const s = stripOf(trackId);
  if (!s || !s.instrument) return;
  resumeAudio();
  const t = ctx.currentTime + 0.01;
  for (const p of pitches) s.instrument.play(p, vel, t, dur);
}

// Écoute d'une boucle de la bibliothèque avec un instrument temporaire (sans piste).
let previewInst = null;
export async function previewSequence(instrumentDef, notes, bpm, maxSeconds = 8) {
  await resumeAudio();
  stopPreviewSequence();
  previewInst = createInstrument(ctx, mixer.master.input, instrumentDef, getBuffer);
  const t0 = ctx.currentTime + 0.05;
  for (const n of notes) {
    const t = ticksToSeconds(n.start, bpm);
    if (t > maxSeconds) continue;
    previewInst.play(n.pitch, n.vel, t0 + t, ticksToSeconds(n.length, bpm));
  }
  const inst = previewInst;
  setTimeout(() => { if (previewInst === inst) stopPreviewSequence(); }, (maxSeconds + 2) * 1000);
}

export function stopPreviewSequence() {
  if (previewInst) { previewInst.dispose(); previewInst = null; }
}

export function allNotesOff() {
  if (!mixer) return;
  for (const strip of mixer.strips.values()) if (strip.instrument) strip.instrument.allOff();
}

// ---- Vu-mètres ------------------------------------------------------------------------------

export function meterLevels() {
  if (!mixer) return null;
  const tracks = {};
  for (const [id, strip] of mixer.strips) tracks[id] = peakOf(strip.meter);
  const buses = mixer.buses.map((b) => peakOf(b.meter));
  const master = mixer.master.meters ? mixer.master.meters.map(peakOf) : [0, 0];
  const reduction = mixer.master.chain.nodes.reduce((acc, n) => Math.min(acc, n.reduction ? n.reduction() : 0), 0);
  return { tracks, buses, master, reduction };
}

// ---- Rendu hors ligne (export) ---------------------------------------------------------------

// Rend [fromTick, toTick) du projet (ou d'une seule piste : soloTrackId) → AudioBuffer stéréo.
export async function renderOffline(proj, { fromTick, toTick, sampleRate = 44100, tail = 2, soloTrackId = null } = {}) {
  let p = proj;
  if (soloTrackId) {
    p = JSON.parse(JSON.stringify(proj));
    for (const t of p.tracks) { t.solo = t.id === soloTrackId; t.mute = t.id !== soloTrackId; }
  }
  const s0 = ticksToSeconds(fromTick, p.bpm);
  const s1 = ticksToSeconds(toTick, p.bpm);
  const length = Math.max(1, Math.ceil((s1 - s0 + tail) * sampleRate));
  const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const octx = new OAC(2, length, sampleRate);
  const m = createMixer(octx, octx.destination, { getBuffer, meters: false });
  m.sync(p);
  const pl = buildPlan(p);
  scheduleRange(m, p, pl, s0, s1, (s) => s - s0, { jump: true, loopEnd: null, sources: null, metronome: false });
  const out = await octx.startRendering();
  m.dispose();
  return out;
}

// Décodage d'un fichier audio (wav, mp3, ogg, flac, m4a…).
export async function decodeAudio(arrayBuffer) {
  const c = audioContext();
  return c.decodeAudioData(arrayBuffer);
}
