// Écran de combat. Le ciblage est toujours demandé explicitement, même s'il ne
// reste qu'une seule cible possible ; une compétence de zone, de groupe ou
// personnelle demande une confirmation qui montre qui sera touché.
// Un héros à Énergie (Voleur) enchaîne plusieurs actions puis finit son tour ;
// tout héros peut passer son tour.

import { state } from '../../state.js';
import { COMBAT } from '../../config.js';
import { STATS } from '../../data/stats.js';
import { getClass, getSkills } from '../../game/party.js';
import { CONSUMABLES, CONSUMABLE_ORDER } from '../../data/consumables.js';
import { countOf, usableIn } from '../../game/consumables.js';
import { estimateHit, BASIC_ATTACK } from '../../game/formulas.js';
import { targetsFor, canUseSkill, canUseItem, canDoAction } from '../../game/combat.js';
import { isMultiAction, actionCost, comboOf, comboMax, atCombo } from '../../game/combo.js';
import { statsOf } from '../../game/units.js';
import { statusesOf } from '../../game/statuses.js';
import { esc, tip, bar, range } from '../html.js';
import { skillEffectLabel, skillShortEstimate, consumableEstimate } from '../format.js';
import { playerAction } from '../encounter.js';

export function renderCombat(app) {
  const cb = state.combat;
  const acting = cb.acting;
  const activeHero = acting?.side === 'hero' ? acting.unit : null;

  app.innerHTML = `
    <div class="hero"><h1>⚔️ Combat</h1><p>${esc(cb.title)} · niveau ${cb.level}</p></div>
    <div class="combatants">
      <div>
        <h3 class="side-title">VOTRE ÉQUIPE</h3>
        ${cb.party.map((h) => heroUnit(h, h === acting?.unit)).join('')}
      </div>
      <div>
        <h3 class="side-title">ENNEMIS</h3>
        ${cb.enemies.map((e) => enemyUnit(e, e === acting?.unit)).join('')}
      </div>
    </div>
    <div class="log">${cb.log.map((l) => `<div class="${l.hit ? 'hit' : ''}">${esc(l.text)}</div>`).join('')}</div>
    ${activeHero ? actionPanel(activeHero) : waitingPanel(acting)}
  `;

  if (activeHero) wireActions(app, activeHero);
}

function heroUnit(hero, active) {
  const cls = getClass(hero);
  const stats = statsOf(hero);
  const res = cls.resource.name;
  return `
    <div class="unit ${hero.alive ? '' : 'dead'} ${active ? 'active-turn' : ''}" style="--c:${cls.color}">
      <div class="row1"><b>${cls.icon} ${esc(hero.name)}</b><small>${hero.hp}/${stats.pv} PV</small></div>
      ${bar(hero.hp, stats.pv, cls.color)}
      <small ${tip(resourceTip(hero))}>${res}: ${hero.res}/${stats.resMax}</small>
      ${bar(hero.res, stats.resMax, 'var(--gold)')}
      ${comboDots(hero)}
      ${statusTags(hero)}
    </div>`;
}

function resourceTip(hero) {
  const cls = getClass(hero);
  const r = cls.resource;
  if (!r.multiAction) return `${r.name} : ressource dépensée pour lancer les compétences de ${cls.name}.`;
  const regen = r.regen + (statsOf(hero).resRegen ?? 0);
  return `${r.name} : chaque action coûte de l'${r.name} (Attaquer ${r.actionCosts.attack}, Défendre ${r.actionCosts.defend}, Objet ${r.actionCosts.item}, compétences : leur coût). `
    + `Le ${cls.name} agit plusieurs fois par tour tant qu'il peut payer, puis finit son tour. +${regen} au début de chacun de ses tours ; pleine au début de chaque combat.`;
}

// Points de combo : ●●●○○
function comboDots(hero) {
  const max = comboMax(hero);
  if (!max || !hero.alive) return '';
  const n = comboOf(hero);
  const dots = '●'.repeat(n) + '○'.repeat(max - n);
  return `<small class="combo" ${tip(`Points de combo : ${n}/${max}. Gagnés par les compétences marquées « +1 combo », dépensés tous à la fois par les finishers (plus il y en a, plus le finisher est fort). Remis à zéro au début de chaque combat.`)}>Combo <b>${dots}</b></small>`;
}

function enemyUnit(enemy, active) {
  return `
    <div class="unit ${enemy.alive ? '' : 'dead'} ${active ? 'active-turn' : ''} ${enemy.boss ? 'boss' : ''}" style="--c:var(--danger)">
      <div class="row1"><b>${enemy.icon} ${esc(enemy.name)}${enemy.boss ? ' <span class="boss-tag">BOSS</span>' : ''}</b><small>${enemy.hp}/${enemy.stats.pv} PV</small></div>
      ${bar(enemy.hp, enemy.stats.pv, 'var(--danger)')}
      ${statusTags(enemy)}
    </div>`;
}

function statusTags(unit) {
  if (!unit.alive) return '';
  const tags = [];
  if (unit.guard) tags.push('<span class="tag buff">🛡️ En garde</span>');
  for (const s of statusesOf(unit)) {
    const value = s.shield ? ` ${s.shield}` : s.dot ? ` -${s.dot}/tour` : s.hot ? ` +${s.hot}/tour` : '';
    const turns = s.stun ? '' : ` (${s.turns})`;
    tags.push(`<span class="tag ${s.kind}">${s.icon ?? ''} ${esc(s.name)}${value}${turns}</span>`);
  }
  return tags.length ? `<div class="status">${tags.join('')}</div>` : '';
}

function waitingPanel(acting) {
  const text = acting?.side === 'enemy' ? `${esc(acting.unit.name)} agit...` : 'Préparation du tour...';
  return `<div class="card waiting">${text}</div>`;
}

function actionPanel(hero) {
  const cb = state.combat;
  const cls = getClass(hero);
  const stats = statsOf(hero);
  const atkEst = range(estimateHit(stats, BASIC_ATTACK));
  const critTip = `Critique : ${Math.min(stats.critChance, COMBAT.caps.critChance)} % de chance, +${stats.critDmg} % de dégâts.`;
  const multi = isMultiAction(hero);
  const res = cls.resource.name;
  const cost = (type) => (actionCost(hero, type) ? ` (${actionCost(hero, type)} ${res})` : '');
  const takesTurn = multi ? '' : ' Prend le tour du héros.';
  return `
    <div class="card">
      <p>Au tour de <b class="hero-name" style="--c:${cls.color}">${esc(hero.name)}</b> (${cls.name})${multi ? ` · <b>${hero.res} ${res}</b> : plusieurs actions possibles` : ''}</p>
      <div class="actions">
        <button id="actAttack" ${tip(`Attaque simple avec l'arme équipée : dégâts physiques (Attaque des armes + ${STATS[cls.physStat].label}). Dégâts estimés : ${atkEst} (avant défense de la cible). ${critTip}`)} ${canDoAction(cb, hero, 'attack') ? '' : 'disabled'}>Attaquer${cost('attack')} · ~${atkEst}</button>
        <button id="actDefend" ${tip("Réduit de moitié les dégâts subis jusqu'au prochain tour du héros." + takesTurn)} ${canDoAction(cb, hero, 'defend') ? '' : 'disabled'}>${hero.guard ? 'En garde' : 'Défendre'}${cost('defend')}</button>
        <button id="actItem" ${tip(`Utilise un consommable (potion, remède, corde…).${takesTurn}`)} ${CONSUMABLE_ORDER.some((k) => canUseItem(cb, k)) ? '' : 'disabled'}>Objet${cost('item')} · ${CONSUMABLE_ORDER.reduce((n, k) => n + countOf(cb.consumables, k), 0)}</button>
        <button id="actEnd" class="end-turn" ${tip(multi ? `Termine le tour de ${hero.name} : l'${res} restante est conservée.` : `${hero.name} ne fait rien ce tour-ci.`)}>${multi ? '⏭️ Finir le tour' : '⏭️ Passer le tour'}</button>
        <span class="hint">Compétences ↓</span>
      </div>
      <div class="skillbox">
        ${getSkills(hero).map((base, i) => {
          const s = atCombo(base, Math.max(1, comboOf(hero)));
          return `
          <button data-skill="${i}" ${tip(`${s.desc}. ${skillEffectLabel(stats, s)}.${s.boosted ? ' ★ Renforcée (objet légendaire ou talent).' : ''}${s.finisher && !comboOf(hero) ? ' Demande au moins 1 point de combo.' : ''}`)} ${canUseSkill(cb, hero, base) ? '' : 'disabled'}>
            ${s.name} (${s.cost} ${res}) · ${skillShortEstimate(stats, s)}${s.comboGain ? ` · +${s.comboGain} combo` : ''}${s.finisher ? ` · ${comboOf(hero)} combo` : ''}
          </button>`;
        }).join('')}
      </div>
      <div id="targetZone" class="target-zone"></div>
    </div>`;
}

function wireActions(app, hero) {
  const cb = state.combat;
  const zone = app.querySelector('#targetZone');

  const stats = statsOf(hero);

  // Estimation affichée sur chaque cible (défense de la cible comprise).
  const targetEstimate = (action, unit) => {
    if (action.type === 'attack') return `~${range(estimateHit(stats, BASIC_ATTACK, statsOf(unit)))}`;
    if (action.type === 'item') return consumableEstimate(action.item, unit);
    const skill = atCombo(getSkills(hero)[action.skill], comboOf(hero));
    return skillShortEstimate(stats, skill, unit.alive ? statsOf(unit) : null);
  };

  // Affiche les cibles valides ; l'action n'est lancée qu'au clic sur une cible.
  // Sans cible unique (zone, groupe, soi-même) : bouton de confirmation.
  const chooseTarget = (action) => {
    const targets = targetsFor(cb, action);
    if (!targets) {
      const label = action.type === 'item'
        ? `${CONSUMABLES[action.item].name} — ${CONSUMABLES[action.item].desc}`
        : `${getSkills(hero)[action.skill].name} — ${skillEffectLabel(stats, atCombo(getSkills(hero)[action.skill], comboOf(hero)))}`;
      zone.innerHTML = `<button data-confirm>Confirmer : ${esc(label)}</button>`;
      zone.querySelector('[data-confirm]').onclick = () => playerAction(action);
      return;
    }
    const list = targets.side === 'enemy' ? cb.enemies : cb.party;
    const verb = targets.units.some((u) => !u.alive) ? 'Relever' : 'Cibler';
    zone.innerHTML = targets.units
      .map((u) => `<button data-target="${list.indexOf(u)}">${verb} ${esc(u.name)} · ${targetEstimate(action, u)}</button>`)
      .join('');
    zone.querySelectorAll('[data-target]').forEach((btn) => {
      btn.onclick = () => playerAction({ ...action, target: Number(btn.dataset.target) });
    });
  };

  app.querySelector('#actAttack').onclick = () => chooseTarget({ type: 'attack' });
  app.querySelector('#actDefend').onclick = () => playerAction({ type: 'defend' });
  app.querySelector('#actEnd').onclick = () => playerAction({ type: 'endTurn' });
  app.querySelector('#actItem').onclick = () => {
    zone.innerHTML = CONSUMABLE_ORDER.filter((k) => countOf(cb.consumables, k) > 0 && usableIn(k, 'combat')).map((k) => {
      const c = CONSUMABLES[k];
      return `<button data-item="${k}" ${tip(c.desc)} ${canUseItem(cb, k) ? '' : 'disabled'}>${c.icon} ${c.name} (${countOf(cb.consumables, k)})</button>`;
    }).join('');
    zone.querySelectorAll('[data-item]').forEach((btn) => {
      btn.onclick = () => chooseTarget({ type: 'item', item: btn.dataset.item });
    });
  };
  app.querySelectorAll('[data-skill]').forEach((btn) => {
    btn.onclick = () => chooseTarget({ type: 'skill', skill: Number(btn.dataset.skill) });
  });
}

