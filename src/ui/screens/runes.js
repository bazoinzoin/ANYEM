// Runomancien : relance d'une stat secondaire d'un objet (porté ou dans le sac).

import { state } from '../../state.js';
import { RARITIES } from '../../data/items.js';
import { STATS } from '../../data/stats.js';
import { getClass } from '../../game/party.js';
import { equippedItems } from '../../game/equipment.js';
import { itemStatLines } from '../../game/items.js';
import { rerollCost, rerollPool, rerollProblem, rerollSecondary } from '../../game/runes.js';
import { esc } from '../html.js';
import { itemCard, itemMeta, itemName, formatStat } from '../items.js';
import { goTo } from '../router.js';

const view = { selectedId: null, flash: null };

export function openRunes() {
  Object.assign(view, { selectedId: null, flash: null });
  goTo('runes');
}

// Objets relançables : au moins une secondaire.
const rerollable = (item) => rerollCost(item) !== null;

export function renderRunes(app) {
  const item = findItem(view.selectedId);
  const flash = view.flash;
  view.flash = null;
  const bagItems = state.bag.filter(rerollable);

  app.innerHTML = `
    <div class="hero"><h1>🔮 Runomancien</h1><p>Or : ${state.gold} · « Donne-moi une rune, je t'en graverai une autre. »</p></div>
    ${flash ? `<div class="card notice">${flash}</div>` : ''}
    <div class="equip-layout">
      <div class="card forge-list">
        <h3>Objets portés</h3>
        ${state.party.map((hero) => `
          <div class="forge-hero" style="--c:${getClass(hero).color}">${getClass(hero).icon} ${esc(hero.name)}</div>
          ${equippedItems(hero).filter(rerollable).map(itemRow).join('') || '<p class="hint">Rien à relancer.</p>'}`).join('')}
        <h3 class="bag-title">Sac</h3>
        ${bagItems.length ? bagItems.map(itemRow).join('') : '<p class="hint">Aucun objet à stats secondaires dans le sac.</p>'}
      </div>
      <div class="card detail">${item ? detailPanel(item) : '<p class="hint">Choisis un objet : le Runomancien relance une de ses stats secondaires (nouvelle stat, nouvelle valeur). Les objets communs n\'en ont pas.</p>'}</div>
    </div>
    <div class="center"><button id="backHub">← Retour au village</button></div>
  `;

  app.querySelectorAll('[data-item]').forEach((row) => {
    row.onclick = () => {
      view.selectedId = row.dataset.item;
      goTo('runes');
    };
  });
  app.querySelectorAll('[data-reroll]').forEach((btn) => {
    btn.onclick = () => {
      const r = rerollSecondary(state, item, btn.dataset.reroll);
      if (r) view.flash = `${esc(itemName(item))} : <s>${formatStat(r.from.stat, r.from.value)}</s> → <b>${formatStat(r.to.stat, r.to.value)}</b>`;
      goTo('runes');
    };
  });
  app.querySelector('#backHub').onclick = () => goTo('hub');
}

function findItem(id) {
  if (!id) return null;
  for (const hero of state.party) {
    const found = equippedItems(hero).find((i) => i.id === id);
    if (found) return found;
  }
  return state.bag.find((i) => i.id === id) ?? null;
}

function itemRow(item) {
  return `
    <button class="bag-row ${item.id === view.selectedId ? 'selected' : ''}" data-item="${item.id}">
      <span class="rarity-text" style="--rc:${RARITIES[item.rarity].color}">${esc(itemName(item))}</span>
      <small>${itemMeta(item)}</small>
    </button>`;
}

function detailPanel(item) {
  const cost = rerollCost(item);
  const lines = itemStatLines(item).filter((l) => l.secondary);
  return `
    ${itemCard(item)}
    <div class="forge-section">
      <h3>Relancer une stat secondaire — ${cost} pièces d'or</h3>
      <p class="hint">Une seule stat change à la fois ; elle peut devenir n'importe quelle stat absente de l'objet, ou ressortir avec une autre valeur.</p>
      ${lines.map((l) => {
        const problem = rerollProblem(state, item, l.stat);
        const pool = rerollPool(item, l.stat).map((k) => STATS[k].label).join(', ');
        return `
          <div class="reroll-row">
            <span>${formatStat(l.stat, l.value)}</span>
            <button data-reroll="${l.stat}" ${problem ? 'disabled' : ''} title="Résultats possibles : ${esc(pool)}">🔮 Relancer</button>
          </div>`;
      }).join('')}
      ${state.gold < cost ? `<p class="hint">Il te manque ${cost - state.gold} pièces d'or.</p>` : ''}
    </div>`;
}
