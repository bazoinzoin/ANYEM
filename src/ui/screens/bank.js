// Banque, plein écran sans défilement : le sac à gauche, le coffre à droite (objets,
// consommables et matéria en icônes), l'or et la fiche de l'objet au centre. Double-clic
// ou glisser d'un côté à l'autre pour déplacer un objet ; clic sur un consommable = 1
// (Maj + clic = tout), clic sur une matéria = tout le tas.
// Ce qui est à la banque ne peut pas être perdu en cas de défaite.

import { state } from '../../state.js';
import { CONSUMABLE_ORDER } from '../../data/consumables.js';
import { bankOf, moveGold, depositItem, withdrawItem, moveConsumable, moveMateria } from '../../game/bank.js';
import { bagItems } from '../bagView.js';
import { goTo } from '../router.js';
import { iconHtml, GOLD_ICON } from '../icons.js';
import { frame, wireFrame, flashLine, itemGrid, wireGrid, fitGrids, consumableCell, materiaGrid, itemDetail } from '../screenFrame.js';

const view = { selected: null };

export function renderBank(app) {
  const bank = bankOf(state);
  const closed = Boolean(state.expedition);
  const bagList = bagItems(state.bag, 'all', null);
  const chestList = bagItems(bank.items, 'all', null);
  const consumables = CONSUMABLE_ORDER.filter((k) => state.consumables[k] > 0 || bank.consumables[k] > 0);
  const selected = view.selected && [...state.bag, ...bank.items].find((i) => i.id === view.selected);

  const side = (title, icon, gridId, items, source, dir) => `
    <section class="win bank-side" data-drop="${dir}">
      <h3>${iconHtml(icon, 16)} ${title} <small>${items.length} objet${items.length > 1 ? 's' : ''}</small></h3>
      ${itemGrid(gridId, items, { selectedId: view.selected, drag: !closed, empty: 'Vide.' })}
      <h3>${iconHtml(276, 16)} Consommables</h3>
      <div class="cells">${consumables.map((k) => consumableCell(k, source.consumables[k] ?? 0, `data-consumable="${k}" data-dir="${dir}"`, 'pick')).join('') || '<p class="hint">Aucun consommable.</p>'}</div>
      <h3>${iconHtml(162, 16)} Matéria</h3>
      ${materiaGrid(source.materia, (kind, rarity) => `data-materia="${kind}:${rarity}" data-dir="${dir}"`)}
    </section>`;

  app.innerHTML = frame({
    title: 'Banque', icon: 131, layout: 'lay-bank',
    body: `
      ${side('Sac', 158, 'bankBag', bagList, state, 1)}
      <section class="win detail-panel">
        <h3>${iconHtml(GOLD_ICON, 16)} Or</h3>
        <p>Sur toi : <b class="price">${state.gold.toLocaleString('fr-FR')}</b><br>À la banque : <b class="price">${bank.gold.toLocaleString('fr-FR')}</b></p>
        <div class="actions">
          <input type="number" id="goldAmount" min="1" value="${Math.max(1, state.gold)}">
          <button id="depositGold">Déposer</button><button id="withdrawGold">Retirer</button>
          <button id="depositAllGold">Tout déposer</button><button id="withdrawAllGold">Tout retirer</button>
        </div>
        ${closed ? '<p class="warning">La banque est fermée pendant une expédition.</p>' : '<p class="hint">Ce qui est à la banque ne peut pas être perdu en cas de défaite. Double-cliquez ou glissez un objet d\'un côté à l\'autre ; Maj + clic sur un consommable déplace tout le tas.</p>'}
        <div id="bankDetail">${detail(selected, bank)}</div>
      </section>
      ${side('Coffre', 131, 'bankChest', chestList, bank, -1)}`,
  });
  wireFrame(app);

  const refresh = () => goTo('bank');
  const move = (item) => {
    if (closed) return;
    if (state.bag.includes(item)) depositItem(state, item.id);
    else withdrawItem(state, item.id);
    view.selected = null;
    refresh();
  };
  const amount = () => Number(app.querySelector('#goldAmount').value) || 0;
  app.querySelector('#depositGold').onclick = () => { moveGold(state, Math.min(amount(), state.gold)); refresh(); };
  app.querySelector('#withdrawGold').onclick = () => { moveGold(state, -Math.min(amount(), bank.gold)); refresh(); };
  app.querySelector('#depositAllGold').onclick = () => { moveGold(state, state.gold); refresh(); };
  app.querySelector('#withdrawAllGold').onclick = () => { moveGold(state, -bank.gold); refresh(); };

  const detailBox = app.querySelector('#bankDetail');
  const wireMove = () => { const b = detailBox.querySelector('[data-move]'); if (b) b.onclick = () => move(selected); };
  const handlers = (items) => ({
    onHover: (item) => { detailBox.innerHTML = detail(item, bank); },
    onLeave: () => { detailBox.innerHTML = detail(selected, bank); wireMove(); },
    onSelect: (item) => { view.selected = item.id; refresh(); },
    onDouble: move,
    rerender: refresh,
  });
  wireGrid(app, 'bankBag', bagList, handlers(bagList));
  wireGrid(app, 'bankChest', chestList, handlers(chestList));
  wireMove();

  // Glisser d'un côté à l'autre.
  app.querySelectorAll('[data-drop]').forEach((zone) => {
    zone.ondragover = (ev) => ev.preventDefault();
    zone.ondrop = (ev) => {
      ev.preventDefault();
      const [grid, id] = ev.dataTransfer.getData('text/plain').split(':');
      const fromBag = grid === 'bankBag';
      if (fromBag === (zone.dataset.drop === '1')) return; // déposé du même côté
      const item = [...state.bag, ...bank.items].find((i) => i.id === id);
      if (item) move(item);
    };
  });

  app.querySelectorAll('[data-consumable]').forEach((cell) => {
    cell.onclick = (ev) => {
      if (closed) return;
      const key = cell.dataset.consumable;
      const dir = Number(cell.dataset.dir);
      const have = (dir > 0 ? state.consumables[key] : bank.consumables[key]) ?? 0;
      if (!have) return;
      moveConsumable(state, key, dir * (ev.shiftKey ? have : 1));
      refresh();
    };
  });
  app.querySelectorAll('[data-materia]').forEach((cell) => {
    cell.onclick = () => {
      if (closed) return;
      const [kind, rarity] = cell.dataset.materia.split(':');
      const dir = Number(cell.dataset.dir);
      const have = (dir > 0 ? state.materia : bank.materia)[kind][rarity];
      if (!have) return;
      moveMateria(state, kind, rarity, dir * have);
      refresh();
    };
  });
  fitGrids(app, refresh);
}

function detail(item, bank) {
  if (!item) return flashLine('');
  const inBank = bank.items.includes(item);
  return itemDetail(item, `<div class="actions"><button data-move ${state.expedition ? 'disabled' : ''}>${inBank ? '◂ Retirer au sac' : 'Déposer au coffre ▸'}</button></div>`);
}
