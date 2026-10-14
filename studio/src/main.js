// Point d'entrée d'Onde Studio.

import { mountApp } from './ui/app.js';
import { ui, loadProject } from './ui/store.js';
import { loadPrefs } from './ui/storage.js';
import { createFromTemplate } from './core/library.js';
import { welcomeDialog } from './ui/dialogs.js';
import { initMidi } from './ui/midiInput.js';
import { initTypingLabels } from './ui/musicalTyping.js';

const prefs = loadPrefs();
for (const k of ['noteNames', 'uiScale', 'latencyMs', 'quickHelp']) if (prefs[k] != null) ui[k] = prefs[k];

// Téléphone ou petite tablette : panneaux latéraux fermés, aide au survol inutile au doigt.
const small = window.matchMedia('(max-width: 900px)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;
if (small) {
  ui.showLibrary = false;
  ui.showInspector = false;
  ui.trackH = 58;
  ui.zoom = 0.045;
  ui.bottomH = Math.max(160, Math.round(window.innerHeight * 0.42));
}
if (coarse) { ui.quickHelp = false; ui.prKeyH = 18; }

loadProject(createFromTemplate('empty'));
mountApp(document.getElementById('app'));
initMidi();
initTypingLabels();
welcomeDialog();
