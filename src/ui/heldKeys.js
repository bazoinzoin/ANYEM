// Déplacement au clavier (flèches, ZQSD, WASD) : un pas à l'appui, puis un pas toutes les
// `interval` ms tant que la touche reste enfoncée (la répétition automatique du clavier est
// ignorée : la vitesse ne dépend plus du système). La dernière direction enfoncée gagne.

const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  z: [0, -1], s: [0, 1], q: [-1, 0], d: [1, 0], w: [0, -1], a: [-1, 0],
};

const dirOf = (key) => KEYS[key] ?? KEYS[key.toLowerCase()] ?? null;

/**
 * active() : l'écran concerné est affiché ; onMove(dx, dy) : un pas ;
 * onAction() : touche d'action (Espace, Entrée, E), facultatif.
 */
export function holdToWalk({ active, onMove, onAction = null, interval }) {
  if (typeof document === 'undefined') return;
  const held = []; // touches de direction enfoncées, la dernière en fin
  let timer = null;
  const stop = () => {
    held.length = 0;
    clearTimeout(timer);
    timer = null;
  };
  const tick = () => {
    if (!held.length || !active()) return stop();
    onMove(...dirOf(held[held.length - 1]));
    timer = setTimeout(tick, interval);
  };
  document.addEventListener('keydown', (ev) => {
    if (!active() || ev.target.closest?.('input, textarea, select')) return;
    if (onAction && [' ', 'Enter', 'e', 'E'].includes(ev.key)) {
      ev.preventDefault();
      if (!ev.repeat) onAction();
      return;
    }
    const dir = dirOf(ev.key);
    if (!dir) return;
    ev.preventDefault();
    if (ev.repeat || held.includes(ev.key)) return;
    held.push(ev.key);
    if (!timer) {
      onMove(...dir);
      timer = setTimeout(tick, interval);
    }
  });
  document.addEventListener('keyup', (ev) => {
    const i = held.indexOf(ev.key);
    if (i !== -1) held.splice(i, 1);
    if (!held.length) stop();
  });
  window.addEventListener('blur', stop);
}
