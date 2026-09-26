// Création de l'équipe : quatre héros, chacun d'une classe au choix (doublons permis).
// Le bouton « Détails » d'un héros ouvre sa fiche de départ (stats de base,
// équipement, compétences) et l'aperçu de ses arbres de talents.

import { state } from '../../state.js';
import { PARTY_ORDER, CLASS_ORDER } from '../../config.js';
import { CLASSES } from '../../data/classes.js';
import { STATS } from '../../data/stats.js';
import { TALENTS } from '../../data/talents.js';
import { createParty, createHero, getStats, getSkills } from '../../game/party.js';
import { equippedItems } from '../../game/equipment.js';
import { esc, tip } from '../html.js';
import { statsList } from '../heroStats.js';
import { itemCard } from '../items.js';
import { skillEffectLabel } from '../format.js';
import { talentTreesPreview } from './talents.js';
import { goTo } from '../router.js';

// Choix en cours (classes et noms), conservés quand on change une classe ;
// fiche de détails ouverte : { slot, tab: 'stats' | 'talents' } ou null.
const draft = { classes: [...PARTY_ORDER], names: PARTY_ORDER.map((k) => CLASSES[k].name), details: null };

export function renderCreate(app) {
  app.innerHTML = `
    <div class="hero"><h1>Anyem</h1><p>Compose ton équipe de quatre héros avant de partir à l'aventure</p></div>
    <p class="center hint">6 classes au choix : ${CLASS_ORDER.map((k) => `${CLASSES[k].icon} ${CLASSES[k].name}`).join(' · ')}. Clique sur une classe dans la carte d'un héros pour la changer.</p>
    <div class="slots">
      ${draft.classes.map((key, i) => classCard(key, i)).join('')}
    </div>
    ${draft.details ? detailsPanel() : ''}
    <div class="center"><button id="startBtn" class="btn-primary">Commencer l'aventure</button></div>
  `;

  app.querySelectorAll('[data-class-slot]').forEach((btn) => {
    btn.onclick = () => {
      const i = Number(btn.dataset.classSlot);
      const before = draft.classes[i];
      readNames(app);
      // Nom par défaut (celui de la classe) : il suit la nouvelle classe.
      if (draft.names[i] === CLASSES[before].name) draft.names[i] = CLASSES[btn.dataset.class].name;
      draft.classes[i] = btn.dataset.class;
      renderCreate(app);
    };
  });
  app.querySelectorAll('[data-details]').forEach((btn) => {
    btn.onclick = () => {
      const slot = Number(btn.dataset.details);
      readNames(app);
      draft.details = draft.details?.slot === slot ? null : { slot, tab: 'stats' };
      renderCreate(app);
      app.querySelector('#classDetails')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
  app.querySelectorAll('[data-details-tab]').forEach((btn) => {
    btn.onclick = () => {
      readNames(app);
      draft.details.tab = btn.dataset.detailsTab;
      renderCreate(app);
    };
  });
  app.querySelector('#closeDetails')?.addEventListener('click', () => {
    readNames(app);
    draft.details = null;
    renderCreate(app);
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
  const open = draft.details?.slot === i;
  return `
    <div class="card slot ${open ? 'selected' : ''}" style="--c:${cls.color}">
      <div ${tip(cls.desc, 'icon')}>${cls.icon}</div>
      <div class="cname">${cls.name}</div>
      <div class="class-picker" role="group" aria-label="Classe du héros ${i + 1}">
        ${CLASS_ORDER.map((k) => `<button data-class-slot="${i}" data-class="${k}" class="${k === key ? 'selected' : ''}" style="--c:${CLASSES[k].color}" ${tip(CLASSES[k].name)}>${CLASSES[k].icon}</button>`).join('')}
      </div>
      <div class="role">Ressource : ${cls.resource.name} · ${STATS[cls.mainStat].label}${key === 'paladin' ? ' ou Intelligence' : ''}</div>
      <div class="role">${branches}</div>
      <p class="class-desc">${esc(cls.desc)}</p>
      <input type="text" id="name${i}" placeholder="Nom du héros" value="${esc(draft.names[i])}" maxlength="24">
      <button class="full" data-details="${i}">${open ? '✖ Fermer les détails' : '📋 Détails'}</button>
    </div>`;
}

// Fiche de la classe choisie pour le héros `draft.details.slot` : héros de niveau 1
// avec son équipement de départ.
function detailsPanel() {
  const { slot, tab } = draft.details;
  const key = draft.classes[slot];
  const cls = CLASSES[key];
  const hero = createHero(key, draft.names[slot]);
  const tabs = [['stats', '📊 Stats, équipement et sorts'], ['talents', '📖 Arbres de talents']];
  return `
    <div id="classDetails" class="card class-details" style="--c:${cls.color}">
      <div class="details-head">
        <h2>${cls.icon} ${esc(hero.name)} — ${cls.name}</h2>
        <button id="closeDetails">✖ Fermer</button>
      </div>
      <div class="hero-tabs">
        ${tabs.map(([id, label]) => `<button data-details-tab="${id}" class="${id === tab ? 'selected' : ''}" style="--c:${cls.color}">${label}</button>`).join('')}
      </div>
      ${tab === 'talents' ? talentsTab(hero) : statsTab(hero)}
    </div>`;
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
        <p class="hint">${esc(resourceText)} À chaque niveau : ${Object.entries(cls.growth).map(([k, v]) => `+${v} ${STATS[k].label}`).join(', ')}.</p>
      </div>
      <div>
        <h3>Compétences de départ</h3>
        <div class="skillbox">
          ${getSkills(hero).map((s) => `
            <div class="skill-line">
              <b>${esc(s.name)}</b> — ${s.cost} ${r.name}<br>
              ${esc(s.desc)}.<br><small>${esc(skillEffectLabel(stats, s))}</small>
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
