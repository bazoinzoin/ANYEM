// Fichiers WAV (PCM 16 / 24 bits ou flottant 32 bits) : écriture et lecture.

export function encodeWav(channels, sampleRate, bitDepth = 16) {
  const numCh = channels.length;
  const length = channels[0] ? channels[0].length : 0;
  const float = bitDepth === 32;
  const bytes = bitDepth / 8;
  const dataSize = length * numCh * bytes;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataSize, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, float ? 3 : 1, true);
  v.setUint16(22, numCh, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * numCh * bytes, true);
  v.setUint16(32, numCh * bytes, true);
  v.setUint16(34, bitDepth, true);
  str(36, 'data');
  v.setUint32(40, dataSize, true);
  let o = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i] || 0));
      if (float) v.setFloat32(o, s, true);
      else if (bitDepth === 24) {
        const x = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff);
        v.setUint8(o, x & 0xff);
        v.setUint8(o + 1, (x >> 8) & 0xff);
        v.setUint8(o + 2, (x >> 16) & 0xff);
      } else v.setInt16(o, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true);
      o += bytes;
    }
  }
  return new Uint8Array(buf);
}

// Lecture d'un WAV PCM 16/24 bits ou flottant 32 bits → { sampleRate, channels }.
export function decodeWav(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Fichier WAV invalide');
  let o = 12;
  let fmt = null;
  while (o + 8 <= v.byteLength) {
    const id = tag(o);
    const size = v.getUint32(o + 4, true);
    if (id === 'fmt ') {
      fmt = { format: v.getUint16(o + 8, true), channels: v.getUint16(o + 10, true), sampleRate: v.getUint32(o + 12, true), bits: v.getUint16(o + 22, true) };
    } else if (id === 'data' && fmt) {
      const bytesPer = fmt.bits / 8;
      const frames = Math.floor(size / (bytesPer * fmt.channels));
      const channels = Array.from({ length: fmt.channels }, () => new Float32Array(frames));
      let p = o + 8;
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < fmt.channels; c++) {
          let s;
          if (fmt.format === 3) s = v.getFloat32(p, true);
          else if (fmt.bits === 24) {
            let x = v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getUint8(p + 2) << 16);
            if (x & 0x800000) x -= 0x1000000;
            s = x / 0x800000;
          } else if (fmt.bits === 8) s = (v.getUint8(p) - 128) / 128;
          else s = v.getInt16(p, true) / 0x8000;
          channels[c][i] = s;
          p += bytesPer;
        }
      }
      return { sampleRate: fmt.sampleRate, channels };
    }
    o += 8 + size + (size % 2);
  }
  throw new Error('Fichier WAV sans données');
}

// Plus haut niveau absolu (pour la normalisation).
export function peakLevel(channels) {
  let peak = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > peak) peak = a; }
  return peak;
}

export function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
