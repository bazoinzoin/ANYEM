// Inspecteur (panneau de gauche) : région sélectionnée, piste (instrument, commandes
// rapides, arpégiateur, entrée audio), tranche de console et effets.

import { esc } from './dom.js';
import { icon } from './icons.js';
import { ui, project, emit, commit, findTrack, findRegion, selectedTrack } from './store.js';
import { knob, fader, control } from './controls.js';
import { INSTRUMENTS, INSTRUMENT_ORDER, EFFECTS } from '../core/defs.js';
import { PRESETS, PRESET_CATEGORIES } from '../core/library.js';
import { NOTE_VALUES } from '../core/time.js';
import { applyPreset, setInstrumentType, setRegionProp, toggleTrack, openEditor } from './ops.js';
import { addEffectMenu, effectsOf, focusOwner } from './mixerView.js';
import { promptText } from './popup.js';
import { listInputs } from '../audio/recorder.js';

let inputs = [];
export async function refreshInputs() {
  try { inputs = await listInputs(); } catch { inputs = []; }
  emit('ui');
}

function section(id, title, body, { open = true, extra = '' } = {}) {
  const closed = ui.closedSections && ui.closedSections[id];
  const isOpen = closed == null ? open : !closed;
  return `<section class="insp-sec${isOpen ? ' open' : ''}" data-sec="${id}">
    <header data-sec-toggle="${id}">${icon(isOpen ? 'chevronDown' : 'chevronRight', 14)}<span>${title}</span>${extra}</header>
    ${isOpen ? `<div class="insp-body">${body}</div>` : ''}</section>`;
}

function regionSection() {
  if (ui.selectedRegions.size !== 1) return '';
  const f = findRegion([...ui.selectedRegions][0]);
  if (!f) return '';
  const r = f.region;
  let body = `<div class="insp-row"><span>Nom</span><button class="link" data-insp="renameRegion" data-id="${r.id}">${esc(r.name)}</button></div>
    <label class="insp-row check"><input type="checkbox" data-insp-check="regionMute" data-id="${r.id}"${r.mute ? ' checked' : ''}> Silence (muette)</label>`;
  if (r.type === 'midi') {
    body += `<div class="insp-row"><span>Répétitions</span><div class="stepper"><button data-insp="loops-" data-id="${r.id}">−</button><b>${r.loops || 1}</b><button data-insp="loops+" data-id="${r.id}">+</button></div></div>
      <div class="insp-row"><span>Notes</span><b>${r.notes.length}</b></div>
      <button class="btn small wide" data-insp="openEditor" data-id="${r.id}">${icon('editor', 14)} Ouvrir dans l'éditeur</button>`;
  } else {
    body += `<div class="insp-knobs">${knob(`r:${r.id}:gain`, { size: 's' })}${knob(`r:${r.id}:fadeIn`, { size: 's' })}${knob(`r:${r.id}:fadeOut`, { size: 's' })}</div>`;
  }
  return section('region', `Région`, body);
}

function presetOptions(track) {
  const type = track.instrument.type;
  const list = PRESETS.filter((pr) => (type === 'drums' ? pr.type === 'drums' : pr.type !== 'drums'));
  const cats = PRESET_CATEGORIES.filter((c) => list.some((pr) => pr.category === c));
  return `<option value="">— Choisir un son —</option>${cats.map((c) => `<optgroup label="${esc(c)}">${list.filter((pr) => pr.category === c).map((pr) => `<option value="${pr.id}"${track.instrument.preset === pr.id ? ' selected' : ''}>${esc(pr.name)}</option>`).join('')}</optgroup>`).join('')}`;
}

function instrumentSection(t) {
  const inst = t.instrument;
  const def = INSTRUMENTS[inst.type];
  const smart = def.smart.map((k) => control(`t:${t.id}:inst:${k}`, { size: 'm' })).join('');
  const showAll = ui.showAllParams;
  const all = def.params.filter((d) => !def.smart.includes(d.key)).map((d) => control(`t:${t.id}:inst:${d.key}`, { size: 's' })).join('');
  let samplerInfo = '';
  if (inst.type === 'sampler') {
    const meta = inst.sampleId ? project().audio[inst.sampleId] : null;
    samplerInfo = `<div class="insp-row"><span>Son</span><b>${meta ? esc(meta.name) : 'aucun'}</b></div>
      <button class="btn small wide" data-insp="loadSample" data-id="${t.id}">${icon('folder', 14)} Charger un son…</button>`;
  }
  const body = `
    <label class="insp-field" data-help="Sons prêts à jouer, rangés par famille.">Son
      <select data-insp-sel="preset" data-id="${t.id}">${presetOptions(t)}</select></label>
    <label class="insp-field" data-help="Type d'instrument (moteur sonore).">Instrument
      <select data-insp-sel="instType" data-id="${t.id}">${INSTRUMENT_ORDER.map((k) => `<option value="${k}"${k === inst.type ? ' selected' : ''}>${esc(INSTRUMENTS[k].label)}</option>`).join('')}</select></label>
    <p class="muted small">${esc(def.help)}</p>
    ${samplerInfo}
    <div class="insp-knobs smart">${smart}</div>
    <button class="btn small wide ghost" data-insp="allParams">${showAll ? 'Masquer' : 'Afficher'} tous les réglages</button>
    ${showAll ? `<div class="insp-knobs">${all}</div>` : ''}`;
  return section('inst', `Instrument`, body);
}

function arpSection(t) {
  if (t.kind === 'drums') return '';
  const a = t.instrument.arp;
  const body = `<label class="insp-row check" data-help="L'arpégiateur rejoue les accords tenus note par note, au rythme choisi."><input type="checkbox" data-insp-check="arpOn" data-id="${t.id}"${a.on ? ' checked' : ''}> Activer l'arpégiateur</label>
    ${a.on ? `<label class="insp-field">Ordre<select data-insp-sel="arp:mode" data-id="${t.id}">${[['up', 'Montant'], ['down', 'Descendant'], ['updown', 'Monte et descend'], ['random', 'Au hasard'], ['chord', 'Accords répétés']].map(([v, l]) => `<option value="${v}"${a.mode === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="insp-field">Rythme<select data-insp-sel="arp:rate" data-id="${t.id}">${NOTE_VALUES.filter((n) => n.ticks <= 960).map((n) => `<option value="${n.id}"${a.rate === n.id ? ' selected' : ''}>${esc(n.label)}</option>`).join('')}</select></label>
    <label class="insp-field">Octaves<select data-insp-sel="arp:octaves" data-id="${t.id}">${[1, 2, 3].map((o) => `<option${a.octaves === o ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
    <label class="insp-field">Durée des notes<input type="range" min="0.1" max="1" step="0.05" value="${a.gate}" data-insp-range="arp:gate" data-id="${t.id}"></label>` : ''}`;
  return section('arp', 'Arpégiateur', body, { open: false });
}

function inputSection(t) {
  const body = `<label class="insp-field" data-help="Micro ou interface audio utilisé pour enregistrer.">Entrée
      <select data-insp-sel="input">${inputs.length ? inputs.map((i) => `<option value="${esc(i.id)}"${ui.inputDevice === i.id ? ' selected' : ''}>${esc(i.label)}</option>`).join('') : '<option value="">Entrée par défaut</option>'}</select></label>
    <button class="btn small wide ghost" data-insp="refreshInputs">Actualiser la liste</button>
    <label class="insp-row check"><input type="checkbox" data-insp-check="arm" data-id="${t.id}"${t.arm ? ' checked' : ''}> Prête à enregistrer</label>
    <p class="muted small">Appuyez sur ● (ou R) pour enregistrer sur cette piste. Utilisez un casque pour éviter que le micro capte les haut-parleurs.</p>`;
  return section('input', 'Enregistrement', body);
}

function effectsBody(effects, owner) {
  return `${effects.map((e, i) => {
    const def = EFFECTS[e.type];
    const open = ui.expandedFx === e.id;
    const base = owner === 'm' ? `m:fx:${e.id}` : owner.startsWith('b:') ? `b:${owner.slice(2)}:fx:${e.id}` : `t:${owner.slice(2)}:fx:${e.id}`;
    return `<div class="fx-item${open ? ' open' : ''}${e.on ? '' : ' off'}">
      <div class="fx-head">
        <button class="icon-btn small${e.on ? ' lit' : ''}" data-fx-toggle="${e.id}" data-owner="${owner}" data-help="Allumer / éteindre l'effet (comparer avec et sans).">${icon('power', 13)}</button>
        <button class="fx-name" data-fx-expand="${e.id}" data-help="${esc(def.help)}">${esc(def.label)}</button>
        <button class="icon-btn small" data-fx-move="-1" data-fx="${e.id}" data-owner="${owner}" ${i === 0 ? 'disabled' : ''} data-help="Monter dans la chaîne">${icon('up', 13)}</button>
        <button class="icon-btn small" data-fx-move="1" data-fx="${e.id}" data-owner="${owner}" ${i === effects.length - 1 ? 'disabled' : ''} data-help="Descendre dans la chaîne">${icon('down', 13)}</button>
        <button class="icon-btn small" data-fx-del="${e.id}" data-owner="${owner}" data-help="Retirer l'effet">${icon('close', 13)}</button>
      </div>
      ${open ? `<p class="muted small">${esc(def.help)}</p><div class="insp-knobs">${def.params.map((d) => control(`${base}:${d.key}`, { size: 's' })).join('')}</div>` : ''}
    </div>`;
  }).join('')}
  <button class="btn small wide" data-fx-add-insp="${owner}">${icon('plus', 13)} Ajouter un effet</button>`;
}

function channelSection(t) {
  const body = `<div class="insp-channel">
      ${fader(`t:${t.id}:volume`, { height: 120 })}
      <div class="insp-knobs col">${knob(`t:${t.id}:pan`, { label: 'Pan', size: 's' })}${knob(`t:${t.id}:send0`, { label: 'Réverbe', size: 's' })}${knob(`t:${t.id}:send1`, { label: 'Écho', size: 's' })}</div>
    </div>
    <div class="insp-row btns">
      <button class="tbtn tb-m${t.mute ? ' on' : ''}" data-insp-tog="mute" data-id="${t.id}">M</button>
      <button class="tbtn tb-s${t.solo ? ' on' : ''}" data-insp-tog="solo" data-id="${t.id}">S</button>
      <button class="tbtn tb-r${t.arm ? ' on' : ''}" data-insp-tog="arm" data-id="${t.id}">${icon('record', 10)}</button>
    </div>`;
  return section('channel', 'Volume et espace', body) + section('fx', 'Effets', effectsBody(t.effects, `t:${t.id}`));
}

function busInspector(i) {
  const p = project();
  const bus = p.buses[i];
  return `<div class="insp-title"><span class="insp-dot" style="--c:#8a93a3"></span><b>${esc(bus.name)}</b><span class="muted small">Bus d'effet partagé</span></div>
    <p class="muted small">Les pistes envoient une part de leur son vers ce bus avec leurs boutons « ${esc(bus.name)} ».</p>
    ${section('busch', 'Volume', `<div class="insp-channel">${fader(`b:${i}:volume`, { height: 110 })}<div class="insp-knobs col">${knob(`b:${i}:pan`, { label: 'Pan', size: 's' })}</div></div>`)}
    ${section('fx', 'Effets', effectsBody(bus.effects, `b:${i}`))}
    <button class="btn small wide ghost" data-insp="backToTrack">Revenir à la piste</button>`;
}

function masterInspector() {
  const p = project();
  return `<div class="insp-title"><span class="insp-dot" style="--c:#f2f4f7"></span><b>Sortie</b><span class="muted small">Mixage final</span></div>
    ${section('mch', 'Volume général', `<div class="insp-channel">${fader('m:volume', { height: 110 })}<div class="insp-knobs col">${knob('p:metro', { label: 'Métronome', size: 's' })}</div></div>`)}
    ${section('fx', 'Effets de mastering', effectsBody(p.master.effects, 'm'))}
    <button class="btn small wide ghost" data-insp="backToTrack">Revenir à la piste</button>`;
}

export function inspectorHtml() {
  if (ui.inspectTarget === 'master') return masterInspector();
  if (ui.inspectTarget && ui.inspectTarget.startsWith('bus')) return busInspector(Number(ui.inspectTarget.slice(3)));
  const t = selectedTrack();
  if (!t) return '<p class="muted pad">Aucune piste. Ajoutez-en une avec « Nouvelle piste ».</p>';
  return `<div class="insp-title"><span class="insp-dot" style="--c:${t.color}"></span><b data-insp="renameTrack" data-id="${t.id}" title="Cliquez pour renommer">${esc(t.name)}</b>
      <span class="muted small">${t.kind === 'audio' ? 'Piste audio' : t.kind === 'drums' ? 'Batterie' : 'Instrument logiciel'}</span></div>
    ${regionSection()}
    ${t.instrument ? instrumentSection(t) + arpSection(t) : inputSection(t)}
    ${channelSection(t)}
    <div class="insp-links"><button class="link" data-insp="showMaster">Sortie générale…</button> · <button class="link" data-insp="showBus0">Réverbe…</button> · <button class="link" data-insp="showBus1">Écho…</button></div>`;
}

export function installInspector(root, { pickSample }) {
  root.addEventListener('click', (e) => {
    const sec = e.target.closest('[data-sec-toggle]');
    if (sec) {
      ui.closedSections = ui.closedSections || {};
      const id = sec.dataset.secToggle;
      const el = sec.closest('.insp-sec');
      ui.closedSections[id] = el.classList.contains('open');
      emit('ui');
      return;
    }
    const tog = e.target.closest('[data-fx-toggle]');
    if (tog) {
      commit('Allumer / éteindre l\'effet', (p) => { const fx = effectsOf(p, tog.dataset.owner).find((x) => x.id === tog.dataset.fxToggle); if (fx) fx.on = !fx.on; });
      return;
    }
    const exp = e.target.closest('[data-fx-expand]');
    if (exp) { ui.expandedFx = ui.expandedFx === exp.dataset.fxExpand ? null : exp.dataset.fxExpand; emit('ui'); return; }
    const mv = e.target.closest('[data-fx-move]');
    if (mv) {
      commit('Réordonner les effets', (p) => {
        const list = effectsOf(p, mv.dataset.owner);
        const i = list.findIndex((x) => x.id === mv.dataset.fx);
        const j = i + Number(mv.dataset.fxMove);
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
      });
      return;
    }
    const del = e.target.closest('[data-fx-del]');
    if (del) {
      commit('Retirer l\'effet', (p) => { const list = effectsOf(p, del.dataset.owner); const i = list.findIndex((x) => x.id === del.dataset.fxDel); if (i >= 0) list.splice(i, 1); });
      return;
    }
    const add = e.target.closest('[data-fx-add-insp]');
    if (add) { const r = add.getBoundingClientRect(); addEffectMenu(r.left, r.bottom + 2, add.dataset.fxAddInsp); return; }
    const it = e.target.closest('[data-insp-tog]');
    if (it) { toggleTrack(it.dataset.id, it.dataset.inspTog); return; }
    const b = e.target.closest('[data-insp]');
    if (!b) return;
    const a = b.dataset.insp;
    const id = b.dataset.id;
    if (a === 'renameRegion') {
      const f = findRegion(id);
      promptText('Renommer la région', f.region.name).then((n) => { if (n) setRegionProp(id, 'name', n, 'Renommer la région'); });
    } else if (a === 'renameTrack') {
      const t = findTrack(id);
      promptText('Renommer la piste', t.name).then((n) => { if (n) commit('Renommer la piste', (p) => { findTrack(id, p).name = n; }); });
    } else if (a === 'loops-' || a === 'loops+') {
      const f = findRegion(id);
      const v = Math.max(1, (f.region.loops || 1) + (a === 'loops+' ? 1 : -1));
      setRegionProp(id, 'loops', v, 'Répétitions de la région');
    } else if (a === 'openEditor') openEditor(id);
    else if (a === 'allParams') { ui.showAllParams = !ui.showAllParams; emit('ui'); }
    else if (a === 'loadSample') pickSample(id);
    else if (a === 'refreshInputs') refreshInputs();
    else if (a === 'showMaster') focusOwner('m');
    else if (a === 'showBus0') focusOwner('b:0');
    else if (a === 'showBus1') focusOwner('b:1');
    else if (a === 'backToTrack') { ui.inspectTarget = null; emit('ui'); }
  });
  root.addEventListener('change', (e) => {
    const s = e.target.closest('[data-insp-sel]');
    const c = e.target.closest('[data-insp-check]');
    const rg = e.target.closest('[data-insp-range]');
    if (s) {
      const k = s.dataset.inspSel;
      const id = s.dataset.id;
      if (k === 'preset' && s.value) applyPreset(id, s.value);
      else if (k === 'instType') setInstrumentType(id, s.value);
      else if (k === 'input') { ui.inputDevice = s.value || null; emit('ui'); }
      else if (k.startsWith('arp:')) {
        const key = k.slice(4);
        commit('Arpégiateur', (p) => { findTrack(id, p).instrument.arp[key] = key === 'octaves' ? Number(s.value) : s.value; });
      }
    } else if (c) {
      const id = c.dataset.id;
      const k = c.dataset.inspCheck;
      if (k === 'regionMute') setRegionProp(id, 'mute', c.checked, 'Silence sur la région');
      if (k === 'arpOn') commit('Arpégiateur', (p) => { findTrack(id, p).instrument.arp.on = c.checked; });
      if (k === 'arm') toggleTrack(id, 'arm');
    } else if (rg) {
      const id = rg.dataset.id;
      commit('Arpégiateur', (p) => { findTrack(id, p).instrument.arp.gate = Number(rg.value); });
    }
  });
}
