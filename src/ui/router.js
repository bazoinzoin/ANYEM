// Navigation entre écrans. Chaque écran est une fonction (app) => void qui
// remplit #app et branche ses propres événements.

import { state } from '../state.js';

const screens = {};

export function registerScreens(map) {
  Object.assign(screens, map);
}

export function render() {
  const app = document.getElementById('app');
  const screen = screens[state.screen];
  if (!screen) throw new Error(`Écran inconnu : ${state.screen}`);
  screen(app);
}

export function goTo(screen) {
  state.screen = screen;
  render();
}

export function showHub(message = null, loot = []) {
  state.hubMessage = message;
  state.hubLoot = loot;
  goTo('hub');
}
