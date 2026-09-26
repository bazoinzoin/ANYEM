// Marchand : achat de consommables et d'équipement, revente du butin.

import { state } from '../../state.js';
import { MERCHANT } from '../../config.js';
import { CONSUMABLES, CONSUMABLE_ORDER, CONSUMABLE_CATEGORIES } from '../../data/consumables.js';
import { RARITIES } from '../../data/items.js';
import { sellPrice, buyPrice, sell, ensureStock, buyItem, buyConsumable, canBuyConsumable } from '../../game/merchant.js';
import { countOf } from '../../game/consumables.js';
import { esc, tip } from '../html.js';
import { itemName, itemMeta, itemTooltipText } from '../items.js';
import { goTo } from '../router.js';

// État propre à l'écran : vente en attente de confirmation, dernier message.
const view = { confirm: null, flash: null };

// Raretés dont la vente demande une confirmation.
const CONFIRM_RARITIES = ['epique', 'legendaire'];

export function openMerchant() {
  Object.assign(view, { confirm: null, flash: null });
  goTo('merchant');
}

export function renderMerchant(app) {
  const stock = ensureStock(state);
  const flash = view.flash;
  view.flash = null;
  const commons = state.bag.filter((i) => i.rarity === 'commun');
  const commonsValue = commons.reduce((sum, i) => sum + sellPrice(i), 0);

  app.innerHTML = `
    <div class="hero"><h1>🛒 Marchand</h1><p>Or : <b class="gold">${state.gold}</b></p></div>
    ${flash ? `<div class="card notice">${esc(flash)}</div>` : ''}
    <div class="equip-layout">
      <div>
        <div class="card shop-section">
          <h3>Consommables</h3>
          <p class="hint">En combat avec l'action « Objet », et pour certains entre deux étages d'un donjon (maximum ${MERCHANT.maxConsumable} de chaque).</p>
          ${Object.entries(CONSUMABLE_CATEGORIES).map(([cat, label]) => `
            <h4 class="shop-cat">${label}</h4>
            ${CONSUMABLE_ORDER.filter((k) => CONSUMABLES[k].category === cat).map(consumableRow).join('')}`).join('')}
        </div>
        <div class="card shop-section">
          <h3>Équipement en vente <small>niveau ${state.dungeonLvl}</small></h3>
          <p class="hint">Au plus haut niveau atteint dans les donjons, renouvelé quand il augmente. Les objets achetés vont dans le sac.</p>
          ${stock.length ? stock.map(stockRow).join('') : '<p class="hint">Tout a été vendu : revenez après le prochain donjon.</p>'}
        </div>
      </div>
      <div class="card shop-section">
        <h3>Vendre le butin <small>${state.bag.length} objet${state.bag.length > 1 ? 's' : ''} dans le sac</small></h3>
        <p class="hint">Seuls les objets du sac se vendent (retire d'abord un objet porté pour le vendre).</p>
        ${commons.length ? `
          <button id="sellCommons" class="full ${view.confirm === 'commons' ? 'danger' : ''}">
            ${view.confirm === 'commons'
              ? `Confirmer : vendre ${commons.length} objet${commons.length > 1 ? 's' : ''} commun${commons.length > 1 ? 's' : ''} pour ${commonsValue} or`
              : `Vendre tous les objets communs (${commons.length}) — ${commonsValue} or`}
          </button>` : ''}
        ${state.bag.length ? state.bag.map(sellRow).join('') : '<p class="hint">Le sac est vide.</p>'}
      </div>
    </div>
    <div class="center"><button id="backHub">← Retour au village</button></div>
  `;

  app.querySelectorAll('[data-buy-consumable]').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.buyConsumable;
      if (buyConsumable(state, key)) view.flash = `Vous achetez : ${CONSUMABLES[key].name}.`;
      rerender();
    };
  });
  app.querySelectorAll('[data-buy-item]').forEach((btn) => {
    btn.onclick = () => {
      const item = stock.find((i) => i.id === btn.dataset.buyItem);
      if (item && buyItem(state, item)) view.flash = `Vous achetez ${itemName(item)} pour ${buyPrice(item)} or. Il est dans le sac.`;
      rerender();
    };
  });
  app.querySelectorAll('[data-sell]').forEach((btn) => {
    btn.onclick = () => {
      const item = state.bag.find((i) => i.id === btn.dataset.sell);
      if (!item) return rerender();
      if (CONFIRM_RARITIES.includes(item.rarity) && view.confirm !== item.id) {
        view.confirm = item.id;
        return goTo('merchant');
      }
      const price = sellPrice(item);
      if (sell(state, item)) view.flash = `${itemName(item)} vendu pour ${price} or.`;
      rerender();
    };
  });
  app.querySelector('#sellCommons')?.addEventListener('click', () => {
    if (view.confirm !== 'commons') {
      view.confirm = 'commons';
      return goTo('merchant');
    }
    const sold = commons.filter((i) => sell(state, i));
    view.flash = `${sold.length} objet${sold.length > 1 ? 's' : ''} vendu${sold.length > 1 ? 's' : ''} pour ${commonsValue} or.`;
    rerender();
  });
  app.querySelector('#backHub').onclick = () => goTo('hub');
}

function rerender() {
  view.confirm = null;
  goTo('merchant');
}

function consumableRow(key) {
  const c = CONSUMABLES[key];
  const owned = countOf(state.consumables, key);
  return `
    <div class="shop-row">
      <div class="shop-info">
        <b>${c.icon} ${c.name}</b> <small>possédé : ${owned}/${MERCHANT.maxConsumable}</small>
        <div class="hint">${c.desc} <i>${c.use.includes('map') ? (c.use.includes('combat') ? 'Combat et donjon.' : 'Entre deux étages.') : 'En combat.'}</i></div>
      </div>
      <button data-buy-consumable="${key}" ${canBuyConsumable(state, key) ? '' : 'disabled'}>Acheter · ${c.price} or</button>
    </div>`;
}

function itemLabel(item) {
  return `<span ${tip(itemTooltipText(item), 'rarity-text')} style="--rc:${RARITIES[item.rarity].color}">${esc(itemName(item))}</span>`;
}

function stockRow(item) {
  const price = buyPrice(item);
  return `
    <div class="shop-row">
      <div class="shop-info">${itemLabel(item)}<div class="hint">${itemMeta(item)}</div></div>
      <button data-buy-item="${item.id}" ${state.gold >= price ? '' : 'disabled'}>Acheter · ${price} or</button>
    </div>`;
}

function sellRow(item) {
  const confirming = view.confirm === item.id;
  return `
    <div class="shop-row">
      <div class="shop-info">${itemLabel(item)}<div class="hint">${itemMeta(item)}</div></div>
      <button data-sell="${item.id}" class="${confirming ? 'danger' : ''}">${confirming ? 'Confirmer la vente' : 'Vendre'} · ${sellPrice(item)} or</button>
    </div>`;
}
