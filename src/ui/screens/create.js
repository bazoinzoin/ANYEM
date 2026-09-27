// Création de l'équipe, plein écran : quatre colonnes (une par héros) avec portrait,
// choix de la classe en portraits, nom, ressource et orientations. « Détails » ouvre une
// fenêtre à deux onglets : le détail d'une classe (stats, sorts et équipement de départ,
// orientations) et tous les légendaires en icônes.

import { state } from '../../state.js';
import { PARTY_ORDER, CLASS_ORDER } from '../../config.js';
import { CLASSES } from '../../data/classes.js';
import { STATS } from '../../data/stats.js';
import { LEGENDARIES, RARITIES } from '../../data/items.js';
import { TALENTS, nodeSkills } from '../../data/talents.js';
import { createParty, createHero, getStats } from '../../game/party.js';
import { equippedItems } from '../../game/equipment.js';
import { generateItem } from '../../game/items.js';
import { esc } from '../html.js';
import { statsList } from '../heroStats.js';
import { skillEffectLabel } from '../format.js';
import { goTo } from '../router.js';
import { iconHtml, itemIcon, branchIcon, skillIconIndex, CLASS_ICONS } from '../icons.js';
import { frame, wireFrame, itemDetail } from '../screenFrame.js';
import { portrait, drawPortraits } from '../portraits.js';

// Choix en cours (classes et noms), conservés quand on change une classe.
// Détails ouverts : { tab: 'classes' | 'legendaries', classKey } ou null.
const draft = { classes: [...PARTY_ORDER], names: PARTY_ORDER.map((k) => CLASSES[k].name), details: null };

export function renderCreate(app) {
  app.innerHTML = `${frame({
    title: 'Nouvelle partie', icon: 720, layout: 'lay-create', gold: false, back: '← Menu principal',
    extras: `<span class="hint">Composez votre équipe de quatre héros (une classe peut revenir plusieurs fois).</span>
      <button id="detailsBtn">${iconHtml(96, 16)} Classes et légendaires</button>
      <button id="startBtn" class="btn-primary">Commencer l'aventure</button>`,
    body: draft.classes.map(heroColumn).join(''),
  })}${draft.details ? detailsWindow() : ''}`;

  const rerender = (change) => () => {
    readNames(app);
    change();
    renderCreate(app);
  };
  wireFrame(app, () => goTo('title'));
  drawPortraits(app);
  app.querySelectorAll('[data-class-slot]').forEach((btn) => {
    btn.onclick = rerender(() => {
      const i = Number(btn.dataset.classSlot);
      // Nom par défaut (celui de la classe) : il suit la nouvelle classe.
      if (draft.names[i] === CLASSES[draft.classes[i]].name) draft.names[i] = CLASSES[btn.dataset.class].name;
      draft.classes[i] = btn.dataset.class;
    });
  });
  app.querySelector('#detailsBtn').onclick = rerender(() => { draft.details = { tab: 'classes', classKey: draft.classes[0] }; });
  app.querySelector('#closeDetails')?.addEventListener('click', rerender(() => { draft.details = null; }));
  app.querySelectorAll('[data-details-tab]').forEach((btn) => {
    btn.onclick = rerender(() => { draft.details.tab = btn.dataset.detailsTab; });
  });
  app.querySelectorAll('[data-details-class]').forEach((btn) => {
    btn.onclick = rerender(() => { draft.details.classKey = btn.dataset.detailsClass; });
  });
  const legBox = app.querySelector('#legDetail');
  app.querySelectorAll('[data-legendary]').forEach((cell) => {
    cell.onmouseenter = () => { legBox.innerHTML = legendaryDetail(cell.dataset.legendary); };
  });
  app.querySelector('#startBtn').onclick = () => {
    readNames(app);
    draft.details = null;
    state.party = createParty(draft.names, draft.classes);
    goTo('hub');
  };
}

function readNames(app) {
  draft.names = draft.classes.map((_, i) => app.querySelector(`#name${i}`)?.value ?? draft.names[i]);
}

function heroColumn(key, i) {
  const cls = CLASSES[key];
  return `
    <section class="win create-hero" style="--c:${cls.color}">
      <h3>Héros ${i + 1} · ${esc(cls.name)}</h3>
      <div class="create-portrait">${portrait(`classe:${key}`, 5)}</div>
      <input type="text" id="name${i}" placeholder="Nom du héros" value="${esc(draft.names[i])}" maxlength="24">
      <div class="create-classes" role="group" aria-label="Classe du héros ${i + 1}">
        ${CLASS_ORDER.map((k) => `<button data-class-slot="${i}" data-class="${k}" class="class-pick ${k === key ? 'selected' : ''}" style="--c:${CLASSES[k].color}" title="${esc(CLASSES[k].name)}">${iconHtml(CLASS_ICONS[k], 32)}</button>`).join('')}
      </div>
      <p class="create-meta">${esc(cls.resource.name)} · ${STATS[cls.mainStat].label}${key === 'paladin' ? ' ou Intelligence' : ''}</p>
      <div class="create-branches">${TALENTS[key].map((b) => `<span>${iconHtml(branchIcon(b), 16)} ${esc(b.name)}</span>`).join('')}</div>
      <p class="hint create-desc">${esc(cls.desc)}</p>
    </section>`;
}

// ---- Fenêtre de détails ----

function detailsWindow() {
  const { tab } = draft.details;
  return `
    <div class="bs-modal create-modal">
      <div class="win">
        <header class="scr-top">
          <button data-details-tab="classes" class="tab ${tab === 'classes' ? 'selected' : ''}">${iconHtml(610, 16)} Détail des classes</button>
          <button data-details-tab="legendaries" class="tab ${tab === 'legendaries' ? 'selected' : ''}">${iconHtml(1447 + 80, 16)} Légendaires</button>
          <span style="flex:1"></span>
          <button id="closeDetails">Fermer</button>
        </header>
        ${tab === 'legendaries' ? legendariesTab() : classesTab()}
      </div>
    </div>`;
}

// Détail d'une classe : héros de niveau 1 avec son équipement de départ, sorts de départ
// (palier 0) et signature de chaque orientation.
function classesTab() {
  const key = draft.details.classKey;
  const cls = CLASSES[key];
  const hero = createHero(key);
  const stats = getStats(hero);
  const r = cls.resource;
  const resourceText = r.multiAction
    ? `${r.name} : ${r.max} au maximum, pleine au début de chaque combat, +${r.regen} par tour. Chaque action en coûte (Attaquer ${r.actionCosts.attack}, Défendre ${r.actionCosts.defend}, Objet ${r.actionCosts.item}) : plusieurs actions par tour.`
    : r.onHitTaken
      ? `${r.name} : ${r.max} au maximum, commence à ${r.start}. +${r.regen} par tour, +${r.onAttack} par attaque simple, +${r.onHitTaken} par coup encaissé.`
      : `${r.name} : ${r.max} au maximum, +${r.regen} au début de chaque tour.`;
  return `
    <div class="create-classes details">
      ${CLASS_ORDER.map((k) => `<button data-details-class="${k}" class="choice ${k === key ? 'selected' : ''}">${iconHtml(CLASS_ICONS[k], 32)}<span>${esc(CLASSES[k].name)}</span></button>`).join('')}
    </div>
    <div class="details-body">
      <div class="details-col">
        <div class="beast-head">${portrait(`classe:${key}`, 3)}<div><h3>${esc(cls.name)}</h3><p class="hint">${esc(cls.desc)}</p></div></div>
        <div class="stats sheet stats-cols">${statsList(hero)}</div>
      </div>
      <div class="details-col">
        <p class="hint">${esc(resourceText)} Position de départ : ${cls.position === 'ranged' ? 'distance' : 'corps à corps'}. Par niveau : ${Object.entries(cls.growth).map(([k, v]) => `+${v} ${STATS[k].label}`).join(', ')}.</p>
        <h4>Orientations <small class="hint">— le premier point dans une orientation apprend son sort de départ ; signature au palier 9</small></h4>
        <div class="skill-list">${TALENTS[key].map((b) => {
          const starterNode = b.nodes.find((n) => n.tier === 0 && nodeSkills(n).length);
          const starter = starterNode ? nodeSkills(starterNode)[0] : null;
          const sig = b.nodes.find((n) => n.kind === 'signature');
          return `
            <div class="skill-item">${iconHtml(branchIcon(b), 32)}<div><b>${esc(b.name)}</b> <small class="hint">${esc(b.desc)}</small><br>
              ${starter ? `<small>${iconHtml(skillIconIndex(starter), 16)} <b>${esc(starter.name)}</b> (${starter.cost} ${esc(r.name)}) : ${esc(skillEffectLabel(stats, starter))}</small><br>` : ''}
              ${sig ? `<small>${iconHtml(skillIconIndex(sig.skill), 16)} Signature : <b>${esc(sig.name)}</b></small>` : ''}</div></div>`;
        }).join('')}</div>
        <h4>Équipement de départ</h4>
        <div class="cells">${equippedItems(hero).map((item) => `<div class="bag-cell" style="--rc:${RARITIES[item.rarity].color}" title="${esc(item.name ?? '')}">${iconHtml(itemIcon(item), 32)}</div>`).join('')}</div>
      </div>
    </div>`;
}

// Tous les légendaires en icônes, classés par classe puis neutres ; fiche au survol.
function legendariesTab() {
  const order = (key) => (LEGENDARIES[key].classKey ? CLASS_ORDER.indexOf(LEGENDARIES[key].classKey) : CLASS_ORDER.length);
  const keys = Object.keys(LEGENDARIES).sort((a, b) => order(a) - order(b));
  const groups = [...CLASS_ORDER, null].map((classKey) => [classKey, keys.filter((k) => (LEGENDARIES[k].classKey ?? null) === classKey)]).filter(([, list]) => list.length);
  return `
    <p class="hint">Un légendaire tombe rarement (plus souvent sur les boss), au niveau du donjon, avec 4 stats secondaires aléatoires. Son pouvoir ne sert qu'à la classe indiquée ; il renforce souvent une compétence, qu'il faut avoir apprise.</p>
    <div class="details-body">
      <div class="details-col leg-groups">${groups.map(([classKey, list]) => `
        <div class="leg-group"><span class="leg-class">${classKey ? `${iconHtml(CLASS_ICONS[classKey], 16)} ${esc(CLASSES[classKey].name)}` : 'Toutes classes'}</span>
          <div class="cells">${list.map((k) => `<div class="bag-cell pick" data-legendary="${k}" style="--rc:${RARITIES.legendaire.color}">${iconHtml(itemIcon(sample(k)), 32)}</div>`).join('')}</div>
        </div>`).join('')}
      </div>
      <div class="details-col" id="legDetail">${legendaryDetail(keys[0])}</div>
    </div>`;
}

// Exemplaire de démonstration d'un légendaire (niveau 10, tiré une fois par session).
const samples = new Map();
function sample(key) {
  if (!samples.has(key)) samples.set(key, generateItem({ level: 10, legendary: key }));
  return samples.get(key);
}

function legendaryDetail(key) {
  const leg = LEGENDARIES[key];
  const cls = leg.classKey ? CLASSES[leg.classKey] : null;
  return `${itemDetail(sample(key))}<p class="hint">${cls ? `Réservé au ${esc(cls.name)}.` : 'Utilisable par toutes les classes.'} Stats données pour un exemplaire de niveau 10 ; les secondaires sont tirées au hasard.</p>`;
}
