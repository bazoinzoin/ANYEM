// Plan de lecture : tout ce qui doit sonner, en secondes, calculé une fois par version du
// projet. Le moteur audio n'a plus qu'à piocher les événements de chaque fenêtre de temps.

import { ticksToSeconds, ticksPerBeat, ticksPerBar } from './time.js';
import { regionNotes, dbToGain } from './project.js';
import { arpeggiate } from './music.js';

export function buildPlan(project) {
  const sec = (t) => ticksToSeconds(t, project.bpm);
  const tracks = project.tracks.map((track) => {
    const notes = [];
    const audio = [];
    for (const region of track.regions) {
      if (region.mute) continue;
      if (region.type === 'midi') {
        let list = regionNotes(region);
        const arp = track.instrument && track.instrument.arp;
        if (arp && arp.on && track.kind !== 'drums') {
          const regionEndTick = region.start + region.length * (region.loops || 1);
          list = arpeggiate(list, arp).filter((n) => n.start < regionEndTick)
            .map((n) => ({ ...n, length: Math.min(n.length, regionEndTick - n.start) }));
        }
        for (const n of list) notes.push({ t: sec(n.start), d: sec(n.length), pitch: n.pitch, vel: n.vel });
      } else if (region.type === 'audio') {
        audio.push({
          id: region.id,
          t: sec(region.start),
          d: region.duration,
          offset: region.offset,
          gain: dbToGain(region.gain || 0),
          fadeIn: region.fadeIn || 0,
          fadeOut: region.fadeOut || 0,
          audioId: region.audioId,
          reverse: !!region.reverse,
        });
      }
    }
    notes.sort((a, b) => a.t - b.t);
    audio.sort((a, b) => a.t - b.t);
    const automation = {};
    for (const [param, points] of Object.entries(track.automation || {})) {
      if (points && points.length) automation[param] = points.map((p) => ({ t: sec(p.tick), value: p.value }));
    }
    return { trackId: track.id, notes, audio, automation };
  });
  return { tracks, bpm: project.bpm };
}

// Événements dont le début tombe dans [s0, s1).
export function eventsIn(list, s0, s1) {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].t < s0) lo = mid + 1; else hi = mid;
  }
  const out = [];
  for (let i = lo; i < list.length && list[i].t < s1; i++) out.push(list[i]);
  return out;
}

// Temps du métronome dans [s0, s1) : { t, accent } (accent = premier temps de la mesure).
export function metronomeBeats(project, s0, s1) {
  const beatSec = ticksToSeconds(ticksPerBeat(project), project.bpm);
  const perBar = Math.round(ticksPerBar(project) / ticksPerBeat(project));
  const out = [];
  let k = Math.ceil(s0 / beatSec - 1e-9) || 0;
  for (let t = k * beatSec; t < s1; k++, t = k * beatSec) out.push({ t, accent: ((k % perBar) + perBar) % perBar === 0 });
  return out;
}

// Valeur d'une automation (points en secondes) à un instant.
export function automationAt(points, t) {
  if (t <= points[0].t) return points[0].value;
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i].t) {
      const a = points[i - 1];
      const b = points[i];
      return b.t === a.t ? b.value : a.value + ((b.value - a.value) * (t - a.t)) / (b.t - a.t);
    }
  }
  return points[points.length - 1].value;
}
