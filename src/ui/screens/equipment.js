// Écran Personnage (équipement et inventaire), plein écran et sans défilement :
// à gauche les statistiques du héros (écart en vert / rouge quand on survole un objet),
// au centre le héros et ses emplacements, à droite le sac en grille d'icônes (onglets,
// pages) et la fiche de l'objet survolé ou choisi.
// Équiper : glisser un objet du sac sur un emplacement (les emplacements possibles
// s'allument), double-clic, ou clic sur l'objet puis sur l'emplacement. Retirer : glisser
// l'objet équipé vers le sac, ou double-clic.

import { state } from '../../state.js';
import { isTwoHanded } from '../../game/items.js';
import { SLOT_ORDER, RARITIES, MATERIA_KINDS, MATERIA_RARITIES } from '../../data/items.js';
import { STATS, STAT_ORDER } from '../../data/stats.js';
import { CONSUMABLES, CONSUMABLE_ORDER } from '../../data/consumables.js';
import { getClass, getStats, xpToNext, heroClassTitle } from '../../game/party.js';
import { equip, unequip, slotsFor, cannotEquipReason, previewEquip } from '../../game/equipment.js';
import { esc } from '../html.js';
import { itemCard, slotLabel, rarityClass } from '../items.js';
import { goTo, goBack, backLabel } from '../router.js';
import { iconHtml, itemIcon, consumableIcon, MATERIA_ICONS, CLASS_ICONS, GOLD_ICON } from '../icons.js';
import { SLOT_ART, assetUrl } from '../skin.js';
import { BAG_TABS, bagItems, paginate } from '../bagView.js';
import { drawActor } from '../actors.js';
import { heroSprite } from '../heroSprite.js';
import { openTalents } from './talents.js';
import { gearGuideHtml, preferredStat } from '../gearGuide.js';

// État propre à l'écran : héros affiché, onglet et page du sac, objet choisi
// ({ from: 'bag', id } | { from: 'slot', slot }), taille d'une page de la grille.
const view = { heroIndex: 0, tab: 'all', page: 0, selected: null, perPage: 40 };

// Disposition des emplacements autour du héros : [emplacement, colonne, ligne].
const DOLL = [
  ['casque', 1, 1], ['epaulieres', 1, 2], ['plastron', 1, 3], ['gants', 1, 4], ['bottes', 1, 5],
  ['collier', 3, 1], ['anneau1', 3, 2], ['anneau2', 3, 3], ['mainDroite', 3, 4], ['mainGauche', 3, 5],
];

export function openEquipment(heroIndex = view.heroIndex) {
  view.heroIndex = heroIndex;
  view.selected = null;
  goTo('equipment');
}

export function renderEquipment(app) {
  view.heroIndex = Math.min(view.heroIndex, state.party.length - 1);
  const hero = state.party[view.heroIndex];
  const cls = getClass(hero);
  app.innerHTML = `
    <div class="inv-screen">
      <header class="inv-top">
        <div class="inv-tabs">${state.party.map((h, i) => `
          <button class="inv-hero ${i === view.heroIndex ? 'current' : ''}" data-hero="${i}" style="--c:${getClass(h).color}">
            ${iconHtml(CLASS_ICONS[h.classKey], 32)}<span><b>${esc(h.name)}</b><small>${esc(heroClassTitle(h))} · niv. ${h.level}</small></span>
          </button>`).join('')}
        </div>
        <span class="inv-gold">${iconHtml(GOLD_ICON, 32)} ${state.gold.toLocaleString('fr-FR')}</span>
        <button id="toTalents">${iconHtml(96, 32)} Talents</button>
        <button id="backHub">${esc(backLabel())}</button>
      </header>
      <section class="win inv-stats" style="--c:${cls.color}">
        <h3>${esc(hero.name)} <small>${esc(heroClassTitle(hero))} · niveau ${hero.level}</small></h3>
        <div class="xp"><small>XP ${hero.xp} / ${xpToNext(hero.level)}</small><span class="meter xp"><span class="fill" style="width:${Math.min(100, (hero.xp / xpToNext(hero.level)) * 100)}%"></span></span></div>
        <div class="stat-grid" id="statGrid">${statGrid(hero, null)}</div>
      </section>
      <section class="win inv-doll">
        <div class="doll">
          ${DOLL.map(([slot, col, row]) => slotCell(hero, slot, col, row)).join('')}
          <canvas id="dollHero" width="96" height="124" style="grid-column:2; grid-row:1 / span 5"></canvas>
        </div>
        ${gearGuideHtml(hero)}
        <p class="hint inv-help">Glissez un objet sur un emplacement (ou double-clic) ; vers le sac pour le retirer.</p>
      </section>
      <section class="win inv-bag" id="bagDrop">
        <nav class="bag-tabs">${BAG_TABS.map((t) => `<button class="bag-tab ${t.id === view.tab ? 'current' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}</nav>
        <div class="bag-grid" id="bagGrid">${bagContent(hero)}</div>
      </section>
      <section class="win inv-detail" id="detail">${detail(hero, selectedItem(hero))}</section>
    </div>`;
  drawHero(app.querySelector('#dollHero'), hero);
  wire(app, hero);
  fitGrid(app);
  fitDetail(app.querySelector('#detail'));
}

// ---- Stats ----

// Stats du héros ; avec `preview` (héros après échange), écart affiché en couleur.
function statGrid(hero, preview) {
  const now = getStats(hero);
  const after = preview ? getStats(preview) : null;
  const cls = getClass(hero);
  const rows = [
    ['physPower', 'Puiss. physique', ''], ['magPower', 'Puiss. magique', ''],
    ...STAT_ORDER.map((k) => [k, STATS[k].label + (k === preferredStat(hero) ? ' ★' : ''), STATS[k].suffix ? ` ${STATS[k].suffix}` : '']),
  ];
  return rows.map(([k, label, suffix]) => {
    const d = after ? after[k] - now[k] : 0;
    const value = k === 'pv' ? `${hero.hp}/${now.pv}` : `${now[k]}${suffix}`;
    return `<span class="k">${label}</span><span class="v">${value}${d ? ` <b class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</b>` : ''}</span>`;
  }).join('');
}

// ---- Poupée ----

function slotCell(hero, slot, col, row) {
  const item = hero.equipment[slot];
  const twoHand = slot === 'mainGauche' && !item && hero.equipment.mainDroite && isTwoHanded(hero.equipment.mainDroite);
  const shown = item ?? (twoHand ? hero.equipment.mainDroite : null);
  const selected = view.selected?.from === 'slot' && view.selected.slot === slot ? 'selected' : '';
  return `
    <div class="eq-slot ${shown ? `filled ${rarityClass(shown)}` : ''} ${twoHand ? 'ghost' : ''} ${selected}" data-slot="${slot}" style="grid-column:${col}; grid-row:${row}; --slot-art:${assetUrl(SLOT_ART[slot])}${shown ? `; --rc:${RARITIES[shown.rarity].color}` : ''}"
      title="${esc(slotLabel(slot))}${twoHand ? ' (arme à deux mains)' : ''}" ${item ? 'draggable="true"' : ''}>
      ${shown ? `${iconHtml(itemIcon(shown), 32)}${shown.plus ? `<sup>+${shown.plus}</sup>` : ''}` : ''}
    </div>`;
}

function drawHero(canvas, hero) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const draw = (now) => {
    if (!canvas.isConnected) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawActor(ctx, { sx: 0, sy: 0, size: 96, scale: 4, dir: 'down', now, sprite: heroSprite(hero) });
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

// ---- Sac ----

// Matéria du sac, toujours visibles sous la grille : total par sorte, détail par rareté au survol
// (et dans l'onglet Matéria).
function materiaChips() {
  return `<span class="inv-materia">${Object.keys(MATERIA_KINDS).map((kind) => {
    const total = MATERIA_RARITIES.reduce((n, r) => n + state.materia[kind][r], 0);
    const detail = MATERIA_RARITIES.map((r) => `${RARITIES[r].label} : ${state.materia[kind][r]}`).join('\n');
    return `<button class="mat-chip" data-tab-link="materia" title="${esc(`${MATERIA_KINDS[kind].label}\n${detail}`)}">${iconHtml(MATERIA_ICONS[kind], 16)} ${total.toLocaleString('fr-FR')}</button>`;
  }).join('')}</span>`;
}

function bagContent(hero) {
  if (view.tab === 'consumables') {
    const owned = CONSUMABLE_ORDER.filter((k) => state.consumables[k] > 0);
    return owned.map((k) => `
      <div class="bag-cell" data-consumable="${k}" title="${esc(CONSUMABLES[k].name)}">${iconHtml(consumableIcon(k), 32)}<sup>${state.consumables[k]}</sup></div>`).join('')
      || '<p class="hint">Aucun consommable.</p>';
  }
  if (view.tab === 'materia') {
    // Tableau : une ligne par sorte (arme, armure, bijou), une colonne par rareté.
    return `<div class="materia-table">
      <span></span>${MATERIA_RARITIES.map((r) => `<span class="mt-head" style="color:${RARITIES[r].color}">${esc(RARITIES[r].label)}</span>`).join('')}
      ${Object.keys(MATERIA_KINDS).map((kind) => `
        <span class="mt-kind">${iconHtml(MATERIA_ICONS[kind], 16)} ${esc(MATERIA_KINDS[kind].label.replace('Matéria ', ''))}</span>
        ${MATERIA_RARITIES.map((r) => `<div class="bag-cell ${state.materia[kind][r] ? '' : 'empty'}" style="--rc:${RARITIES[r].color}" title="${esc(`${MATERIA_KINDS[kind].label} ${RARITIES[r].label.toLowerCase()}`)}">${iconHtml(MATERIA_ICONS[kind], 32)}<sup>${state.materia[kind][r]}</sup></div>`).join('')}`).join('')}
    </div>
    <p class="hint mt-note">Les matéria servent à la Forge : améliorer, fabriquer, forge divine.</p>`;
  }
  const { items, page, pages } = paginate(bagItems(state.bag, view.tab, hero), view.page, view.perPage);
  view.page = page;
  const cells = items.map((item) => {
    const usable = !cannotEquipReason(hero, item);
    const selected = view.selected?.from === 'bag' && view.selected.id === item.id ? 'selected' : '';
    return `<div class="bag-cell ${rarityClass(item)} ${usable ? '' : 'unusable'} ${selected}" data-item="${item.id}" draggable="true" style="--rc:${RARITIES[item.rarity].color}">${iconHtml(itemIcon(item), 32)}${item.plus ? `<sup>+${item.plus}</sup>` : ''}</div>`;
  });
  for (let i = items.length; i < view.perPage; i++) cells.push('<div class="bag-cell empty"></div>');
  return `${cells.join('')}
    <div class="bag-pager"><button id="pgPrev" ${page ? '' : 'disabled'}>◂</button><span>Page ${page + 1} / ${pages} · ${state.bag.length} objets</span><button id="pgNext" ${page < pages - 1 ? '' : 'disabled'}>▸</button>${materiaChips()}</div>`;
}

// Nombre de cases par page : ce qui tient dans la grille (mesuré après affichage).
function fitGrid(app) {
  const grid = app.querySelector('#bagGrid');
  if (!grid || view.tab === 'consumables' || view.tab === 'materia') return;
  const cell = 46;
  const cols = Math.max(4, Math.floor((grid.clientWidth + 4) / cell));
  const rows = Math.max(2, Math.floor((grid.clientHeight - 34 + 4) / cell));
  const perPage = cols * rows;
  if (perPage !== view.perPage) {
    view.perPage = perPage;
    grid.innerHTML = bagContent(state.party[view.heroIndex]);
    wire(app, state.party[view.heroIndex]);
  }
}

// ---- Fiche ----

function selectedItem(hero) {
  const sel = view.selected;
  if (!sel) return null;
  if (sel.from === 'slot') return hero.equipment[sel.slot] ?? null;
  return state.bag.find((item) => item.id === sel.id) ?? null;
}

function detail(hero, item, hoverSlot = null) {
  if (!item) return '<p class="hint">Survolez un objet pour voir sa fiche ; cliquez pour le choisir.</p>';
  const equipped = SLOT_ORDER.find((s) => hero.equipment[s] === item);
  let actions = '';
  if (equipped) actions = `<button data-unequip="${equipped}">Retirer</button>`;
  else {
    const reason = cannotEquipReason(hero, item);
    actions = reason ? `<p class="warning">${esc(reason)}.</p>`
      : slotsFor(hero, item).map((slot) => `<button class="gold" data-equip="${slot}" data-id="${item.id}">Équiper — ${esc(slotLabel(slot))}</button>`).join('');
  }
  const compare = !equipped ? comparedWith(hero, item, hoverSlot) : null;
  return `<div class="detail-cols">
      <div>${iconHtml(itemIcon(item), 64, 'detail-icon')}${itemCard(item)}</div>
      ${compare ? `<div class="detail-vs"><small>Équipé :</small>${iconHtml(itemIcon(compare), 32)}${itemCard(compare)}</div>` : ''}
    </div><div class="detail-actions">${actions}</div>`;
}

// Fiche trop longue (beaucoup de stats, pouvoir unique, comparaison) : on resserre
// l'affichage par étapes plutôt que de laisser le texte déborder du cadre.
export function fitDetail(panel) {
  panel.classList.remove('dense', 'denser');
  const over = () => panel.scrollHeight > panel.clientHeight + 1;
  if (over()) panel.classList.add('dense');
  if (over()) panel.classList.add('denser');
}

// Objet actuellement porté à la place où irait `item`.
function comparedWith(hero, item, slot) {
  const target = slot ?? slotsFor(hero, item)[0];
  return target ? hero.equipment[target] ?? null : null;
}

// ---- Événements ----

function rerender() {
  const app = document.getElementById('app');
  if (app && state.screen === 'equipment') renderEquipment(app);
}

function doEquip(hero, item, slot) {
  if (!item || !equip(hero, state.bag, item, slot)) return false;
  view.selected = { from: 'slot', slot };
  rerender();
  return true;
}

function doUnequip(hero, slot) {
  const item = hero.equipment[slot];
  if (!unequip(hero, state.bag, slot)) return;
  view.selected = { from: 'bag', id: item.id };
  rerender();
}

// Aperçu au survol : fiche, comparaison, écart de stats, emplacements possibles.
function preview(app, hero, item, slot = null) {
  const panel = app.querySelector('#detail');
  if (panel) { panel.innerHTML = detail(hero, item, slot); fitDetail(panel); }
  wireDetail(app, hero);
  const inBag = item && !SLOT_ORDER.some((s) => hero.equipment[s] === item);
  const target = inBag ? slot ?? slotsFor(hero, item)[0] : null;
  const after = target ? previewEquip(hero, item, target) : null;
  app.querySelector('#statGrid').innerHTML = statGrid(hero, after);
  const ok = inBag ? slotsFor(hero, item) : [];
  app.querySelectorAll('.eq-slot').forEach((el) => el.classList.toggle('can-drop', ok.includes(el.dataset.slot)));
}

function wireDetail(app, hero) {
  app.querySelectorAll('[data-equip]').forEach((b) => {
    b.onclick = () => doEquip(hero, state.bag.find((i) => i.id === b.dataset.id), b.dataset.equip);
  });
  app.querySelectorAll('[data-unequip]').forEach((b) => { b.onclick = () => doUnequip(hero, b.dataset.unequip); });
}

function wire(app, hero) {
  app.querySelectorAll('[data-hero]').forEach((b) => { b.onclick = () => openEquipment(Number(b.dataset.hero)); });
  app.querySelector('#backHub').onclick = () => goBack();
  app.querySelector('#toTalents').onclick = () => openTalents(view.heroIndex);
  app.querySelectorAll('[data-tab-link]').forEach((b) => { b.onclick = () => { view.tab = b.dataset.tabLink; view.page = 0; rerender(); }; });
  app.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { view.tab = b.dataset.tab; view.page = 0; rerender(); }; });
  app.querySelector('#pgPrev')?.addEventListener('click', () => { view.page--; rerender(); });
  app.querySelector('#pgNext')?.addEventListener('click', () => { view.page++; rerender(); });
  wireDetail(app, hero);
  const chosen = () => selectedItem(hero);
  const restore = () => preview(app, hero, chosen());

  // Objets du sac.
  app.querySelectorAll('.bag-cell[data-item]').forEach((cell) => {
    const item = state.bag.find((i) => i.id === cell.dataset.item);
    cell.onmouseenter = () => preview(app, hero, item);
    cell.onmouseleave = restore;
    cell.onclick = () => { view.selected = { from: 'bag', id: item.id }; rerender(); };
    cell.ondblclick = () => { const slot = slotsFor(hero, item)[0]; if (slot) doEquip(hero, item, slot); };
    cell.ondragstart = (ev) => {
      ev.dataTransfer.setData('text/plain', `bag:${item.id}`);
      ev.dataTransfer.effectAllowed = 'move';
      preview(app, hero, item);
    };
    cell.ondragend = restore;
  });
  app.querySelectorAll('.bag-cell[data-consumable]').forEach((cell) => {
    const c = CONSUMABLES[cell.dataset.consumable];
    cell.onmouseenter = () => { app.querySelector('#detail').innerHTML = `<p>${iconHtml(consumableIcon(cell.dataset.consumable), 64, 'detail-icon')}<b>${esc(c.name)}</b> ×${state.consumables[cell.dataset.consumable]}</p><p>${esc(c.desc)}</p>`; };
  });

  // Emplacements.
  app.querySelectorAll('.eq-slot').forEach((el) => {
    const slot = el.dataset.slot;
    const item = hero.equipment[slot];
    el.onmouseenter = () => { if (item) preview(app, hero, item); else if (chosen() && !SLOT_ORDER.some((s) => hero.equipment[s] === chosen())) preview(app, hero, chosen(), slot); };
    el.onmouseleave = restore;
    el.onclick = () => {
      const sel = chosen();
      // Un objet du sac est choisi et va ici : on l'équipe.
      if (sel && view.selected.from === 'bag' && slotsFor(hero, sel).includes(slot)) return doEquip(hero, sel, slot);
      if (item) { view.selected = { from: 'slot', slot }; rerender(); }
    };
    el.ondblclick = () => { if (item) doUnequip(hero, slot); };
    el.ondragstart = (ev) => { if (!item) return ev.preventDefault(); ev.dataTransfer.setData('text/plain', `slot:${slot}`); };
    el.ondragover = (ev) => { if (el.classList.contains('can-drop')) { ev.preventDefault(); el.classList.add('over'); } };
    el.ondragleave = () => el.classList.remove('over');
    el.ondrop = (ev) => {
      ev.preventDefault();
      const [from, id] = ev.dataTransfer.getData('text/plain').split(':');
      if (from === 'bag') doEquip(hero, state.bag.find((i) => i.id === id), slot);
    };
  });

  // Déposer un objet équipé sur le sac le retire.
  const bag = app.querySelector('#bagDrop');
  bag.ondragover = (ev) => { if (ev.dataTransfer.types.includes('text/plain')) { ev.preventDefault(); bag.classList.add('over'); } };
  bag.ondragleave = () => bag.classList.remove('over');
  bag.ondrop = (ev) => {
    ev.preventDefault();
    bag.classList.remove('over');
    const [from, slot] = ev.dataTransfer.getData('text/plain').split(':');
    if (from === 'slot') doUnequip(hero, slot);
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => { if (state.screen === 'equipment') rerender(); });
}

