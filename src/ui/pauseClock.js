// Horloge des combats : pendant la pause (menu Échap, ui/pause.js), les actions
// programmées attendent. `later` remplace setTimeout pour le rythme des tours.

let paused = false;
const waiting = [];

export const isPaused = () => paused;

export function later(fn, ms) {
  setTimeout(() => (paused ? waiting.push(fn) : fn()), ms);
}

export function setPaused(value) {
  paused = value;
  if (!paused) waiting.splice(0).forEach((fn) => fn());
}
