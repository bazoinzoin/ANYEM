// Menus contextuels et petites boîtes de saisie.

import { esc } from './dom.js';
import { icon } from './icons.js';

let openMenu = null;

export function closeMenu() {
  if (openMenu) { openMenu.remove(); openMenu = null; }
}

// items : [{ label, action, shortcut, disabled, checked, icon }] ou '-' (séparateur).
export function showMenu(x, y, items, { minWidth = 200 } = {}) {
  closeMenu();
  const el = document.createElement('div');
  el.className = 'ctx-menu';
  el.style.minWidth = `${minWidth}px`;
  el.innerHTML = items.map((it, i) => {
    if (it === '-') return '<div class="ctx-sep"></div>';
    if (it.header) return `<div class="ctx-header">${esc(it.header)}</div>`;
    return `<button class="ctx-item${it.disabled ? ' disabled' : ''}${it.checked ? ' checked' : ''}" data-i="${i}" ${it.disabled ? 'disabled' : ''}>
      <span class="ctx-check">${it.checked ? '✓' : ''}</span>${it.icon ? icon(it.icon, 15) : ''}<span class="ctx-label">${esc(it.label)}</span>${it.shortcut ? `<span class="ctx-key">${esc(it.shortcut)}</span>` : ''}</button>`;
  }).join('');
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(4, Math.min(x, window.innerWidth - r.width - 4))}px`;
  el.style.top = `${Math.max(4, Math.min(y, window.innerHeight - r.height - 4))}px`;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.ctx-item');
    if (!b || b.disabled) return;
    const it = items[Number(b.dataset.i)];
    closeMenu();
    if (it.action) it.action();
  });
  openMenu = el;
  setTimeout(() => {
    const away = (e) => {
      if (openMenu && !openMenu.contains(e.target)) { closeMenu(); document.removeEventListener('pointerdown', away, true); }
      if (!openMenu) document.removeEventListener('pointerdown', away, true);
    };
    document.addEventListener('pointerdown', away, true);
  });
  return el;
}

// Fenêtre modale générique. Renvoie { el, close }.
export function modal(html, { wide = false, onClose = null, className = '' } = {}) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal${wide ? ' wide' : ''} ${className}" role="dialog">${html}</div>`;
  document.body.appendChild(back);
  const close = () => {
    back.remove();
    document.removeEventListener('keydown', onKey, true);
    if (onClose) onClose();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
  };
  document.addEventListener('keydown', onKey, true);
  back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
  back.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  return { el: back.querySelector('.modal'), close };
}

export function promptText(title, value = '', { label = '', ok = 'Valider' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal(`<h2>${esc(title)}</h2>
      ${label ? `<p class="muted">${esc(label)}</p>` : ''}
      <input class="text-input" type="text" value="${esc(value)}" maxlength="80">
      <div class="modal-actions"><button class="btn" data-close>Annuler</button><button class="btn primary" data-ok>${esc(ok)}</button></div>`,
    { onClose: () => { if (!done) resolve(null); } });
    const input = m.el.querySelector('input');
    input.focus();
    input.select();
    const submit = () => { done = true; m.close(); resolve(input.value.trim()); };
    m.el.querySelector('[data-ok]').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  });
}

export function confirmBox(title, text, { ok = 'Continuer', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal(`<h2>${esc(title)}</h2><p>${esc(text)}</p>
      <div class="modal-actions"><button class="btn" data-close>Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button></div>`,
    { onClose: () => { if (!done) resolve(false); } });
    const b = m.el.querySelector('[data-ok]');
    b.focus();
    b.addEventListener('click', () => { done = true; m.close(); resolve(true); });
  });
}
