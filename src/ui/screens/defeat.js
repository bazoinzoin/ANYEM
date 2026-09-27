// Écran de mort : après une défaite en expédition, bilan de ce qui a été perdu (or, objets
// du sac, équipement porté à partir de Guerre) avant de revenir au village.
// state.defeat = { where, message, lost: { gold, bag, worn: [{ hero, slot, item }] } }.

import { state } from '../../state.js';
import { DIFFICULTIES } from '../../config.js';
import { difficultyOf } from '../../game/difficulty.js';
import { esc, tip } from '../html.js';
import { itemTooltipText } from '../items.js';
import { iconHtml, itemIcon, GOLD_ICON } from '../icons.js';
import { RARITIES } from '../../data/items.js';
import { heroPortrait, drawPortraits } from '../portraits.js';
import { showHub } from '../router.js';

const MAX_ICONS = 36;

// Case d'objet avec sa fiche au survol.
const cell = (item) => `<span ${tip(itemTooltipText(item), 'bag-cell')} style="--rc:${RARITIES[item.rarity].color}">${iconHtml(itemIcon(item), 32)}</span>`;

export function renderDefeat(app) {
  const d = state.defeat;
  if (!d) return showHub();
  const { gold, bag, worn } = d.lost;
  const byHero = state.party.map((hero) => ({ hero, items: worn.filter((w) => w.hero === hero.name) }));
  const wornRule = DIFFICULTIES[difficultyOf(state)].loot.defeatWornLossChance
    ? ''
    : '<p class="hint">Dans cette difficulté, l\'équipement porté ne se perd pas (à partir de Guerre, si).</p>';
  app.innerHTML = `
    <div class="defeat-screen">
      <h1>Défaite</h1>
      <p class="defeat-where">${esc(d.where)}</p>
      <div class="defeat-party">${state.party.map((h) => heroPortrait(h, 3, 'fallen')).join('')}</div>
      <section class="win defeat-lost">
        <h3>Ce qui a été perdu</h3>
        <p class="defeat-gold">${iconHtml(GOLD_ICON, 32)} <b>${gold.toLocaleString('fr-FR')}</b> pièces d'or</p>
        <h4>Sac (${bag.length} objet${bag.length > 1 ? 's' : ''})</h4>
        <div class="defeat-items">${bag.slice(0, MAX_ICONS).map(cell).join('')}${bag.length > MAX_ICONS ? `<span class="hint">+ ${bag.length - MAX_ICONS} autres</span>` : ''}${bag.length ? '' : '<span class="hint">Rien.</span>'}</div>
        <h4>Équipement porté (${worn.length} pièce${worn.length > 1 ? 's' : ''})</h4>
        ${wornRule}
        <div class="defeat-worn">
          ${byHero.map(({ hero, items }) => `
            <div class="defeat-hero"><b>${esc(hero.name)}</b>
              <div class="defeat-items">${items.map((w) => cell(w.item)).join('') || '<span class="hint">rien de perdu</span>'}</div>
            </div>`).join('')}
        </div>
        <p class="hint">La banque, les matéria et les consommables sont intacts. La progression reste au dernier boss vaincu ; les héros reviennent avec la moitié de leurs PV.</p>
      </section>
      <button id="defeatBack" class="defeat-back">Revenir au village</button>
    </div>`;
  drawPortraits(app);
  app.querySelector('#defeatBack').onclick = () => {
    const message = d.message;
    state.defeat = null;
    showHub(message);
  };
}
