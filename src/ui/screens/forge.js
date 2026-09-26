// Forge : décraft des objets du sac en matéria, amélioration des objets (portés ou non).

import { state } from '../../state.js';
import { RARITIES, MATERIA_KINDS } from '../../data/items.js';
import { getClass } from '../../game/party.js';
import { equippedItems } from '../../game/equipment.js';
import { itemStats } from '../../game/items.js';
import { decraft, decraftYield, upgradeCost, missingForUpgrade, canUpgrade, upgrade } from '../../game/forge.js';
import { esc } from '../html.js';
import { itemCard, itemMeta, itemName, formatStat, materiaTable } from '../items.js';
import { goTo } from '../router.js';

// État propre à l'écran : objet sélectionné, décraft en attente de confirmation, dernier message.
const view = { selectedId: null, confirm: null, flash: null };

// Raretés dont le décraft demande une confirmation.
const CONFIRM_RARITIES = ['epique', 'legendaire'];

export function openForge() {
  Object.assign(view, { selectedId: null, confirm: null, flash: null });
  goTo('forge');
}

export function renderForge(app) {
  const item = findItem(view.selectedId);
  const flash = view.flash;
  view.flash = null;
  const commons = state.bag.filter((i) => i.rarity === 'commun');

  app.innerHTML = `
    <div class="hero"><h1>🔨 Forge</h1><p>Or : ${state.gold}</p></div>
    ${flash ? `<div class="card notice">${esc(flash)}</div>` : ''}
    <div class="card materia"><p class="hint">Matéria du sac :</p>${materiaTable(state.materia)}</div>
    <div class="equip-layout">
      <div class="card forge-list">
        <h3>Objets portés</h3>
        ${state.party.map((hero) => `
          <div class="forge-hero" style="--c:${getClass(hero).color}">${getClass(hero).icon} ${esc(hero.name)}</div>
          ${equippedItems(hero).map(itemRow).join('')}`).join('')}
        <h3 class="bag-title">Sac (${state.bag.length})</h3>
        ${state.bag.length ? state.bag.map(itemRow).join('') : '<p class="hint">Le sac est vide.</p>'}
        ${commons.length ? `
          <button id="decraftCommons" class="full ${view.confirm === 'commons' ? 'danger' : ''}">
            ${view.confirm === 'commons'
              ? `Confirmer : décrafter ${commons.length} objet${commons.length > 1 ? 's' : ''} commun${commons.length > 1 ? 's' : ''}`
              : `Décrafter tous les objets communs du sac (${commons.length})`}
          </button>` : ''}
      </div>
      <div class="card detail">${item ? detailPanel(item) : '<p class="hint">Sélectionne un objet pour l\'améliorer ou le décrafter.</p>'}</div>
    </div>
    <div class="center"><button id="backHub">← Retour au village</button></div>
  `;

  app.querySelectorAll('[data-item]').forEach((row) => {
    row.onclick = () => {
      Object.assign(view, { selectedId: row.dataset.item, confirm: null });
      goTo('forge');
    };
  });
  app.querySelector('#upgrade')?.addEventListener('click', () => {
    if (upgrade(state, item)) view.flash = `${itemName(item)} : amélioration réussie !`;
    goTo('forge');
  });
  app.querySelector('#decraft')?.addEventListener('click', () => {
    if (CONFIRM_RARITIES.includes(item.rarity) && view.confirm !== item.id) {
      view.confirm = item.id;
    } else {
      const gain = decraft(state, item);
      if (gain) view.flash = `${itemName(item)} décrafté : ${yieldText(gain)}.`;
      Object.assign(view, { selectedId: null, confirm: null });
    }
    goTo('forge');
  });
  app.querySelector('#decraftCommons')?.addEventListener('click', () => {
    if (view.confirm !== 'commons') {
      view.confirm = 'commons';
    } else {
      const gains = commons.map((i) => decraft(state, i)).filter(Boolean);
      const byKind = Object.keys(MATERIA_KINDS)
        .map((kind) => [kind, gains.filter((g) => g.kind === kind).reduce((sum, g) => sum + g.amount, 0)])
        .filter(([, n]) => n > 0)
        .map(([kind, n]) => `${n} × ${MATERIA_KINDS[kind].label} commun`);
      view.flash = `${gains.length} objet${gains.length > 1 ? 's' : ''} décrafté${gains.length > 1 ? 's' : ''} : ${byKind.join(', ')}.`;
      if (commons.some((i) => i.id === view.selectedId)) view.selectedId = null;
      view.confirm = null;
    }
    goTo('forge');
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

function wearerOf(item) {
  return state.party.find((hero) => equippedItems(hero).includes(item)) ?? null;
}

function rarityLabel(rarity) {
  return `<span class="rarity-text" style="--rc:${RARITIES[rarity].color}">${RARITIES[rarity].label.toLowerCase()}</span>`;
}

function rangeYieldText({ kind, rarity, min, max }) {
  return `${min} à ${max} × ${MATERIA_KINDS[kind].label} ${RARITIES[rarity].label.toLowerCase()} (au hasard)`;
}

function yieldText(gain) {
  return `${gain.amount} × ${MATERIA_KINDS[gain.kind].label} ${RARITIES[gain.rarity].label.toLowerCase()}`;
}

function itemRow(item) {
  const selected = item.id === view.selectedId ? 'selected' : '';
  return `
    <button class="bag-row ${selected}" data-item="${item.id}">
      <span class="rarity-text" style="--rc:${RARITIES[item.rarity].color}">${esc(itemName(item))}</span>
      <small>${itemMeta(item)}</small>
    </button>`;
}

function detailPanel(item) {
  const wearer = wearerOf(item);
  return `
    ${itemCard(item)}
    <p class="hint">${wearer ? `Porté par ${esc(wearer.name)}` : 'Dans le sac'}</p>
    ${upgradeSection(item)}
    ${wearer ? '<p class="hint">Un objet porté ne peut pas être décrafté : retire-le d\'abord (écran Équipement).</p>' : decraftSection(item)}`;
}

function upgradeSection(item) {
  const cost = upgradeCost(item);
  if (!cost) return '<div class="forge-section"><h3>Amélioration</h3><p>Amélioration maximale atteinte (+5).</p></div>';

  const missing = missingForUpgrade(state, item);
  const lines = Object.entries(cost.materia).map(([tier, need]) => {
    const have = state.materia[cost.kind][tier];
    return `<li class="${missing.materia[tier] ? 'lack' : 'ok'}">${need} × ${MATERIA_KINDS[cost.kind].label} ${rarityLabel(tier)} <small>(possédé : ${have})</small></li>`;
  });
  lines.push(`<li class="${missing.gold ? 'lack' : 'ok'}">${cost.gold} pièces d'or <small>(possédé : ${state.gold})</small></li>`);

  const before = itemStats(item);
  const after = itemStats({ ...item, plus: cost.plus });
  const gains = Object.keys(after)
    .filter((k) => after[k] !== before[k])
    .map((k) => `<span class="up">${formatStat(k, after[k] - before[k])}</span>`);

  return `
    <div class="forge-section">
      <h3>Amélioration +${cost.plus}</h3>
      <ul class="cost">${lines.join('')}</ul>
      <div class="diff">${gains.length ? gains.join('') : '<span>Aucun gain visible à ce niveau</span>'}</div>
      <button id="upgrade" ${canUpgrade(state, item) ? '' : 'disabled'}>Améliorer (+${cost.plus})</button>
    </div>`;
}

function decraftSection(item) {
  const confirming = view.confirm === item.id;
  return `
    <div class="forge-section">
      <h3>Décraft</h3>
      <p>Détruit l'objet et rapporte ${rangeYieldText(decraftYield(item))}.</p>
      <button id="decraft" class="${confirming ? 'danger' : ''}">${confirming ? `Confirmer : détruire ${esc(itemName(item))}` : 'Décrafter'}</button>
    </div>`;
}
