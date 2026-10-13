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

loadProject(createFromTemplate('empty'));
mountApp(document.getElementById('app'));
initMidi();
initTypingLabels();
welcomeDialog();
