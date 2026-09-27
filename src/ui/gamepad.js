// Jeu à la manette (API Gamepad du navigateur, manette « standard » : Xbox, PlayStation,
// Switch Pro…). Aucune règle ici : la manette imite le clavier et la souris.
//   Sur les cartes (village, expédition) : croix / stick gauche = marcher (flèches),
//     A = parler / agir (Espace ; en expédition, descendre l'échelle quand on est dessus),
//     Y = passer aux menus de l'écran (curseur sur les boutons), Y ou B pour revenir à la carte.
//   Partout ailleurs (menus, combat, fenêtres) : un curseur doré va de bouton en bouton
//     (croix / stick), A = cliquer, B = retour (bouton de retour de l'écran, sinon Échap),
//     LB / RB = page précédente / suivante (ou héros précédent / suivant).
//   Start = menu Échap (pause). Le survol est simulé : la fiche de l'élément visé s'affiche.
// Le curseur disparaît dès que la souris bouge ; il revient au premier appui sur la manette.

import { state } from '../state.js';
import { isPaused } from './pauseClock.js';
import { pickNext, nearest, padDirection } from './gamepadNav.js';

const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, BACK: 8, START: 9 };
const FIRST_REPEAT_MS = 320; // maintien d'une direction dans les menus : 1re répétition
const REPEAT_MS = 120;       // puis répétitions
const FOCUSABLE = [
  'button', 'a[href]', 'select', 'input', '[data-cell]', '[data-worn]', '[data-slot]', '[data-legendary]',
  '[data-consumable]', '[data-item]', '.bag-cell:not(.empty)',
].join(', ');
const ARROWS = { '0,-1': 'ArrowUp', '0,1': 'ArrowDown', '-1,0': 'ArrowLeft', '1,0': 'ArrowRight' };

let focused = null;       // élément sous le curseur
let lastPoint = null;     // centre du dernier élément visé (pour retrouver un voisin après un rendu)
let menuOnMap = false;    // Y sur une carte : les menus prennent la main
let prev = [];            // boutons enfoncés à l'image précédente
let heldDir = null;       // direction tenue { key, since, last }
let walkKey = null;       // flèche simulée enfoncée (marche)
let running = false;

const key = (type, k) => document.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }));

// Carte affichée et rien par-dessus : la manette fait marcher.
function walking() {
  if (isPaused() || menuOnMap) return false;
  if (!['hub', 'dungeon'].includes(state.screen)) return false;
  if (!document.querySelector('#villageMap, #floorMap')) return false;
  return !document.querySelector('.hud-modal, .hud-panel');
}

// Zone où chercher les boutons : le menu Échap, sinon une fenêtre modale, sinon l'écran.
function scope() {
  return document.getElementById('pauseMenu') ?? document.querySelector('.hud-modal') ?? document.getElementById('app');
}

function candidates() {
  const root = scope();
  if (!root) return [];
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (el.disabled || el.closest('[hidden], .hidden')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth
      && getComputedStyle(el).visibility !== 'hidden';
  });
}

const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };

function setFocus(el) {
  if (focused === el) return;
  if (focused?.isConnected) {
    focused.classList.remove('pad-focus');
    focused.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    focused.dispatchEvent(new MouseEvent('mouseleave'));
  }
  focused = el;
  if (!el) return;
  el.classList.add('pad-focus');
  const r = rectOf(el);
  lastPoint = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mouseenter'));
  el.focus?.({ preventScroll: true });
}

// Après un nouveau rendu, l'élément visé a pu disparaître : on reprend son plus proche voisin.
function ensureFocus() {
  const list = candidates();
  if (focused?.isConnected && list.includes(focused)) {
    focused.classList.add('pad-focus');
    return list;
  }
  focused = null;
  if (!list.length) return list;
  // Choix d'une cible en combat : le curseur va directement sur la première cible.
  const target = list.find((el) => el.matches('[data-target]'));
  const i = target ? list.indexOf(target) : lastPoint ? nearest(lastPoint, list.map(rectOf)) : 0;
  setFocus(list[Math.max(0, i)]);
  return list;
}

function moveFocus(dir) {
  const list = ensureFocus();
  if (!focused) return;
  const others = list.filter((el) => el !== focused);
  const i = pickNext(rectOf(focused), others.map(rectOf), dir);
  if (i >= 0) setFocus(others[i]);
}

function clickFocused() {
  ensureFocus();
  if (!focused) return;
  // Le rendu qui suit remplace souvent l'élément : on retient sa position avant le clic
  // pour viser ensuite son plus proche voisin.
  const r = rectOf(focused);
  lastPoint = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  focused.click();
}

function back() {
  if (isPaused() || state.screen === 'combat') return key('keydown', 'Escape');
  if (menuOnMap) { menuOnMap = false; setFocus(null); return; }
  const close = document.querySelector('.hud-modal #eventSkip, .hud-close, #scrBack, #backHub, #backBtn');
  if (close) return close.click();
  key('keydown', 'Escape');
}

// Page précédente / suivante d'une grille, sinon héros précédent / suivant (onglets).
function page(step) {
  const pager = [...document.querySelectorAll(`[data-page$=":${step}"]`)].find((b) => !b.disabled);
  if (pager) return pager.click();
  const tabs = [...document.querySelectorAll('[data-hero]')];
  const current = tabs.findIndex((b) => b.classList.contains('current'));
  if (tabs.length > 1 && current >= 0) tabs[(current + step + tabs.length) % tabs.length].click();
}

function releaseWalk() {
  if (walkKey) key('keyup', walkKey);
  walkKey = null;
}

function frame(now) {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const pad = pads.find((p) => p.mapping === 'standard') ?? pads[0];
  if (!pad) { running = false; releaseWalk(); return; }
  const down = pad.buttons.map((b) => b.pressed);
  const pressed = (i) => down[i] && !prev[i];
  const dir = padDirection(pad.buttons, pad.axes);
  const dirKey = dir ? `${dir.dx},${dir.dy}` : null;
  const active = down.some(Boolean) || !!dir;
  if (active) document.body.classList.add('pad-mode');

  if (pressed(BTN.START)) key('keydown', 'Escape');
  if (walking()) {
    setFocus(null);
    const arrow = dirKey ? ARROWS[dirKey] : null;
    if (arrow !== walkKey) {
      releaseWalk();
      if (arrow) { key('keydown', arrow); walkKey = arrow; }
    }
    if (pressed(BTN.A)) {
      const ladder = document.querySelector('#ladderBtn:not(:disabled)');
      if (ladder) ladder.click(); else key('keydown', ' ');
    }
    if (pressed(BTN.Y)) { menuOnMap = true; releaseWalk(); ensureFocus(); }
  } else {
    releaseWalk();
    if (active) ensureFocus();
    if (dirKey) {
      if (!heldDir || heldDir.key !== dirKey) {
        heldDir = { key: dirKey, next: now + FIRST_REPEAT_MS };
        moveFocus(dir);
      } else if (now >= heldDir.next) {
        heldDir.next = now + REPEAT_MS;
        moveFocus(dir);
      }
    } else heldDir = null;
    if (pressed(BTN.A)) clickFocused();
    if (pressed(BTN.B)) back();
    if (pressed(BTN.Y) && menuOnMap) { menuOnMap = false; setFocus(null); }
    if (pressed(BTN.LB)) page(-1);
    if (pressed(BTN.RB)) page(1);
  }
  // Retour sur la carte : quitter le mode menu si l'écran n'est plus une carte.
  if (menuOnMap && !['hub', 'dungeon'].includes(state.screen)) menuOnMap = false;
  prev = down;
  requestAnimationFrame(frame);
}

function start() {
  if (running) return;
  running = true;
  prev = [];
  requestAnimationFrame(frame);
}

// Lance l'écoute (une fois, au démarrage) : la boucle ne tourne que manette branchée.
export function startGamepad() {
  if (typeof window === 'undefined' || !navigator.getGamepads) return;
  window.addEventListener('gamepadconnected', start);
  window.addEventListener('gamepaddisconnected', () => { if (![...navigator.getGamepads()].some(Boolean)) setFocus(null); });
  // La souris reprend la main : le curseur de la manette s'efface.
  window.addEventListener('mousemove', () => {
    if (!document.body.classList.contains('pad-mode')) return;
    document.body.classList.remove('pad-mode');
    setFocus(null);
  });
  if ([...navigator.getGamepads()].some(Boolean)) start();
}
