// Banque : met à l'abri l'or, les objets, les consommables et les matéria du sac
// (en cas de défaite, une partie du sac et de l'or porté peut être perdue).

import { state } from '../../state.js';
import { RARITIES, RARITY_ORDER } from '../../data/items.js';
import { CONSUMABLES, CONSUMABLE_ORDER } from '../../data/consumables.js';
import { bankOf, moveGold, depositItem, withdrawItem, moveConsumable, moveMateria } from '../../game/bank.js';
import { esc, tip } from '../html.js';
import { itemName, itemMeta, itemTooltipText, materiaTable } from '../items.js';
import { goTo, goBack, backLabel } from '../router.js';

export function renderBank(app) {
  const bank = bankOf(state);
  app.innerHTML = `
    <div class="hero"><h1>🏦 Banque</h1><p>Ce qui est à la banque ne peut pas être perdu en cas de défaite</p></div>
    ${state.expedition ? '<div class="card notice">La banque est fermée pendant une expédition.</div>' : ''}
    <div class="card">
      <h2>Or</h2>
      <p>Sur toi : <b>${state.gold}</b> · À la banque : <b>${bank.gold}</b></p>
      <div class="actions">
        <input type="number" id="goldAmount" min="1" value="${Math.max(1, state.gold)}">
        <button id="depositGold">Déposer</button>
        <button id="withdrawGold">Retirer</button>
        <button id="depositAllGold">Tout déposer</button>
        <button id="withdrawAllGold">Tout retirer</button>
      </div>
    </div>
    <div class="bank-layout">
      <div class="card">
        <h2>🎒 Sac (${state.bag.length})</h2>
        ${itemList(state.bag, 'deposit')}
      </div>
      <div class="card">
        <h2>🏦 Coffre (${bank.items.length})</h2>
        ${itemList(bank.items, 'withdraw')}
      </div>
    </div>
    <div class="card">
      <h2>Consommables</h2>
      <table class="bank-table">
        <thead><tr><th></th><th>Sac</th><th></th><th>Banque</th></tr></thead>
        <tbody>
          ${CONSUMABLE_ORDER.filter((k) => state.consumables[k] > 0 || bank.consumables[k] > 0).map((k) => `
            <tr>
              <th>${CONSUMABLES[k].icon} ${CONSUMABLES[k].name}</th>
              <td>${state.consumables[k] ?? 0}</td>
              <td>
                <button data-consumable="${k}" data-amount="1" ${tip('Déposer 1')}>→</button>
                <button data-consumable="${k}" data-amount="-1" ${tip('Retirer 1')}>←</button>
              </td>
              <td>${bank.consumables[k] ?? 0}</td>
            </tr>`).join('') || '<tr><td colspan="4" class="hint">Aucun consommable.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="bank-layout">
      <div class="card">
        <h2>Matéria du sac</h2>
        ${materiaTable(state.materia, (kind, rarity, n) => (n ? `<button class="mini" data-materia="${kind}:${rarity}" data-amount="${n}" ${tip(`Déposer ${n}`)}>${n} →</button>` : '0'))}
      </div>
      <div class="card">
        <h2>Matéria à la banque</h2>
        ${materiaTable(bank.materia, (kind, rarity, n) => (n ? `<button class="mini" data-materia="${kind}:${rarity}" data-amount="${-n}" ${tip(`Retirer ${n}`)}>← ${n}</button>` : '0'))}
      </div>
    </div>
    <div class="center"><button id="backHub">${backLabel()}</button></div>
  `;

  const refresh = () => goTo('bank');
  const amount = () => Number(app.querySelector('#goldAmount').value) || 0;
  app.querySelector('#depositGold').onclick = () => { moveGold(state, Math.min(amount(), state.gold)); refresh(); };
  app.querySelector('#withdrawGold').onclick = () => { moveGold(state, -Math.min(amount(), bank.gold)); refresh(); };
  app.querySelector('#depositAllGold').onclick = () => { moveGold(state, state.gold); refresh(); };
  app.querySelector('#withdrawAllGold').onclick = () => { moveGold(state, -bank.gold); refresh(); };
  app.querySelectorAll('[data-deposit]').forEach((btn) => { btn.onclick = () => { depositItem(state, btn.dataset.deposit); refresh(); }; });
  app.querySelectorAll('[data-withdraw]').forEach((btn) => { btn.onclick = () => { withdrawItem(state, btn.dataset.withdraw); refresh(); }; });
  app.querySelectorAll('[data-consumable]').forEach((btn) => {
    btn.onclick = () => { moveConsumable(state, btn.dataset.consumable, Number(btn.dataset.amount)); refresh(); };
  });
  app.querySelectorAll('[data-materia]').forEach((btn) => {
    btn.onclick = () => {
      const [kind, rarity] = btn.dataset.materia.split(':');
      moveMateria(state, kind, rarity, Number(btn.dataset.amount));
      refresh();
    };
  });
  app.querySelector('#backHub').onclick = () => goBack();
}

function itemList(items, action) {
  if (!items.length) return '<p class="hint">Vide.</p>';
  const sorted = [...items].sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.level - a.level);
  return sorted.map((item) => `
    <button class="bag-row" data-${action}="${item.id}" ${tip(itemTooltipText(item))}>
      <span class="rarity-text" style="--rc:${RARITIES[item.rarity].color}">${action === 'withdraw' ? '← ' : ''}${esc(itemName(item))}${action === 'deposit' ? ' →' : ''}</span>
      <small>${itemMeta(item)}</small>
    </button>`).join('');
}
