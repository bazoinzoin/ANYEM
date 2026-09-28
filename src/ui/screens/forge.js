// Forge, plein écran sans défilement, en trois onglets :
// - Améliorer / décrafter : objets portés (par héros) et sac en icônes à gauche, fiche au
//   centre avec l'amélioration +1..+5 et le décraft ;
// - Fabriquer : commande (catégorie, rareté, caractéristiques imposées) en boutons icônes ;
// - Forge divine : un objet divin absorbe le pouvoir d'un légendaire du sac.
// La matéria du sac reste affichée à droite.

import { state } from '../../state.js';
import { RARITIES, MATERIA_RARITIES, MATERIA_KINDS, WEAPON_TYPES, ARMOR_TYPES, JEWELS, SLOTS, SHIELD, LEGENDARIES } from '../../data/items.js';
import { STATS } from '../../data/stats.js';
import { FORGE } from '../../config.js';
import { equippedItems } from '../../game/equipment.js';
import { itemStats } from '../../game/items.js';
import {
  decraft, decraftYield, upgradeCost, missingForUpgrade, canUpgrade, upgrade,
  CRAFT_FILTERS, craftOptions, craftCost, craftProblem, craft, craftLegendaries,
  absorbProblem, absorbLegendary,
} from '../../game/forge.js';
import { CLASSES } from '../../data/classes.js';
import { esc } from '../html.js';
import { itemName, formatStat } from '../items.js';
import { bagItems } from '../bagView.js';
import { goTo } from '../router.js';
import { iconHtml, itemIcon, MATERIA_ICONS, GOLD_ICON } from '../icons.js';
import { frame, wireFrame, flashLine, itemGrid, wireGrid, fitGrids, materiaGrid, itemDetail, wornRows, wornItems } from '../screenFrame.js';

// État propre à l'écran : objet sélectionné, décraft en attente de confirmation, dernier message.
// tab : 'items' (amélioration / décraft), 'craft' (fabrication) ou 'divine' (Forge divine) ;
// order : commande en cours ; divineId / legendaryId : choix à la Forge divine.
const view = {
  tab: 'items', selectedId: null, confirm: null, flash: null, crafted: null,
  order: { kind: 'arme', rarity: 'commun' }, divineId: null, legendaryId: null,
};

// Raretés dont le décraft demande une confirmation.
const CONFIRM_RARITIES = ['epique', 'legendaire', 'divin'];

const TABS = [
  { key: 'items', label: 'Améliorer / décrafter', icon: 125 },
  { key: 'craft', label: 'Fabriquer', icon: 1471 },
  { key: 'divine', label: 'Forge divine', icon: 1055 },
];

export function openForge() {
  Object.assign(view, { tab: 'items', selectedId: null, confirm: null, flash: null, crafted: null, legendaryId: null });
  goTo('forge');
}

const refresh = () => goTo('forge');

export function renderForge(app) {
  const flash = view.flash;
  view.flash = null;
  const body = view.tab === 'craft' ? craftBody() : view.tab === 'divine' ? divineBody() : itemsBody();
  app.innerHTML = frame({
    title: 'Forge', icon: 1471, layout: 'lay-forge',
    extras: TABS.map((t) => `<button class="tab ${view.tab === t.key ? 'selected' : ''}" data-tab="${t.key}">${iconHtml(t.icon, 16)} ${t.label}</button>`).join(''),
    body: `${body}
      <section class="win forge-side">
        <h3>${iconHtml(162, 16)} Matéria du sac</h3>
        ${materiaGrid(state.materia)}
        <div id="forgeFlash">${flashLine(flash)}${view.crafted ? itemDetail(view.crafted) : ''}</div>
      </section>`,
  });
  view.crafted = null;
  wireFrame(app, () => goTo('hub'));
  app.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.onclick = () => { Object.assign(view, { tab: btn.dataset.tab, confirm: null }); refresh(); };
  });
  if (view.tab === 'craft') bindCraft(app);
  else if (view.tab === 'divine') bindDivine(app);
  else bindItems(app);
  fitGrids(app, refresh);
}

function wearerOf(item) {
  return state.party.find((hero) => equippedItems(hero).includes(item)) ?? null;
}

function allItems() {
  return [...state.party.flatMap((hero) => equippedItems(hero)), ...state.bag];
}

function rarityLabel(rarity) {
  return `<span class="rarity-text" style="--rc:${RARITIES[rarity].color}">${RARITIES[rarity].label.toLowerCase()}</span>`;
}

function yieldText(gain) {
  return `${gain.amount} × ${MATERIA_KINDS[gain.kind].label} ${RARITIES[gain.rarity].label.toLowerCase()}`;
}

// ---- Améliorer / décrafter ----

function itemsBody() {
  const bag = bagItems(state.bag, 'all', null);
  const commons = state.bag.filter((i) => i.rarity === 'commun');
  const item = allItems().find((i) => i.id === view.selectedId);
  return `
    <section class="win">
      <h3>${iconHtml(1920, 16)} Objets portés</h3>
      ${wornRows('forgeWorn', undefined, view.selectedId)}
      <h3>${iconHtml(158, 16)} Sac <small>${state.bag.length} objets</small>
        ${commons.length ? `<button id="decraftCommons" class="${view.confirm === 'commons' ? 'btn-primary' : ''}">${view.confirm === 'commons' ? `Confirmer : décrafter ${commons.length} communs` : `Décrafter les communs (${commons.length})`}</button>` : ''}</h3>
      ${itemGrid('forgeBag', bag, { selectedId: view.selectedId, empty: 'Le sac est vide.' })}
    </section>
    <section class="win detail-panel" id="forgeDetail">${item ? itemPanel(item) : '<p class="hint">Choisissez un objet (porté ou dans le sac) pour l\'améliorer ou le décrafter.</p>'}</section>`;
}

function itemPanel(item) {
  const wearer = wearerOf(item);
  return `
    ${itemDetail(item)}
    <p class="hint">${wearer ? `Porté par ${esc(wearer.name)}` : 'Dans le sac'}</p>
    ${upgradeSection(item)}
    ${wearer ? '<p class="hint">Un objet porté ne peut pas être décrafté : retirez-le d\'abord (écran Personnage).</p>' : decraftSection(item)}`;
}

function upgradeSection(item) {
  const cost = upgradeCost(item);
  if (!cost) return '<div class="forge-section"><h4>Amélioration</h4><p>Amélioration maximale atteinte (+5).</p></div>';
  const missing = missingForUpgrade(state, item);
  const lines = Object.entries(cost.materia).map(([tier, need]) => {
    const have = state.materia[cost.kind][tier];
    return `<li class="${missing.materia[tier] ? 'lack' : 'ok'}">${iconHtml(MATERIA_ICONS[cost.kind], 16)} ${need} ${rarityLabel(tier)} <small>(${have})</small></li>`;
  });
  lines.push(`<li class="${missing.gold ? 'lack' : 'ok'}">${iconHtml(GOLD_ICON, 16)} ${cost.gold} or</li>`);
  const before = itemStats(item);
  const after = itemStats({ ...item, plus: cost.plus });
  const gains = Object.keys(after).filter((k) => after[k] !== before[k]).map((k) => `<span class="up">${formatStat(k, after[k] - before[k])}</span>`);
  return `
    <div class="forge-section">
      <h4>Amélioration +${cost.plus}</h4>
      <ul class="cost">${lines.join('')}</ul>
      <div class="diff">${gains.length ? gains.join(' ') : '<span>Aucun gain visible à ce niveau</span>'}</div>
      <button id="upgrade" class="gold" ${canUpgrade(state, item) ? '' : 'disabled'}>${iconHtml(125, 16)} Améliorer (+${cost.plus})</button>
    </div>`;
}

function decraftSection(item) {
  const confirming = view.confirm === item.id;
  const { kind, rarity, min, max } = decraftYield(item);
  return `
    <div class="forge-section">
      <h4>Décraft</h4>
      <p>Détruit l'objet : ${iconHtml(MATERIA_ICONS[kind], 16)} ${min} à ${max} matéria ${rarityLabel(rarity)}.</p>
      <button id="decraft" class="${confirming ? 'btn-primary' : ''}">${confirming ? 'Confirmer la destruction' : 'Décrafter'}</button>
    </div>`;
}

function bindItems(app) {
  const worn = wornItems();
  const bag = bagItems(state.bag, 'all', null);
  const box = app.querySelector('#forgeDetail');
  const current = () => allItems().find((i) => i.id === view.selectedId);
  const show = (item) => { box.innerHTML = item ? itemPanel(item) : ''; wireDetail(app, item); };
  const handlers = {
    onHover: (item) => show(item),
    onLeave: () => show(current()),
    onSelect: (item) => { Object.assign(view, { selectedId: item.id, confirm: null }); refresh(); },
    rerender: refresh,
  };
  wireGrid(app, 'forgeWorn', worn, handlers);
  wireGrid(app, 'forgeBag', bag, handlers);
  wireDetail(app, current());

  const commons = state.bag.filter((i) => i.rarity === 'commun');
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
    refresh();
  });
}

function wireDetail(app, item) {
  if (!item) return;
  app.querySelector('#upgrade')?.addEventListener('click', () => {
    if (upgrade(state, item)) view.flash = `${itemName(item)} : amélioration réussie !`;
    view.selectedId = item.id;
    refresh();
  });
  app.querySelector('#decraft')?.addEventListener('click', () => {
    if (CONFIRM_RARITIES.includes(item.rarity) && view.confirm !== item.id) {
      Object.assign(view, { confirm: item.id, selectedId: item.id });
    } else {
      const gain = decraft(state, item);
      if (gain) view.flash = `${itemName(item)} décrafté : ${yieldText(gain)}.`;
      Object.assign(view, { selectedId: null, confirm: null });
    }
    refresh();
  });
}

// ---- Fabrication ----

const FILTER_LABELS = { weaponType: "Type d'arme", slotType: 'Pièce', armorType: "Type d'armure", primary: 'Stat principale' };
const KIND_LABELS = { arme: 'Arme', armure: 'Armure / bouclier', bijou: 'Bijou' };
const PRIMARY_ICONS = { force: 608, agilite: 666, intelligence: 609 };

function optionLabel(filter, value) {
  if (filter === 'weaponType') return WEAPON_TYPES[value].name;
  if (filter === 'armorType') return ARMOR_TYPES[value].label;
  if (filter === 'primary') return STATS[value].label;
  if (value === 'bouclier') return SHIELD.name;
  if (JEWELS[value]) return JEWELS[value].name;
  return SLOTS[value].label;
}

// Icône d'une option de commande, dans la rareté visée.
function optionIcon(filter, value) {
  const rarity = view.order.rarity;
  if (filter === 'primary') return PRIMARY_ICONS[value];
  if (filter === 'weaponType') return itemIcon({ slotType: 'arme', weaponType: value, rarity });
  if (filter === 'armorType') return itemIcon({ slotType: 'plastron', armorType: value, rarity });
  return itemIcon({ slotType: value, armorType: view.order.armorType ?? 'lourde', rarity });
}

const KIND_ICON = { arme: { slotType: 'arme', weaponType: 'epee' }, armure: { slotType: 'plastron', armorType: 'lourde' }, bijou: { slotType: 'anneau' } };

function craftBody() {
  const order = view.order;
  const cost = craftCost(order);
  const problem = craftProblem(state, order);
  const have = state.materia[cost.kind][cost.rarity];
  const options = craftOptions(order.kind);
  const legendaries = order.rarity === 'legendaire' ? craftLegendaries(order) : [];
  const choice = (attrs, selected, icon, label, extra = '') =>
    `<button class="choice ${selected ? 'selected' : ''}" ${attrs} title="${esc(label)}">${iconHtml(icon, 32)}<span>${esc(label)}${extra}</span></button>`;
  return `
    <section class="win craft-order">
      <p class="hint">Objet du niveau le plus haut atteint (${state.dungeonLvl}) : ${FORGE.craftBase} matéria de la rareté voulue, +${FORGE.craftPerFilter} par caractéristique imposée. Le reste est tiré au sort.</p>
      <div class="craft-line"><b>Catégorie</b>
        ${Object.keys(MATERIA_KINDS).map((kind) => choice(`data-craft-kind="${kind}"`, order.kind === kind, itemIcon({ ...KIND_ICON[kind], rarity: order.rarity }), KIND_LABELS[kind])).join('')}</div>
      <div class="craft-line"><b>Rareté</b>
        ${MATERIA_RARITIES.map((r) => `<button class="choice rar ${order.rarity === r ? "selected" : ""}" data-craft-rarity="${r}" style="--rc:${RARITIES[r].color}">${iconHtml(MATERIA_ICONS[order.kind], 32)}<span style="color:${RARITIES[r].color}">${RARITIES[r].label} <small>(${state.materia[order.kind][r]})</small></span></button>`).join('')}</div>
      ${CRAFT_FILTERS[order.kind].map((f) => `
        <div class="craft-line"><b>${FILTER_LABELS[f]}</b>
          <button class="choice ${order[f] ? '' : 'selected'}" data-craft-filter="${f}" data-value="">${iconHtml(1000, 32)}<span>Au hasard</span></button>
          ${options[f].map((v) => choice(`data-craft-filter="${f}" data-value="${v}"`, order[f] === v, optionIcon(f, v), optionLabel(f, v))).join('')}
        </div>`).join('')}
    </section>
    <section class="win detail-panel">
      <h3>${iconHtml(1471, 16)} Commande</h3>
      <ul class="cost"><li class="${have < cost.amount ? 'lack' : 'ok'}">${iconHtml(MATERIA_ICONS[cost.kind], 16)} ${cost.amount} × ${MATERIA_KINDS[cost.kind].label} ${rarityLabel(cost.rarity)} <small>(possédé : ${have})</small></li></ul>
      ${order.rarity === 'legendaire' ? `<p class="hint">Légendaires possibles : ${legendaries.length ? legendaries.map((k) => `<b style="color:${RARITIES.legendaire.color}">${esc(LEGENDARIES[k].name)}</b>`).join(', ') : 'aucun'}.</p>` : ''}
      ${problem ? `<p class="warning">${esc(problem)}</p>` : ''}
      <div class="actions"><button id="craftBtn" class="gold" ${problem ? 'disabled' : ''}>${iconHtml(1471, 16)} Fabriquer</button></div>
    </section>`;
}

function bindCraft(app) {
  app.querySelectorAll('[data-craft-kind]').forEach((btn) => {
    btn.onclick = () => { view.order = { kind: btn.dataset.craftKind, rarity: view.order.rarity }; refresh(); };
  });
  app.querySelectorAll('[data-craft-rarity]').forEach((btn) => {
    btn.onclick = () => { view.order.rarity = btn.dataset.craftRarity; refresh(); };
  });
  app.querySelectorAll('[data-craft-filter]').forEach((btn) => {
    btn.onclick = () => {
      const f = btn.dataset.craftFilter;
      if (btn.dataset.value) view.order[f] = btn.dataset.value;
      else delete view.order[f];
      refresh();
    };
  });
  app.querySelector('#craftBtn')?.addEventListener('click', () => {
    const item = craft(state, view.order);
    if (item) {
      view.flash = `Fabriqué : ${itemName(item)} (dans le sac).`;
      view.crafted = item;
    }
    refresh();
  });
}

// ---- Forge divine ----

function divineBody() {
  const divines = [...new Set(allItems())].filter((i) => i.rarity === 'divin');
  const legendaries = bagItems(state.bag.filter((i) => i.legendary), 'all', null);
  const divine = divines.find((i) => i.id === view.divineId) ?? null;
  const leg = legendaries.find((i) => i.id === view.legendaryId) ?? null;
  const cls = leg && CLASSES[leg.legendary.classKey];
  const problem = divine && leg ? absorbProblem(state, divine, leg) : 'Choisissez un objet divin et un légendaire.';
  const confirming = leg && view.confirm === `absorb:${leg.id}`;
  return `
    <section class="win">
      <p class="hint">Un objet <b style="color:${RARITIES.divin.color}">divin</b> absorbe le pouvoir unique d'un légendaire du sac, qui est détruit. Le pouvoir s'applique comme s'il était porté ; un nouveau pouvoir remplace l'ancien.</p>
      <h3>${iconHtml(1055, 16)} Objets divins</h3>
      ${itemGrid('forgeDivine', divines, { selectedId: view.divineId, empty: 'Aucun objet divin : ils ne tombent que sur les boss, à partir de la difficulté Guerre.' })}
      <h3>${iconHtml(1447 + 80, 16)} Légendaires du sac</h3>
      ${itemGrid('forgeLegendary', legendaries, { selectedId: view.legendaryId, empty: 'Aucun légendaire dans le sac (un légendaire porté doit d\'abord être retiré).' })}
    </section>
    <section class="win detail-panel" id="divineDetail">
      ${divine ? itemDetail(divine) : '<p class="hint">Choisissez un objet divin.</p>'}
      ${leg ? `<div class="forge-section"><h4>${iconHtml(itemIcon(leg), 16)} <span class="rarity-text" style="--rc:${RARITIES.legendaire.color}">${esc(itemName(leg))}</span>${cls ? ` <small>(${esc(cls.title)})</small>` : ''}</h4><p>${esc(leg.legendary.desc)}</p></div>` : ''}
      ${divine?.absorbed && leg ? `<p class="hint">Le pouvoir actuel (${esc(divine.absorbed.name)}) sera remplacé.</p>` : ''}
      <div class="actions"><button id="absorbBtn" class="${confirming ? 'btn-primary' : 'gold'}" ${problem ? 'disabled' : ''}>${confirming ? `Confirmer : détruire ${esc(itemName(leg))}` : 'Absorber le pouvoir'}</button></div>
    </section>`;
}

function bindDivine(app) {
  const divines = [...new Set(allItems())].filter((i) => i.rarity === 'divin');
  const legendaries = state.bag.filter((i) => i.legendary);
  wireGrid(app, 'forgeDivine', divines, { onSelect: (i) => { Object.assign(view, { divineId: i.id, confirm: null }); refresh(); }, rerender: refresh });
  wireGrid(app, 'forgeLegendary', legendaries, { onSelect: (i) => { Object.assign(view, { legendaryId: i.id, confirm: null }); refresh(); }, rerender: refresh });
  app.querySelector('#absorbBtn')?.addEventListener('click', () => {
    const divine = divines.find((i) => i.id === view.divineId);
    const leg = legendaries.find((i) => i.id === view.legendaryId);
    if (!divine || !leg) return;
    if (view.confirm !== `absorb:${leg.id}`) {
      view.confirm = `absorb:${leg.id}`;
    } else {
      if (absorbLegendary(state, divine, leg) !== false) view.flash = `${itemName(divine)} absorbe le pouvoir de ${itemName(leg)}.`;
      Object.assign(view, { confirm: null, legendaryId: null });
    }
    refresh();
  });
}
