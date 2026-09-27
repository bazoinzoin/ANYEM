// Création de l'équipe : quatre héros, chacun d'une classe au choix (doublons permis).
// Un seul bouton « Détails » ouvre deux onglets : le détail des classes (stats,
// équipement et sorts de départ, arbres de talents) et tous les légendaires.

import { state } from '../../state.js';
import { PARTY_ORDER, CLASS_ORDER } from '../../config.js';
import { CLASSES } from '../../data/classes.js';
import { STATS } from '../../data/stats.js';
import { LEGENDARIES, RARITIES, SLOTS, WEAPON_TYPES, JEWELS } from '../../data/items.js';
import { TALENTS, nodeSkills } from '../../data/talents.js';
import { createParty, createHero, getStats } from '../../game/party.js';
import { equippedItems } from '../../game/equipment.js';
import { itemTypeLabel } from '../../game/items.js';
import { esc, tip } from '../html.js';
import { statsList } from '../heroStats.js';
import { itemCard } from '../items.js';
import { skillEffectLabel } from '../format.js';
import { talentTreesPreview } from './talents.js';
import { goTo } from '../router.js';

// Choix en cours (classes et noms), conservés quand on change une classe.
// Détails ouverts : { tab: 'classes' | 'legendaries', classKey } ou null.
const draft = { classes: [...PARTY_ORDER], names: PARTY_ORDER.map((k) => CLASSES[k].name), details: null };

export function renderCreate(app) {
  app.innerHTML = `
    <button id="toTitle" class="back">← Menu principal</button>
    <div class="hero"><h1>Nouvelle partie</h1><p>Compose ton équipe de quatre héros avant de partir à l'aventure</p></div>
    <p class="center hint">6 classes au choix : ${CLASS_ORDER.map((k) => `${CLASSES[k].icon} ${CLASSES[k].name}`).join(' · ')}. Clique sur une classe dans la carte d'un héros pour la changer.</p>
    <div class="slots">
      ${draft.classes.map((key, i) => classCard(key, i)).join('')}
    </div>
    <div class="center">
      <button id="detailsBtn">${draft.details ? '✖ Fermer les détails' : '📋 Détails des classes et légendaires'}</button>
    </div>
    ${draft.details ? detailsPanel() : ''}
    <div class="center"><button id="startBtn" class="btn-primary">Commencer l'aventure</button></div>
  `;

  const rerender = (change) => () => {
    readNames(app);
    change();
    renderCreate(app);
  };
  app.querySelectorAll('[data-class-slot]').forEach((btn) => {
    btn.onclick = rerender(() => {
      const i = Number(btn.dataset.classSlot);
      // Nom par défaut (celui de la classe) : il suit la nouvelle classe.
      if (draft.names[i] === CLASSES[draft.classes[i]].name) draft.names[i] = CLASSES[btn.dataset.class].name;
      draft.classes[i] = btn.dataset.class;
    });
  });
  app.querySelector('#toTitle').onclick = () => goTo('title');
  app.querySelector('#detailsBtn').onclick = () => {
    rerender(() => { draft.details = draft.details ? null : { tab: 'classes', classKey: draft.classes[0] }; })();
    app.querySelector('#classDetails')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  app.querySelectorAll('[data-details-tab]').forEach((btn) => {
    btn.onclick = rerender(() => { draft.details.tab = btn.dataset.detailsTab; });
  });
  app.querySelectorAll('[data-details-class]').forEach((btn) => {
    btn.onclick = rerender(() => { draft.details.classKey = btn.dataset.detailsClass; });
  });
  app.querySelector('#startBtn').onclick = () => {
    readNames(app);
    draft.details = null;
    state.party = createParty(draft.names, draft.classes);
    goTo('hub');
  };
}

function readNames(app) {
  draft.names = draft.classes.map((_, i) => app.querySelector(`#name${i}`).value);
}

function classCard(key, i) {
  const cls = CLASSES[key];
  const branches = TALENTS[key].map((b) => `${b.icon} ${b.name}`).join(', ');
  return `
    <div class="card slot" style="--c:${cls.color}">
      <div ${tip(cls.desc, 'icon')}>${cls.icon}</div>
      <div class="cname">${cls.name}</div>
      <div class="class-picker" role="group" aria-label="Classe du héros ${i + 1}">
        ${CLASS_ORDER.map((k) => `<button data-class-slot="${i}" data-class="${k}" class="${k === key ? 'selected' : ''}" style="--c:${CLASSES[k].color}" ${tip(CLASSES[k].name)}>${CLASSES[k].icon}</button>`).join('')}
      </div>
      <div class="role">Ressource : ${cls.resource.name} · ${STATS[cls.mainStat].label}${key === 'paladin' ? ' ou Intelligence' : ''}</div>
      <div class="role">${branches}</div>
      <p class="class-desc">${esc(cls.desc)}</p>
      <input type="text" id="name${i}" placeholder="Nom du héros" value="${esc(draft.names[i])}" maxlength="24">
    </div>`;
}

function detailsPanel() {
  const { tab } = draft.details;
  const tabs = [['classes', '📊 Détail des classes'], ['legendaries', '🌟 Légendaires']];
  return `
    <div id="classDetails" class="card class-details">
      <div class="hero-tabs">
        ${tabs.map(([id, label]) => `<button data-details-tab="${id}" class="${id === tab ? 'selected' : ''}">${label}</button>`).join('')}
      </div>
      ${tab === 'legendaries' ? legendariesTab() : classesTab()}
    </div>`;
}

// Détail d'une classe : héros de niveau 1 avec son équipement de départ, puis ses
// arbres de talents.
function classesTab() {
  const key = draft.details.classKey;
  const cls = CLASSES[key];
  const hero = createHero(key);
  return `
    <div class="class-picker details-classes" role="group" aria-label="Classe à détailler">
      ${CLASS_ORDER.map((k) => `<button data-details-class="${k}" class="${k === key ? 'selected' : ''}" style="--c:${CLASSES[k].color}">${CLASSES[k].icon} ${CLASSES[k].name}</button>`).join('')}
    </div>
    <h2 style="--c:${cls.color}">${cls.icon} ${cls.name}</h2>
    <p class="hint">${esc(cls.desc)}</p>
    ${statsTab(hero)}
    <h3>📖 Arbres de talents</h3>
    ${talentsTab(hero)}`;
}

function statsTab(hero) {
  const cls = CLASSES[hero.classKey];
  const stats = getStats(hero);
  const r = cls.resource;
  const resourceText = r.multiAction
    ? `${r.name} : ${r.max} au maximum, pleine au début de chaque combat, +${r.regen} au début de chaque tour. Chaque action en coûte (Attaquer ${r.actionCosts.attack}, Défendre ${r.actionCosts.defend}, Objet ${r.actionCosts.item}) : plusieurs actions par tour.`
    : r.onHitTaken
      ? `${r.name} : ${r.max} au maximum, commence à ${r.start}. +${r.regen} par tour, +${r.onAttack} par attaque simple, +${r.onHitTaken} par coup encaissé.`
      : `${r.name} : ${r.max} au maximum, +${r.regen} au début de chaque tour.`;
  return `
    <div class="details-grid">
      <div>
        <h3>Stats de base (niveau 1, équipement compris)</h3>
        <div class="stats sheet">${statsList(hero)}</div>
        <p class="hint">Position de départ : ${cls.position === 'ranged' ? 'distance' : 'corps à corps'} (modifiable au village, bouton Stratégie). ${esc(resourceText)} À chaque niveau : ${Object.entries(cls.growth).map(([k, v]) => `+${v} ${STATS[k].label}`).join(', ')}.</p>
      </div>
      <div>
        <h3>Sorts de départ</h3>
        <p class="hint">Un héros commence sans sort : son premier point de talent lui fait apprendre le sort de départ d'une orientation (palier 0).</p>
        <div class="skillbox">
          ${TALENTS[hero.classKey].map((b) => `
            <div class="skill-line">
              <b>${b.icon} ${esc(b.name)}</b> : ${nodeSkills(b.nodes.find((n) => n.tier === 0 && nodeSkills(n).length)).map((s) => `<b>${esc(s.name)}</b> (${s.cost} ${r.name}) — ${esc(s.desc)}. <small>${esc(skillEffectLabel(stats, s))}</small>`).join(' · ')}
            </div>`).join('')}
        </div>
        <h3>Équipement de départ</h3>
        <div class="details-items">${equippedItems(hero).map(itemCard).join('')}</div>
      </div>
    </div>`;
}

function talentsTab(hero) {
  return `
    <p class="hint">1 point par niveau (50 au niveau maximum). Chaque orientation a 10 paliers et se termine par une compétence signature ; au niveau 50, on en complète une seule.</p>
    ${talentTreesPreview(hero)}`;
}

// Tous les légendaires, classés par classe puis neutres ; ceux d'une classe portent
// son symbole. Pièce, stat principale, passif unique et compétence renforcée.
function legendariesTab() {
  const entries = Object.values(LEGENDARIES);
  const order = (l) => (l.classKey ? CLASS_ORDER.indexOf(l.classKey) : CLASS_ORDER.length);
  const cards = [...entries].sort((a, b) => order(a) - order(b)).map((leg) => {
    const piece = leg.slotType === 'arme' ? WEAPON_TYPES[leg.weaponType].name
      : leg.slotType === 'bouclier' ? 'Bouclier'
        : JEWELS[leg.slotType] ? JEWELS[leg.slotType].name : SLOTS[leg.slotType].label;
    const type = itemTypeLabel(leg);
    const cls = leg.classKey ? CLASSES[leg.classKey] : null;
    const badge = cls
      ? `<span class="leg-class" style="--c:${cls.color}" ${tip(`Réservé au ${cls.name}`)}>${cls.icon}</span>`
      : `<span class="leg-class" ${tip('Utilisable par toutes les classes')}>✦</span>`;
    const source = cls && leg.passive?.skill ? skillSource(leg.classKey, leg.passive.skill) : '';
    return `
      <div class="item-card" style="--rc:${RARITIES.legendaire.color}">
        <div class="item-name">${badge} ${esc(leg.name)}</div>
        <div class="item-rarity">${RARITIES.legendaire.label}</div>
        <div class="item-meta">${esc(type.startsWith(piece) ? type : `${piece} · ${type}`)} · ${leg.primary ? STATS[leg.primary].label : 'stat principale au hasard'}</div>
        <div class="item-legendary">Unique : ${esc(leg.desc)}</div>
        ${source ? `<div class="item-meta">${esc(source)}</div>` : ''}
      </div>`;
  });
  return `
    <p class="hint">Un légendaire tombe rarement (plus souvent sur les boss), au niveau du donjon, avec 4 stats secondaires aléatoires. Le symbole indique la classe à laquelle il est réservé (${CLASS_ORDER.map((k) => `${CLASSES[k].icon} ${CLASSES[k].name}`).join(', ')}) ; n'importe quel légendaire peut tomber, et l'auberge permet de recruter la classe qui en profite. Son passif renforce une compétence : il faut l'avoir apprise pour en profiter.</p>
    <div class="details-items legendaries">${cards.join('')}</div>`;
}

function skillSource(classKey, skillId) {
  for (const branch of TALENTS[classKey]) {
    const node = branch.nodes.find((n) => nodeSkills(n).some((s) => s.id === skillId));
    if (node) {
      const skill = nodeSkills(node).find((s) => s.id === skillId);
      return `Renforce ${skill.name} (${branch.icon} ${branch.name}, ${node.tier === 0 ? 'sort de départ' : `palier ${node.tier}`}).`;
    }
  }
  return '';
}
