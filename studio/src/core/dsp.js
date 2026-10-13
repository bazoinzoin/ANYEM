// Calculs de signal sans Web Audio (testables) : réponses de réverbération, courbes de
// saturation, aperçu des formes d'onde.

// Hasard reproductible (réverbes identiques d'une session à l'autre).
export function seededRandom(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Réponse impulsionnelle stéréo : bruit qui décroît en `seconds`, assourdi selon `damping`.
export function makeReverbIR(sampleRate, seconds, damping = 0.5, predelay = 0) {
  const length = Math.max(1, Math.floor(sampleRate * (seconds + predelay)));
  const pre = Math.floor(sampleRate * predelay);
  const out = [];
  for (let c = 0; c < 2; c++) {
    const rnd = seededRandom(1234 + c * 777);
    const data = new Float32Array(length);
    let lp = 0;
    for (let i = pre; i < length; i++) {
      const t = (i - pre) / sampleRate;
      const env = Math.exp((-6.9 * t) / seconds);
      // Plus on avance, plus les aigus disparaissent (filtre passe-bas qui se referme).
      const k = Math.min(0.97, damping * 0.6 + (damping * 0.35 * t) / seconds);
      lp = lp * k + (rnd() * 2 - 1) * (1 - k);
      data[i] = lp * env * (1 + damping);
    }
    out.push(data);
  }
  return out;
}

export function makeDriveCurve(amount, n = 2048) {
  const k = amount * 60 + 0.01;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = ((1 + k / 10) * x) / (1 + (k / 10) * Math.abs(x));
    curve[i] = Math.tanh(curve[i] * (1 + k / 20));
  }
  const max = Math.max(...curve.map(Math.abs));
  for (let i = 0; i < n; i++) curve[i] /= max || 1;
  return curve;
}

// Réduction de résolution : escaliers de 2^bits marches.
export function makeCrushCurve(bits, n = 4096) {
  const steps = 2 ** Math.max(1, bits - 1);
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve;
}

// Aperçu d'une forme d'onde : pour chaque tranche, minimum et maximum.
export function computePeaks(data, buckets) {
  const n = Math.max(1, Math.floor(buckets));
  const out = new Float32Array(n * 2);
  const per = data.length / n;
  for (let b = 0; b < n; b++) {
    const s = Math.floor(b * per);
    const e = Math.max(s + 1, Math.floor((b + 1) * per));
    let min = 1;
    let max = -1;
    for (let i = s; i < e && i < data.length; i++) {
      const x = data[i];
      if (x < min) min = x;
      if (x > max) max = x;
    }
    if (min > max) { min = 0; max = 0; }
    out[b * 2] = min;
    out[b * 2 + 1] = max;
  }
  return out;
}
