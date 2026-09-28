// Menu Échap (pause), posé par-dessus n'importe quel écran de jeu : Reprendre,
// Sauvegarder, Options, Quitter. Pendant la pause, les tours ennemis attendent
// (`later`, ui/pauseClock.js).

import { state, resetGame } from '../state.js';
import { esc } from './html.js';
import { goTo } from './router.js';
import { isPaused, setPaused } from './pauseClock.js';
import { openSlots } from './screens/slots.js';
import { saveGame, getOptions, setOption, OPTION_CHOICES } from './saves.js';

// Écrans sans menu Échap (ils ont leurs propres boutons).
const NO_PAUSE = new Set(['title', 'create', 'slots', 'defeat']);

let panel = 'main'; // 'main' | 'options' | 'quit'
let note = null;
let standalone = false; // options ouvertes depuis le menu principal

export function openPause() {
  if (NO_PAUSE.has(state.screen)) return;
  setPaused(true);
  standalone = false;
  panel = 'main';
  note = null;
  draw();
}

// Options seules (bouton « Options » du menu principal).
export function openOptions() {
  setPaused(true);
  standalone = true;
  panel = 'options';
  draw();
}

export function closePause() {
  document.getElementById('pauseMenu')?.remove();
  setPaused(false);
}

function draw() {
  let root = document.getElementById('pauseMenu');
  if (!root) {
    root = document.createElement('div');
    root.id = 'pauseMenu';
    root.className = 'pause-overlay';
    document.body.appendChild(root);
  }
  root.innerHTML = `<div class="title-panel pause-panel" role="dialog" aria-label="Pause">${content()}</div>`;
  wire(root);
}

function content() {
  if (panel === 'options') {
    const options = getOptions();
    return `
      <h2>Options</h2>
      ${Object.entries(OPTION_CHOICES).map(([key, o]) => `
        <div class="pause-option"><span>${esc(o.label)}</span>
          ${Object.entries(o.choices).map(([v, [label]]) => `<button data-opt="${key}:${v}" class="${options[key] === v ? 'gold' : ''}">${esc(label)}</button>`).join('')}
        </div>`).join('')}
      <button data-pause="main" class="title-item">◂ Retour</button>`;
  }
  if (panel === 'quit') {
    return `
      <h2>Quitter la partie ?</h2>
      <p class="hint">Vous revenez au menu principal. Ce qui n'a pas été sauvegardé sera perdu.</p>
      ${state.saveSlot ? '<button data-pause="saveQuit" class="title-item">Sauvegarder et quitter</button>' : ''}
      <button data-pause="quitNow" class="title-item">Quitter sans sauvegarder</button>
      <button data-pause="main" class="title-item">◂ Retour</button>`;
  }
  return `
    <h2>Pause</h2>
    <button data-pause="resume" class="title-item">Reprendre</button>
    <button data-pause="save" class="title-item">Sauvegarder${state.saveSlot ? ` <small>${esc(`Emplacement ${state.saveSlot}`)}</small>` : ''}</button>
    <button data-pause="options" class="title-item">Options</button>
    <button data-pause="quit" class="title-item">Quitter</button>
    ${note ? `<p class="pause-note">${esc(note)}</p>` : '<p class="hint">Échap : reprendre</p>'}`;
}

function wire(root) {
  root.querySelectorAll('[data-pause]').forEach((b) => {
    b.onclick = () => act(b.dataset.pause);
  });
  root.querySelectorAll('[data-opt]').forEach((b) => {
    b.onclick = () => {
      const [key, value] = b.dataset.opt.split(':');
      setOption(key, value);
      draw();
    };
  });
  root.querySelector('button')?.focus();
}

function act(what) {
  if (what === 'resume') return closePause();
  if (what === 'save') {
    if (!state.saveSlot) {
      // Partie sans emplacement (Debug) : on choisit où l'écrire.
      closePause();
      return openSlots('save');
    }
    note = saveGame() ? `Partie sauvegardée (emplacement ${state.saveSlot}).` : 'Impossible de sauvegarder : le navigateur refuse le stockage.';
    return draw();
  }
  if (what === 'saveQuit') saveGame();
  if (what === 'saveQuit' || what === 'quitNow') {
    closePause();
    resetGame();
    return goTo('title');
  }
  if (what === 'main' && standalone) return closePause();
  panel = what;
  draw();
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (ev) => {
    if (isPaused() && ev.key !== 'Escape') {
      // Le jeu ne reçoit rien pendant la pause (Entrée / Tab restent aux boutons du menu).
      ev.stopImmediatePropagation();
      if (ev.key.startsWith('Arrow')) ev.preventDefault();
      return;
    }
    if (ev.key !== 'Escape') return;
    if (isPaused()) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if (panel !== 'main' && !standalone) { panel = 'main'; draw(); } else closePause();
      return;
    }
    // En combat, Échap annule d'abord un choix en cours (géré par l'écran de combat).
    if (state.screen === 'combat' && document.querySelector('#actBack')) return;
    if (NO_PAUSE.has(state.screen)) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    openPause();
  }, true);
}
