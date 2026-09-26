// Création de l'équipe.

import { state } from '../../state.js';
import { PARTY_ORDER } from '../../config.js';
import { CLASSES } from '../../data/classes.js';
import { createParty, createHero, getStats } from '../../game/party.js';
import { esc, tip } from '../html.js';
import { goTo } from '../router.js';

export function renderCreate(app) {
  app.innerHTML = `
    <div class="hero"><h1>Anyem</h1><p>Compose ton équipe de quatre héros avant de partir à l'aventure</p></div>
    <div class="slots">
      ${PARTY_ORDER.map((key, i) => classCard(key, i)).join('')}
    </div>
    <div class="center"><button id="startBtn" class="btn-primary">Commencer l'aventure</button></div>
  `;

  app.querySelector('#startBtn').onclick = () => {
    const names = PARTY_ORDER.map((_, i) => app.querySelector(`#name${i}`).value);
    state.party = createParty(names);
    goTo('hub');
  };
}

function classCard(key, i) {
  const cls = CLASSES[key];
  const stats = getStats(createHero(key)); // avec l'équipement de départ
  const power = cls.skills.some((s) => s.magic || s.kind === 'heal')
    ? `Magie ${stats.magPower}` : `Puissance ${stats.physPower}`;
  return `
    <div class="card slot" style="--c:${cls.color}">
      <div ${tip(cls.desc, 'icon')}>${cls.icon}</div>
      <div class="cname">${cls.name}</div>
      <div class="role">Ressource : ${cls.resource.name}</div>
      <div class="stats">PV ${stats.pv} · ${power} · Vitesse ${stats.vit}</div>
      <input type="text" id="name${i}" placeholder="Nom du héros" value="${esc(cls.name)}" maxlength="24">
    </div>`;
}
