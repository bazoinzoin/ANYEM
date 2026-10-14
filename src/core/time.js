// Temps musical : positions en « ticks » (480 par noire), conversions vers les secondes,
// affichage mesure.temps.double-croche et grille de magnétisme.

export const PPQ = 480;

export function ticksPerBeat(project) {
  return (PPQ * 4) / project.sigDen;
}

export function ticksPerBar(project) {
  return ticksPerBeat(project) * project.sigNum;
}

// Le tempo est exprimé en noires par minute, quelle que soit la signature.
export function ticksToSeconds(ticks, bpm) {
  return (ticks * 60) / (bpm * PPQ);
}

export function secondsToTicks(seconds, bpm) {
  return (seconds * bpm * PPQ) / 60;
}

// Position lisible : « 5.2.3 » = mesure 5, temps 2, double-croche 3 (comptés à partir de 1).
export function formatPosition(ticks, project) {
  const bar = ticksPerBar(project);
  const beat = ticksPerBeat(project);
  const sixteenth = PPQ / 4;
  const sign = ticks < 0 ? '-' : '';
  const t = Math.abs(Math.floor(ticks));
  const b = Math.floor(t / bar);
  const inBar = t - b * bar;
  const be = Math.floor(inBar / beat);
  const s = Math.floor((inBar - be * beat) / sixteenth);
  return `${sign}${b + 1}.${be + 1}.${s + 1}`;
}

// Temps lisible : « 1:05.250 ».
export function formatTime(seconds) {
  const sign = seconds < 0 ? '-' : '';
  const s = Math.abs(seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${sign}${m}:${rest.toFixed(3).padStart(6, '0')}`;
}

export const SNAP_OPTIONS = [
  { id: 'bar', label: 'Mesure' },
  { id: 'beat', label: 'Temps' },
  { id: '1/8', label: '1/8' },
  { id: '1/16', label: '1/16' },
  { id: '1/32', label: '1/32' },
  { id: '1/8T', label: '1/8 triolet' },
  { id: '1/16T', label: '1/16 triolet' },
  { id: 'off', label: 'Libre' },
];

// Taille d'une case de grille en ticks (1 tick = libre).
export function gridTicks(id, project) {
  switch (id) {
    case 'bar': return ticksPerBar(project);
    case 'beat': return ticksPerBeat(project);
    case '1/8': return PPQ / 2;
    case '1/16': return PPQ / 4;
    case '1/32': return PPQ / 8;
    case '1/8T': return PPQ / 3;
    case '1/16T': return PPQ / 6;
    default: return 1;
  }
}

export function snap(tick, grid, mode = 'round') {
  if (grid <= 1) return Math.round(tick);
  const f = mode === 'floor' ? Math.floor : mode === 'ceil' ? Math.ceil : Math.round;
  return f(tick / grid) * grid;
}

// Valeurs de note (délais synchronisés, arpégiateur) → ticks.
export const NOTE_VALUES = [
  { id: '1/1', label: 'Ronde', ticks: PPQ * 4 },
  { id: '1/2', label: 'Blanche', ticks: PPQ * 2 },
  { id: '1/4', label: 'Noire', ticks: PPQ },
  { id: '1/4.', label: 'Noire pointée', ticks: PPQ * 1.5 },
  { id: '1/8', label: 'Croche', ticks: PPQ / 2 },
  { id: '1/8.', label: 'Croche pointée', ticks: PPQ * 0.75 },
  { id: '1/8T', label: 'Triolet de croches', ticks: PPQ / 3 },
  { id: '1/16', label: 'Double croche', ticks: PPQ / 4 },
  { id: '1/16T', label: 'Triolet de doubles', ticks: PPQ / 6 },
  { id: '1/32', label: 'Triple croche', ticks: PPQ / 8 },
];

export function noteValueTicks(id) {
  const v = NOTE_VALUES.find((n) => n.id === id);
  return v ? v.ticks : PPQ / 4;
}
