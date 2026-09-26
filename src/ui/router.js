// Navigation entre écrans. Chaque écran est une fonction (app) => void qui
// remplit #app et branche ses propres événements.

import { state } from '../state.js';
import { arriveAtVillage } from './villageView.js';

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

// Écran de base : le village, ou l'expédition en cours (exploration de l'étage).
export function goBack() {
  goTo(state.expedition ? 'dungeon' : 'hub');
}

export function backLabel() {
  return state.expedition ? '← Retour au donjon' : '← Retour au village';
}

// Arrivée au village (retour d'expédition…) : le groupe réapparaît à la porte.
export function showHub(message = null, loot = []) {
  arriveAtVillage();
  state.hubMessage = message;
  state.hubLoot = loot;
  goTo('hub');
}
