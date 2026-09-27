// Stratégie, plein écran : position de départ de chaque héros en combat (corps à corps ou
// distance), une colonne par héros avec son portrait et son arme.

import { state } from '../../state.js';
import { COMBAT } from '../../config.js';
import { WEAPON_TYPES, RANGE_LABELS } from '../../data/items.js';
import { getClass, getStats } from '../../game/party.js';
import { setPosition, weaponRange, POSITIONS } from '../../game/position.js';
import { esc } from '../html.js';
import { goTo } from '../router.js';
import { iconHtml, itemIcon, POSITION_ICONS } from '../icons.js';
import { frame, wireFrame } from '../screenFrame.js';
import { heroPortrait, drawPortraits } from '../portraits.js';

export function renderStrategy(app) {
  app.innerHTML = frame({
    title: 'Stratégie', icon: 648, layout: 'lay-strategy', gold: false,
    body: `
      <section class="win strat-rules">
        <p>${iconHtml(POSITION_ICONS.melee, 16)} <b>Corps à corps</b> : ${COMBAT.meleeTargetWeight} fois plus de chances d'être ciblé qu'à distance ; un héros au corps à corps frappé au corps à corps peut <b>riposter</b>.</p>
        <p>${iconHtml(POSITION_ICONS.ranged, 16)} <b>Armes</b> : l'arc ne sert qu'à distance, toutes les autres armes (bâton compris) qu'au corps à corps. Sorts, soins, pièges et objets marchent partout.</p>
        <p>${iconHtml(648, 16)} En combat, « Changer de position » prend tout le tour. Chaque combat repart de la position choisie ici.</p>
      </section>
      ${state.party.map(heroColumn).join('')}`,
  });
  wireFrame(app);
  drawPortraits(app);
  app.querySelectorAll('[data-pos]').forEach((btn) => {
    btn.onclick = () => {
      setPosition(state.party[Number(btn.dataset.hero)], btn.dataset.pos);
      goTo('strategy');
    };
  });
}

function heroColumn(hero, i) {
  const cls = getClass(hero);
  const weapon = hero.equipment.mainDroite;
  const weaponName = weapon ? WEAPON_TYPES[weapon.weaponType].name : 'Mains nues';
  const range = weaponRange(hero);
  const warning = range !== hero.position
    ? `<p class="warning">${range === 'ranged' ? 'Son arc ne sert pas au corps à corps' : `Son arme (${esc(weaponName)}) ne sert pas à distance`} : ni attaque simple ni compétence physique depuis cette position.</p>`
    : '';
  return `
    <section class="win strat-hero" style="--c:${getClass(hero).color}">
      <h3>${esc(hero.name)} <small>${esc(cls.name)} · niv. ${hero.level}</small></h3>
      <div class="strat-portrait ${hero.position}">${heroPortrait(hero, 5)}</div>
      <p class="strat-weapon">${weapon ? iconHtml(itemIcon(weapon), 32) : ''} ${esc(weaponName)} <small>(${RANGE_LABELS[range].toLowerCase()}) · Riposte ${getStats(hero).riposte} %</small></p>
      <div class="strat-choice">
        ${POSITIONS.map((p) => `<button data-hero="${i}" data-pos="${p}" class="choice ${hero.position === p ? 'selected' : ''}">${iconHtml(POSITION_ICONS[p], 32)}<span>${RANGE_LABELS[p]}</span></button>`).join('')}
      </div>
      ${warning}
    </section>`;
}
