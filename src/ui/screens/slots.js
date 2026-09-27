// Emplacements de sauvegarde, plein écran : 4 colonnes (équipe en portraits, lieu,
// difficulté, or, date). Trois usages (`openSlots(mode)`) :
//   'new'  : Nouvelle partie → l'aventure occupera cet emplacement (écrasé après confirmation)
//   'load' : Charger une aventure
//   'save' : sauvegarder une partie qui n'a pas encore d'emplacement (partie Debug)

import { state, resetGame } from '../../state.js';
import { CLASSES } from '../../data/classes.js';
import { lookKey } from '../../game/appearance.js';
import { esc } from '../html.js';
import { goTo, goBack, showHub } from '../router.js';
import { frame, wireFrame } from '../screenFrame.js';
import { portrait, drawPortraits } from '../portraits.js';
import { SLOTS, readSlot, saveGame, loadGame, deleteSlot } from '../saves.js';
import { resumeCombat } from '../encounter.js';

const TITLES = { new: 'Nouvelle partie', load: 'Charger', save: 'Sauvegarder' };
const HINTS = {
  new: "Choisissez l'emplacement de cette nouvelle aventure : elle s'y sauvegardera toujours, sans toucher aux autres.",
  load: 'Choisissez une aventure à reprendre.',
  save: 'Choisissez où sauvegarder cette partie.',
};

let mode = 'load';
let confirm = null; // { slot, action: 'overwrite' | 'delete' }
let flash = null;

export function openSlots(m) {
  mode = m;
  confirm = null;
  flash = null;
  goTo('slots');
}

export function renderSlots(app) {
  app.innerHTML = frame({
    title: TITLES[mode], icon: 1330, layout: 'lay-slots', gold: false,
    back: mode === 'save' ? '← Retour au jeu' : '← Menu principal',
    extras: `<span class="hint">${esc(flash ?? HINTS[mode])}</span>`,
    body: SLOTS.map(card).join(''),
  });
  wireFrame(app, () => (mode === 'save' ? goBack() : goTo('title')));
  drawPortraits(app);
  app.querySelectorAll('[data-slot]').forEach((b) => {
    b.onclick = () => choose(Number(b.dataset.slot), b.dataset.act);
  });
}

function card(slot) {
  const save = readSlot(slot);
  const s = save?.summary;
  const asking = confirm?.slot === slot;
  const current = state.saveSlot === slot && mode === 'save';
  let buttons;
  if (asking) {
    buttons = `<p class="warning">${confirm.action === 'delete' ? 'Effacer définitivement cette aventure ?' : 'Écraser cette aventure ?'}</p>
      <button class="full" data-slot="${slot}" data-act="yes">Oui</button><button class="full" data-slot="${slot}" data-act="no">Non</button>`;
  } else if (mode === 'load') {
    buttons = save ? `<button class="full gold" data-slot="${slot}" data-act="pick">Reprendre</button><button class="full" data-slot="${slot}" data-act="delete">Effacer</button>` : '<button class="full" disabled>Vide</button>';
  } else {
    buttons = `<button class="full gold" data-slot="${slot}" data-act="pick">${mode === 'new' ? 'Commencer ici' : 'Sauvegarder ici'}</button>`;
  }
  const body = s ? `
      <div class="slot-party">${s.party.map((h) => `<div class="slot-hero">${portrait(`look:${lookKey(h.look)}`, 2)}<small>${esc(h.name)}<br>${esc(CLASSES[h.classKey]?.name ?? '')} ${h.level}</small></div>`).join('')}</div>
      <ul class="slot-lines">
        <li>${esc(s.where)}</li>
        <li>Difficulté : ${esc(s.difficulty)}</li>
        <li>${s.gold.toLocaleString('fr-FR')} or · ${s.zones} zone${s.zones > 1 ? 's' : ''} terminée${s.zones > 1 ? 's' : ''}</li>
        <li class="hint">${esc(new Date(save.savedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))}</li>
      </ul>`
    : `<p class="hint slot-empty">${save === null ? 'Emplacement libre' : 'Sauvegarde illisible'}</p>`;
  return `
    <section class="win save-slot ${save ? '' : 'empty'} ${current ? 'selected' : ''}">
      <h3>Emplacement ${slot}</h3>
      ${body}
      <div class="slot-actions">${buttons}</div>
    </section>`;
}

function choose(slot, act) {
  const save = readSlot(slot);
  if (act === 'no') { confirm = null; return goTo('slots'); }
  if (act === 'delete') { confirm = { slot, action: 'delete' }; return goTo('slots'); }
  if (act === 'pick' && save && mode !== 'load') { confirm = { slot, action: 'overwrite' }; return goTo('slots'); }
  if (act === 'yes' && confirm?.action === 'delete') {
    deleteSlot(slot);
    confirm = null;
    flash = `Emplacement ${slot} effacé.`;
    return goTo('slots');
  }
  confirm = null;
  if (mode === 'new') {
    resetGame(slot);
    return goTo('create');
  }
  if (mode === 'save') {
    flash = saveGame(slot) ? `Partie sauvegardée dans l'emplacement ${slot}.` : 'Impossible de sauvegarder : le navigateur refuse le stockage.';
    return goTo('slots');
  }
  if (!loadGame(slot)) {
    flash = 'Cette sauvegarde est illisible.';
    return goTo('slots');
  }
  resumeGame();
}

// Reprend l'aventure chargée là où elle en était.
function resumeGame() {
  if (state.combat) return resumeCombat();
  if (state.expedition) return goTo('dungeon');
  const menus = ['stats', 'equipment', 'forge', 'talents', 'merchant', 'strategy', 'inn', 'bank', 'difficulty', 'runes', 'bestiary', 'portals'];
  if (menus.includes(state.screen)) return goTo(state.screen);
  showHub(`Aventure reprise (emplacement ${state.saveSlot}).`);
}
