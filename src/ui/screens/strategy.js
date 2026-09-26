// Stratégie : position de départ de chaque héros en combat (corps à corps ou distance).

import { state } from '../../state.js';
import { COMBAT } from '../../config.js';
import { WEAPON_TYPES, RANGE_LABELS } from '../../data/items.js';
import { getClass, getStats } from '../../game/party.js';
import { setPosition, weaponRange, POSITIONS } from '../../game/position.js';
import { esc } from '../html.js';
import { goTo, goBack, backLabel } from '../router.js';

const ICONS = { melee: '⚔️', ranged: '🏹' };

export function renderStrategy(app) {
  app.innerHTML = `
    <div class="hero"><h1>🧭 Stratégie</h1><p>Place tes héros au corps à corps ou à distance avant le combat</p></div>
    <div class="card">
      <ul class="rules">
        <li><b>Corps à corps</b> : ${COMBAT.meleeTargetWeight} fois plus de chances d'être ciblé par les ennemis qu'à distance. Un héros au corps à corps frappé au corps à corps peut <b>riposter</b> (stat Riposte).</li>
        <li><b>Armes</b> : l'arc ne sert qu'à distance ; toutes les autres armes (bâton compris) qu'au corps à corps. L'attaque simple et les compétences physiques en dépendent ; sorts, soins, pièges et objets marchent partout.</li>
        <li>En combat, <b>« Changer de position »</b> prend tout le tour (avant toute autre action pour le Voleur et le Chasseur). Chaque combat repart de la position choisie ici.</li>
      </ul>
    </div>
    <div class="slots">${state.party.map(heroCard).join('')}</div>
    <div class="center"><button id="backHub">${backLabel()}</button></div>
  `;
  app.querySelectorAll('[data-pos]').forEach((btn) => {
    btn.onclick = () => {
      setPosition(state.party[Number(btn.dataset.hero)], btn.dataset.pos);
      goTo('strategy');
    };
  });
  app.querySelector('#backHub').onclick = () => goBack();
}

function heroCard(hero, i) {
  const cls = getClass(hero);
  const weapon = hero.equipment.mainDroite;
  const weaponName = weapon ? WEAPON_TYPES[weapon.weaponType].name : 'Mains nues';
  const range = weaponRange(hero);
  const warning = range !== hero.position
    ? `<p class="warn">⚠️ ${range === 'ranged' ? "Son arc ne sert pas au corps à corps" : `Son arme (${esc(weaponName)}) ne sert pas à distance`} : pas d'attaque simple ni de compétence physique depuis cette position (sorts, soins, pièges et objets restent possibles).</p>`
    : '';
  return `
    <div class="card slot" style="--c:${cls.color}">
      <div class="icon">${cls.icon}</div>
      <div class="cname">${esc(hero.name)}</div>
      <div class="role">${cls.name} · ${esc(weaponName)} (${RANGE_LABELS[range].toLowerCase()}) · Riposte ${getStats(hero).riposte} %</div>
      <div class="pos-choice">
        ${POSITIONS.map((p) => `<button data-hero="${i}" data-pos="${p}" class="${hero.position === p ? 'selected' : ''}">${ICONS[p]} ${RANGE_LABELS[p]}</button>`).join('')}
      </div>
      ${warning}
    </div>`;
}
