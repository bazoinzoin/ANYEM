// Instruments logiciels (Web Audio) : synthétiseur, piano électrique FM, orgue à tirettes,
// boîte à rythmes et échantillonneur. Chaque note jouée = une « voix » qu'on peut couper.
//   play(pitch, vel, time, dur)  note programmée (lecture)
//   noteOn / noteOff             jeu en direct (clavier, contrôleur MIDI)

import { midiToFreq } from '../core/music.js';
import { dbToGain } from '../core/project.js';

const MAX_VOICES = 32;
const noiseCache = new WeakMap();

function noiseBuffer(ctx) {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let s = 22222;
  for (let i = 0; i < len; i++) {
    s = (s * 16807) % 2147483647;
    d[i] = (s / 2147483647) * 2 - 1;
  }
  noiseCache.set(ctx, buf);
  return buf;
}

function noiseSource(ctx, loop = true) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = loop;
  return src;
}

const tc = (x) => Math.max(0.001, x / 3);

// Enveloppe ADSR. dur connu (note programmée) → tout est calculé d'avance ; sinon tenue
// jusqu'à `releaseLive`. Renvoie l'instant où le son s'est éteint (ou null).
function envelope(param, t, dur, env, peak) {
  const a = Math.max(0.001, env.a);
  param.cancelScheduledValues(t);
  param.setValueAtTime(0, t);
  if (dur == null) {
    param.linearRampToValueAtTime(peak, t + a);
    param.setTargetAtTime(peak * env.s, t + a, tc(env.d));
    return null;
  }
  const d = Math.max(0.005, dur);
  const rel = t + d;
  if (d <= a) param.linearRampToValueAtTime((peak * d) / a, rel);
  else {
    param.linearRampToValueAtTime(peak, t + a);
    param.setTargetAtTime(peak * env.s, t + a, tc(env.d));
    const v = peak * env.s + (peak - peak * env.s) * Math.exp(-(d - a) / tc(env.d));
    param.setValueAtTime(v, rel);
  }
  param.setTargetAtTime(0, rel, tc(env.r));
  return rel + env.r * 2.2 + 0.05;
}

function releaseLive(param, now, r) {
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
  else {
    const v = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(v, now);
  }
  param.setTargetAtTime(0, now, tc(r));
  return now + r * 2.2 + 0.05;
}

function velAmount(vel, sens) {
  return 1 - sens + sens * (vel / 127) ** 1.5;
}

function makeVoice(ctx, amp, sources, nodes, pitch, release) {
  const voice = { pitch, amp, sources, nodes, end: Infinity, release, done: false };
  const last = sources[0];
  if (last) {
    last.onended = () => {
      voice.done = true;
      for (const n of nodes) { try { n.disconnect(); } catch { /* déjà déconnecté */ } }
    };
  }
  return voice;
}

function stopSources(voice, at) {
  for (const s of voice.sources) { try { s.stop(at); } catch { /* déjà arrêté */ } }
}

// ---- Synthétiseur soustractif -----------------------------------------------------------

function synthVoice(ctx, out, P, pitch, vel, t, dur, glideFrom) {
  const freq = midiToFreq(pitch);
  const nyq = ctx.sampleRate / 2 - 100;
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = P.filterType || 'lowpass';
  filter.Q.value = P.resonance;
  const mix = ctx.createGain();
  mix.gain.value = 0.32;
  const nodes = [amp, filter, mix];
  const sources = [];
  const oscs = [];

  const addOsc = (type, f, detune, level) => {
    if (level <= 0.001) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.value = level;
    o.connect(g).connect(mix);
    nodes.push(o, g);
    sources.push(o);
    oscs.push(o);
  };
  const ratio2 = 2 ** (P.osc2Semi / 12);
  addOsc(P.osc1, freq, -P.detune / 2, 1 - P.oscMix);
  addOsc(P.osc2, freq * ratio2, P.detune / 2, P.oscMix);
  addOsc('sine', freq / 2, 0, P.sub * 0.9);
  if (P.noise > 0.001) {
    const n = noiseSource(ctx);
    const g = ctx.createGain();
    g.gain.value = P.noise * 0.6;
    n.connect(g).connect(mix);
    nodes.push(n, g);
    sources.push(n);
  }
  if (!sources.length) addOsc('sine', freq, 0, 0.5);

  if (P.glide > 0.001 && glideFrom) {
    for (const o of oscs) {
      const target = o.frequency.value;
      o.frequency.setValueAtTime(target * (glideFrom / freq), t);
      o.frequency.exponentialRampToValueAtTime(target, t + P.glide);
    }
  }
  if (P.vibrato > 0.01) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = P.lfoRate;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(P.vibrato, t + 0.35);
    lfo.connect(depth);
    for (const o of oscs) depth.connect(o.detune);
    nodes.push(lfo, depth);
    sources.push(lfo);
  }

  // Filtre : suit un peu la hauteur de la note, s'ouvre avec l'enveloppe et le toucher.
  const v = velAmount(vel, P.velSens);
  const base = Math.min(nyq, P.cutoff * (freq / 261.6) ** 0.3);
  const peakCut = Math.min(nyq, base * 2 ** (P.envAmount * 7 * (0.5 + v / 2)));
  filter.frequency.setValueAtTime(base, t);
  if (P.envAmount > 0.001) {
    filter.frequency.linearRampToValueAtTime(peakCut, t + Math.max(0.002, P.fAttack));
    filter.frequency.setTargetAtTime(base, t + Math.max(0.002, P.fAttack), tc(P.fDecay));
  }

  mix.connect(filter).connect(amp).connect(out);
  const env = { a: P.attack, d: P.decay, s: P.sustain, r: P.release };
  const end = envelope(amp.gain, t, dur, env, v);
  for (const s of sources) s.start(t);
  const voice = makeVoice(ctx, amp, sources, nodes, pitch, (now) => {
    const e = releaseLive(amp.gain, now, P.release);
    stopSources(voice, e);
    return e;
  });
  if (end != null) { voice.end = end; stopSources(voice, end); }
  return voice;
}

// ---- Piano électrique / cloches (FM) -----------------------------------------------------

function keysVoice(ctx, out, P, pitch, vel, t, dur) {
  const freq = midiToFreq(pitch);
  const v = velAmount(vel, P.velSens);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const car = ctx.createOscillator();
  car.frequency.value = freq;
  const mod = ctx.createOscillator();
  mod.frequency.value = freq * P.ratio;
  const modGain = ctx.createGain();
  const idx = P.index * freq * (0.4 + v * 0.8);
  modGain.gain.setValueAtTime(idx, t);
  modGain.gain.setTargetAtTime(idx * 0.08, t, tc(P.modDecay));
  mod.connect(modGain).connect(car.frequency);
  const level = ctx.createGain();
  level.gain.value = 0.45;
  car.connect(level).connect(amp);
  const nodes = [amp, car, mod, modGain, level];
  const sources = [car, mod];
  if (P.tine > 0.01) {
    const tine = ctx.createOscillator();
    tine.frequency.value = freq * 7.1;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(P.tine * 0.12 * v, t);
    tg.gain.setTargetAtTime(0, t, 0.04);
    tine.connect(tg).connect(amp);
    nodes.push(tine, tg);
    sources.push(tine);
  }
  amp.connect(out);
  // Les notes aiguës s'éteignent plus vite, comme sur un vrai piano.
  const decay = P.decay * Math.min(1.5, (261.6 / freq) ** 0.35);
  const end = envelope(amp.gain, t, dur, { a: P.attack, d: decay, s: P.sustain, r: P.release }, v);
  for (const s of sources) s.start(t);
  const voice = makeVoice(ctx, amp, sources, nodes, pitch, (now) => {
    const e = releaseLive(amp.gain, now, P.release);
    stopSources(voice, e);
    return e;
  });
  if (end != null) { voice.end = end; stopSources(voice, end); }
  return voice;
}

// ---- Orgue à tirettes ----------------------------------------------------------------------

const waveCache = new WeakMap();
// Tirettes (16', 5 1/3', 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1') = harmoniques 1, 3, 2, 4, 6, 8, 10, 12, 16
// d'une fondamentale à l'octave inférieure : une seule onde périodique par réglage.
function organWave(ctx, P) {
  if (!waveCache.has(ctx)) waveCache.set(ctx, new Map());
  const cache = waveCache.get(ctx);
  const bars = [P.d1, P.d2, P.d3, P.d4, P.d5, P.d6, P.d7, P.d8, P.d9].map((x) => Math.round(x || 0));
  const key = bars.join(',');
  if (cache.has(key)) return cache.get(key);
  const harm = [1, 3, 2, 4, 6, 8, 10, 12, 16];
  const real = new Float32Array(17);
  const imag = new Float32Array(17);
  bars.forEach((b, i) => { imag[harm[i]] += (b / 8) ** 1.6; });
  const total = imag.reduce((a, x) => a + x, 0) || 1;
  for (let i = 0; i < imag.length; i++) imag[i] = (imag[i] / total) * 0.9;
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: true });
  cache.set(key, wave);
  if (cache.size > 64) cache.delete(cache.keys().next().value);
  return wave;
}

function organVoice(ctx, out, P, pitch, vel, t, dur) {
  const freq = midiToFreq(pitch);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(organWave(ctx, P));
  osc.frequency.value = freq / 2;
  osc.connect(amp);
  const nodes = [amp, osc];
  const sources = [osc];
  if (P.perc > 0.01) {
    const po = ctx.createOscillator();
    po.frequency.value = freq * 3;
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(P.perc * 0.25, t);
    pg.gain.setTargetAtTime(0, t, 0.08);
    po.connect(pg).connect(amp);
    nodes.push(po, pg);
    sources.push(po);
  }
  if (P.click > 0.01) {
    const n = noiseSource(ctx, false);
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 3000;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(P.click * 0.3, t);
    cg.gain.setTargetAtTime(0, t, 0.004);
    n.connect(hp).connect(cg).connect(amp);
    nodes.push(n, hp, cg);
    sources.push(n);
  }
  amp.connect(out);
  const end = envelope(amp.gain, t, dur, { a: P.attack, d: 0.1, s: 1, r: P.release }, 0.7);
  for (const s of sources) s.start(t);
  const voice = makeVoice(ctx, amp, sources, nodes, pitch, (now) => {
    const e = releaseLive(amp.gain, now, P.release);
    stopSources(voice, e);
    return e;
  });
  if (end != null) { voice.end = end; stopSources(voice, end); }
  return voice;
}

// ---- Échantillonneur ------------------------------------------------------------------------

function samplerVoice(ctx, out, P, pitch, vel, t, dur, buffer) {
  if (!buffer) return keysVoice(ctx, out, { ratio: 1, index: 0.5, modDecay: 0.3, tine: 0, attack: P.attack, decay: P.decay, sustain: P.sustain, release: P.release, velSens: P.velSens }, pitch, vel, t, dur);
  const v = velAmount(vel, P.velSens);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = 2 ** ((pitch - P.root + P.fine / 100) / 12);
  if (P.loop === 'on') { src.loop = true; src.loopStart = 0; src.loopEnd = buffer.duration; }
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(ctx.sampleRate / 2 - 100, P.cutoff);
  src.connect(filter).connect(amp).connect(out);
  const end = envelope(amp.gain, t, dur, { a: P.attack, d: P.decay, s: P.sustain, r: P.release }, v * 0.9);
  src.start(t);
  const voice = makeVoice(ctx, amp, [src], [amp, src, filter], pitch, (now) => {
    const e = releaseLive(amp.gain, now, P.release);
    stopSources(voice, e);
    return e;
  });
  if (end != null) { voice.end = end; stopSources(voice, end); }
  return voice;
}

// ---- Boîte à rythmes ------------------------------------------------------------------------

const KITS = {
  808: { kick: [150, 42, 0.07, 0.9, 0.15], snare: [185, 0.1, 0.17, 1800, 0.55], hat: [0.045, 0.36, 'metal'], tom: 1, metalTone: 1, clap: 0.9, dark: 0 },
  acoustic: { kick: [110, 55, 0.025, 0.32, 0.7], snare: [200, 0.08, 0.24, 1200, 0.75], hat: [0.06, 0.45, 'noise'], tom: 1.2, metalTone: 0.8, clap: 0.7, dark: 0.1 },
  electro: { kick: [230, 48, 0.045, 0.42, 0.5], snare: [220, 0.07, 0.15, 2500, 0.7], hat: [0.035, 0.25, 'metal'], tom: 0.9, metalTone: 1.3, clap: 1, dark: 0 },
  lofi: { kick: [120, 45, 0.05, 0.5, 0.3], snare: [180, 0.09, 0.16, 900, 0.6], hat: [0.04, 0.3, 'noise'], tom: 1, metalTone: 0.7, clap: 0.8, dark: 0.6 },
};

function drumHit(ctx, out, P, pitch, vel, t, state) {
  const kit = KITS[P.kit] || KITS['808'];
  const tune = 2 ** (P.tune / 12);
  const dm = P.decay;
  const v = (vel / 127) ** 1.2;
  const bright = 0.4 + P.tone * 1.2 - kit.dark * 0.4;
  const amp = ctx.createGain();
  amp.gain.value = 0;
  amp.connect(out);
  const nodes = [amp];
  const sources = [];
  let end = t + 0.1;

  const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; nodes.push(o); sources.push(o); return o; };
  const noise = () => { const n = noiseSource(ctx); nodes.push(n); sources.push(n); return n; };
  const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = Math.min(ctx.sampleRate / 2 - 100, f); b.Q.value = q; nodes.push(b); return b; };
  const gain = (g) => { const x = ctx.createGain(); x.gain.value = g; nodes.push(x); return x; };
  const decayEnv = (param, peak, d, attack = 0.001) => {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.setTargetAtTime(0, t + attack, d / 4);
    end = Math.max(end, t + d * 1.6 + 0.05);
  };
  const metal = (decay, hp, level) => {
    const g = gain(0);
    for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) osc('square', f * tune * kit.metalTone).connect(g);
    const bp = filt('bandpass', 10000 * bright, 1);
    const h = filt('highpass', hp * Math.min(1.3, bright));
    g.connect(bp).connect(h).connect(amp);
    decayEnv(g.gain, level, decay);
  };
  const noisy = (decay, hp, level, type = 'highpass') => {
    const g = gain(0);
    noise().connect(filt(type, hp, type === 'bandpass' ? 1.2 : 0.7)).connect(g).connect(amp);
    decayEnv(g.gain, level, decay);
  };
  const tom = (f) => {
    const o = osc('sine', f * tune * kit.tom);
    o.frequency.setValueAtTime(f * tune * kit.tom * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(f * tune * kit.tom, t + 0.05);
    const g = gain(0);
    o.connect(g).connect(amp);
    decayEnv(g.gain, 0.9, 0.45 * dm);
    noisy(0.05, 2000, 0.15 * bright);
  };

  amp.gain.setValueAtTime(v, t);
  switch (pitch) {
    case 35: case 36: {
      const [f0, f1, pd, d, click] = kit.kick;
      const o = osc('sine', f0 * tune);
      o.frequency.setValueAtTime(f0 * tune * (1 + P.punch * 0.6), t);
      o.frequency.exponentialRampToValueAtTime(f1 * tune, t + pd);
      const g = gain(0);
      const sat = ctx.createWaveShaper();
      sat.curve = new Float32Array([-0.9, -0.6, 0, 0.6, 0.9]);
      nodes.push(sat);
      o.connect(g).connect(sat).connect(amp);
      decayEnv(g.gain, 1, d * dm);
      if (click > 0) noisy(0.008, 1500, click * (0.4 + P.punch * 0.6), 'bandpass');
      break;
    }
    case 37: noisy(0.02, 1800, 0.6, 'bandpass'); { const o = osc('triangle', 820 * tune); const g = gain(0); o.connect(g).connect(amp); decayEnv(g.gain, 0.5, 0.03); } break;
    case 38: case 40: {
      const [tone, td, nd, hp, nl] = kit.snare;
      const o = osc('triangle', tone * tune);
      o.frequency.setValueAtTime(tone * tune * 1.5, t);
      o.frequency.exponentialRampToValueAtTime(tone * tune, t + 0.02);
      const g = gain(0);
      o.connect(g).connect(amp);
      decayEnv(g.gain, 0.7 * (0.6 + P.punch * 0.6), td * dm);
      noisy(nd * dm, hp * bright, nl);
      break;
    }
    case 39: {
      const g = gain(0);
      noise().connect(filt('bandpass', 1300 * bright, 1.5)).connect(g).connect(amp);
      g.gain.setValueAtTime(0, t);
      for (let k = 0; k < 3; k++) {
        g.gain.setValueAtTime(kit.clap, t + k * 0.011);
        g.gain.setTargetAtTime(0, t + k * 0.011 + 0.001, 0.003);
      }
      g.gain.setValueAtTime(kit.clap, t + 0.034);
      g.gain.setTargetAtTime(0, t + 0.035, 0.06 * dm);
      end = t + 0.5 * dm + 0.1;
      break;
    }
    case 42: case 44:
      if (state.openHat) { try { state.openHat.gain.cancelScheduledValues(t); state.openHat.gain.setTargetAtTime(0, t, 0.005); } catch { /* déjà fini */ } state.openHat = null; }
      if (kit.hat[2] === 'metal') metal(kit.hat[0] * dm, 7000, 0.55);
      else noisy(kit.hat[0] * dm, 7000 * bright, 0.5);
      break;
    case 46:
      if (kit.hat[2] === 'metal') metal(kit.hat[1] * dm, 7000, 0.5);
      else noisy(kit.hat[1] * dm, 6500 * bright, 0.45);
      state.openHat = amp;
      break;
    case 41: case 43: tom(95); break;
    case 45: case 47: tom(130); break;
    case 48: case 50: tom(175); break;
    case 49: case 57: metal(1.6 * dm, 4000, 0.45); noisy(1.4 * dm, 5000 * bright, 0.25); break;
    case 51: case 59: metal(0.9 * dm, 6000, 0.3); { const o = osc('sine', 2900 * tune); const g = gain(0); o.connect(g).connect(amp); decayEnv(g.gain, 0.08, 0.8 * dm); } break;
    case 56: {
      const g = gain(0);
      osc('square', 540 * tune).connect(g);
      osc('square', 800 * tune).connect(g);
      g.connect(filt('bandpass', 2000, 2)).connect(amp);
      decayEnv(g.gain, 0.5, 0.25 * dm);
      break;
    }
    case 54: case 69: case 70: case 82: noisy(0.06 * dm, 5000 * bright, 0.4, 'highpass'); break;
    default: tom(midiToFreq(pitch) / 2);
  }
  for (const s of sources) s.start(t);
  for (const s of sources) s.stop(end);
  const voice = makeVoice(ctx, amp, sources, nodes, pitch, () => end);
  voice.end = end;
  return voice;
}

// ---- Instrument ------------------------------------------------------------------------------

export function createInstrument(ctx, destination, def, getBuffer) {
  const output = ctx.createGain();
  // Modulation d'ensemble : trémolo (piano électrique) ou cabine tournante (orgue).
  const modGain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  output.connect(modGain).connect(panner).connect(destination);
  const lfo = ctx.createOscillator();
  const lfoToGain = ctx.createGain();
  const lfoToPan = ctx.createGain();
  lfoToGain.gain.value = 0;
  lfoToPan.gain.value = 0;
  lfo.connect(lfoToGain).connect(modGain.gain);
  lfo.connect(lfoToPan).connect(panner.pan);
  lfo.start();

  const inst = {
    type: def.type,
    params: { ...def.params },
    sampleId: def.sampleId || null,
    voices: [],
    held: new Map(),
    drumState: { openHat: null },
    lastFreq: null,
  };

  function applyParams() {
    const P = inst.params;
    const now = ctx.currentTime;
    output.gain.setTargetAtTime(dbToGain(P.volume ?? 0), now, 0.02);
    let depth = 0;
    let pan = 0;
    let rate = 4.5;
    if (inst.type === 'keys') { depth = (P.tremolo || 0) * 0.45; rate = 4.5; }
    if (inst.type === 'organ') { depth = (P.rotary || 0) * 0.25; pan = (P.rotary || 0) * 0.6; rate = P.rotarySpeed || 1.2; }
    lfo.frequency.setTargetAtTime(rate, now, 0.3);
    lfoToGain.gain.setTargetAtTime(depth, now, 0.02);
    modGain.gain.setTargetAtTime(1 - depth, now, 0.02);
    lfoToPan.gain.setTargetAtTime(pan, now, 0.02);
  }
  applyParams();

  function purge() {
    const now = ctx.currentTime;
    inst.voices = inst.voices.filter((v) => !v.done && v.end > now - 0.05);
    while (inst.voices.length > MAX_VOICES) {
      const v = inst.voices.shift();
      kill(v, now);
    }
  }

  function kill(v, now) {
    try {
      v.amp.gain.cancelScheduledValues(now);
      v.amp.gain.setTargetAtTime(0, now, 0.008);
    } catch { /* voix déjà terminée */ }
    stopSources(v, now + 0.05);
    v.end = now + 0.05;
  }

  function startVoice(pitch, vel, t, dur) {
    const P = inst.params;
    let v;
    switch (inst.type) {
      case 'keys': v = keysVoice(ctx, output, P, pitch, vel, t, dur); break;
      case 'organ': v = organVoice(ctx, output, P, pitch, vel, t, dur); break;
      case 'drums': v = drumHit(ctx, output, P, pitch, vel, t, inst.drumState); break;
      case 'sampler': v = samplerVoice(ctx, output, P, pitch, vel, t, dur, inst.sampleId && getBuffer ? getBuffer(inst.sampleId) : null); break;
      default: v = synthVoice(ctx, output, P, pitch, vel, t, dur, inst.lastFreq);
    }
    inst.lastFreq = midiToFreq(pitch);
    inst.voices.push(v);
    purge();
    return v;
  }

  return {
    get type() { return inst.type; },
    get sampleId() { return inst.sampleId; },
    play(pitch, vel, t, dur) {
      startVoice(pitch, vel, Math.max(t, ctx.currentTime), dur);
    },
    noteOn(pitch, vel, t = ctx.currentTime) {
      if (inst.held.has(pitch)) inst.held.get(pitch).release(t);
      const v = startVoice(pitch, vel, t, inst.type === 'drums' ? 0.1 : null);
      if (inst.type !== 'drums') inst.held.set(pitch, v);
    },
    noteOff(pitch, t = ctx.currentTime) {
      const v = inst.held.get(pitch);
      if (!v) return;
      inst.held.delete(pitch);
      v.end = v.release(t);
    },
    // Coupe tout (arrêt de la lecture) : les notes programmées dans le futur aussi.
    allOff(t = ctx.currentTime) {
      for (const v of inst.voices) kill(v, t);
      inst.voices = [];
      inst.held.clear();
    },
    update(next) {
      inst.params = { ...next.params };
      inst.sampleId = next.sampleId || null;
      applyParams();
    },
    dispose() {
      this.allOff();
      try { lfo.stop(); } catch { /* déjà arrêté */ }
      setTimeout(() => { try { panner.disconnect(); } catch { /* rien */ } }, 200);
    },
  };
}
