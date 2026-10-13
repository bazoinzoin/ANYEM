// Console de mixage : une tranche par piste, les deux bus d'effets et la sortie.

import { esc } from './dom.js';
import { icon } from './icons.js';
import { ui, project, emit, commit, findTrack } from './store.js';
import { knob, fader } from './controls.js';
import { EFFECTS, EFFECT_ORDER, INSTRUMENTS } from '../core/defs.js';
import { createEffect } from '../core/project.js';
import { findPreset } from '../core/library.js';
import { toggleTrack } from './ops.js';
import { showMenu } from './popup.js';
import { meterLevels } from '../audio/engine.js';

const FADER_H = 120;

function fxSlots(effects, owner) {
  return `<div class="st-fx">${effects.map((e) => `<button class="fx-slot${e.on ? '' : ' off'}${ui.expandedFx === e.id ? ' open' : ''}" data-fx-open="${e.id}" data-owner="${owner}" data-help="${esc(EFFECTS[e.type].help)} Cliquez pour régler.">${esc(EFFECTS[e.type].label)}</button>`).join('')}
    <button class="fx-slot add" data-fx-add="${owner}" data-help="Ajouter un effet (égaliseur, compresseur, réverbe…).">${icon('plus', 12)} Effet</button></div>`;
}

function meter(id, stereo = false) {
  return `<div class="st-meter${stereo ? ' stereo' : ''}" data-mix-meter="${id}">${stereo ? '<i></i><i></i>' : '<i></i>'}</div>`;
}

function trackStrip(t) {
  const inst = t.instrument ? (findPreset(t.instrument.preset)?.name || INSTRUMENTS[t.instrument.type].label) : 'Entrée audio';
  return `<div class="strip${t.id === ui.selectedTrackId && !ui.inspectTarget ? ' selected' : ''}" data-strip="${t.id}" style="--c:${t.color}">
    <div class="st-top"><div class="st-color"></div><div class="st-name" title="${esc(t.name)}">${esc(t.name)}</div><div class="st-inst">${esc(inst)}</div></div>
    ${fxSlots(t.effects, `t:${t.id}`)}
    <div class="st-knobs">${knob(`t:${t.id}:send0`, { label: 'Rév.', size: 'xs', help: 'Réverbe : quantité de son envoyée vers la réverbération commune.' })}${knob(`t:${t.id}:send1`, { label: 'Écho', size: 'xs', help: 'Écho : quantité de son envoyée vers l\'écho commun.' })}${knob(`t:${t.id}:pan`, { label: 'Pan', size: 'xs', help: 'Panoramique : place le son à gauche ou à droite.' })}</div>
    <div class="st-fader">${fader(`t:${t.id}:volume`, { height: FADER_H })}${meter(t.id)}</div>
    <div class="st-btns">
      <button class="tbtn tb-m${t.mute ? ' on' : ''}" data-mix-act="mute" data-help="Silence">M</button>
      <button class="tbtn tb-s${t.solo ? ' on' : ''}" data-mix-act="solo" data-help="Solo">S</button>
      <button class="tbtn tb-r${t.arm ? ' on' : ''}" data-mix-act="arm" data-help="Armer pour l'enregistrement">${icon('record', 10)}</button>
    </div>
  </div>`;
}

function busStrip(bus, i) {
  return `<div class="strip bus${ui.inspectTarget === `bus${i}` ? ' selected' : ''}" data-bus="${i}">
    <div class="st-top"><div class="st-color"></div><div class="st-name">${esc(bus.name)}</div><div class="st-inst">Bus d'effet</div></div>
    ${fxSlots(bus.effects, `b:${i}`)}
    <div class="st-knobs">${knob(`b:${i}:pan`, { label: 'Pan', size: 'xs' })}</div>
    <div class="st-fader">${fader(`b:${i}:volume`, { height: FADER_H })}${meter(`bus${i}`)}</div>
    <div class="st-btns"><button class="tbtn tb-m${bus.mute ? ' on' : ''}" data-bus-mute="${i}">M</button></div>
  </div>`;
}

function masterStrip(p) {
  return `<div class="strip master${ui.inspectTarget === 'master' ? ' selected' : ''}" data-master="1">
    <div class="st-top"><div class="st-color"></div><div class="st-name">Sortie</div><div class="st-inst">Mixage final</div></div>
    ${fxSlots(p.master.effects, 'm')}
    <div class="st-knobs"><div class="st-reduction" data-help="Réduction de gain du compresseur / limiteur de sortie (dB)." data-mix-gr="1">GR 0.0</div></div>
    <div class="st-fader">${fader('m:volume', { height: FADER_H })}${meter('master', true)}</div>
    <div class="st-btns"></div>
  </div>`;
}

export function mixerHtml() {
  const p = project();
  return `<div class="mixer">${p.tracks.map(trackStrip).join('')}<div class="mix-sep"></div>${p.buses.map(busStrip).join('')}${masterStrip(p)}</div>`;
}

// Liste d'effets d'un « propriétaire » : t:<piste>, b:<n> ou m.
export function effectsOf(p, owner) {
  if (owner === 'm') return p.master.effects;
  if (owner.startsWith('b:')) return p.buses[Number(owner.slice(2))].effects;
  const t = findTrack(owner.slice(2), p);
  return t ? t.effects : null;
}

export function addEffectMenu(x, y, owner) {
  showMenu(x, y, EFFECT_ORDER.map((type) => ({
    label: EFFECTS[type].label,
    action: () => {
      const fx = createEffect(type);
      commit(`Ajouter ${EFFECTS[type].label}`, (p) => {
        const list = effectsOf(p, owner);
        // Le limiteur se place toujours en dernier.
        const lim = list.findIndex((e) => e.type === 'limiter');
        if (lim >= 0 && type !== 'limiter') list.splice(lim, 0, fx); else list.push(fx);
      });
      ui.expandedFx = fx.id;
      focusOwner(owner);
    },
  })), { minWidth: 180 });
}

export function focusOwner(owner) {
  if (owner === 'm') ui.inspectTarget = 'master';
  else if (owner.startsWith('b:')) ui.inspectTarget = `bus${owner.slice(2)}`;
  else { ui.inspectTarget = null; ui.selectedTrackId = owner.slice(2); }
  ui.showInspector = true;
  emit('ui');
}

export function installMixer(root) {
  root.addEventListener('click', (e) => {
    const add = e.target.closest('[data-fx-add]');
    if (add) { const r = add.getBoundingClientRect(); addEffectMenu(r.left, r.bottom + 2, add.dataset.fxAdd); return; }
    const open = e.target.closest('[data-fx-open]');
    if (open) {
      ui.expandedFx = ui.expandedFx === open.dataset.fxOpen ? null : open.dataset.fxOpen;
      focusOwner(open.dataset.owner);
      return;
    }
    const act = e.target.closest('[data-mix-act]');
    const strip = e.target.closest('[data-strip]');
    if (act && strip) { toggleTrack(strip.dataset.strip, act.dataset.mixAct); return; }
    const bm = e.target.closest('[data-bus-mute]');
    if (bm) { commit('Silence du bus', (p) => { const b = p.buses[Number(bm.dataset.busMute)]; b.mute = !b.mute; }); return; }
    if (e.target.closest('.knob, .fader')) return;
    if (strip) { ui.inspectTarget = null; ui.selectedTrackId = strip.dataset.strip; emit('ui'); return; }
    const bus = e.target.closest('[data-bus]');
    if (bus) { ui.inspectTarget = `bus${bus.dataset.bus}`; ui.showInspector = true; emit('ui'); return; }
    if (e.target.closest('[data-master]')) { ui.inspectTarget = 'master'; ui.showInspector = true; emit('ui'); }
  });
}

function levelPct(v) {
  return Math.min(100, Math.max(0, (1 + Math.log10(Math.max(1e-4, v)) / 3) * 100));
}

// Vu-mètres (appelé à chaque image quand la console est visible).
export function updateMixerMeters(root) {
  const lv = meterLevels();
  if (!lv) return;
  for (const el of root.querySelectorAll('[data-mix-meter]')) {
    const id = el.dataset.mixMeter;
    const bars = el.children;
    let vals;
    if (id === 'master') vals = lv.master;
    else if (id.startsWith('bus')) vals = [lv.buses[Number(id.slice(3))] || 0];
    else vals = [lv.tracks[id] || 0];
    vals.forEach((v, i) => {
      if (!bars[i]) return;
      bars[i].style.height = `${levelPct(v)}%`;
      bars[i].classList.toggle('clip', v > 1);
    });
  }
  const gr = root.querySelector('[data-mix-gr]');
  if (gr) gr.textContent = `GR ${lv.reduction.toFixed(1)}`;
}
