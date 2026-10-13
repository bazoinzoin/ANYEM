// Sauvegarde : « Mes projets » (base de données locale du navigateur / de l'application,
// sons compris) et fichiers de projet .onde (à copier, partager, archiver).

import { encodeWav, bytesToBase64, base64ToBytes, decodeWav } from '../core/wav.js';
import { uid } from '../core/project.js';
import { getBuffer, setBuffer, audioContext } from '../audio/engine.js';

const DB_NAME = 'onde-studio';
let dbPromise = null;

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('Stockage local indisponible')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('audio')) d.createObjectStore('audio', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(store, mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    const result = fn(s);
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

function bufferRecord(id, buffer) {
  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c).slice());
  return { id, sampleRate: buffer.sampleRate, channels };
}

function recordToBuffer(rec) {
  const ctx = audioContext();
  const buf = ctx.createBuffer(rec.channels.length, rec.channels[0].length, rec.sampleRate);
  rec.channels.forEach((d, c) => buf.copyToChannel(d, c));
  return buf;
}

// Enregistre le projet dans « Mes projets » (lui attribue un identifiant au besoin).
export async function saveToLibrary(project) {
  if (!project.libId) project.libId = uid('prj');
  const known = new Set(await tx('audio', 'readonly', (s) => s.getAllKeys()));
  for (const id of Object.keys(project.audio)) {
    const buffer = getBuffer(id);
    if (buffer && !known.has(id)) await tx('audio', 'readwrite', (s) => s.put(bufferRecord(id, buffer)));
  }
  const entry = { id: project.libId, name: project.name, savedAt: Date.now(), project: JSON.parse(JSON.stringify(project)) };
  await tx('projects', 'readwrite', (s) => s.put(entry));
  return entry.savedAt;
}

export async function listLibrary() {
  const all = await tx('projects', 'readonly', (s) => s.getAll());
  return all.map((e) => ({ id: e.id, name: e.name, savedAt: e.savedAt, tracks: e.project.tracks.length, bpm: e.project.bpm }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function loadFromLibrary(id) {
  const entry = await tx('projects', 'readonly', (s) => s.get(id));
  if (!entry) throw new Error('Projet introuvable');
  for (const audioId of Object.keys(entry.project.audio || {})) {
    if (getBuffer(audioId)) continue;
    const rec = await tx('audio', 'readonly', (s) => s.get(audioId));
    if (rec) setBuffer(audioId, recordToBuffer(rec));
  }
  return entry.project;
}

export async function deleteFromLibrary(id) {
  await tx('projects', 'readwrite', (s) => s.delete(id));
  // Sons orphelins : supprimés s'ils ne servent plus à aucun projet.
  const all = await tx('projects', 'readonly', (s) => s.getAll());
  const used = new Set(all.flatMap((e) => Object.keys(e.project.audio || {})));
  const keys = await tx('audio', 'readonly', (s) => s.getAllKeys());
  for (const k of keys) if (!used.has(k)) await tx('audio', 'readwrite', (s) => s.delete(k));
}

// ---- Fichiers .onde ------------------------------------------------------------------------

export function projectFile(project) {
  const audio = {};
  for (const [id, meta] of Object.entries(project.audio)) {
    const buffer = getBuffer(id);
    if (!buffer) continue;
    const chans = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c));
    audio[id] = { name: meta.name, wav: bytesToBase64(encodeWav(chans, buffer.sampleRate, 24)) };
  }
  const data = { format: 'onde-studio', version: 1, project: { ...project, libId: undefined }, audio };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

export async function readProjectFile(file) {
  const data = JSON.parse(await file.text());
  if (data.format !== 'onde-studio' || !data.project) throw new Error('Ce fichier n\'est pas un projet Onde Studio');
  const ctx = audioContext();
  for (const [id, a] of Object.entries(data.audio || {})) {
    const { sampleRate, channels } = decodeWav(base64ToBytes(a.wav));
    const buf = ctx.createBuffer(channels.length, channels[0].length, sampleRate);
    channels.forEach((d, c) => buf.copyToChannel(d, c));
    setBuffer(id, buf);
  }
  return data.project;
}

// Enregistre via la boîte de dialogue du système quand elle existe (garde le fichier pour
// les enregistrements suivants), sinon par téléchargement.
export async function writeFileWithPicker(blob, suggestedName, handle, types) {
  if (handle && handle.createWritable) {
    const w = await handle.createWritable();
    await w.write(blob);
    await w.close();
    return handle;
  }
  if (globalThis.showSaveFilePicker) {
    const h = await globalThis.showSaveFilePicker({ suggestedName, types });
    const w = await h.createWritable();
    await w.write(blob);
    await w.close();
    return h;
  }
  return null;
}

// Préférences (petites valeurs).
export function loadPrefs() {
  try { return JSON.parse(localStorage.getItem('onde-prefs') || '{}'); } catch { return {}; }
}

export function savePrefs(prefs) {
  try { localStorage.setItem('onde-prefs', JSON.stringify(prefs)); } catch { /* stockage refusé */ }
}
