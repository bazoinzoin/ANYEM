// Marchand, plein écran sans défilement : à gauche la boutique (consommables et
// équipement en vente, en icônes), au centre la fiche de ce qu'on survole ou choisit avec
// le bouton Acheter / Vendre, à droite le sac (butin à vendre) en grille paginée.

import { state } from '../../state.js';
import { MERCHANT } from '../../config.js';
import { CONSUMABLES, CONSUMABLE_ORDER } from '../../data/consumables.js';
import { sellPrice, buyPrice, sell, ensureStock, buyItem, buyConsumable, canBuyConsumable, consumablePrice } from '../../game/merchant.js';
import { countOf } from '../../game/consumables.js';
import { bagItems } from '../bagView.js';
import { esc } from '../html.js';
import { itemName } from '../items.js';
import { goTo } from '../router.js';
import { iconHtml, consumableIcon, GOLD_ICON } from '../icons.js';
import { frame, wireFrame, flashLine, itemGrid, wireGrid, fitGrids, consumableCell, itemDetail } from '../screenFrame.js';

// État propre à l'écran : sélection ({ kind: 'consumable' | 'stock' | 'bag', id }),
// vente en attente de confirmation, dernier message.
const view = { selected: null, confirm: null, flash: null };

// Raretés dont la vente demande une confirmation.
const CONFIRM_RARITIES = ['epique', 'legendaire', 'divin'];

export function openMerchant() {
  Object.assign(view, { selected: null, confirm: null, flash: null });
  goTo('merchant');
}

const gold = (n) => `<span class="price">${iconHtml(GOLD_ICON, 16)}${n}</span>`;

export function renderMerchant(app) {
  const stock = ensureStock(state);
  const bag = bagItems(state.bag, 'all', null);
  const commons = state.bag.filter((i) => i.rarity === 'commun');
  const commonsValue = commons.reduce((sum, i) => sum + sellPrice(i), 0);
  const flash = view.flash;
  view.flash = null;

  app.innerHTML = frame({
    title: 'Marchand', icon: 157, layout: 'lay-shop', extras: flashLine(flash),
    body: `
      <section class="win">
        <h3>${iconHtml(276, 16)} Consommables <small>max ${MERCHANT.maxConsumable} de chaque</small></h3>
        <div class="cells">${CONSUMABLE_ORDER.map((k) => consumableCell(k, countOf(state.consumables, k), `data-consumable="${k}"`, `pick ${view.selected?.id === k ? 'selected' : ''}`)).join('')}</div>
        <h3>${iconHtml(1447, 16)} Équipement en vente <small>niveau ${state.dungeonLvl}</small></h3>
        ${itemGrid('shopStock', stock, { selectedId: view.selected?.id, empty: 'Tout a été vendu : revenez après le prochain donjon.', badge: () => '' })}
      </section>
      <section class="win detail-panel" id="shopDetail">${detail(stock)}</section>
      <section class="win">
        <h3>${iconHtml(157, 16)} Vendre le butin <small>${state.bag.length} objets</small></h3>
        ${commons.length ? `<button id="sellCommons" class="${view.confirm === 'commons' ? 'btn-primary' : ''}">${view.confirm === 'commons' ? `Confirmer : ${commons.length} communs pour ${commonsValue} or` : `Vendre les communs (${commons.length}) · ${commonsValue} or`}</button>` : ''}
        ${itemGrid('shopBag', bag, { selectedId: view.selected?.id, empty: 'Le sac est vide.' })}
      </section>`,
  });
  wireFrame(app, () => goTo('hub'));

  const show = (html) => { app.querySelector('#shopDetail').innerHTML = html; wireDetail(app, stock); };
  const restore = () => show(detail(stock));
  app.querySelectorAll('[data-consumable]').forEach((cell) => {
    const key = cell.dataset.consumable;
    cell.onmouseenter = () => show(consumableDetail(key));
    cell.onmouseleave = restore;
    cell.onclick = () => select('consumable', key);
    cell.ondblclick = () => buy('consumable', key, stock);
  });
  wireGrid(app, 'shopStock', stock, {
    onHover: (item) => show(stockDetail(item)), onLeave: restore,
    onSelect: (item) => select('stock', item.id), onDouble: (item) => buy('stock', item.id, stock), rerender,
  });
  wireGrid(app, 'shopBag', bag, {
    onHover: (item) => show(sellDetail(item)), onLeave: restore,
    onSelect: (item) => select('bag', item.id), rerender,
  });
  app.querySelector('#sellCommons')?.addEventListener('click', () => {
    if (view.confirm !== 'commons') { view.confirm = 'commons'; return goTo('merchant'); }
    const sold = commons.filter((i) => sell(state, i));
    view.flash = `${sold.length} objet${sold.length > 1 ? 's' : ''} vendu${sold.length > 1 ? 's' : ''} pour ${commonsValue} or.`;
    rerender();
  });
  wireDetail(app, stock);
  fitGrids(app, () => goTo('merchant'));
}

function rerender() {
  view.confirm = null;
  goTo('merchant');
}

function select(kind, id) {
  view.selected = { kind, id };
  view.confirm = null;
  goTo('merchant');
}

function detail(stock) {
  const sel = view.selected;
  if (!sel) return '<p class="hint">Survolez un objet pour voir sa fiche ; cliquez pour le choisir, double-cliquez sur un article pour l\'acheter.</p>';
  if (sel.kind === 'consumable') return consumableDetail(sel.id);
  if (sel.kind === 'stock') { const item = stock.find((i) => i.id === sel.id); return item ? stockDetail(item) : ''; }
  const item = state.bag.find((i) => i.id === sel.id);
  return item ? sellDetail(item) : '';
}

function consumableDetail(key) {
  const c = CONSUMABLES[key];
  const where = c.use.includes('map') ? (c.use.includes('combat') ? 'En combat et en exploration.' : 'En exploration.') : 'En combat.';
  return `<h3>${iconHtml(consumableIcon(key), 32)} ${esc(c.name)}</h3>
    <p>${esc(c.desc)} <i>${where}</i></p>
    <p class="hint">Possédé : ${countOf(state.consumables, key)} / ${MERCHANT.maxConsumable}</p>
    <div class="actions"><button class="gold" data-buy="consumable:${key}" ${canBuyConsumable(state, key) ? '' : 'disabled'}>Acheter · ${gold(consumablePrice(state, key))}</button></div>`;
}

function stockDetail(item) {
  const price = buyPrice(item);
  return itemDetail(item, `<div class="actions"><button class="gold" data-buy="stock:${item.id}" ${state.gold >= price ? '' : 'disabled'}>Acheter · ${gold(price)}</button></div>`);
}

function sellDetail(item) {
  const confirming = view.confirm === item.id;
  return itemDetail(item, `<div class="actions"><button data-sell="${item.id}" class="${confirming ? 'btn-primary' : ''}">${confirming ? 'Confirmer la vente' : 'Vendre'} · ${gold(sellPrice(item))}</button></div>`);
}

function buy(kind, id, stock) {
  if (kind === 'consumable') {
    if (buyConsumable(state, id)) view.flash = `Vous achetez : ${CONSUMABLES[id].name}.`;
  } else {
    const item = stock.find((i) => i.id === id);
    if (item && buyItem(state, item)) view.flash = `Vous achetez ${itemName(item)} pour ${buyPrice(item)} or. Il est dans le sac.`;
  }
  view.selected = kind === 'consumable' ? view.selected : null;
  rerender();
}

function wireDetail(app, stock) {
  app.querySelectorAll('[data-buy]').forEach((b) => {
    const [kind, id] = b.dataset.buy.split(':');
    b.onclick = () => buy(kind, id, stock);
  });
  app.querySelectorAll('[data-sell]').forEach((b) => {
    b.onclick = () => {
      const item = state.bag.find((i) => i.id === b.dataset.sell);
      if (!item) return rerender();
      if (CONFIRM_RARITIES.includes(item.rarity) && view.confirm !== item.id) {
        view.confirm = item.id;
        view.selected = { kind: 'bag', id: item.id };
        return goTo('merchant');
      }
      const price = sellPrice(item);
      if (sell(state, item)) view.flash = `${itemName(item)} vendu pour ${price} or.`;
      view.selected = null;
      rerender();
    };
  });
}
