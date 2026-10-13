// Bibliothèque (panneau de gauche) : sons d'instruments et boucles prêtes à l'emploi.
// Clic = appliquer à la piste sélectionnée ; double-clic ou glisser = nouvelle piste.

import { esc } from './dom.js';
import { icon } from './icons.js';
import { ui, project, emit, selectedTrack } from './store.js';
import { PRESETS, PRESET_CATEGORIES, LOOPS, LOOP_CATEGORIES, PROGRESSION_LIST, findLoop, findPreset } from '../core/library.js';
import { instrumentDefaults } from '../core/defs.js';
import { KEY_ROOTS, SCALES } from '../core/music.js';
import { applyPreset, addTrack, addLoop } from './ops.js';
import { previewSequence, stopPreviewSequence, previewNotes } from '../audio/engine.js';

let playingLoop = null;

function soundsHtml() {
  const t = selectedTrack();
  const q = (ui.libSearch || '').toLowerCase();
  return PRESET_CATEGORIES.map((cat) => {
    const list = PRESETS.filter((p) => p.category === cat && (!q || p.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)));
    if (!list.length) return '';
    const open = q || ui.libraryOpen[cat] !== false;
    return `<div class="lib-cat${open ? ' open' : ''}">
      <button class="lib-cat-head" data-lib-cat="${esc(cat)}">${icon(open ? 'chevronDown' : 'chevronRight', 13)} ${esc(cat)} <span class="muted small">${list.length}</span></button>
      ${open ? list.map((p) => `<div class="lib-item${t && t.instrument && t.instrument.preset === p.id ? ' current' : ''}" draggable="true" data-preset="${p.id}" data-help="Clic : donner ce son à la piste sélectionnée. Double-clic ou glisser : nouvelle piste avec ce son.">
        <span class="lib-ico">${icon(p.type === 'drums' ? 'drum' : 'piano', 15)}</span><span>${esc(p.name)}</span>
        <button class="icon-btn small lib-play" data-preview-preset="${p.id}" data-help="Écouter">${icon('play', 12)}</button></div>`).join('') : ''}
    </div>`;
  }).join('');
}

function loopsHtml() {
  const p = project();
  const q = (ui.libSearch || '').toLowerCase();
  return `<div class="lib-key muted small">Tonalité du projet : <b>${esc(KEY_ROOTS[p.key].label)} ${esc(SCALES[p.scale].label.toLowerCase())}</b> — les boucles s'y adaptent.</div>
    <label class="insp-field" data-help="Suite d'accords utilisée par les boucles de basse et d'accords.">Suite d'accords
      <select data-lib-prog>${PROGRESSION_LIST.map((pr) => `<option value="${pr.id}"${ui.progression === pr.id ? ' selected' : ''}>${esc(pr.name)}</option>`).join('')}</select></label>
    ${LOOP_CATEGORIES.map((cat) => {
    const list = LOOPS.filter((l) => l.category === cat && (!q || l.name.toLowerCase().includes(q)));
    if (!list.length) return '';
    const open = q || ui.libraryOpen[`loop-${cat}`] !== false;
    return `<div class="lib-cat${open ? ' open' : ''}">
      <button class="lib-cat-head" data-lib-cat="loop-${esc(cat)}">${icon(open ? 'chevronDown' : 'chevronRight', 13)} ${esc(cat)} <span class="muted small">${list.length}</span></button>
      ${open ? list.map((l) => `<div class="lib-item" draggable="true" data-loop="${l.id}" data-help="Double-clic : ajouter à la tête de lecture. Glisser : déposer sur une piste ou dans le vide.">
        <span class="lib-ico">${icon(l.category === 'Batterie' ? 'drum' : 'note', 15)}</span><span>${esc(l.name)}</span><span class="muted small">${l.bars} mes.</span>
        <button class="icon-btn small lib-play${playingLoop === l.id ? ' lit' : ''}" data-preview-loop="${l.id}" data-help="Écouter">${icon(playingLoop === l.id ? 'stop' : 'play', 12)}</button></div>`).join('') : ''}
    </div>`;
  }).join('')}`;
}

export function libraryHtml() {
  return `<div class="lib-tabs seg">
      <button class="${ui.libraryTab === 'sons' ? 'on' : ''}" data-lib-tab="sons">Sons</button>
      <button class="${ui.libraryTab === 'boucles' ? 'on' : ''}" data-lib-tab="boucles">Boucles</button>
    </div>
    <input class="text-input lib-search" type="search" placeholder="Rechercher…" value="${esc(ui.libSearch || '')}" data-lib-search>
    <div class="lib-list">${ui.libraryTab === 'boucles' ? loopsHtml() : soundsHtml()}</div>
    <div class="lib-foot">
      <button class="btn small wide" data-lib-import="audio">${icon('wave', 14)} Importer un son…</button>
      <button class="btn small wide" data-lib-import="midi">${icon('note', 14)} Importer un fichier MIDI…</button>
    </div>`;
}

function previewPreset(id) {
  const pr = findPreset(id);
  if (!pr) return;
  const def = { type: pr.type, params: { ...instrumentDefaults(pr.type), ...pr.params }, sampleId: null };
  const notes = pr.type === 'drums'
    ? [36, 42, 38, 42, 36, 36, 38, 46].map((pitch, i) => ({ pitch, start: i * 240, length: 200, vel: 100 }))
    : [60, 64, 67, 72].map((pitch, i) => ({ pitch: pr.category === 'Basses' ? pitch - 24 : pitch, start: i * 240, length: 900 - i * 240, vel: 100 }));
  previewSequence(def, notes, 120, 4);
}

function previewLoop(id) {
  if (playingLoop === id) { stopPreviewSequence(); playingLoop = null; emit('ui'); return; }
  const loop = findLoop(id);
  const p = project();
  const notes = loop.build(p, ui.progression);
  const pr = findPreset(loop.preset);
  const def = { type: pr.type, params: { ...instrumentDefaults(pr.type), ...pr.params }, sampleId: null };
  previewSequence(def, notes, p.bpm, 10);
  playingLoop = id;
  emit('ui');
  setTimeout(() => { if (playingLoop === id) { playingLoop = null; emit('ui'); } }, 10000);
}

export function installLibrary(root, { importAudio, importMidi }) {
  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-lib-tab]');
    if (tab) { ui.libraryTab = tab.dataset.libTab; emit('ui'); return; }
    const cat = e.target.closest('[data-lib-cat]');
    if (cat) { const k = cat.dataset.libCat; ui.libraryOpen[k] = ui.libraryOpen[k] === false; emit('ui'); return; }
    const pp = e.target.closest('[data-preview-preset]');
    if (pp) { previewPreset(pp.dataset.previewPreset); return; }
    const pl = e.target.closest('[data-preview-loop]');
    if (pl) { previewLoop(pl.dataset.previewLoop); return; }
    const imp = e.target.closest('[data-lib-import]');
    if (imp) { if (imp.dataset.libImport === 'audio') importAudio(); else importMidi(); return; }
    const preset = e.target.closest('[data-preset]');
    if (preset) {
      const t = selectedTrack();
      const pr = findPreset(preset.dataset.preset);
      const compatible = t && t.instrument && ((pr.type === 'drums') === (t.instrument.type === 'drums'));
      if (compatible) applyPreset(t.id, pr.id);
      else addTrack(pr.type === 'drums' ? 'drums' : 'instrument', { presetId: pr.id });
      previewNotes(ui.selectedTrackId, pr.type === 'drums' ? [36] : [pr.category === 'Basses' ? 36 : 60], 100, 0.5);
    }
  });
  root.addEventListener('dblclick', (e) => {
    const preset = e.target.closest('[data-preset]');
    if (preset && !e.target.closest('button')) {
      const pr = findPreset(preset.dataset.preset);
      addTrack(pr.type === 'drums' ? 'drums' : 'instrument', { presetId: pr.id });
      return;
    }
    const loop = e.target.closest('[data-loop]');
    if (loop && !e.target.closest('button')) addLoop(loop.dataset.loop, { trackId: null });
  });
  root.addEventListener('dragstart', (e) => {
    const preset = e.target.closest('[data-preset]');
    const loop = e.target.closest('[data-loop]');
    if (preset) e.dataTransfer.setData('application/x-onde-preset', preset.dataset.preset);
    if (loop) e.dataTransfer.setData('application/x-onde-loop', loop.dataset.loop);
    e.dataTransfer.effectAllowed = 'copy';
  });
  root.addEventListener('change', (e) => {
    const prog = e.target.closest('[data-lib-prog]');
    if (prog) { ui.progression = prog.value; emit('ui'); }
  });
  root.addEventListener('input', (e) => {
    const s = e.target.closest('[data-lib-search]');
    if (!s) return;
    ui.libSearch = s.value;
    const list = root.querySelector('.lib-list');
    if (list) list.innerHTML = ui.libraryTab === 'boucles' ? loopsHtml() : soundsHtml();
  });
}
