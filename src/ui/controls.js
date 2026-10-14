// Boutons rotatifs, faders et listes génériques, reliés à un chemin de réglage (bind.js).
// Glisser = régler (Maj = réglage fin), double-clic = valeur par défaut, molette = petit pas.

import { esc } from './dom.js';
import { resolve, formatPan, formatDb } from './bind.js';
import { paramToNorm, normToParam, formatParam } from '../core/defs.js';
import { dbToFader, faderToDb } from '../core/project.js';
import { project, beginGesture, endGesture, touch, commit } from './store.js';

export function toNorm(def, value) {
  if (def.curve === 'fader') return dbToFader(value);
  return paramToNorm(def, value);
}

export function fromNorm(def, norm) {
  if (def.curve === 'fader') {
    const db = faderToDb(norm);
    return Math.abs(db) < 0.25 ? 0 : Math.round(db * 10) / 10;
  }
  return normToParam(def, norm);
}

export function formatValue(def, value) {
  if (def.curve === 'fader' || (def.unit === 'dB' && def.key === 'volume')) return formatDb(value);
  if (def.unit === 'pan') return formatPan(value);
  if (def.unit === 's' && def.max <= 10 && def.key.startsWith('fade')) return value <= 0 ? 'Aucun' : `${value.toFixed(2)} s`;
  return formatParam(def, value);
}

export function knob(path, { label = null, size = 'm', help = '' } = {}) {
  const r = resolve(project(), path);
  if (!r) return '';
  const v = r.obj[r.key];
  const norm = toNorm(r.def, v);
  const bipolar = r.def.min < 0 && r.def.max > 0;
  return `<div class="knob knob-${size}${bipolar ? ' bipolar' : ''}" data-path="${esc(path)}" data-help="${esc(help || `${label || r.def.label} : glissez vers le haut ou le bas. Double-clic = valeur par défaut.`)}" style="--n:${norm.toFixed(4)}">
    <div class="knob-dial"><div class="knob-cap"></div></div>
    <div class="knob-label">${esc(label || r.def.label)}</div>
    <div class="knob-val">${esc(formatValue(r.def, v))}</div>
  </div>`;
}

export function fader(path, { height = 150, help = '' } = {}) {
  const r = resolve(project(), path);
  if (!r) return '';
  const v = r.obj[r.key];
  const norm = toNorm(r.def, v);
  return `<div class="fader" data-path="${esc(path)}" data-help="${esc(help || 'Volume : glissez. Double-clic = 0 dB.')}" style="--n:${norm.toFixed(4)};--h:${height}px">
    <div class="fader-track"><div class="fader-fill"></div><div class="fader-zero"></div><div class="fader-cap"></div></div>
    <div class="fader-val">${esc(formatValue(r.def, v))}</div>
  </div>`;
}

export function paramSelect(path, { help = '' } = {}) {
  const r = resolve(project(), path);
  if (!r || !r.def.options) return '';
  const v = r.obj[r.key];
  return `<label class="param-select" data-help="${esc(help || r.def.label)}"><span>${esc(r.def.label)}</span>
    <select data-path="${esc(path)}">${r.def.options.map((o) => `<option value="${esc(o.value)}"${o.value === v ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
}

// Bouton ou liste selon le type du réglage.
export function control(path, opts = {}) {
  const r = resolve(project(), path);
  if (!r) return '';
  return r.def.options ? paramSelect(path, opts) : knob(path, opts);
}

function refresh(path) {
  const r = resolve(project(), path);
  if (!r) return;
  const v = r.obj[r.key];
  const norm = toNorm(r.def, v);
  for (const el of document.querySelectorAll(`[data-path="${CSS.escape(path)}"]`)) {
    el.style.setProperty('--n', norm.toFixed(4));
    const val = el.querySelector('.knob-val, .fader-val');
    if (val) val.textContent = formatValue(r.def, v);
  }
}

function setValue(path, value) {
  const r = resolve(project(), path);
  if (!r) return;
  r.obj[r.key] = value;
  refresh(path);
  touch();
}

let drag = null;

export function installControls(root = document) {
  root.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.knob[data-path], .fader[data-path]');
    if (!el || e.button !== 0) return;
    const path = el.dataset.path;
    const r = resolve(project(), path);
    if (!r) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    beginGesture(`Réglage ${r.def.label}`);
    const isFader = el.classList.contains('fader');
    const track = isFader ? el.querySelector('.fader-track') : null;
    drag = { el, path, def: r.def, startY: e.clientY, startNorm: toNorm(r.def, r.obj[r.key]), isFader, track };
    el.classList.add('active');
    if (isFader) moveFader(e);
  });
  function moveFader(e) {
    const rect = drag.track.getBoundingClientRect();
    const n = 1 - (e.clientY - rect.top) / rect.height;
    setValue(drag.path, fromNorm(drag.def, Math.max(0, Math.min(1, n))));
  }
  root.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (drag.isFader) { moveFader(e); return; }
    const scale = e.shiftKey ? 0.2 : 1;
    const n = drag.startNorm + ((drag.startY - e.clientY) / 180) * scale;
    setValue(drag.path, fromNorm(drag.def, Math.max(0, Math.min(1, n))));
  });
  const end = () => {
    if (!drag) return;
    drag.el.classList.remove('active');
    drag = null;
    endGesture();
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('dblclick', (e) => {
    const el = e.target.closest('.knob[data-path], .fader[data-path]');
    if (!el) return;
    const r = resolve(project(), el.dataset.path);
    if (!r) return;
    commit(`Réglage ${r.def.label} par défaut`, (p) => {
      const rr = resolve(p, el.dataset.path);
      rr.obj[rr.key] = rr.def.def;
    });
  });
  root.addEventListener('wheel', (e) => {
    const el = e.target.closest('.knob[data-path], .fader[data-path]');
    if (!el) return;
    e.preventDefault();
    const r = resolve(project(), el.dataset.path);
    if (!r) return;
    beginGesture(`Réglage ${r.def.label}`);
    const n = toNorm(r.def, r.obj[r.key]) + (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 0.005 : 0.02);
    let v = fromNorm(r.def, Math.max(0, Math.min(1, n)));
    if (r.def.step && v === r.obj[r.key]) v = Math.max(r.def.min, Math.min(r.def.max, v + (e.deltaY < 0 ? r.def.step : -r.def.step)));
    setValue(el.dataset.path, v);
    clearTimeout(el._wheelEnd);
    el._wheelEnd = setTimeout(endGesture, 400);
  }, { passive: false });
  root.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-path]');
    if (!sel) return;
    const r = resolve(project(), sel.dataset.path);
    if (!r) return;
    commit(`Réglage ${r.def.label}`, (p) => {
      const rr = resolve(p, sel.dataset.path);
      rr.obj[rr.key] = sel.value;
    });
  });
}
