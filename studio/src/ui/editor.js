// Panneau Éditeur (bas de l'écran) : barre d'outils + piano roll, pas de batterie ou éditeur audio.

import { esc } from './dom.js';
import { icon } from './icons.js';
import { ui, project, emit, commit, editorRegion } from './store.js';
import { CHORD_TYPES, legatoNotes, humanizeNotes, fitNotesToScale, changeVelocity, SCALES } from '../core/music.js';
import { ticksPerBar } from '../core/time.js';
import { showMenu } from './popup.js';
import { quantizeRegions, transposeRegions, normalizeRegion, samplerFromRegion, setRegionProp, createRegionAt, openEditor } from './ops.js';
import { mountPianoRoll, unmountPianoRoll, drawPianoRoll, selectAllNotes } from './pianoRoll.js';
import { mountSteps, unmountSteps, drawSteps } from './stepSeq.js';
import { mountAudioEditor, unmountAudioEditor, drawAudioEditor } from './audioEditor.js';
import { knob } from './controls.js';

let mounted = { kind: null, host: null };

function viewKind() {
  const er = editorRegion();
  if (!er) return 'empty';
  if (er.region.type === 'audio') return 'audio';
  if (er.track.kind === 'drums' && ui.editorView !== 'piano') return 'steps';
  return 'piano';
}

const QUANT = [
  { id: '1/4', label: 'Noire' }, { id: '1/8', label: 'Croche' }, { id: '1/16', label: 'Double croche' },
  { id: '1/32', label: 'Triple croche' }, { id: '1/8T', label: 'Triolet de croches' }, { id: '1/16T', label: 'Triolet de doubles' },
];

function midiToolbar(region, track) {
  const drums = track.kind === 'drums';
  const kind = viewKind();
  const sel = ui.selectedNotes.size;
  return `
    <div class="ed-group">
      <span class="ed-title" style="--c:${track.color}">${esc(region.name)}</span>
      <span class="muted small">${sel ? `${sel} note(s) sélectionnée(s)` : `${region.notes.length} note(s)`}</span>
    </div>
    ${drums ? `<div class="seg" data-help="Pas à pas : grille de batterie simple. Piano roll : édition détaillée.">
      <button class="${kind === 'steps' ? 'on' : ''}" data-ed="viewSteps">Pas à pas</button>
      <button class="${kind === 'piano' ? 'on' : ''}" data-ed="viewPiano">Piano roll</button></div>` : ''}
    ${kind === 'steps' ? `<label class="ed-field" data-help="Finesse de la grille de pas.">Pas
      <select data-ed-sel="stepRes">${['1/8', '1/16', '1/32'].map((r) => `<option${ui.stepRes === r ? ' selected' : ''}>${r}</option>`).join('')}</select></label>` : ''}
    <div class="ed-group" data-help="Quantifier : cale les notes (sélectionnées, ou toutes) sur la grille choisie. Raccourci : Q.">
      <select data-ed-sel="quant">${QUANT.map((q) => `<option value="${q.id}"${(ui.quant || '1/16') === q.id ? ' selected' : ''}>${q.label}</option>`).join('')}</select>
      <button class="btn small" data-ed="quantize">${icon('magnet', 14)} Quantifier</button>
    </div>
    ${drums && kind === 'steps' ? '' : `<div class="ed-group" data-help="Transposer les notes sélectionnées (ou toutes) : demi-ton ou octave.">
      <button class="btn small" data-ed="tr-12">−8ve</button><button class="btn small" data-ed="tr-1">−1</button>
      <button class="btn small" data-ed="tr1">+1</button><button class="btn small" data-ed="tr12">+8ve</button>
    </div>`}
    ${kind === 'piano' ? `<label class="ed-field" data-help="Avec le crayon, poser une note peut poser un accord entier.">Crayon
      <select data-ed-sel="chord">${Object.entries(CHORD_TYPES).map(([k, c]) => `<option value="${k}"${ui.chordMode === k ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>` : ''}
    <label class="ed-field" data-help="Force des nouvelles notes. « Appliquer » la donne aux notes sélectionnées.">Vélocité
      <input type="range" min="1" max="127" value="${ui.velocity}" data-ed-range="velocity"><span class="ed-num">${ui.velocity}</span>
      <button class="btn small" data-ed="applyVel" ${sel ? '' : 'disabled'}>Appliquer</button></label>
    <button class="btn small" data-ed="more">Fonctions ${icon('chevronDown', 13)}</button>
    <span class="spacer"></span>
    ${kind === 'piano' ? `<button class="icon-btn" data-ed="zoomOut" data-help="Dézoomer (Ctrl+molette)">${icon('zoomOut', 16)}</button><button class="icon-btn" data-ed="zoomIn" data-help="Zoomer (Ctrl+molette)">${icon('zoomIn', 16)}</button>` : ''}`;
}

function audioToolbar(region, track) {
  return `
    <div class="ed-group"><span class="ed-title" style="--c:${track.color}">${esc(region.name)}</span>
      <span class="muted small">${region.duration.toFixed(2)} s</span></div>
    <div class="ed-knobs">
      ${knob(`r:${region.id}:gain`, { size: 's', help: 'Gain de la région : plus fort ou plus doux.' })}
      ${knob(`r:${region.id}:fadeIn`, { size: 's', help: 'Fondu d\'entrée : le son monte progressivement.' })}
      ${knob(`r:${region.id}:fadeOut`, { size: 's', help: 'Fondu de sortie : le son s\'éteint progressivement.' })}
    </div>
    <button class="btn small" data-ed="normalize" data-help="Monte le gain pour que le passage le plus fort atteigne presque le maximum.">Normaliser</button>
    <button class="btn small${region.reverse ? ' on' : ''}" data-ed="reverse" data-help="Lit le son à l'envers.">À l'envers</button>
    <button class="btn small" data-ed="sampler" data-help="Crée une piste d'instrument qui joue ce son sur toutes les notes.">${icon('piano', 14)} Créer un instrument</button>
    <span class="spacer"></span>`;
}

function emptyView() {
  const sel = project().tracks.find((t) => t.id === ui.selectedTrackId);
  return `<div class="ed-empty">
    <p>${icon('editor', 28)}</p>
    <p><strong>Aucune région ouverte.</strong></p>
    <p class="muted">Double-cliquez une région dans l'arrangement pour la modifier ici,
    ou double-cliquez une piste vide pour créer une région.</p>
    ${sel && sel.kind !== 'audio' ? '<button class="btn primary" data-ed="newRegion">Créer une région sur la piste sélectionnée</button>' : ''}
  </div>`;
}

export function renderEditor(root) {
  const er = editorRegion();
  const kind = viewKind();
  const bar = root.querySelector('.ed-toolbar');
  const view = root.querySelector('.ed-view');
  if (bar) bar.innerHTML = er ? (er.region.type === 'audio' ? audioToolbar(er.region, er.track) : midiToolbar(er.region, er.track)) : '<span class="muted">Éditeur</span>';
  if (mounted.kind !== kind || mounted.host !== view) {
    if (mounted.kind === 'piano') unmountPianoRoll();
    if (mounted.kind === 'steps') unmountSteps();
    if (mounted.kind === 'audio') unmountAudioEditor();
    mounted = { kind, host: view };
    if (kind === 'piano') mountPianoRoll(view);
    else if (kind === 'steps') mountSteps(view);
    else if (kind === 'audio') mountAudioEditor(view);
    else view.innerHTML = emptyView();
  } else if (kind === 'empty') view.innerHTML = emptyView();
  drawEditor();
}

export function drawEditor() {
  if (mounted.kind === 'piano') drawPianoRoll();
  else if (mounted.kind === 'steps') drawSteps();
  else if (mounted.kind === 'audio') drawAudioEditor();
}

export function resetEditorMount() {
  mounted = { kind: null, host: null };
}

function moreMenu(btn) {
  const r = btn.getBoundingClientRect();
  const er = editorRegion();
  if (!er) return;
  const p = project();
  const apply = (label, fn) => commit(label, () => {
    const region = editorRegion().region;
    const sel = ui.selectedNotes.size ? ui.selectedNotes : null;
    const chosen = region.notes.filter((n) => !sel || sel.has(n.id));
    const rest = region.notes.filter((n) => sel && !sel.has(n.id));
    region.notes = [...rest, ...fn(chosen)];
  });
  showMenu(r.left, r.bottom + 4, [
    { label: 'Tout sélectionner', shortcut: 'Ctrl+A', action: selectAllNotes },
    '-',
    { label: 'Legato (notes liées)', action: () => apply('Legato', legatoNotes) },
    { label: 'Humaniser (moins mécanique)', action: () => apply('Humaniser', (ns) => humanizeNotes(ns, Math.random, { time: 10, vel: 12 })) },
    { label: `Caler sur la gamme (${SCALES[p.scale].label})`, disabled: er.track.kind === 'drums', action: () => apply('Caler sur la gamme', (ns) => fitNotesToScale(ns, p.key, p.scale)) },
    { label: 'Vélocité +10', action: () => apply('Vélocité', (ns) => changeVelocity(ns, { add: 10 })) },
    { label: 'Vélocité −10', action: () => apply('Vélocité', (ns) => changeVelocity(ns, { add: -10 })) },
    { label: 'Durées ×2', action: () => apply('Durées ×2', (ns) => ns.map((n) => ({ ...n, length: n.length * 2 }))) },
    { label: 'Durées ÷2', action: () => apply('Durées ÷2', (ns) => ns.map((n) => ({ ...n, length: Math.max(10, Math.round(n.length / 2)) }))) },
    { label: 'Vitesse ×2 (tout deux fois plus vite)', action: () => apply('Vitesse ×2', (ns) => ns.map((n) => ({ ...n, start: Math.round(n.start / 2), length: Math.max(10, Math.round(n.length / 2)) }))) },
    { label: 'Vitesse ÷2 (tout deux fois plus lent)', action: () => commit('Vitesse ÷2', () => {
      const region = editorRegion().region;
      const sel = ui.selectedNotes.size ? ui.selectedNotes : null;
      for (const n of region.notes) if (!sel || sel.has(n.id)) { n.start *= 2; n.length *= 2; }
      const end = Math.max(...region.notes.map((n) => n.start + n.length), region.length);
      region.length = Math.ceil(end / ticksPerBar(p)) * ticksPerBar(p);
    }) },
  ]);
}

export function installEditor(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ed]');
    if (!b) return;
    const er = editorRegion();
    const a = b.dataset.ed;
    if (a === 'newRegion') {
      const r = createRegionAt(ui.selectedTrackId, Math.floor(ui.playhead / ticksPerBar(project())) * ticksPerBar(project()));
      if (r) openEditor(r.id);
      return;
    }
    if (!er) return;
    const id = er.region.id;
    if (a === 'viewSteps') { ui.editorView = 'auto'; emit('ui'); }
    if (a === 'viewPiano') { ui.editorView = 'piano'; emit('ui'); }
    if (a === 'quantize') quantizeRegions([id], ui.quant || '1/16');
    if (a.startsWith('tr')) transposeRegions([id], Number(a.slice(2)));
    if (a === 'applyVel') commit('Vélocité', () => { for (const n of editorRegion().region.notes) if (ui.selectedNotes.has(n.id)) n.vel = ui.velocity; });
    if (a === 'more') moreMenu(b);
    if (a === 'zoomIn') { ui.prZoom = Math.min(2, ui.prZoom * 1.3); drawEditor(); }
    if (a === 'zoomOut') { ui.prZoom = Math.max(0.02, ui.prZoom / 1.3); drawEditor(); }
    if (a === 'normalize') normalizeRegion(id);
    if (a === 'reverse') setRegionProp(id, 'reverse', !er.region.reverse, 'Inverser le son');
    if (a === 'sampler') samplerFromRegion(id);
  });
  root.addEventListener('change', (e) => {
    const s = e.target.closest('[data-ed-sel]');
    if (!s) return;
    const k = s.dataset.edSel;
    if (k === 'quant') ui.quant = s.value;
    if (k === 'chord') ui.chordMode = s.value;
    if (k === 'stepRes') ui.stepRes = s.value;
    emit('ui');
  });
  root.addEventListener('input', (e) => {
    const r = e.target.closest('[data-ed-range]');
    if (!r) return;
    ui.velocity = Number(r.value);
    const num = r.parentElement.querySelector('.ed-num');
    if (num) num.textContent = r.value;
  });
}

