// Entrée audio (micro, interface audio) : liste des entrées, niveau d'entrée, enregistrement.

import { audioContext } from './engine.js';

let stream = null;
let streamDevice = null;
let inputAnalyser = null;
let inputSource = null;

export async function listInputs() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audioinput').map((d, i) => ({ id: d.deviceId, label: d.label || `Entrée ${i + 1}` }));
}

export async function openInput(deviceId = null) {
  if (stream && streamDevice === deviceId) return stream;
  closeInput();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Aucune entrée audio disponible sur cet appareil.');
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 2,
    },
  });
  streamDevice = deviceId;
  const ctx = audioContext();
  inputSource = ctx.createMediaStreamSource(stream);
  inputAnalyser = ctx.createAnalyser();
  inputAnalyser.fftSize = 1024;
  inputSource.connect(inputAnalyser);
  return stream;
}

export function closeInput() {
  if (stream) for (const t of stream.getTracks()) t.stop();
  if (inputSource) { try { inputSource.disconnect(); } catch { /* rien */ } }
  stream = null;
  streamDevice = null;
  inputAnalyser = null;
  inputSource = null;
}

export function inputLevel() {
  if (!inputAnalyser) return 0;
  const buf = new Float32Array(inputAnalyser.fftSize);
  inputAnalyser.getFloatTimeDomainData(buf);
  let peak = 0;
  for (const x of buf) peak = Math.max(peak, Math.abs(x));
  return peak;
}

// Enregistreur : start() → promesse résolue au démarrage effectif (horloge audio) ;
// stop() → { buffer (AudioBuffer), startedAt (temps audio du début) }.
export function createRecorder() {
  if (!stream) throw new Error('Entrée audio non ouverte');
  const ctx = audioContext();
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  const mimeType = types.find((t) => globalThis.MediaRecorder && MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 256000 } : undefined);
  const chunks = [];
  let startedAt = 0;
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  return {
    start() {
      return new Promise((resolve) => {
        rec.onstart = () => { startedAt = ctx.currentTime; resolve(startedAt); };
        rec.start();
      });
    },
    stop() {
      return new Promise((resolve, reject) => {
        rec.onstop = async () => {
          try {
            const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
            const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
            resolve({ buffer, startedAt });
          } catch (err) { reject(err); }
        };
        rec.stop();
      });
    },
  };
}
