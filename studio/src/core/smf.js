// Fichiers MIDI standard (.mid) : export d'un projet et import vers des pistes.

import { PPQ } from './time.js';
import { regionNotes } from './project.js';

function varLen(n) {
  const bytes = [n & 0x7f];
  let v = n >> 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

function chunk(type, data) {
  const len = data.length;
  return [...type].map((c) => c.charCodeAt(0)).concat([(len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff], data);
}

function textEvent(type, text) {
  const bytes = [...new TextEncoder().encode(text)];
  return [0, 0xff, type, ...varLen(bytes.length), ...bytes];
}

// Format 1 : une piste de tempo, puis une piste par piste instrument (batterie sur le canal 10).
export function writeMidi(project) {
  const tracks = [];
  const usPerQuarter = Math.round(60000000 / project.bpm);
  const denPow = Math.round(Math.log2(project.sigDen));
  tracks.push(chunk('MTrk', [
    ...textEvent(0x03, project.name || 'Projet'),
    0, 0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff,
    0, 0xff, 0x58, 0x04, project.sigNum, denPow, 24, 8,
    0, 0xff, 0x2f, 0x00,
  ]));
  let channel = 0;
  for (const track of project.tracks) {
    if (track.kind === 'audio') continue;
    const ch = track.kind === 'drums' ? 9 : channel;
    if (track.kind !== 'drums') channel = (channel + 1) % 16 === 9 ? (channel + 2) % 16 : (channel + 1) % 16;
    const events = [];
    for (const region of track.regions) {
      if (region.mute) continue;
      for (const n of regionNotes(region)) {
        events.push({ t: n.start, on: true, pitch: n.pitch, vel: n.vel });
        events.push({ t: n.start + n.length, on: false, pitch: n.pitch, vel: 0 });
      }
    }
    events.sort((a, b) => a.t - b.t || (a.on === b.on ? 0 : a.on ? 1 : -1));
    const data = [...textEvent(0x03, track.name)];
    let last = 0;
    for (const e of events) {
      data.push(...varLen(Math.max(0, Math.round(e.t - last))), (e.on ? 0x90 : 0x80) | ch, e.pitch, e.vel);
      last = Math.round(e.t);
    }
    data.push(0, 0xff, 0x2f, 0x00);
    tracks.push(chunk('MTrk', data));
  }
  const header = chunk('MThd', [0, 1, (tracks.length >> 8) & 0xff, tracks.length & 0xff, (PPQ >> 8) & 0xff, PPQ & 0xff]);
  return new Uint8Array(header.concat(...tracks));
}

// Lecture → { bpm, sigNum, sigDen, tracks: [{ name, drums, notes: [{ pitch, start, length, vel }] }] }
// (positions converties en ticks de 480 par noire).
export function readMidi(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
  if (tag(0) !== 'MThd') throw new Error('Ce n\'est pas un fichier MIDI');
  const ntracks = v.getUint16(10);
  const division = v.getUint16(12);
  if (division & 0x8000) throw new Error('Fichier MIDI à base de temps SMPTE non pris en charge');
  const scale = PPQ / division;
  let o = 8 + v.getUint32(4);
  const result = { bpm: 120, sigNum: 4, sigDen: 4, tracks: [] };
  for (let t = 0; t < ntracks && o + 8 <= bytes.length; t++) {
    if (tag(o) !== 'MTrk') break;
    const len = v.getUint32(o + 4);
    let p = o + 8;
    const end = p + len;
    let tick = 0;
    let status = 0;
    let name = '';
    const open = new Map();
    const byChannel = new Map();
    const readVar = () => {
      let n = 0;
      let b;
      do { b = bytes[p++]; n = (n << 7) | (b & 0x7f); } while (b & 0x80 && p < end);
      return n;
    };
    while (p < end) {
      tick += readVar();
      let b = bytes[p];
      if (b & 0x80) { status = b; p++; } else if (!status) break;
      const type = status & 0xf0;
      const ch = status & 0x0f;
      if (status === 0xff) {
        const meta = bytes[p++];
        const l = readVar();
        if (meta === 0x03 && !name) name = new TextDecoder().decode(bytes.subarray(p, p + l));
        if (meta === 0x51 && l === 3) result.bpm = Math.round(60000000 / ((bytes[p] << 16) | (bytes[p + 1] << 8) | bytes[p + 2]));
        if (meta === 0x58 && l >= 2) { result.sigNum = bytes[p]; result.sigDen = 2 ** bytes[p + 1]; }
        p += l;
        status = 0;
      } else if (status === 0xf0 || status === 0xf7) {
        p += readVar();
        status = 0;
      } else if (type === 0x90 || type === 0x80) {
        const pitch = bytes[p++];
        const vel = bytes[p++];
        const key = `${ch}:${pitch}`;
        if (type === 0x90 && vel > 0) {
          if (!open.has(key)) open.set(key, []);
          open.get(key).push({ tick, vel });
        } else if (open.has(key) && open.get(key).length) {
          const st = open.get(key).shift();
          if (!byChannel.has(ch)) byChannel.set(ch, []);
          byChannel.get(ch).push({ pitch, start: Math.round(st.tick * scale), length: Math.max(1, Math.round((tick - st.tick) * scale)), vel: st.vel });
        }
      } else if (type === 0xc0 || type === 0xd0) p += 1;
      else p += 2;
    }
    for (const [ch, notes] of byChannel) {
      if (!notes.length) continue;
      notes.sort((a, b) => a.start - b.start);
      result.tracks.push({ name: name || `Piste ${result.tracks.length + 1}`, drums: ch === 9, notes });
    }
    o = end;
  }
  return result;
}
