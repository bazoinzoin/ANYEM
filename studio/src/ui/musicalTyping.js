// Clavier musical : les touches de l'ordinateur jouent des notes (position physique des
// touches, donc identique en AZERTY et QWERTY).
//   rangée du milieu (Q S D F G H J K L M en AZERTY) = touches blanches
//   rangée du haut (Z E T Y U O P) = touches noires
//   W / X = octave −/+, C / V = vélocité −/+

import { ui, emit } from './store.js';
import { noteOn, noteOff } from './transport.js';
import { esc } from './dom.js';
import { icon } from './icons.js';
import { noteName } from '../core/music.js';

const MAP = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11,
  KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};
// Libellés AZERTY (les plus courants pour les francophones) ; remplacés par la disposition réelle si connue.
const AZERTY = { KeyA: 'Q', KeyW: 'Z', KeyS: 'S', KeyE: 'E', KeyD: 'D', KeyF: 'F', KeyT: 'T', KeyG: 'G', KeyY: 'Y', KeyH: 'H', KeyU: 'U', KeyJ: 'J', KeyK: 'K', KeyO: 'O', KeyL: 'L', KeyP: 'P', Semicolon: 'M', Quote: 'Ù', KeyZ: 'W', KeyX: 'X', KeyC: 'C', KeyV: 'V' };
let labels = { ...AZERTY };
const down = new Map();

export async function initTypingLabels() {
  try {
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
      const map = await navigator.keyboard.getLayoutMap();
      for (const code of Object.keys(labels)) { const k = map.get(code); if (k) labels[code] = k.toUpperCase(); }
    }
  } catch { /* disposition inconnue : AZERTY par défaut */ }
}

function base() {
  return (ui.octave + 1) * 12;
}

// Renvoie true si la touche a été utilisée.
export function typingKeyDown(e) {
  if (!ui.musicalTyping || e.ctrlKey || e.metaKey || e.altKey) return false;
  const code = e.code;
  if (code in MAP) {
    if (!e.repeat && !down.has(code)) {
      const pitch = Math.min(127, base() + MAP[code]);
      down.set(code, pitch);
      noteOn(pitch, ui.velocity);
      highlight();
    }
    return true;
  }
  if (code === 'KeyZ' || code === 'KeyX') { if (!e.repeat) { ui.octave = Math.max(0, Math.min(8, ui.octave + (code === 'KeyZ' ? -1 : 1))); emit('typing'); } return true; }
  if (code === 'KeyC' || code === 'KeyV') { ui.velocity = Math.max(1, Math.min(127, ui.velocity + (code === 'KeyC' ? -16 : 16))); emit('typing'); return true; }
  return false;
}

export function typingKeyUp(e) {
  if (!down.has(e.code)) return false;
  noteOff(down.get(e.code));
  down.delete(e.code);
  highlight();
  return true;
}

export function releaseAllTyping() {
  for (const p of down.values()) noteOff(p);
  down.clear();
}

function highlight() {
  for (const el of document.querySelectorAll('.mt-key')) el.classList.toggle('down', down.has(el.dataset.code));
}

export function typingPanelHtml() {
  const whites = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
  const blacks = { KeyW: 0, KeyE: 1, KeyT: 3, KeyY: 4, KeyU: 5, KeyO: 7, KeyP: 8 };
  return `<div class="mt-panel" data-help="Clavier musical : touchez les notes, ou jouez avec les touches de l'ordinateur. Ctrl+K pour le fermer.">
    <div class="mt-head">${icon('keyboard', 16)} <b>Clavier musical</b>
      <span class="mt-ctl"><button class="icon-btn small" data-typing-shift="oct:-1" data-help="Octave plus grave (${esc(labels.KeyZ)})">${icon('minus', 12)}</button><span class="muted small">Octave ${ui.octave - 1}</span><button class="icon-btn small" data-typing-shift="oct:1" data-help="Octave plus aiguë (${esc(labels.KeyX)})">${icon('plus', 12)}</button></span>
      <span class="mt-ctl"><button class="icon-btn small" data-typing-shift="vel:-1" data-help="Jouer plus doucement (${esc(labels.KeyC)})">${icon('minus', 12)}</button><span class="muted small">Force ${ui.velocity}</span><button class="icon-btn small" data-typing-shift="vel:1" data-help="Jouer plus fort (${esc(labels.KeyV)})">${icon('plus', 12)}</button></span>
      <button class="icon-btn small" data-typing-close>${icon('close', 14)}</button></div>
    <div class="mt-keys">
      ${whites.map((c) => `<div class="mt-key white" data-code="${c}"><span>${esc(labels[c] || '')}</span><small>${esc(noteName(base() + MAP[c], ui.noteNames))}</small></div>`).join('')}
      ${Object.entries(blacks).map(([c, i]) => `<div class="mt-key black" data-code="${c}" style="left:${(i + 1) * 40 - 13}px"><span>${esc(labels[c] || '')}</span></div>`).join('')}
    </div></div>`;
}

// Touches du clavier à l'écran : jouables à la souris et au doigt (téléphone, tablette).
export function installTypingPointer(root) {
  const touching = new Map();
  root.addEventListener('pointerdown', (e) => {
    const key = e.target.closest('.mt-key');
    if (!key || !(key.dataset.code in MAP)) return;
    e.preventDefault();
    const pitch = Math.min(127, base() + MAP[key.dataset.code]);
    touching.set(e.pointerId, { pitch, el: key });
    key.classList.add('down');
    noteOn(pitch, ui.velocity);
  });
  const end = (e) => {
    const t = touching.get(e.pointerId);
    if (!t) return;
    touching.delete(e.pointerId);
    t.el.classList.remove('down');
    noteOff(t.pitch);
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('pointerleave', end, true);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-typing-shift]');
    if (!b) return;
    const [what, dir] = b.dataset.typingShift.split(':');
    if (what === 'oct') ui.octave = Math.max(0, Math.min(8, ui.octave + Number(dir)));
    else ui.velocity = Math.max(1, Math.min(127, ui.velocity + Number(dir) * 16));
    emit('typing');
  });
}
