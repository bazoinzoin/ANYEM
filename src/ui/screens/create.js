// Création de l'équipe : quatre héros, chacun d'une classe au choix (doublons permis).

import { state } from '../../state.js';
import { PARTY_ORDER, CLASS_ORDER } from '../../config.js';
import { CLASSES } from '../../data/classes.js';
import { STATS } from '../../data/stats.js';
import { TALENTS } from '../../data/talents.js';
import { createParty, createHero, getStats } from '../../game/party.js';
import { esc, tip } from '../html.js';
import { goTo } from '../router.js';

// Choix en cours (classes et noms), conservés quand on change une classe.
const draft = { classes: [...PARTY_ORDER], names: PARTY_ORDER.map((k) => CLASSES[k].name) };

export function renderCreate(app) {
  app.innerHTML = `
    <div class="hero"><h1>Anyem</h1><p>Compose ton équipe de quatre héros avant de partir à l'aventure</p></div>
    <p class="center hint">6 classes au choix : ${CLASS_ORDER.map((k) => `${CLASSES[k].icon} ${CLASSES[k].name}`).join(' · ')}. Clique sur une classe dans la carte d'un héros pour la changer.</p>
    <div class="slots">
      ${draft.classes.map((key, i) => classCard(key, i)).join('')}
    </div>
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
  app.querySelector('#startBtn').onclick = () => {
    readNames(app);
    state.party = createParty(draft.names, draft.classes);
    goTo('hub');
  };
}

function readNames(app) {
  draft.names = draft.classes.map((_, i) => app.querySelector(`#name${i}`).value);
}

function classCard(key, i) {
  const cls = CLASSES[key];
  const stats = getStats(createHero(key)); // avec l'équipement de départ
  const phys = cls.skills.some((s) => s.kind === 'damage' && !s.magic);
  const magic = cls.skills.some((s) => s.magic || s.kind === 'heal');
  const power = [phys ? `Puissance ${stats.physPower}` : '', magic ? `Magie ${stats.magPower}` : ''].filter(Boolean).join(' · ');
  const branches = TALENTS[key].map((b) => `${b.icon} ${b.name}`).join(', ');
  return `
    <div class="card slot" style="--c:${cls.color}">
      <div ${tip(cls.desc, 'icon')}>${cls.icon}</div>
      <div class="cname">${cls.name}</div>
      <div class="class-picker" role="group" aria-label="Classe du héros ${i + 1}">
        ${CLASS_ORDER.map((k) => `<button data-class-slot="${i}" data-class="${k}" class="${k === key ? 'selected' : ''}" style="--c:${CLASSES[k].color}" ${tip(CLASSES[k].name)}>${CLASSES[k].icon}</button>`).join('')}
      </div>
      <div class="role">Ressource : ${cls.resource.name} · ${STATS[cls.mainStat].label}${key === 'paladin' ? ' ou Intelligence' : ''}</div>
      <div class="stats">PV ${stats.pv} · ${power} · Vitesse ${stats.vit}</div>
      <div class="role">${branches}</div>
      <p class="class-desc">${esc(cls.desc)}</p>
      <input type="text" id="name${i}" placeholder="Nom du héros" value="${esc(draft.names[i])}" maxlength="24">
    </div>`;
}
