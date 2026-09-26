// Maître des compétences : arbres de talents de chaque héros.

import { state } from '../../state.js';
import { getClass, getStats, xpToNext } from '../../game/party.js';
import {
  branchesOf, rankOf, pointsAvailable, pointsTotal, pointsInBranch, tierRequirement,
  cannotLearnReason, learn, resetTalents, resetCost, pointsSpent,
} from '../../game/talents.js';
import { esc, tip, bar } from '../html.js';
import { skillEffectLabel } from '../format.js';
import { goTo, goBack, backLabel } from '../router.js';
import { TALENT_RULES, XP } from '../../config.js';

// État propre à l'écran : héros affiché, réinitialisation en attente de confirmation, message.
const view = { heroIndex: 0, confirmReset: false, flash: null };

const KIND_LABELS = { minor: 'Bonus', skill: 'Compétence', passive: 'Passif', signature: 'Signature' };

export function openTalents(heroIndex = view.heroIndex) {
  Object.assign(view, { heroIndex, confirmReset: false, flash: null });
  goTo('talents');
}

export function renderTalents(app) {
  const hero = state.party[view.heroIndex];
  const cls = getClass(hero);
  const flash = view.flash;
  view.flash = null;
  const available = pointsAvailable(hero);
  const cost = resetCost(hero);

  app.innerHTML = `
    <div class="hero"><h1>📖 Maître des compétences</h1><p>Or : ${state.gold}</p></div>
    ${flash ? `<div class="card notice">${esc(flash)}</div>` : ''}
    <div class="hero-tabs">
      ${state.party.map((h, i) => `
        <button data-hero="${i}" class="${i === view.heroIndex ? 'selected' : ''}" style="--c:${getClass(h).color}">
          ${getClass(h).icon} ${esc(h.name)}${pointsAvailable(h) ? ` <span class="badge">${pointsAvailable(h)}</span>` : ''}
        </button>`).join('')}
    </div>
    <div class="card talent-summary" style="--c:${cls.color}">
      <div>
        <b>${cls.icon} ${esc(hero.name)}</b> — ${cls.name} niveau ${hero.level}
        <div class="xp"><small>XP ${hero.xp}/${xpToNext(hero.level)}</small>${bar(hero.xp, xpToNext(hero.level), 'var(--gold)')}</div>
      </div>
      <div class="points ${available ? 'has' : ''}">Points disponibles : <b>${available}</b> / ${pointsTotal(hero)}</div>
      <button id="reset" class="${view.confirmReset ? 'danger' : ''}" ${pointsSpent(hero) && state.gold >= cost ? '' : 'disabled'}
        ${tip(`Rend tous les points de talent de ${hero.name} contre ${cost} pièces d'or.`)}>
        ${view.confirmReset ? `Confirmer : réinitialiser (${cost} or)` : `Réinitialiser (${cost} or)`}
      </button>
    </div>
    <p class="hint">Chaque niveau rapporte 1 point, soit ${XP.maxLevel} points au niveau maximum (${XP.maxLevel}) : de quoi compléter une seule orientation. Un palier se débloque en investissant des points dans la même orientation : ${TALENT_RULES.tierPoints} points par palier, jusqu'à la compétence signature du palier 9 (${tierRequirement(9)} points).</p>
    <div class="talent-branches">${branchesOf(hero).map((b) => branchCard(hero, b)).join('')}</div>
    <div class="center"><button id="backHub">${backLabel()}</button></div>
  `;

  app.querySelectorAll('[data-hero]').forEach((btn) => {
    btn.onclick = () => openTalents(Number(btn.dataset.hero));
  });
  app.querySelectorAll('[data-learn]').forEach((btn) => {
    btn.onclick = () => {
      if (learn(hero, btn.dataset.learn)) view.flash = `${hero.name} apprend ${btn.dataset.name}.`;
      view.confirmReset = false;
      goTo('talents');
    };
  });
  app.querySelector('#reset').onclick = () => {
    if (!view.confirmReset) view.confirmReset = true;
    else {
      if (resetTalents(state, hero)) view.flash = `Les talents de ${hero.name} ont été réinitialisés.`;
      view.confirmReset = false;
    }
    goTo('talents');
  };
  app.querySelector('#backHub').onclick = () => goBack();
}

function branchCard(hero, branch) {
  const invested = pointsInBranch(hero, branch);
  return `
    <div class="card branch">
      <h3>${branch.icon} ${branch.name} <small>${invested} pt${invested > 1 ? 's' : ''}</small></h3>
      <p class="hint">${branch.desc}</p>
      ${[...new Set(branch.nodes.map((n) => n.tier))].map((tier) => {
        const locked = invested < tierRequirement(tier);
        return `
        <div class="tier-group ${locked ? 'locked' : ''}">
          <div class="tier-title">Palier ${tier}${tier ? ` · ${tierRequirement(tier)} points requis` : ''}</div>
          ${branch.nodes.filter((n) => n.tier === tier).map((n) => nodeCard(hero, branch, n)).join('')}
        </div>`;
      }).join('')}
    </div>`;
}

function nodeCard(hero, branch, node) {
  const rank = rankOf(hero, node.id);
  const reason = cannotLearnReason(hero, node.id);
  const locked = pointsInBranch(hero, branch) < tierRequirement(node.tier);
  const status = rank >= node.ranks ? 'maxed' : rank > 0 ? 'learned' : locked ? 'locked' : 'open';
  let body = esc(node.desc);
  if (node.skill) {
    const s = node.skill;
    body = `<b>${esc(s.name)}</b> — ${s.cost} ${getClass(hero).resource.name}<br>${esc(s.desc)}.<br><small>${esc(skillEffectLabel(getStats(hero), s))}</small>`;
  }
  const action = reason
    ? (rank >= node.ranks ? '' : `<small class="reason">${esc(reason)}</small>`)
    : `<button data-learn="${node.id}" data-name="${esc(node.name)}">Apprendre${node.ranks > 1 ? ` (rang ${rank + 1})` : ''}</button>`;
  return `
    <div class="talent ${node.kind} ${status}">
      <div class="talent-head">
        <b>${esc(node.name)}</b>
        <span class="kind">${KIND_LABELS[node.kind]}</span>
        <span class="rank">${rank}/${node.ranks}</span>
      </div>
      <div class="talent-body">${body}</div>
      ${action}
    </div>`;
}
