// Briques communes des écrans plein écran sans défilement : cadre (barre du haut avec
// titre, or et retour), grilles d'icônes paginées (objets, consommables, matéria) et fiche
// d'objet. Les pages d'une grille s'ajustent à la place disponible (`fitGrids`).

import { state } from '../state.js';
import { RARITIES, MATERIA_KINDS, MATERIA_RARITIES } from '../data/items.js';
import { CONSUMABLES } from '../data/consumables.js';
import { esc } from './html.js';
import { itemCard } from './items.js';
import { iconHtml, itemIcon, consumableIcon, MATERIA_ICONS, GOLD_ICON, CLASS_ICONS } from './icons.js';
import { paginate } from './bagView.js';
import { getClass, heroClassTitle } from '../game/party.js';
import { equippedItems } from '../game/equipment.js';
import { backLabel, goBack } from './router.js';

// Cadre d'écran : `layout` = classe de mise en page du corps (grille CSS propre à l'écran).
export function frame({ title, icon, extras = '', body, layout = '', back = backLabel(), gold = true }) {
  return `
    <div class="scr ${layout}">
      <header class="scr-top">
        <h2 class="scr-title">${icon !== undefined ? iconHtml(icon, 32) : ''}${esc(title)}</h2>
        <div class="scr-extras">${extras}</div>
        ${gold ? `<span class="inv-gold">${iconHtml(GOLD_ICON, 32)} ${state.gold.toLocaleString('fr-FR')}</span>` : ''}
        <button id="scrBack">${esc(back)}</button>
      </header>
      <div class="scr-body">${body}</div>
    </div>`;
}

export function wireFrame(app, onBack = goBack) {
  const back = app.querySelector('#scrBack');
  if (back) back.onclick = onBack;
}

export function flashLine(text) {
  return text ? `<p class="scr-flash">${esc(text)}</p>` : '';
}

// ---- Grilles paginées ----

const grids = new Map(); // id → { page, perPage }

export function gridState(id) {
  if (!grids.has(id)) grids.set(id, { page: 0, perPage: 24 });
  return grids.get(id);
}

export function resetGrid(id) {
  gridState(id).page = 0;
}

/**
 * Grille d'objets d'équipement. opts : selectedId, dim(item) (grisé), badge(item) (texte
 * dans le coin), empty (message si vide), drag (glissable).
 */
export function itemGrid(id, items, opts = {}) {
  const st = gridState(id);
  const { items: shown, page, pages } = paginate(items, st.page, st.perPage);
  st.page = page;
  const cells = shown.map((item) => `
    <div class="bag-cell ${opts.dim?.(item) ? 'unusable' : ''} ${opts.selectedId === item.id ? 'selected' : ''}" data-cell="${id}" data-id="${item.id}"
      style="--rc:${RARITIES[item.rarity].color}" ${opts.drag ? 'draggable="true"' : ''}>
      ${iconHtml(itemIcon(item), 32)}${opts.badge ? `<sup>${opts.badge(item)}</sup>` : item.plus ? `<sup>+${item.plus}</sup>` : ''}
    </div>`);
  if (!items.length && opts.empty) cells.push(`<p class="hint grid-empty">${esc(opts.empty)}</p>`);
  else for (let i = shown.length; i < st.perPage; i++) cells.push('<div class="bag-cell empty"></div>');
  return `
    <div class="igrid" data-grid="${id}">
      <div class="igrid-cells">${cells.join('')}</div>
      <div class="bag-pager"><button data-page="${id}:-1" ${page ? '' : 'disabled'}>◂</button><span>${page + 1} / ${pages} · ${items.length} objet${items.length > 1 ? 's' : ''}</span><button data-page="${id}:1" ${page < pages - 1 ? '' : 'disabled'}>▸</button></div>
    </div>`;
}

/**
 * Branche une grille : survol, clic, double-clic, glisser. `items` = la liste complète.
 * handlers : onHover(item), onLeave(), onSelect(item), onDouble(item), rerender().
 */
export function wireGrid(app, id, items, handlers) {
  app.querySelectorAll(`[data-page^="${id}:"]`).forEach((b) => {
    b.onclick = () => { gridState(id).page += Number(b.dataset.page.split(':')[1]); handlers.rerender(); };
  });
  app.querySelectorAll(`[data-cell="${id}"]`).forEach((cell) => {
    const item = items.find((i) => i.id === cell.dataset.id);
    if (!item) return;
    cell.onmouseenter = () => handlers.onHover?.(item);
    cell.onmouseleave = () => handlers.onLeave?.();
    cell.onclick = () => handlers.onSelect?.(item);
    cell.ondblclick = () => handlers.onDouble?.(item);
    cell.ondragstart = (ev) => ev.dataTransfer.setData('text/plain', `${id}:${item.id}`);
  });
}

// Ajuste le nombre de cases par page de chaque grille à la place disponible ; réaffiche
// l'écran si une grille a changé (une seule fois : la mesure est alors stable).
export function fitGrids(app, rerender) {
  let changed = false;
  app.querySelectorAll('.igrid').forEach((grid) => {
    const cells = grid.querySelector('.igrid-cells');
    const size = 46;
    const cols = Math.max(3, Math.floor((cells.clientWidth + 2) / size));
    const rows = Math.max(1, Math.floor((cells.clientHeight + 2) / size));
    const st = gridState(grid.dataset.grid);
    if (cols * rows !== st.perPage) {
      st.perPage = cols * rows;
      changed = true;
    }
  });
  if (changed) rerender();
}

// Case de consommable (icône + quantité).
export function consumableCell(key, count, attrs = '', extraClass = '') {
  return `<div class="bag-cell ${count ? '' : 'empty'} ${extraClass}" ${attrs} title="${esc(CONSUMABLES[key].name)}">${iconHtml(consumableIcon(key), 32)}<sup>${count}</sup></div>`;
}

// Matéria : une ligne par sorte, une case par rareté.
export function materiaGrid(materia, attrs = () => '') {
  return `<div class="materia-grid">${Object.keys(MATERIA_KINDS).map((kind) => `
    <div class="materia-row"><span class="materia-kind">${iconHtml(MATERIA_ICONS[kind], 16)} ${esc(MATERIA_KINDS[kind].label.replace('Matéria ', ''))}</span>
      ${MATERIA_RARITIES.map((r) => `<div class="bag-cell small ${materia[kind][r] ? '' : 'empty'}" style="--rc:${RARITIES[r].color}" title="${esc(`${MATERIA_KINDS[kind].label} ${RARITIES[r].label.toLowerCase()}`)}" ${attrs(kind, r)}>${iconHtml(MATERIA_ICONS[kind], 16)}<sup>${materia[kind][r]}</sup></div>`).join('')}
    </div>`).join('')}</div>`;
}

// Fiche d'objet avec grande icône, et éléments ajoutés (prix, boutons…).
export function itemDetail(item, extra = '') {
  if (!item) return '';
  return `<div class="item-detail">${iconHtml(itemIcon(item), 64, 'detail-icon')}${itemCard(item)}</div>${extra}`;
}

// Objets portés par l'équipe, une ligne par héros (cases `data-cell=id`, à brancher avec
// wireGrid(app, id, wornItems(filter), …)).
export function wornItems(filter = () => true) {
  return state.party.flatMap((hero) => equippedItems(hero)).filter(filter);
}

export function wornRows(id, filter = () => true, selectedId = null) {
  return `<div class="forge-worn">${state.party.map((hero) => {
    const items = equippedItems(hero).filter(filter);
    return `
      <div class="forge-hero" style="--c:${getClass(hero).color}">
        <span class="forge-hero-name">${iconHtml(CLASS_ICONS[hero.classKey] ?? 720, 16)} ${esc(hero.name)}</span>
        <div class="cells">${items.map((item) => `<div class="bag-cell ${item.id === selectedId ? 'selected' : ''}" data-cell="${id}" data-id="${item.id}" style="--rc:${RARITIES[item.rarity].color}">${iconHtml(itemIcon(item), 32)}${item.plus ? `<sup>+${item.plus}</sup>` : ''}</div>`).join('') || '<span class="hint">Rien</span>'}</div>
      </div>`;
  }).join('')}</div>`;
}

// Onglets des héros de l'équipe (barre du haut) ; brancher avec wireHeroTabs.
export function heroTabs(current) {
  return `<div class="inv-tabs">${state.party.map((h, i) => `
    <button class="inv-hero ${i === current ? 'current' : ''}" data-hero="${i}" style="--c:${getClass(h).color}">
      ${iconHtml(CLASS_ICONS[h.classKey], 32)}<span><b>${esc(h.name)}</b><small>${esc(heroClassTitle(h))} · niv. ${h.level}</small></span>
    </button>`).join('')}</div>`;
}

export function wireHeroTabs(app, onPick) {
  app.querySelectorAll('[data-hero]').forEach((b) => { b.onclick = () => onPick(Number(b.dataset.hero)); });
}
