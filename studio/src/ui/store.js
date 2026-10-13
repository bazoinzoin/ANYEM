// État de l'application : le projet (avec Annuler / Rétablir) et l'état de l'interface
// (sélection, outil, zoom…). Les écrans s'abonnent aux changements.
//   commit(label, fn)   modification annulable (un instantané avant)
//   beginGesture / endGesture : un geste continu (bouton tourné, fader) = une seule étape
//   touch()             changement en cours (pas d'étape d'historique)

import { createHistory } from '../core/history.js';
import { createProject, normalizeProject, PROJECT_VERSION } from '../core/project.js';
import { setProject as engineSetProject } from '../audio/engine.js';

const history = createHistory(200);
const listeners = new Set();

export const state = {
  project: createProject(),
  dirty: false,
  savedAt: null,
};

export const ui = {
  selectedTrackId: null,
  selectedRegions: new Set(),
  editorRegionId: null,
  selectedNotes: new Set(),
  tool: 'pointer',
  snap: '1/16',
  zoom: 0.07,
  trackH: 68,
  bottom: null,
  bottomH: 330,
  showLibrary: true,
  showInspector: true,
  libraryTab: 'sons',
  libraryOpen: {},
  prZoom: 0.16,
  prKeyH: 14,
  chordMode: 'single',
  editorView: 'auto',
  stepRes: '1/16',
  focusArea: 'arrange',
  musicalTyping: false,
  octave: 4,
  velocity: 100,
  playhead: 0,
  playing: false,
  recording: false,
  recordingInfo: null,
  expandedFx: null,
  noteNames: 'fr',
  progression: 'pop',
  clipboard: null,
  fileHandle: null,
  quickHelp: true,
  uiScale: 1,
  latencyMs: 0,
  inputDevice: null,
  showAutomationFor: null,
};

export function project() {
  return state.project;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// kind : 'project' (contenu changé), 'ui' (sélection, vue), 'live' (réglage en cours).
export function emit(kind = 'ui') {
  for (const fn of listeners) fn(kind);
}

function syncEngine() {
  engineSetProject(state.project);
}

export function commit(label, fn) {
  const before = JSON.stringify(state.project);
  const result = fn(state.project);
  const after = JSON.stringify(state.project);
  if (after !== before) {
    history.push(before, label);
    state.dirty = true;
    syncEngine();
    cleanSelection();
    emit('project');
  }
  return result;
}

let gesture = null;
export function beginGesture(label) {
  if (!gesture) gesture = { label, before: JSON.stringify(state.project) };
}

export function endGesture() {
  if (!gesture) return;
  const g = gesture;
  gesture = null;
  if (JSON.stringify(state.project) !== g.before) {
    history.push(g.before, g.label);
    state.dirty = true;
  }
  syncEngine();
  emit('project');
}

export function touch() {
  syncEngine();
  emit('live');
}

export function undo() {
  const entry = history.undo(JSON.stringify(state.project));
  if (!entry) return null;
  state.project = JSON.parse(entry.snapshot);
  state.dirty = true;
  syncEngine();
  cleanSelection();
  emit('project');
  return entry.label;
}

export function redo() {
  const entry = history.redo(JSON.stringify(state.project));
  if (!entry) return null;
  state.project = JSON.parse(entry.snapshot);
  state.dirty = true;
  syncEngine();
  cleanSelection();
  emit('project');
  return entry.label;
}

export function historyInfo() {
  return { canUndo: history.canUndo, canRedo: history.canRedo, undoLabel: history.undoLabel, redoLabel: history.redoLabel };
}

// Nouveau projet chargé (nouveau, ouverture, reprise) : historique remis à zéro.
export function loadProject(raw, { dirty = false } = {}) {
  state.project = normalizeProject(raw);
  state.project.version = PROJECT_VERSION;
  state.dirty = dirty;
  history.clear();
  ui.selectedRegions.clear();
  ui.selectedNotes.clear();
  ui.editorRegionId = null;
  ui.playhead = 0;
  ui.selectedTrackId = state.project.tracks[0] ? state.project.tracks[0].id : null;
  syncEngine();
  emit('project');
}

// ---- Recherches ---------------------------------------------------------------------------

export function findTrack(id, p = state.project) {
  return p.tracks.find((t) => t.id === id) || null;
}

export function findRegion(id, p = state.project) {
  for (const track of p.tracks) {
    const region = track.regions.find((r) => r.id === id);
    if (region) return { track, region };
  }
  return null;
}

export function selectedTrack() {
  return findTrack(ui.selectedTrackId);
}

export function editorRegion() {
  return ui.editorRegionId ? findRegion(ui.editorRegionId) : null;
}

// Retire de la sélection ce qui n'existe plus (après suppression, annulation…).
function cleanSelection() {
  const p = state.project;
  if (ui.selectedTrackId && !findTrack(ui.selectedTrackId)) ui.selectedTrackId = p.tracks[0] ? p.tracks[0].id : null;
  if (!ui.selectedTrackId && p.tracks[0]) ui.selectedTrackId = p.tracks[0].id;
  for (const id of [...ui.selectedRegions]) if (!findRegion(id)) ui.selectedRegions.delete(id);
  if (ui.editorRegionId && !findRegion(ui.editorRegionId)) ui.editorRegionId = null;
  const er = editorRegion();
  if (er && er.region.notes) {
    const ids = new Set(er.region.notes.map((n) => n.id));
    for (const id of [...ui.selectedNotes]) if (!ids.has(id)) ui.selectedNotes.delete(id);
  } else ui.selectedNotes.clear();
}

export function selectTrack(id) {
  if (ui.selectedTrackId === id) return;
  ui.selectedTrackId = id;
  emit('ui');
}
