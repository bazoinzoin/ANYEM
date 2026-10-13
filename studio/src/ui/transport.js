// Transport côté interface : lecture, arrêt, position, enregistrement (MIDI et audio).

import {
  play as enginePlay, stop as engineStop, isPlaying, playheadTicks, songSecondsAt, outputLatency,
  liveNoteOn, liveNoteOff, resumeAudio,
} from '../audio/engine.js';
import { openInput, createRecorder } from '../audio/recorder.js';
import { ticksPerBar, secondsToTicks, ticksToSeconds, snap } from '../core/time.js';
import { projectEnd, createMidiRegion } from '../core/project.js';
import { makeNote } from '../core/music.js';
import { ui, project, emit, commit, findTrack, selectedTrack } from './store.js';
import { addRecordedAudio } from './ops.js';
import { toast } from './toast.js';

let playStart = 0;

export function currentTick() {
  const t = isPlaying() ? playheadTicks() : null;
  return t == null ? ui.playhead : t;
}

export async function startPlay(from = ui.playhead, opts = {}) {
  playStart = from;
  ui.playing = true;
  emit('ui');
  try {
    await enginePlay(from, opts);
  } catch (err) {
    ui.playing = false;
    emit('ui');
    toast(`Lecture impossible : ${err.message}`, 'error');
  }
}

export async function stopPlay() {
  if (ui.recording) await finishRecording();
  if (isPlaying()) {
    const t = playheadTicks();
    engineStop();
    if (t != null) ui.playhead = Math.max(0, Math.round(t));
  } else {
    // Deuxième appui sur Stop : retour au début (ou au début de la boucle).
    const p = project();
    ui.playhead = p.loop.on && ui.playhead !== p.loop.start ? p.loop.start : 0;
  }
  ui.playing = false;
  emit('ui');
}

export function togglePlay() {
  if (isPlaying()) {
    if (ui.recording) { stopPlay(); return; }
    const t = playheadTicks();
    engineStop();
    ui.playing = false;
    ui.playhead = t != null ? Math.max(0, Math.round(t)) : ui.playhead;
    emit('ui');
  } else startPlay(ui.playhead);
}

// Lecture depuis le début de la position d'origine (touche Entrée du pavé numérique ou Maj+Espace).
export function playFromStart() {
  const p = project();
  if (isPlaying()) engineStop();
  ui.playhead = p.loop.on ? p.loop.start : 0;
  startPlay(ui.playhead);
}

export function setPlayhead(tick) {
  const t = Math.max(0, Math.round(tick));
  if (isPlaying() && !ui.recording) {
    ui.playhead = t;
    startPlay(t);
  } else {
    ui.playhead = t;
    emit('ui');
  }
}

export function nudgeBars(n) {
  const bar = ticksPerBar(project());
  setPlayhead(snap(currentTick(), bar, n < 0 ? 'ceil' : 'floor') + n * bar);
}

export function goToEnd() {
  const p = project();
  setPlayhead(snap(projectEnd(p), ticksPerBar(p), 'ceil'));
}

// Arrêt automatique en fin de morceau (hors boucle et hors enregistrement).
export function checkAutoStop() {
  if (!isPlaying() || ui.recording) return;
  const p = project();
  if (p.loop.on) return;
  const end = projectEnd(p);
  const t = playheadTicks();
  if (end > 0 && t != null && t > end + ticksPerBar(p)) {
    engineStop();
    ui.playing = false;
    ui.playhead = playStart;
    emit('ui');
  }
}

// ---- Enregistrement -------------------------------------------------------------------------

function recordTargets() {
  const p = project();
  let armed = p.tracks.filter((t) => t.arm);
  if (!armed.length) {
    const sel = selectedTrack();
    if (sel) armed = [sel];
  }
  return {
    midi: armed.filter((t) => t.kind !== 'audio').map((t) => t.id),
    audio: armed.find((t) => t.kind === 'audio') || null,
  };
}

export async function toggleRecord() {
  if (ui.recording) { await stopPlay(); return; }
  const p = project();
  const targets = recordTargets();
  if (!targets.midi.length && !targets.audio) {
    toast('Ajoutez ou sélectionnez une piste à enregistrer.', 'error');
    return;
  }
  await resumeAudio();
  if (isPlaying()) engineStop();
  const startTick = ui.playhead;
  const info = { startTick, midi: targets.midi, notes: [], held: new Map(), audioTrackId: null, recorder: null, startedAt: null };
  if (targets.audio) {
    try {
      await openInput(ui.inputDevice);
      info.recorder = createRecorder();
      info.audioTrackId = targets.audio.id;
    } catch (err) {
      toast(`Micro inaccessible : ${err.message || 'autorisez l\'accès au micro'}`, 'error', 5000);
      if (!targets.midi.length) return;
    }
  }
  ui.recording = true;
  ui.recordingInfo = info;
  const countInBars = p.metronome.countIn ? 1 : 0;
  await startPlay(startTick, { countInBars, ignoreLoop: true });
  if (info.recorder) info.startedAt = await info.recorder.start();
  emit('ui');
}

async function finishRecording() {
  const info = ui.recordingInfo;
  ui.recording = false;
  ui.recordingInfo = null;
  if (!info) return;
  const p = project();
  const now = playheadTicks();
  // Notes encore tenues : arrêtées à la position actuelle.
  for (const [pitch, n] of info.held) {
    n.length = Math.max(1, (now ?? n.start + 120) - n.start);
    info.notes.push(n);
    info.held.delete(pitch);
  }
  if (info.notes.length) {
    const bar = ticksPerBar(p);
    const start = snap(Math.min(info.startTick, ...info.notes.map((n) => n.start)), bar, 'floor');
    const end = snap(Math.max(...info.notes.map((n) => n.start + n.length)), bar, 'ceil');
    commit('Enregistrement MIDI', (pp) => {
      for (const trackId of info.midi) {
        const t = findTrack(trackId, pp);
        if (!t) continue;
        const notes = info.notes.filter((n) => n.trackId === trackId)
          .map((n) => makeNote(n.pitch, n.start - start, n.length, n.vel));
        if (notes.length) t.regions.push(createMidiRegion(start, Math.max(bar, end - start), notes, `${t.name} (prise)`));
      }
    });
  }
  if (info.recorder) {
    try {
      const startedAt = info.startedAt;
      const { buffer } = await info.recorder.stop();
      const songAtStart = startedAt != null ? songSecondsAt(startedAt) : null;
      const latency = outputLatency() + (ui.latencyMs || 0) / 1000;
      const recTick = songAtStart != null ? secondsToTicks(songAtStart - latency, p.bpm) : info.startTick;
      let tick = recTick;
      let offset = 0;
      if (recTick < info.startTick) {
        offset = ticksToSeconds(info.startTick - recTick, p.bpm);
        tick = info.startTick;
      }
      if (buffer.duration - offset > 0.05) {
        const track = findTrack(info.audioTrackId);
        addRecordedAudio(info.audioTrackId, buffer, tick, offset, `${track ? track.name : 'Audio'} (prise)`);
      }
    } catch (err) {
      toast(`Enregistrement audio perdu : ${err.message}`, 'error', 5000);
    }
  }
}

// ---- Jeu en direct (clavier de l'ordinateur, contrôleur MIDI) ----------------------------------

export function playTargetIds() {
  const p = project();
  if (ui.recording && ui.recordingInfo && ui.recordingInfo.midi.length) return ui.recordingInfo.midi;
  const armed = p.tracks.filter((t) => t.arm && t.kind !== 'audio').map((t) => t.id);
  if (armed.length) return armed;
  const sel = selectedTrack();
  return sel && sel.kind !== 'audio' ? [sel.id] : [];
}

export function noteOn(pitch, vel) {
  const ids = playTargetIds();
  for (const id of ids) liveNoteOn(id, pitch, vel);
  const info = ui.recordingInfo;
  if (ui.recording && info && info.midi.length) {
    const t = playheadTicks();
    if (t != null && t >= info.startTick - 10) {
      for (const id of info.midi) info.held.set(`${id}:${pitch}`, { trackId: id, pitch, vel, start: Math.max(info.startTick, Math.round(t)), length: 1 });
    }
  }
}

export function noteOff(pitch) {
  const ids = playTargetIds();
  for (const id of ids) liveNoteOff(id, pitch);
  const info = ui.recordingInfo;
  if (ui.recording && info) {
    const t = playheadTicks();
    for (const id of info.midi) {
      const key = `${id}:${pitch}`;
      const n = info.held.get(key);
      if (!n) continue;
      n.length = Math.max(10, Math.round((t ?? n.start) - n.start));
      info.notes.push(n);
      info.held.delete(key);
    }
  }
}

export function recordingNotes() {
  const info = ui.recordingInfo;
  if (!info) return [];
  const now = playheadTicks() ?? 0;
  return [...info.notes, ...[...info.held.values()].map((n) => ({ ...n, length: Math.max(10, now - n.start) }))];
}
