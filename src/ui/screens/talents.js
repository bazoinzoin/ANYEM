// Maître des compétences : arbres de talents de chaque héros.

import { returnForbiddenGear, refillGear } from '../../game/equipment.js';
import { itemName } from '../items.js';
import { skillGearText } from '../gearGuide.js';
import { state } from '../../state.js';
import { getClass, getStats, xpToNext, heroClassTitle } from '../../game/party.js';
import {
  branchesOf, rankOf, pointsAvailable, pointsTotal, pointsInBranch, tierRequirement,
  cannotLearnReason, learn, resetTalents, resetCost, pointsSpent, tiersOf, tierOpen, excludedInTier,
} from '../../game/talents.js';
import { esc } from '../html.js';
import { skillEffectLabel, skillCostLabel } from '../format.js';
import { nodeSkills, CHOICE_PICKS } from '../../data/talents.js';
import { goTo, goBack, backLabel } from '../router.js';
import { XP } from '../../config.js';
import { iconHtml, branchIcon, talentNodeIcon, skillIconIndex, CLASS_ICONS } from '../icons.js';

// État propre à l'écran : héros affiché, nœud choisi, réinitialisation en attente, message.
const view = { heroIndex: 0, node: null, confirmReset: false, flash: null };

const KIND_LABELS = { minor: 'Bonus au choix', skill: 'Compétence', passive: 'Passif', signature: 'Signature' };

export function openTalents(heroIndex = view.heroIndex) {
  Object.assign(view, { heroIndex, node: null, confirmReset: false, flash: null });
  goTo('talents');
}

// Plein écran sans défilement : une colonne par orientation ; chaque rangée = un gros palier
// et, à sa droite, le petit palier qui le suit (2 bonus sur 3) ; fenêtre de détail (effet,
// rangs, bouton Apprendre).
export function renderTalents(app) {
  const hero = state.party[view.heroIndex];
  const cls = getClass(hero);
  const flash = view.flash;
  view.flash = null;
  const available = pointsAvailable(hero);
  const cost = resetCost(hero);
  const branches = branchesOf(hero);
  const nodeById = new Map(branches.flatMap((b) => b.nodes.map((n) => [n.id, { node: n, branch: b }])));
  const chosen = nodeById.get(view.node) ?? null;

  app.innerHTML = `
    <div class="tal-screen" style="--branches:${branches.length}">
      <header class="inv-top">
        <div class="inv-tabs">${state.party.map((h, i) => `
          <button class="inv-hero ${i === view.heroIndex ? 'current' : ''}" data-hero="${i}">
            ${iconHtml(CLASS_ICONS[h.classKey], 32)}<span><b>${esc(h.name)}${pointsAvailable(h) ? ` <span class="badge">${pointsAvailable(h)}</span>` : ''}</b><small>${esc(heroClassTitle(h))} · niv. ${h.level}</small></span>
          </button>`).join('')}
        </div>
        <span class="tal-points ${available ? 'has' : ''}">${iconHtml(682, 32)} ${available} / ${pointsTotal(hero)} points</span>
        <button id="reset" class="${view.confirmReset ? 'btn-primary' : ''}" ${pointsSpent(hero) && state.gold >= cost ? '' : 'disabled'}
          title="Rend tous les points de talent de ${esc(hero.name)} contre ${cost} pièces d'or.">
          ${view.confirmReset ? `Confirmer (${cost} or)` : `Réinitialiser · ${cost} or`}
        </button>
        <button id="backHub">${esc(backLabel())}</button>
      </header>
      ${branches.map((b) => branchColumn(hero, b)).join('')}
      <section class="win tal-detail" id="talDetail">
        ${flash ? `<p class="tal-flash">${esc(flash)}</p>` : ''}
        ${chosen ? nodeDetail(hero, chosen.branch, chosen.node) : introDetail(hero, cls)}
      </section>
    </div>`;

  app.querySelectorAll('[data-hero]').forEach((btn) => { btn.onclick = () => openTalents(Number(btn.dataset.hero)); });
  app.querySelectorAll('[data-node]').forEach((el) => {
    const { node, branch } = nodeById.get(el.dataset.node);
    el.onmouseenter = () => { app.querySelector('#talDetail').innerHTML = nodeDetail(hero, branch, node); wireLearn(app, hero); };
    el.onmouseleave = () => { app.querySelector('#talDetail').innerHTML = chosen ? nodeDetail(hero, chosen.branch, chosen.node) : introDetail(hero, cls); wireLearn(app, hero); };
    el.onclick = () => { view.node = node.id; goTo('talents'); };
    el.ondblclick = () => doLearn(hero, node);
  });
  wireLearn(app, hero);
  app.querySelector('#reset').onclick = () => {
    if (!view.confirmReset) view.confirmReset = true;
    else {
      if (resetTalents(state, hero)) view.flash = `Les talents de ${hero.name} ont été réinitialisés.${gearNote(hero)}`;
      view.confirmReset = false;
    }
    goTo('talents');
  };
  app.querySelector('#backHub').onclick = () => goBack();
}

// L'orientation principale a pu changer (armure permise) : ce qui n'est plus portable va au sac.
function gearNote(hero) {
  const removed = returnForbiddenGear(hero, state.bag);
  if (!removed.length) return '';
  const added = refillGear(hero, state.bag);
  return ` Nouvelle orientation principale : ${removed.map((it) => itemName(it)).join(', ')} retourne${removed.length > 1 ? 'nt' : ''} au sac${added.length ? ` ; équipé à la place : ${added.map((it) => itemName(it)).join(', ')}` : ''}.`;
}

function doLearn(hero, node) {
  if (learn(hero, node.id)) view.flash = `${hero.name} apprend ${node.name} (rang ${rankOf(hero, node.id)}/${node.ranks}).${gearNote(hero)}`;
  view.node = node.id;
  view.confirmReset = false;
  goTo('talents');
}

function wireLearn(app, hero) {
  app.querySelectorAll('[data-learn]').forEach((btn) => {
    btn.onclick = () => doLearn(hero, branchesOf(hero).flatMap((b) => b.nodes).find((n) => n.id === btn.dataset.learn));
  });
}

// Colonne d'une orientation : en-tête, puis les rangées de haut en bas. Rangée : un gros
// palier (nœud obligatoire) suivi du petit palier (trois bonus, deux au choix).
function branchColumn(hero, branch) {
  const invested = pointsInBranch(hero, branch);
  const tiers = tiersOf(branch);
  const max = tierRequirement(branch, tiers.at(-1) + 1);
  const isBig = (tier) => branch.nodes.filter((n) => n.tier === tier).length === 1;
  const rows = [];
  for (const tier of tiers) {
    if (isBig(tier) || !rows.length) rows.push([tier]);
    else rows.at(-1).push(tier);
  }
  const group = (tier) => {
    const nodes = branch.nodes.filter((n) => n.tier === tier);
    const big = nodes.length === 1;
    const locked = !tierOpen(hero, branch, tier);
    return `<div class="tal-tier ${big ? 'big' : 'pick'} ${locked ? 'locked' : ''}" title="${big ? `Gros palier ${tier} (obligatoire)` : `Petit palier ${tier} : ${CHOICE_PICKS} bonus au choix parmi les trois`}">
      ${big ? '' : `<span class="tal-req">${CHOICE_PICKS}/3</span>`}${nodes.map((n) => nodeIcon(hero, branch, n)).join('')}</div>`;
  };
  return `
    <section class="win tal-branch">
      <h3>${iconHtml(branchIcon(branch), 32)} ${esc(branch.name)} <small>${invested} / ${max} pts</small></h3>
      <span class="meter xp tal-progress"><span class="fill" style="width:${Math.min(100, (invested / Math.max(1, max)) * 100)}%"></span></span>
      <div class="tal-tiers">
        ${rows.map((row) => `<div class="tal-row">${row.map(group).join('')}</div>`).join('')}
      </div>
    </section>`;
}

function nodeIcon(hero, branch, node) {
  const rank = rankOf(hero, node.id);
  const locked = !tierOpen(hero, branch, node.tier);
  const can = !cannotLearnReason(hero, node.id);
  const status = rank >= node.ranks ? 'maxed' : rank > 0 ? 'learned' : excludedInTier(hero, branch, node) ? 'excluded' : locked ? 'locked' : can ? 'open' : 'closed';
  return `<button class="tal-node ${node.kind} ${status} ${view.node === node.id ? 'selected' : ''}" data-node="${node.id}" title="${esc(node.name)}">
    ${iconHtml(talentNodeIcon(node, nodeSkills(node)), 32)}<sup>${rank}/${node.ranks}</sup></button>`;
}

function introDetail(hero, cls) {
  return `<h3>${iconHtml(CLASS_ICONS[hero.classKey], 32)} ${esc(hero.name)} <small>${esc(heroClassTitle(hero))} · niveau ${hero.level}</small></h3>
    <div class="xp"><small>XP ${hero.xp} / ${xpToNext(hero.level)}</small><span class="meter xp"><span class="fill" style="width:${Math.min(100, (hero.xp / xpToNext(hero.level)) * 100)}%"></span></span></div>
    <p class="hint">Chaque niveau rapporte 1 point (${XP.maxLevel} au niveau ${XP.maxLevel}). Une orientation alterne <b>gros paliers</b> ◆ (sort de départ, nouvelle compétence ou passif important : obligatoires) et <b>petits paliers</b> ${CHOICE_PICKS}/3 (trois bonus de stats : on en prend ${CHOICE_PICKS}, à tous leurs rangs). Un palier s'ouvre quand les précédents sont complets ; une orientation entière coûte ${tierRequirement(branchesOf(hero)[0], 99)} points, jusqu'à la compétence signature.</p>
    <p class="hint">Survolez un talent pour voir son effet ; cliquez pour le choisir, double-cliquez pour l'apprendre.</p>`;
}

function nodeDetail(hero, branch, node) {
  const rank = rankOf(hero, node.id);
  const reason = cannotLearnReason(hero, node.id);
  const skills = nodeSkills(node);
  const body = skills.length
    ? skills.map((sk) => `<p><b>${iconHtml(skillIconIndex(sk), 16)} ${esc(sk.name)}</b> — ${esc(skillCostLabel(getClass(hero), sk, hero))}<br>${esc(sk.desc)}.<br><small>${esc(skillEffectLabel(getStats(hero), sk))}</small><br><small class="hint">${esc(skillGearText(sk))}.</small></p>`).join('')
    : `<p>${esc(node.desc)}</p>`;
  const action = rank >= node.ranks ? '<p class="tal-maxed">Maîtrisé.</p>'
    : reason ? `<p class="warning">${esc(reason)}</p>`
    : `<button class="gold" data-learn="${node.id}">Apprendre${node.ranks > 1 ? ` — rang ${rank + 1}/${node.ranks}` : ''}</button>`;
  return `<h3>${iconHtml(talentNodeIcon(node, skills), 32)} ${esc(node.name)} <small>${KIND_LABELS[node.kind]} · ${esc(branch.name)} · palier ${node.tier} · rang ${rank}/${node.ranks}</small></h3>
    ${node.kind === 'minor' ? `<p class="hint">Petit palier : ${CHOICE_PICKS} des trois bonus se prennent (réinitialiser pour changer).</p>` : ''}
    ${node.tier === 0 && skills.length ? '<p class="hint">Sort de départ.</p>' : ''}${body}${action}`;
}

