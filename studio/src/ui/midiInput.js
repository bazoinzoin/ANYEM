// Contrôleurs MIDI (claviers USB) via Web MIDI : les notes jouent la piste sélectionnée
// (ou les pistes armées) et sont enregistrées pendant l'enregistrement.

import { noteOn, noteOff } from './transport.js';
import { toast } from './toast.js';

let access = null;
let status = 'non disponible sur cet appareil';
let sustain = false;
const sustained = new Set();

function handle(e) {
  const [st, d1, d2] = e.data;
  const type = st & 0xf0;
  if (type === 0x90 && d2 > 0) { sustained.delete(d1); noteOn(d1, d2); } else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
    if (sustain) sustained.add(d1); else noteOff(d1);
  } else if (type === 0xb0 && d1 === 64) {
    sustain = d2 >= 64;
    if (!sustain) { for (const p of sustained) noteOff(p); sustained.clear(); }
  }
}

function bind() {
  const names = [];
  for (const input of access.inputs.values()) {
    input.onmidimessage = handle;
    names.push(input.name);
  }
  status = names.length ? `connecté(s) : ${names.join(', ')}` : 'aucun clavier MIDI branché';
  return names;
}

export async function initMidi() {
  if (!navigator.requestMIDIAccess) return;
  try {
    access = await navigator.requestMIDIAccess();
    bind();
    access.onstatechange = (e) => {
      const before = status;
      bind();
      if (e.port.type === 'input' && e.port.state === 'connected' && before !== status) toast(`Clavier MIDI connecté : ${e.port.name}`, 'ok');
    };
  } catch {
    status = 'accès refusé';
  }
}

export function midiStatus() {
  return status;
}
