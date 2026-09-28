// Feuilles de personnage, plein écran sans défilement : un onglet par héros ; stats à
// gauche, compétences (icône, coût, effet estimé) au centre, équipement porté à droite.

import { state } from '../../state.js';
import { STATS } from '../../data/stats.js';
import { RARITIES } from '../../data/items.js';
import { getClass, getStats, getSkills, xpToNext, heroClassTitle, usesHp } from '../../game/party.js';
import { equippedItems } from '../../game/equipment.js';
import { pointsAvailable } from '../../game/talents.js';
import { esc } from '../html.js';
import { skillEffectLabel, skillCostLabel } from '../format.js';
import { itemName } from '../items.js';
import { statsList } from '../heroStats.js';
import { goTo } from '../router.js';
import { iconHtml, itemIcon, skillIconIndex } from '../icons.js';
import { frame, wireFrame, heroTabs, wireHeroTabs, itemDetail } from '../screenFrame.js';
import { openEquipment } from './equipment.js';
import { openTalents } from './talents.js';

const view = { heroIndex: 0 };

export function openStats(heroIndex = view.heroIndex) {
  view.heroIndex = heroIndex;
  goTo('stats');
}

export function renderStats(app) {
  view.heroIndex = Math.min(view.heroIndex, state.party.length - 1);
  const index = view.heroIndex;
  const hero = state.party[index];
  const cls = getClass(hero);
  const stats = getStats(hero);
  const items = equippedItems(hero);
  const points = pointsAvailable(hero);

  app.innerHTML = frame({
    title: 'Personnages', icon: 610, layout: 'lay-stats', gold: false,
    extras: heroTabs(index),
    body: `
      <section class="win" style="--c:${cls.color}">
        <h3>${esc(hero.name)} <small>${esc(heroClassTitle(hero))} · niveau ${hero.level} · stat principale : ${STATS[cls.mainStat].label} ★</small></h3>
        <div class="xp"><small>XP ${hero.xp} / ${xpToNext(hero.level)}</small><span class="meter xp"><span class="fill" style="width:${Math.min(100, (hero.xp / xpToNext(hero.level)) * 100)}%"></span></span></div>
        <div class="stats sheet stats-cols">${statsList(hero)}</div>
      </section>
      <section class="win">
        <h3>${iconHtml(96, 16)} Compétences <small>${usesHp(cls) ? 'payées en PV' : cls.resource.name}</small></h3>
        <div class="skill-list">${getSkills(hero).map((s) => `
          <div class="skill-item">${iconHtml(skillIconIndex(s), 32)}
            <div><b>${esc(s.name)}</b>${s.boosted ? ' <span class="boosted">★ renforcée</span>' : ''} <small class="cost">${esc(skillCostLabel(cls, s, hero))}</small><br><small>${skillEffectLabel(stats, s)}</small></div>
          </div>`).join('') || '<p class="hint">Aucune compétence : apprenez-en dans les talents.</p>'}</div>
      </section>
      <section class="win">
        <h3>${iconHtml(1920, 16)} Équipement</h3>
        <div class="cells">${items.map((item) => `<div class="bag-cell" data-worn="${item.id}" style="--rc:${RARITIES[item.rarity].color}" title="${esc(itemName(item))}">${iconHtml(itemIcon(item), 32)}${item.plus ? `<sup>+${item.plus}</sup>` : ''}</div>`).join('') || '<span class="hint">Aucun équipement</span>'}</div>
        <div id="statsItem" class="stats-item"></div>
        <div class="actions stack">
          <button id="toEquip">${iconHtml(1920, 16)} Gérer l'équipement</button>
          <button id="toTalents">${iconHtml(96, 16)} Talents${points ? ` <span class="badge">${points}</span>` : ''}</button>
        </div>
      </section>`,
  });
  wireFrame(app);
  wireHeroTabs(app, (i) => openStats(i));
  const box = app.querySelector('#statsItem');
  app.querySelectorAll('[data-worn]').forEach((cell) => {
    const item = items.find((i) => i.id === cell.dataset.worn);
    cell.onmouseenter = () => { box.innerHTML = itemDetail(item); };
    cell.onmouseleave = () => { box.innerHTML = ''; };
  });
  app.querySelector('#toEquip').onclick = () => openEquipment(index);
  app.querySelector('#toTalents').onclick = () => openTalents(index);
}
