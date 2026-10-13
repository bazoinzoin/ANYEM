// Fichiers : enregistrer, ouvrir, exporter (WAV, pistes séparées, MIDI), importer.

import { state, ui, project, loadProject, emit, findTrack, commit } from './store.js';
import { saveToLibrary, loadFromLibrary, projectFile, readProjectFile, writeFileWithPicker } from './storage.js';
import { downloadBlob, pickFile, safeFileName } from './dom.js';
import { toast } from './toast.js';
import { renderOffline, stop as engineStop, decodeAudio } from '../audio/engine.js';
import { encodeWav, peakLevel } from '../core/wav.js';
import { writeMidi } from '../core/smf.js';
import { projectEnd } from '../core/project.js';
import { ticksPerBar } from '../core/time.js';
import { importAudioFiles, importMidiFile, registerAudio } from './ops.js';

export async function saveProject({ quiet = false } = {}) {
  const p = project();
  try {
    state.savedAt = await saveToLibrary(p);
    if (ui.fileHandle) await writeFileWithPicker(projectFile(p), `${safeFileName(p.name)}.onde`, ui.fileHandle);
    state.dirty = false;
    if (!quiet) toast(`« ${p.name} » enregistré`, 'ok');
    emit('ui');
    return true;
  } catch (err) {
    if (!quiet) toast(`Enregistrement impossible : ${err.message}`, 'error', 5000);
    return false;
  }
}

const ONDE_TYPES = [{ description: 'Projet Onde Studio', accept: { 'application/json': ['.onde'] } }];

export async function saveProjectAs() {
  const p = project();
  const blob = projectFile(p);
  try {
    const handle = await writeFileWithPicker(blob, `${safeFileName(p.name)}.onde`, null, ONDE_TYPES);
    if (handle) ui.fileHandle = handle;
    else downloadBlob(blob, `${safeFileName(p.name)}.onde`);
    await saveToLibrary(p);
    state.dirty = false;
    toast('Fichier de projet enregistré', 'ok');
    emit('ui');
  } catch (err) {
    if (err.name !== 'AbortError') toast(`Enregistrement impossible : ${err.message}`, 'error', 5000);
  }
}

export async function openProjectFile(file) {
  try {
    engineStop();
    const raw = await readProjectFile(file);
    loadProject(raw);
    ui.fileHandle = null;
    toast(`« ${project().name} » ouvert`, 'ok');
    return true;
  } catch (err) {
    toast(err.message || 'Fichier illisible', 'error', 5000);
    return false;
  }
}

export async function openProjectPicker() {
  if (globalThis.showOpenFilePicker) {
    try {
      const [handle] = await globalThis.showOpenFilePicker({ types: ONDE_TYPES });
      const ok = await openProjectFile(await handle.getFile());
      if (ok) ui.fileHandle = handle;
      return ok;
    } catch (err) {
      if (err.name === 'AbortError') return false;
    }
  }
  const [file] = await pickFile('.onde,application/json');
  return file ? openProjectFile(file) : false;
}

export async function openFromLibrary(id) {
  try {
    engineStop();
    const raw = await loadFromLibrary(id);
    loadProject(raw);
    ui.fileHandle = null;
    return true;
  } catch (err) {
    toast(`Ouverture impossible : ${err.message}`, 'error', 5000);
    return false;
  }
}

export async function importAudioPicker() {
  const files = await pickFile('audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aac', true);
  if (files.length) await importAudioFiles(files);
}

export async function importMidiPicker() {
  const [file] = await pickFile('.mid,.midi,audio/midi');
  if (file) await importMidiFile(file);
}

// Son de l'échantillonneur d'une piste.
export async function pickSampleFor(trackId) {
  const [file] = await pickFile('audio/*,.wav,.mp3,.ogg,.flac,.m4a');
  if (!file) return;
  try {
    const buffer = await decodeAudio(await file.arrayBuffer());
    const { id, meta } = registerAudio(buffer, file.name.replace(/\.[^.]+$/, ''));
    commit('Charger un son dans l\'échantillonneur', (p) => {
      p.audio[id] = meta;
      const t = findTrack(trackId, p);
      if (t && t.instrument) t.instrument.sampleId = id;
    });
  } catch {
    toast(`Impossible de lire « ${file.name} »`, 'error');
  }
}

// ---- Export ------------------------------------------------------------------------------

export function exportRange(which) {
  const p = project();
  if (which === 'loop' && p.loop.end > p.loop.start) return [p.loop.start, p.loop.end];
  const end = Math.max(projectEnd(p), ticksPerBar(p));
  return [0, end];
}

function bufferChannels(buffer) {
  const out = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) out.push(buffer.getChannelData(c));
  return out;
}

function normalize(chans, targetDb = -0.3) {
  const peak = peakLevel(chans);
  if (peak <= 0) return;
  const g = 10 ** (targetDb / 20) / peak;
  for (const ch of chans) for (let i = 0; i < ch.length; i++) ch[i] *= g;
}

// Retire la fin silencieuse (après la queue de réverbe) pour un fichier propre.
function trimTail(chans, sampleRate, minLength) {
  let last = minLength;
  for (const ch of chans) for (let i = ch.length - 1; i > last; i--) if (Math.abs(ch[i]) > 0.0003) { last = i; break; }
  const len = Math.min(chans[0].length, last + Math.floor(sampleRate * 0.05));
  return chans.map((ch) => ch.subarray(0, len));
}

export async function exportAudio({ range = 'song', bits = 16, stems = false, norm = false, sampleRate = 44100, onProgress = () => {} }) {
  const p = project();
  const [from, to] = exportRange(range);
  const base = safeFileName(p.name);
  const jobs = stems ? p.tracks.filter((t) => t.regions.length && !t.mute).map((t) => ({ name: `${base} - ${safeFileName(t.name)}`, solo: t.id })) : [{ name: base, solo: null }];
  if (!jobs.length) { toast('Aucune piste à exporter.', 'error'); return; }
  const files = [];
  for (let i = 0; i < jobs.length; i++) {
    onProgress(`Rendu ${i + 1} / ${jobs.length} : ${jobs[i].name}`);
    const buffer = await renderOffline(p, { fromTick: from, toTick: to, sampleRate, soloTrackId: jobs[i].solo, tail: range === 'loop' ? 0.01 : 4 });
    let chans = bufferChannels(buffer);
    const minLen = Math.floor(((to - from) / (p.bpm * 480 / 60)) * sampleRate);
    if (range !== 'loop') chans = trimTail(chans, sampleRate, minLen);
    else chans = chans.map((c) => c.subarray(0, Math.min(c.length, minLen)));
    if (norm) normalize(chans);
    files.push({ name: `${jobs[i].name}.wav`, blob: new Blob([encodeWav(chans, sampleRate, bits)], { type: 'audio/wav' }) });
  }
  onProgress('Enregistrement du fichier…');
  if (files.length === 1) {
    const handle = await writeFileWithPicker(files[0].blob, files[0].name, null, [{ description: 'Fichier audio WAV', accept: { 'audio/wav': ['.wav'] } }]).catch((err) => { if (err.name === 'AbortError') return 'abort'; return null; });
    if (handle === 'abort') return;
    if (!handle) downloadBlob(files[0].blob, files[0].name);
  } else {
    for (const f of files) { downloadBlob(f.blob, f.name); await new Promise((r) => setTimeout(r, 350)); }
  }
  toast(files.length > 1 ? `${files.length} pistes exportées` : 'Morceau exporté en WAV', 'ok', 3500);
}

export function exportMidi() {
  const p = project();
  if (!p.tracks.some((t) => t.kind !== 'audio' && t.regions.length)) { toast('Aucune note à exporter.', 'error'); return; }
  downloadBlob(new Blob([writeMidi(p)], { type: 'audio/midi' }), `${safeFileName(p.name)}.mid`);
  toast('Fichier MIDI exporté', 'ok');
}
