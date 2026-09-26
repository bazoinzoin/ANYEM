// Forge : décraft des objets du sac en matéria, amélioration des objets (portés ou non).

import { state } from '../../state.js';
import { RARITIES, MATERIA_RARITIES, MATERIA_KINDS, WEAPON_TYPES, ARMOR_TYPES, JEWELS, SLOTS, SHIELD, LEGENDARIES } from '../../data/items.js';
import { STATS } from '../../data/stats.js';
import { FORGE } from '../../config.js';
import { getClass } from '../../game/party.js';
import { equippedItems } from '../../game/equipment.js';
import { itemStats } from '../../game/items.js';
import {
  decraft, decraftYield, upgradeCost, missingForUpgrade, canUpgrade, upgrade,
  CRAFT_FILTERS, craftOptions, craftCost, craftProblem, craft, craftLegendaries,
  absorbProblem, absorbLegendary,
} from '../../game/forge.js';
import { CLASSES } from '../../data/classes.js';
import { esc } from '../html.js';
import { itemCard, itemMeta, itemName, formatStat, materiaTable } from '../items.js';
import { goTo } from '../router.js';

// État propre à l'écran : objet sélectionné, décraft en attente de confirmation, dernier message.
// tab : 'items' (amélioration / décraft), 'craft' (fabrication) ou 'divine' (Forge divine) ;
// order : commande en cours ; divineId : objet divin choisi à la Forge divine.
const view = { tab: 'items', selectedId: null, confirm: null, flash: null, crafted: null, order: { kind: 'arme', rarity: 'commun' }, divineId: null };

// Raretés dont le décraft demande une confirmation.
const CONFIRM_RARITIES = ['epique', 'legendaire', 'divin'];

export function openForge() {
  Object.assign(view, { tab: 'items', selectedId: null, confirm: null, flash: null, crafted: null });
  goTo('forge');
}

export function renderForge(app) {
  const item = findItem(view.selectedId);
  const flash = view.flash;
  const crafted = view.crafted;
  view.flash = null;
  view.crafted = null;
  const commons = state.bag.filter((i) => i.rarity === 'commun');

  app.innerHTML = `
    <div class="hero"><h1>🔨 Forge</h1><p>Or : ${state.gold}</p></div>
    ${flash ? `<div class="card notice">${esc(flash)}${crafted ? itemCard(crafted) : ''}</div>` : ''}
    <div class="card materia"><p class="hint">Matéria du sac :</p>${materiaTable(state.materia)}</div>
    <div class="tabs">
      <button data-tab="items" class="${view.tab === 'items' ? 'selected' : ''}">🔧 Améliorer / décrafter</button>
      <button data-tab="craft" class="${view.tab === 'craft' ? 'selected' : ''}">⚒️ Fabriquer</button>
      <button data-tab="divine" class="${view.tab === 'divine' ? 'selected' : ''}" style="color:${RARITIES.divin.color}">✴️ Forge divine</button>
    </div>
    ${view.tab === 'craft' ? craftPanel() : view.tab === 'divine' ? divinePanel() : `
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
    </div>`}
    <div class="center"><button id="backHub">← Retour au village</button></div>
  `;

  app.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.onclick = () => {
      Object.assign(view, { tab: btn.dataset.tab, confirm: null });
      goTo('forge');
    };
  });
  bindCraft(app);
  bindDivine(app);
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

// ---- Fabrication ----

const KIND_FILTER_LABELS = {
  weaponType: "Type d'arme", slotType: 'Pièce', armorType: "Type d'armure", primary: 'Stat principale',
};

function optionLabel(filter, value) {
  if (filter === 'weaponType') return WEAPON_TYPES[value].name;
  if (filter === 'armorType') return ARMOR_TYPES[value].label;
  if (filter === 'primary') return STATS[value].label;
  if (value === 'bouclier') return SHIELD.name;
  if (JEWELS[value]) return JEWELS[value].name;
  return SLOTS[value].label;
}

function craftPanel() {
  const order = view.order;
  const cost = craftCost(order);
  const problem = craftProblem(state, order);
  const have = state.materia[cost.kind][cost.rarity];
  const options = craftOptions(order.kind);
  const legendaries = order.rarity === 'legendaire' ? craftLegendaries(order) : [];
  return `
    <div class="card craft">
      <p class="hint">Fabrique un objet du niveau le plus haut atteint (${state.dungeonLvl}) avec ${FORGE.craftBase} matéria de la rareté voulue, +${FORGE.craftPerFilter} par caractéristique imposée. Ce qui reste « au hasard » est tiré au sort.</p>
      <div class="craft-row"><span>Catégorie</span>
        ${Object.entries(MATERIA_KINDS).map(([kind, def]) => `<button data-craft-kind="${kind}" class="${order.kind === kind ? 'selected' : ''}">${def.icon} ${kind === 'arme' ? 'Arme' : kind === 'armure' ? 'Armure / bouclier' : 'Bijou'}</button>`).join('')}
      </div>
      <div class="craft-row"><span>Rareté</span>
        ${MATERIA_RARITIES.map((r) => `<button data-craft-rarity="${r}" class="${order.rarity === r ? 'selected' : ''}" style="color:${RARITIES[r].color}">${RARITIES[r].label} <small>(${state.materia[order.kind][r]})</small></button>`).join('')}
      </div>
      ${CRAFT_FILTERS[order.kind].map((f) => `
        <div class="craft-row"><span>${KIND_FILTER_LABELS[f]}</span>
          <select data-craft-filter="${f}">
            <option value="">Au hasard</option>
            ${options[f].map((v) => `<option value="${v}" ${order[f] === v ? 'selected' : ''}>${esc(optionLabel(f, v))}</option>`).join('')}
          </select>
        </div>`).join('')}
      ${order.rarity === 'legendaire' ? `<p class="hint">Légendaires possibles : ${legendaries.length ? legendaries.map((k) => `<b style="color:${RARITIES.legendaire.color}">${esc(LEGENDARIES[k].name)}</b>`).join(', ') : 'aucun'}.</p>` : ''}
      <ul class="cost"><li class="${have < cost.amount ? 'lack' : 'ok'}">${cost.amount} × ${MATERIA_KINDS[cost.kind].label} ${rarityLabel(cost.rarity)} <small>(possédé : ${have})</small></li></ul>
      ${problem ? `<p class="hint">${esc(problem)}</p>` : ''}
      <button id="craftBtn" ${problem ? 'disabled' : ''}>⚒️ Fabriquer</button>
    </div>`;
}

function bindCraft(app) {
  app.querySelectorAll('[data-craft-kind]').forEach((btn) => {
    btn.onclick = () => {
      view.order = { kind: btn.dataset.craftKind, rarity: view.order.rarity };
      goTo('forge');
    };
  });
  app.querySelectorAll('[data-craft-rarity]').forEach((btn) => {
    btn.onclick = () => {
      view.order.rarity = btn.dataset.craftRarity;
      goTo('forge');
    };
  });
  app.querySelectorAll('[data-craft-filter]').forEach((sel) => {
    sel.onchange = () => {
      if (sel.value) view.order[sel.dataset.craftFilter] = sel.value;
      else delete view.order[sel.dataset.craftFilter];
      goTo('forge');
    };
  });
  app.querySelector('#craftBtn')?.addEventListener('click', () => {
    const item = craft(state, view.order);
    if (item) {
      view.flash = `Fabriqué : ${itemName(item)} (dans le sac).`;
      view.crafted = item;
    }
    goTo('forge');
  });
}

// ---- Forge divine ----

function allItems() {
  return [...state.party.flatMap((hero) => equippedItems(hero)), ...state.bag];
}

function divinePanel() {
  const divines = [...new Set(allItems())].filter((i) => i.rarity === 'divin');
  const divine = divines.find((i) => i.id === view.divineId) ?? null;
  const legendaries = state.bag.filter((i) => i.legendary);
  return `
    <p class="hint">Un objet <b style="color:${RARITIES.divin.color}">divin</b> peut absorber le pouvoir unique d'un objet légendaire du sac. Le légendaire est détruit ; le pouvoir s'applique comme s'il était porté (il ne sert qu'à la classe concernée). Un nouveau pouvoir remplace l'ancien.</p>
    <div class="equip-layout">
      <div class="card forge-list">
        <h3>Objets divins</h3>
        ${divines.length ? divines.map((i) => `
          <button class="bag-row ${i === divine ? 'selected' : ''}" data-divine="${i.id}">
            <span class="rarity-text" style="--rc:${RARITIES.divin.color}">${esc(itemName(i))}</span>
            <small>${itemMeta(i)}${wearerOf(i) ? ` · porté par ${esc(wearerOf(i).name)}` : ''}</small>
          </button>`).join('') : '<p class="hint">Aucun objet divin. Ils ne tombent que sur les boss, à partir de la difficulté Guerre.</p>'}
      </div>
      <div class="card detail">
        ${divine ? `
          ${itemCard(divine)}
          <div class="forge-section">
            <h3>Absorber un pouvoir légendaire</h3>
            ${legendaries.length ? legendaries.map((leg) => {
              const cls = CLASSES[leg.legendary.classKey];
              const confirming = view.confirm === `absorb:${leg.id}`;
              return `
                <div class="absorb-row">
                  <div><span class="rarity-text" style="--rc:${RARITIES.legendaire.color}">${esc(itemName(leg))}</span>${cls ? ` <small>(${cls.icon} ${cls.name})</small>` : ''}<br><small>${esc(leg.legendary.desc)}</small></div>
                  <button data-absorb="${leg.id}" class="${confirming ? 'danger' : ''}" ${absorbProblem(state, divine, leg) ? 'disabled' : ''}>${confirming ? `Confirmer : détruire ${esc(itemName(leg))}` : '✴️ Absorber'}</button>
                </div>`;
            }).join('') : '<p class="hint">Aucun objet légendaire dans le sac (un légendaire porté doit d\'abord être retiré).</p>'}
            ${divine.absorbed && legendaries.length ? `<p class="hint">Le pouvoir actuel (${esc(divine.absorbed.name)}) sera remplacé.</p>` : ''}
          </div>` : '<p class="hint">Choisis un objet divin.</p>'}
      </div>
    </div>`;
}

function bindDivine(app) {
  app.querySelectorAll('[data-divine]').forEach((btn) => {
    btn.onclick = () => {
      Object.assign(view, { divineId: btn.dataset.divine, confirm: null });
      goTo('forge');
    };
  });
  app.querySelectorAll('[data-absorb]').forEach((btn) => {
    btn.onclick = () => {
      const leg = state.bag.find((i) => i.id === btn.dataset.absorb);
      const divine = allItems().find((i) => i.id === view.divineId);
      if (view.confirm !== `absorb:${leg.id}`) {
        view.confirm = `absorb:${leg.id}`;
      } else {
        if (absorbLegendary(state, divine, leg) !== false) view.flash = `${itemName(divine)} absorbe le pouvoir de ${itemName(leg)}.`;
        view.confirm = null;
      }
      goTo('forge');
    };
  });
}
