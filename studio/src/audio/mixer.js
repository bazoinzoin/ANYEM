// Console de mixage (graphe Web Audio) : une tranche par piste, deux bus d'effets, la sortie.
//   piste : entrée → effets → volume → panoramique → muet → sortie (+ envois vers les bus)
// `sync(project)` met le graphe en accord avec le projet (ajouts, suppressions, réglages).

import { createInstrument } from './instruments.js';
import { createEffectNode, chainSignature } from './effects.js';
import { dbToGain, isAudible } from '../core/project.js';

function setSmooth(param, value, ctx) {
  param.setTargetAtTime(value, ctx.currentTime, 0.012);
}

function createChain(ctx, input, output) {
  return { ctx, input, output, sig: null, nodes: [], effects: [] };
}

function syncChain(chain, effects, info) {
  const sig = chainSignature(effects);
  const active = effects.filter((e) => e.on);
  if (sig !== chain.sig) {
    try { chain.input.disconnect(); } catch { /* rien */ }
    for (const n of chain.nodes) {
      try { n.output.disconnect(); } catch { /* rien */ }
      if (n.dispose) n.dispose();
    }
    chain.nodes = active.map((e) => createEffectNode(chain.ctx, e, info)).filter(Boolean);
    let prev = chain.input;
    for (const n of chain.nodes) { prev.connect(n.input); prev = n.output; }
    prev.connect(chain.output);
    chain.sig = sig;
  } else {
    active.forEach((e, i) => { if (chain.nodes[i]) chain.nodes[i].update(e.params, info); });
  }
  chain.effects = active;
}

function meterOf(ctx, node) {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  node.connect(analyser);
  return analyser;
}

export function createMixer(ctx, destination, { getBuffer, meters = true } = {}) {
  const info = { bpm: 120 };

  // Sortie
  const masterIn = ctx.createGain();
  const masterPost = ctx.createGain();
  const masterVol = ctx.createGain();
  masterPost.connect(masterVol);
  masterVol.connect(destination);
  const master = { input: masterIn, chain: createChain(ctx, masterIn, masterPost), volume: masterVol, meters: null };
  if (meters) {
    const split = ctx.createChannelSplitter(2);
    masterVol.connect(split);
    const l = ctx.createAnalyser(); l.fftSize = 1024;
    const r = ctx.createAnalyser(); r.fftSize = 1024;
    split.connect(l, 0);
    split.connect(r, 1);
    master.meters = [l, r];
  }

  // Bus d'effets (réverbe, écho) : reçoivent les envois des pistes.
  const buses = [0, 1].map(() => {
    const input = ctx.createGain();
    const post = ctx.createGain();
    const volume = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const mute = ctx.createGain();
    post.connect(volume).connect(pan).connect(mute).connect(masterIn);
    return { id: null, input, chain: createChain(ctx, input, post), volume, pan, mute, meter: meters ? meterOf(ctx, mute) : null };
  });

  const strips = new Map();

  function createStrip(track) {
    const input = ctx.createGain();
    const post = ctx.createGain();
    const volume = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const mute = ctx.createGain();
    post.connect(volume).connect(pan).connect(mute).connect(masterIn);
    const sends = buses.map((bus) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      mute.connect(g).connect(bus.input);
      return g;
    });
    return {
      id: track.id,
      input,
      chain: createChain(ctx, input, post),
      volume, pan, mute, sends,
      meter: meters ? meterOf(ctx, mute) : null,
      instrument: null,
      instKey: '',
      automated: {},
    };
  }

  function disposeStrip(strip) {
    if (strip.instrument) strip.instrument.dispose();
    for (const n of strip.chain.nodes) if (n.dispose) n.dispose();
    try { strip.mute.disconnect(); } catch { /* rien */ }
    for (const s of strip.sends) { try { s.disconnect(); } catch { /* rien */ } }
  }

  return {
    ctx,
    master,
    buses,
    strips,
    info,
    sync(project) {
      info.bpm = project.bpm;
      syncChain(master.chain, project.master.effects, info);
      setSmooth(master.volume.gain, dbToGain(project.master.volume), ctx);
      project.buses.forEach((b, i) => {
        const bus = buses[i];
        if (!bus) return;
        bus.id = b.id;
        syncChain(bus.chain, b.effects, info);
        setSmooth(bus.volume.gain, dbToGain(b.volume), ctx);
        setSmooth(bus.pan.pan, b.pan, ctx);
        setSmooth(bus.mute.gain, b.mute ? 0 : 1, ctx);
      });
      const seen = new Set();
      for (const track of project.tracks) {
        seen.add(track.id);
        let strip = strips.get(track.id);
        if (!strip) { strip = createStrip(track); strips.set(track.id, strip); }
        if (track.instrument) {
          const key = track.instrument.type;
          if (!strip.instrument || strip.instKey !== key) {
            if (strip.instrument) strip.instrument.dispose();
            strip.instrument = createInstrument(ctx, strip.input, track.instrument, getBuffer);
            strip.instKey = key;
          } else strip.instrument.update(track.instrument);
        } else if (strip.instrument) {
          strip.instrument.dispose();
          strip.instrument = null;
          strip.instKey = '';
        }
        syncChain(strip.chain, track.effects, info);
        if (!strip.automated.volume) setSmooth(strip.volume.gain, dbToGain(track.volume), ctx);
        if (!strip.automated.pan) setSmooth(strip.pan.pan, track.pan, ctx);
        strip.sends.forEach((g, i) => { if (!strip.automated[`send${i}`]) setSmooth(g.gain, track.sends[i] || 0, ctx); });
        setSmooth(strip.mute.gain, isAudible(track, project.tracks) ? 1 : 0, ctx);
      }
      for (const [id, strip] of strips) {
        if (!seen.has(id)) { disposeStrip(strip); strips.delete(id); }
      }
    },
    // Paramètre d'une tranche piloté par l'automation (en dB pour le volume).
    automationParam(strip, param) {
      if (param === 'volume') return { param: strip.volume.gain, map: dbToGain };
      if (param === 'pan') return { param: strip.pan.pan, map: (v) => v };
      if (param === 'send0') return { param: strip.sends[0].gain, map: (v) => v };
      if (param === 'send1') return { param: strip.sends[1].gain, map: (v) => v };
      return null;
    },
    dispose() {
      for (const s of strips.values()) disposeStrip(s);
      strips.clear();
    },
  };
}

// Niveau crête d'un analyseur (0-1+).
const scratch = new Float32Array(2048);
export function peakOf(analyser) {
  if (!analyser) return 0;
  const n = analyser.fftSize;
  const buf = n <= scratch.length ? scratch.subarray(0, n) : new Float32Array(n);
  analyser.getFloatTimeDomainData(buf);
  let peak = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(buf[i]); if (a > peak) peak = a; }
  return peak;
}
