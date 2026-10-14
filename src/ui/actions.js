// Commandes de l'application : menus, raccourcis clavier et barre d'outils passent tous ici.

import { ui, project, emit, commit, undo, redo, historyInfo, editorRegion, findTrack } from './store.js';
import { togglePlay, stopPlay, toggleRecord, nudgeBars, setPlayhead, goToEnd, currentTick, playFromStart } from './transport.js';
import {
  deleteRegions, duplicateRegions, copyRegions, pasteRegions, splitAt, joinSelected, toggleMuteRegions,
  quantizeRegions, transposeRegions, deleteTrack, duplicateTrack,
} from './ops.js';
import { deleteSelectedNotes, shiftSelected, selectAllNotes, copyNotes, pasteNotes, gridStep } from './pianoRoll.js';
import { saveProject, saveProjectAs, openProjectPicker, importAudioPicker, importMidiPicker } from './files.js';
import { welcomeDialog, newTrackDialog, songDialog, exportDialog, prefsDialog, shortcutsDialog, guideDialog, APP_NAME } from './dialogs.js';
import { zoomAt, zoomToFit } from './arrange.js';
import { typingKeyDown, typingKeyUp, releaseAllTyping } from './musicalTyping.js';
import { toast } from './toast.js';
import { snap } from '../core/time.js';
import { regionEnd } from '../core/project.js';
import { modal } from './popup.js';
import { VERSION } from '../version.js';
import { tapTempo } from '../core/music.js';
import { allNotesOff } from '../audio/engine.js';

function inEditor() {
  const er = editorRegion();
  return ui.focusArea === 'editor' && ui.bottom === 'editor' && er && er.region.type === 'midi';
}

const sel = () => [...ui.selectedRegions];

export const TOOLS = [
  { id: 'pointer', label: 'Pointeur', icon: 'pointer', help: 'Pointeur : sélectionner, déplacer, redimensionner.' },
  { id: 'pencil', label: 'Crayon', icon: 'pencil', help: 'Crayon : dessiner des régions et des notes.' },
  { id: 'eraser', label: 'Gomme', icon: 'eraser', help: 'Gomme : effacer des régions, des notes ou des points.' },
  { id: 'scissors', label: 'Ciseaux', icon: 'scissors', help: 'Ciseaux : couper une région en deux à l\'endroit cliqué.' },
  { id: 'glue', label: 'Colle', icon: 'glue', help: 'Colle : réunir les régions sélectionnées en une seule.' },
  { id: 'mute', label: 'Silence', icon: 'muteTool', help: 'Silence : rendre muette (ou non) une région.' },
];

let taps = [];

export const actions = {
  newProject: { label: 'Nouveau projet…', key: 'Ctrl+N', run: async () => { if (project().tracks.length) await saveProject({ quiet: true }); welcomeDialog(); } },
  open: { label: 'Ouvrir un fichier .onde…', key: 'Ctrl+O', run: () => openProjectPicker() },
  projects: { label: 'Mes projets…', run: () => welcomeDialog() },
  save: { label: 'Enregistrer', key: 'Ctrl+S', run: () => saveProject() },
  saveAs: { label: 'Enregistrer un fichier .onde…', key: 'Ctrl+Maj+S', run: () => saveProjectAs() },
  importAudio: { label: 'Importer un son…', key: 'Ctrl+I', run: () => importAudioPicker() },
  importMidi: { label: 'Importer un fichier MIDI…', run: () => importMidiPicker() },
  exportSong: { label: 'Exporter (WAV, pistes, MIDI)…', key: 'Ctrl+E', run: () => exportDialog() },
  song: { label: 'Réglages du morceau (tempo, tonalité)…', run: () => songDialog() },
  prefs: { label: 'Préférences…', key: 'Ctrl+,', run: () => prefsDialog() },

  undo: { label: 'Annuler', key: 'Ctrl+Z', run: () => { const l = undo(); if (l) toast(`Annulé : ${l}`); } },
  redo: { label: 'Rétablir', key: 'Ctrl+Y', run: () => { const l = redo(); if (l) toast(`Rétabli : ${l}`); } },
  copy: { label: 'Copier', key: 'Ctrl+C', run: () => (inEditor() ? copyNotes() : copyRegions(sel())) },
  cut: { label: 'Couper', key: 'Ctrl+X', run: () => { if (inEditor()) { if (copyNotes()) deleteSelectedNotes(); } else if (copyRegions(sel())) deleteRegions(sel()); } },
  paste: {
    label: 'Coller', key: 'Ctrl+V',
    run: () => {
      if (ui.clipboard && ui.clipboard.kind === 'notes' && editorRegion()) pasteNotes();
      else pasteRegions(snap(currentTick(), 1), ui.selectedTrackId);
    },
  },
  duplicate: { label: 'Dupliquer', key: 'Ctrl+D', run: () => (inEditor() ? (copyNotes() && pasteNotes()) : duplicateRegions(sel())) },
  delete: { label: 'Supprimer', key: 'Suppr', run: () => (inEditor() ? deleteSelectedNotes() : deleteRegions(sel())) },
  selectAll: {
    label: 'Tout sélectionner', key: 'Ctrl+A',
    run: () => {
      if (inEditor()) { selectAllNotes(); return; }
      ui.selectedRegions = new Set(project().tracks.flatMap((t) => t.regions.map((r) => r.id)));
      emit('ui');
    },
  },
  split: { label: 'Couper à la tête de lecture', key: 'Ctrl+T', run: () => { if (!splitAt(sel().length ? sel() : regionsUnderPlayhead(), Math.round(currentTick()))) toast('Placez la tête de lecture sur une région.'); } },
  join: { label: 'Joindre les régions', key: 'Ctrl+J', run: () => { if (!joinSelected(sel())) toast('Sélectionnez au moins deux régions MIDI d\'une même piste.'); } },
  quantize: { label: 'Quantifier', key: 'Q', run: () => { const ids = editorRegion() && ui.bottom === 'editor' ? [editorRegion().region.id] : sel(); if (ids.length) quantizeRegions(ids, ui.quant || '1/16'); } },
  muteRegion: { label: 'Rendre muette', key: 'M', run: () => toggleMuteRegions(sel()) },

  newTrack: { label: 'Nouvelle piste…', key: 'Ctrl+Maj+N', run: () => newTrackDialog() },
  duplicateTrack: { label: 'Dupliquer la piste', run: () => ui.selectedTrackId && duplicateTrack(ui.selectedTrackId) },
  deleteTrack: { label: 'Supprimer la piste', run: () => ui.selectedTrackId && deleteTrack(ui.selectedTrackId) },

  play: { label: 'Lecture / pause', key: 'Espace', run: () => togglePlay() },
  stop: { label: 'Stop', run: () => stopPlay() },
  record: { label: 'Enregistrer', key: 'R', run: () => toggleRecord() },
  toStart: { label: 'Aller au début', key: 'Entrée', run: () => setPlayhead(project().loop.on ? project().loop.start : 0) },
  toEnd: { label: 'Aller à la fin', key: 'Fin', run: () => goToEnd() },
  playFromStart: { label: 'Lire depuis le début', run: () => playFromStart() },
  prevBar: { label: 'Mesure précédente', key: ',', run: () => nudgeBars(-1) },
  nextBar: { label: 'Mesure suivante', key: ';', run: () => nudgeBars(1) },
  loop: { label: 'Boucle (cycle)', key: 'C', run: () => commit('Boucle', (p) => { p.loop.on = !p.loop.on; if (p.loop.end <= p.loop.start) p.loop.end = p.loop.start + 1920 * 4; }) },
  metronome: { label: 'Métronome', key: 'K', run: () => commit('Métronome', (p) => { p.metronome.on = !p.metronome.on; }) },
  countIn: { label: 'Décompte avant enregistrement', run: () => commit('Décompte', (p) => { p.metronome.countIn = !p.metronome.countIn; }) },
  tap: {
    label: 'Taper le tempo', run: () => {
      const now = performance.now() / 1000;
      taps = taps.filter((t) => now - t < 3);
      taps.push(now);
      const bpm = tapTempo(taps);
      if (bpm) commit('Tempo', (p) => { p.bpm = bpm; });
    },
  },

  library: { label: 'Bibliothèque', key: 'Y', run: () => { ui.showLibrary = !ui.showLibrary; emit('layout'); } },
  inspector: { label: 'Inspecteur', key: 'I', run: () => { ui.showInspector = !ui.showInspector; emit('layout'); } },
  editor: { label: 'Éditeur', key: 'E', run: () => { ui.bottom = ui.bottom === 'editor' ? null : 'editor'; if (ui.bottom === 'editor' && !ui.editorRegionId && ui.selectedRegions.size === 1) ui.editorRegionId = sel()[0]; emit('layout'); } },
  mixer: { label: 'Console de mixage', key: 'X', run: () => { ui.bottom = ui.bottom === 'mixer' ? null : 'mixer'; emit('layout'); } },
  typing: { label: 'Clavier musical', key: 'Ctrl+K', run: () => { ui.musicalTyping = !ui.musicalTyping; if (!ui.musicalTyping) releaseAllTyping(); emit('layout'); } },
  zoomIn: { label: 'Zoom avant', key: 'Ctrl++', run: () => zoomAt(1.3) },
  zoomOut: { label: 'Zoom arrière', key: 'Ctrl+-', run: () => zoomAt(1 / 1.3) },
  zoomFit: { label: 'Tout afficher', key: 'Ctrl+0', run: () => zoomToFit() },
  quickHelp: { label: 'Aide rapide', run: () => { ui.quickHelp = !ui.quickHelp; emit('layout'); } },

  shortcuts: { label: 'Raccourcis clavier', key: 'F1', run: () => shortcutsDialog() },
  guide: { label: 'Guide de démarrage', run: () => guideDialog() },
  about: {
    label: `À propos d'${APP_NAME}`,
    run: () => modal(`<h2>${APP_NAME}</h2><p>Version ${VERSION}</p><p class="muted">Station de travail audio-numérique pour composer, enregistrer, arranger et mixer.
      Moteur audio Web Audio, instruments et effets intégrés, aucune installation de greffon nécessaire.</p>
      <div class="modal-actions"><button class="btn primary" data-close>Fermer</button></div>`),
  },
};

function regionsUnderPlayhead() {
  const t = currentTick();
  const track = findTrack(ui.selectedTrackId);
  const tracks = track ? [track] : project().tracks;
  return tracks.flatMap((tr) => tr.regions.filter((r) => r.start < t && t < regionEnd(r, project().bpm)).map((r) => r.id));
}

export function run(id) {
  const a = actions[id];
  if (a) a.run();
}

export const MENUS = [
  { label: 'Fichier', items: ['newProject', 'projects', 'open', '-', 'save', 'saveAs', '-', 'importAudio', 'importMidi', '-', 'exportSong', '-', 'song', 'prefs'] },
  { label: 'Édition', items: ['undo', 'redo', '-', 'cut', 'copy', 'paste', 'duplicate', 'delete', 'selectAll', '-', 'split', 'join', 'quantize', 'muteRegion'] },
  { label: 'Piste', items: ['newTrack', 'duplicateTrack', 'deleteTrack'] },
  { label: 'Lecture', items: ['play', 'record', 'toStart', 'toEnd', 'prevBar', 'nextBar', '-', 'loop', 'metronome', 'countIn', 'tap'] },
  { label: 'Affichage', items: ['library', 'inspector', 'editor', 'mixer', 'typing', '-', 'zoomIn', 'zoomOut', 'zoomFit', '-', 'quickHelp'] },
  { label: 'Aide', items: ['guide', 'shortcuts', '-', 'about'] },
];

export function menuItems(menu) {
  const h = historyInfo();
  return menu.items.map((id) => {
    if (id === '-') return '-';
    const a = actions[id];
    let label = a.label;
    if (id === 'undo' && h.undoLabel) label = `Annuler : ${h.undoLabel}`;
    if (id === 'redo' && h.redoLabel) label = `Rétablir : ${h.redoLabel}`;
    const checked = { library: ui.showLibrary, inspector: ui.showInspector, editor: ui.bottom === 'editor', mixer: ui.bottom === 'mixer', typing: ui.musicalTyping, loop: project().loop.on, metronome: project().metronome.on, countIn: project().metronome.countIn, quickHelp: ui.quickHelp }[id];
    return { label, shortcut: a.key, checked, disabled: (id === 'undo' && !h.canUndo) || (id === 'redo' && !h.canRedo), action: a.run };
  });
}

// ---- Clavier ---------------------------------------------------------------------------------

let toolChord = false;

export function installKeyboard() {
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const typingField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if (typingField || document.querySelector('.modal-back')) return;
    if (typingKeyDown(e)) { e.preventDefault(); return; }
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    let id = null;
    if (toolChord && /^[1-6]$/.test(k)) {
      ui.tool = TOOLS[Number(k) - 1].id;
      toolChord = false;
      emit('ui');
      e.preventDefault();
      return;
    }
    toolChord = false;
    if (ctrl) {
      if (k === 'z' && e.shiftKey) id = 'redo';
      else if (k === 's' && e.shiftKey) id = 'saveAs';
      else if (k === 'n' && e.shiftKey) id = 'newTrack';
      else id = { z: 'undo', y: 'redo', c: 'copy', x: 'cut', v: 'paste', d: 'duplicate', a: 'selectAll', t: 'split', j: 'join', s: 'save', o: 'open', n: 'newProject', e: 'exportSong', i: 'importAudio', k: 'typing', '+': 'zoomIn', '=': 'zoomIn', '-': 'zoomOut', 0: 'zoomFit', ',': 'prefs' }[k] || null;
    } else if (e.altKey) {
      return;
    } else {
      if (k === ' ') id = 'play';
      else if (k === 'Enter') id = 'toStart';
      else if (k === 'Home') id = 'toStart';
      else if (k === 'End') id = 'toEnd';
      else if (k === 'Delete' || k === 'Backspace') id = 'delete';
      else if (k === 'F1') id = 'shortcuts';
      else if (k === 'Escape') { if (ui.musicalTyping) id = 'typing'; else { ui.selectedRegions.clear(); ui.selectedNotes.clear(); emit('ui'); } }
      else if (k === 't') { toolChord = true; e.preventDefault(); return; }
      else if (inEditor() && (k === 'ArrowUp' || k === 'ArrowDown')) { shiftSelected(0, (k === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 12 : 1)); e.preventDefault(); return; }
      else if (inEditor() && (k === 'ArrowLeft' || k === 'ArrowRight')) { shiftSelected((k === 'ArrowRight' ? 1 : -1) * gridStep(), 0); e.preventDefault(); return; }
      else if (k === 'ArrowLeft') id = 'prevBar';
      else if (k === 'ArrowRight') id = 'nextBar';
      else if (k === 'ArrowUp' && sel().length && !inEditor()) { transposeRegions(sel(), e.shiftKey ? 12 : 1); e.preventDefault(); return; }
      else if (k === 'ArrowDown' && sel().length && !inEditor()) { transposeRegions(sel(), e.shiftKey ? -12 : -1); e.preventDefault(); return; }
      else id = { r: 'record', c: 'loop', k: 'metronome', ',': 'prevBar', ';': 'nextBar', '.': 'nextBar', q: 'quantize', m: 'muteRegion', e: 'editor', x: 'mixer', y: 'library', i: 'inspector' }[k] || null;
    }
    if (id) {
      e.preventDefault();
      run(id);
    }
  });
  document.addEventListener('keyup', (e) => { if (typingKeyUp(e)) e.preventDefault(); });
  window.addEventListener('blur', () => { releaseAllTyping(); allNotesOff(); });
}
