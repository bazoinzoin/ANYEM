// Chemins de réglages (« t:<piste>:volume », « t:<piste>:fx:<effet>:mix »…) : lecture,
// écriture et description (bornes, unité) pour les boutons et faders génériques.

import { INSTRUMENTS, EFFECTS, findParam } from '../core/defs.js';
import { findTrack, findRegion } from './store.js';

const VOLUME = { key: 'volume', label: 'Volume', min: -60, max: 6, def: 0, unit: 'dB', curve: 'fader' };
const PAN = { key: 'pan', label: 'Panoramique', min: -1, max: 1, def: 0, unit: 'pan', curve: 'lin' };
const SEND = (i) => ({ key: `send${i}`, label: i === 0 ? 'Envoi réverbe' : 'Envoi écho', min: 0, max: 1, def: 0, unit: '', curve: 'lin' });

function fxIn(list, id) {
  return list.find((e) => e.id === id) || null;
}

// → { obj, key, def } ou null.
export function resolve(project, path) {
  const parts = path.split(':');
  const [scope] = parts;
  if (scope === 't') {
    const track = findTrack(parts[1], project);
    if (!track) return null;
    const what = parts[2];
    if (what === 'volume') return { obj: track, key: 'volume', def: VOLUME };
    if (what === 'pan') return { obj: track, key: 'pan', def: PAN };
    if (what === 'send0' || what === 'send1') {
      const i = Number(what.slice(4));
      return { obj: track.sends, key: i, def: SEND(i) };
    }
    if (what === 'inst' && track.instrument) {
      const def = findParam(INSTRUMENTS[track.instrument.type].params, parts[3]);
      return def ? { obj: track.instrument.params, key: parts[3], def } : null;
    }
    if (what === 'fx') {
      const fx = fxIn(track.effects, parts[3]);
      const def = fx && findParam(EFFECTS[fx.type].params, parts[4]);
      return def ? { obj: fx.params, key: parts[4], def } : null;
    }
    return null;
  }
  if (scope === 'b') {
    const bus = project.buses[Number(parts[1])];
    if (!bus) return null;
    if (parts[2] === 'volume') return { obj: bus, key: 'volume', def: VOLUME };
    if (parts[2] === 'pan') return { obj: bus, key: 'pan', def: PAN };
    if (parts[2] === 'fx') {
      const fx = fxIn(bus.effects, parts[3]);
      const def = fx && findParam(EFFECTS[fx.type].params, parts[4]);
      return def ? { obj: fx.params, key: parts[4], def } : null;
    }
    return null;
  }
  if (scope === 'm') {
    if (parts[1] === 'volume') return { obj: project.master, key: 'volume', def: VOLUME };
    if (parts[1] === 'fx') {
      const fx = fxIn(project.master.effects, parts[2]);
      const def = fx && findParam(EFFECTS[fx.type].params, parts[3]);
      return def ? { obj: fx.params, key: parts[3], def } : null;
    }
    return null;
  }
  if (scope === 'r') {
    const found = findRegion(parts[1], project);
    if (!found) return null;
    const defs = {
      gain: { key: 'gain', label: 'Gain', min: -24, max: 12, def: 0, unit: 'dB', curve: 'lin' },
      fadeIn: { key: 'fadeIn', label: 'Fondu d\'entrée', min: 0, max: 10, def: 0, unit: 's', curve: 'lin' },
      fadeOut: { key: 'fadeOut', label: 'Fondu de sortie', min: 0, max: 10, def: 0, unit: 's', curve: 'lin' },
    };
    const def = defs[parts[2]];
    return def ? { obj: found.region, key: parts[2], def } : null;
  }
  if (scope === 'p') {
    if (parts[1] === 'metro') return { obj: project.metronome, key: 'volume', def: { key: 'volume', label: 'Volume du métronome', min: 0, max: 1, def: 0.6, unit: '', curve: 'lin' } };
  }
  return null;
}

export function readValue(project, path) {
  const r = resolve(project, path);
  return r ? r.obj[r.key] : null;
}

export function writeValue(project, path, value) {
  const r = resolve(project, path);
  if (!r) return false;
  r.obj[r.key] = value;
  return true;
}

export function formatPan(v) {
  if (Math.abs(v) < 0.01) return 'Centre';
  return v < 0 ? `G ${Math.round(-v * 100)}` : `D ${Math.round(v * 100)}`;
}

export function formatDb(v) {
  if (v <= -60) return '−∞ dB';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;
}
