// Effets d'insert (Web Audio). Chaque effet : { input, output, update(params, info), dispose() }.
// `info` = { bpm } (échos synchronisés sur le tempo).

import { makeReverbIR, makeDriveCurve, makeCrushCurve } from '../core/dsp.js';
import { noteValueTicks, ticksToSeconds } from '../core/time.js';
import { dbToGain } from '../core/project.js';

// Réglages qui changent la structure de l'effet : l'effet est reconstruit s'ils changent.
export const STRUCTURAL = { delay: ['pingpong'], tremolo: ['mode'] };

const irCache = new Map();
function reverbBuffer(ctx, size, damping, predelay) {
  const key = `${ctx.sampleRate}:${size.toFixed(2)}:${damping.toFixed(2)}:${predelay.toFixed(3)}`;
  if (irCache.has(key)) return irCache.get(key);
  const data = makeReverbIR(ctx.sampleRate, size, damping, predelay);
  const buf = ctx.createBuffer(2, data[0].length, ctx.sampleRate);
  buf.copyToChannel(data[0], 0);
  buf.copyToChannel(data[1], 1);
  irCache.set(key, buf);
  if (irCache.size > 24) irCache.delete(irCache.keys().next().value);
  return buf;
}

const curveCache = new Map();
function cachedCurve(key, make) {
  if (!curveCache.has(key)) curveCache.set(key, make());
  return curveCache.get(key);
}

function set(param, value, ctx) {
  if (!Number.isFinite(value)) return;
  param.setTargetAtTime(value, ctx.currentTime, 0.015);
}

// Structure commune : entrée → (sec) + (traité) → sortie, dosage à puissance constante.
function wetDry(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.connect(dry).connect(output);
  wet.connect(output);
  return {
    input, output, dry, wet,
    mix(m) {
      set(dry.gain, Math.cos((m * Math.PI) / 2), ctx);
      set(wet.gain, Math.sin((m * Math.PI) / 2), ctx);
    },
  };
}

function lfo(ctx, rate) {
  const o = ctx.createOscillator();
  o.frequency.value = rate;
  o.start();
  return o;
}

const builders = {
  eq(ctx) {
    const input = ctx.createGain();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.Q.value = 0.707;
    const lo = ctx.createBiquadFilter(); lo.type = 'lowshelf';
    const mid = ctx.createBiquadFilter(); mid.type = 'peaking';
    const hi = ctx.createBiquadFilter(); hi.type = 'highshelf';
    input.connect(hp).connect(lo).connect(mid).connect(hi);
    return {
      input, output: hi,
      update(P) {
        set(hp.frequency, P.lowCut, ctx);
        set(lo.frequency, P.lowFreq, ctx); set(lo.gain, P.lowGain, ctx);
        set(mid.frequency, P.midFreq, ctx); set(mid.gain, P.midGain, ctx); set(mid.Q, P.midQ, ctx);
        set(hi.frequency, P.highFreq, ctx); set(hi.gain, P.highGain, ctx);
      },
    };
  },
  comp(ctx) {
    const input = ctx.createGain();
    const c = ctx.createDynamicsCompressor();
    const out = ctx.createGain();
    input.connect(c).connect(out);
    return {
      input, output: out,
      update(P) {
        set(c.threshold, P.threshold, ctx); set(c.ratio, P.ratio, ctx); set(c.knee, P.knee, ctx);
        set(c.attack, P.attack / 1000, ctx); set(c.release, P.release / 1000, ctx);
        set(out.gain, dbToGain(P.makeup), ctx);
      },
      reduction: () => c.reduction,
    };
  },
  reverb(ctx) {
    const w = wetDry(ctx);
    const conv = ctx.createConvolver();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120;
    w.input.connect(hp).connect(conv).connect(w.wet);
    let key = '';
    return {
      input: w.input, output: w.output,
      update(P) {
        const k = `${P.size}:${P.damping}:${P.predelay}`;
        if (k !== key) { key = k; conv.buffer = reverbBuffer(ctx, P.size, P.damping, P.predelay / 1000); }
        w.mix(P.mix);
      },
    };
  },
  delay(ctx, P0) {
    const w = wetDry(ctx);
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass';
    const fb = ctx.createGain();
    const dl = ctx.createDelay(4);
    const dr = ctx.createDelay(4);
    if (P0.pingpong === 'on') {
      const merger = ctx.createChannelMerger(2);
      const mono = ctx.createGain();
      mono.channelCount = 1; mono.channelCountMode = 'explicit';
      w.input.connect(mono).connect(tone).connect(dl);
      dl.connect(merger, 0, 0);
      dl.connect(dr);
      dr.connect(merger, 0, 1);
      dr.connect(fb).connect(tone);
      merger.connect(w.wet);
    } else {
      w.input.connect(tone).connect(dl);
      dl.connect(fb).connect(tone);
      dl.connect(w.wet);
    }
    return {
      input: w.input, output: w.output,
      update(P, info) {
        const sec = P.sync === 'ms' ? P.time / 1000 : ticksToSeconds(noteValueTicks(P.sync), info.bpm);
        const t = Math.min(3.9, Math.max(0.01, sec));
        set(dl.delayTime, t, ctx); set(dr.delayTime, t, ctx);
        set(fb.gain, P.feedback, ctx); set(tone.frequency, P.tone, ctx);
        w.mix(P.mix);
      },
    };
  },
  chorus(ctx) {
    const w = wetDry(ctx);
    const merger = ctx.createChannelMerger(2);
    const osc = lfo(ctx, 0.8);
    const lines = [0, 1].map((ch) => {
      const d = ctx.createDelay(0.1);
      d.delayTime.value = 0.018;
      const depth = ctx.createGain();
      osc.connect(depth);
      if (ch === 1) { const inv = ctx.createGain(); inv.gain.value = -1; depth.connect(inv).connect(d.delayTime); } else depth.connect(d.delayTime);
      w.input.connect(d);
      d.connect(merger, 0, ch);
      return depth;
    });
    merger.connect(w.wet);
    return {
      input: w.input, output: w.output,
      update(P) {
        set(osc.frequency, P.rate, ctx);
        for (const depth of lines) set(depth.gain, P.depth * 0.006, ctx);
        w.mix(P.mix * 0.7);
      },
      dispose() { osc.stop(); },
    };
  },
  phaser(ctx) {
    const w = wetDry(ctx);
    const osc = lfo(ctx, 0.5);
    const depth = ctx.createGain();
    osc.connect(depth);
    const stages = [];
    let prev = w.input;
    const fb = ctx.createGain();
    const sum = ctx.createGain();
    w.input.connect(sum);
    fb.connect(sum);
    prev = sum;
    for (let i = 0; i < 4; i++) {
      const ap = ctx.createBiquadFilter();
      ap.type = 'allpass';
      ap.frequency.value = 700 + i * 300;
      ap.Q.value = 0.6;
      depth.connect(ap.frequency);
      prev.connect(ap);
      prev = ap;
      stages.push(ap);
    }
    // Une boucle Web Audio doit contenir un retard (sinon elle est rendue muette).
    const loopDelay = ctx.createDelay(0.05);
    loopDelay.delayTime.value = 0.003;
    prev.connect(loopDelay).connect(fb);
    prev.connect(w.wet);
    return {
      input: w.input, output: w.output,
      update(P) {
        set(osc.frequency, P.rate, ctx);
        set(depth.gain, P.depth * 600, ctx);
        set(fb.gain, P.feedback * 0.8, ctx);
        w.mix(P.mix);
      },
      dispose() { osc.stop(); },
    };
  },
  distortion(ctx) {
    const w = wetDry(ctx);
    const pre = ctx.createGain();
    const shaper = ctx.createWaveShaper();
    shaper.oversample = '4x';
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass';
    const out = ctx.createGain();
    w.input.connect(pre).connect(shaper).connect(tone).connect(out).connect(w.wet);
    return {
      input: w.input, output: w.output,
      update(P) {
        const q = Math.round(P.drive * 20) / 20;
        shaper.curve = cachedCurve(`d${q}`, () => makeDriveCurve(q));
        set(pre.gain, 1 + P.drive * 4, ctx);
        set(tone.frequency, P.tone, ctx);
        set(out.gain, dbToGain(P.output), ctx);
        set(w.dry.gain, 1 - P.mix, ctx);
        set(w.wet.gain, P.mix, ctx);
      },
    };
  },
  filter(ctx) {
    const input = ctx.createGain();
    const f = ctx.createBiquadFilter();
    const osc = lfo(ctx, 0.5);
    const depth = ctx.createGain();
    osc.connect(depth).connect(f.frequency);
    input.connect(f);
    return {
      input, output: f,
      update(P) {
        f.type = P.type;
        set(f.frequency, P.cutoff, ctx);
        set(f.Q, P.resonance, ctx);
        set(osc.frequency, P.lfoRate, ctx);
        set(depth.gain, P.lfoDepth * P.cutoff * 0.9, ctx);
      },
      dispose() { osc.stop(); },
    };
  },
  tremolo(ctx, P0) {
    const input = ctx.createGain();
    const osc = lfo(ctx, 4);
    const depth = ctx.createGain();
    osc.connect(depth);
    let output;
    let base = null;
    if (P0.mode === 'pan') {
      output = ctx.createStereoPanner();
      depth.connect(output.pan);
      input.connect(output);
    } else {
      output = ctx.createGain();
      base = output.gain;
      depth.connect(output.gain);
      input.connect(output);
    }
    return {
      input, output,
      update(P) {
        set(osc.frequency, P.rate, ctx);
        if (base) { set(base, 1 - P.depth / 2, ctx); set(depth.gain, P.depth / 2, ctx); } else set(depth.gain, P.depth, ctx);
      },
      dispose() { osc.stop(); },
    };
  },
  lofi(ctx) {
    const w = wetDry(ctx);
    const shaper = ctx.createWaveShaper();
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass';
    const wob = ctx.createDelay(0.05);
    wob.delayTime.value = 0.01;
    const osc = lfo(ctx, 0.6);
    const depth = ctx.createGain();
    osc.connect(depth).connect(wob.delayTime);
    w.input.connect(shaper).connect(tone).connect(wob).connect(w.wet);
    return {
      input: w.input, output: w.output,
      update(P) {
        shaper.curve = cachedCurve(`c${Math.round(P.bits)}`, () => makeCrushCurve(Math.round(P.bits)));
        set(tone.frequency, P.tone, ctx);
        set(depth.gain, P.wobble * 0.0025, ctx);
        set(w.dry.gain, 1 - P.mix, ctx);
        set(w.wet.gain, P.mix, ctx);
      },
      dispose() { osc.stop(); },
    };
  },
  limiter(ctx) {
    const input = ctx.createGain();
    const c = ctx.createDynamicsCompressor();
    c.knee.value = 0;
    c.ratio.value = 20;
    c.attack.value = 0.001;
    input.connect(c);
    return {
      input, output: c,
      update(P) {
        set(input.gain, dbToGain(P.gain), ctx);
        set(c.threshold, P.ceiling, ctx);
        set(c.release, P.release / 1000, ctx);
      },
      reduction: () => c.reduction,
    };
  },
};

export function createEffectNode(ctx, effect, info) {
  const build = builders[effect.type];
  if (!build) return null;
  const node = build(ctx, effect.params);
  node.update(effect.params, info);
  node.type = effect.type;
  return node;
}

// Signature de structure d'une chaîne : si elle change, la chaîne est reconstruite.
export function chainSignature(effects) {
  return effects.filter((e) => e.on).map((e) => `${e.id}:${e.type}:${(STRUCTURAL[e.type] || []).map((k) => e.params[k]).join(',')}`).join('|');
}
