// Écran de combat, plein écran et sans défilement : en haut le titre et les dernières
// lignes du journal, au centre la scène animée (ui/battleStage.js), en bas trois fenêtres
// façon JRPG : l'équipe (PV, ressource, combo, effets), les commandes du héros actif, et
// une fenêtre d'infos (description et estimation au survol, choix de la cible).
// Le ciblage est toujours demandé explicitement, même s'il ne reste qu'une cible ; une
// compétence de zone, de groupe ou personnelle demande une confirmation.
// Un héros à Énergie enchaîne plusieurs actions puis finit son tour ; tout héros peut
// passer son tour. Raccourcis : 1-6 pour les commandes, Échap pour revenir.

import { state } from '../../state.js';
import { COMBAT, XP } from '../../config.js';
import { STATS } from '../../data/stats.js';
import { getClass, getSkills, heroClassTitle, usesHp, hpCost, usesSouls, soulsOf, xpToNext } from '../../game/party.js';
import { CONSUMABLES, CONSUMABLE_ORDER } from '../../data/consumables.js';
import { countOf, usableIn } from '../../game/consumables.js';
import { estimateHit, BASIC_ATTACK } from '../../game/formulas.js';
import { targetsFor, canUseSkill, canUseItem, canDoAction, canMove, hasFreeMove, effectiveSkill } from '../../game/combat.js';
import { isMultiAction, actionCost, comboOf, comboMax, atCombo } from '../../game/combo.js';
import { usesWeapon, weaponBlockedReason, skillWeaponProblem } from '../../game/position.js';
import { statsOf } from '../../game/units.js';
import { statusesOf } from '../../game/statuses.js';
import { EFFECTS } from '../../data/effects.js';
import { backlashPct } from '../../game/souls.js';
import { esc, range, resourceKind } from '../html.js';
import { skillEffectLabel, skillShortEstimate, consumableEstimate, skillCostLabel } from '../format.js';
import { iconHtml, skillIconIndex, consumableIcon, effectIcon, CLASS_ICONS, COMMAND_ICONS } from '../icons.js';

const skillIcon = (s, size = 32) => iconHtml(skillIconIndex(s), size);
const itemIc = (k, size = 32) => iconHtml(consumableIcon(k), size);
import { statsList } from '../heroStats.js';
import { playerAction } from '../encounter.js';
import { logLines } from '../combatLog.js';
import { attachStage, setStagePick, setStageFocus, fitStage } from '../battleStage.js';

// État de l'interface (pas du combat) : menu ouvert pour le héros actif, action en cours
// de ciblage, fenêtre superposée (journal ou fiche d'un héros).
const ui = { hero: null, mode: 'main', action: null, overlay: null };

export function renderCombat(app) {
  const cb = state.combat;
  const acting = cb.acting;
  const hero = acting?.side === 'hero' && !cb.result ? acting.unit : null;
  if (hero !== ui.hero) Object.assign(ui, { hero, mode: 'main', action: null });

  app.innerHTML = `
    <div class="battle-screen">
      <header class="bs-top">
        <span class="bs-title">${esc(cb.title)} <small>niv. ${cb.level}</small></span>
        <div class="bs-ticker">${logLines(cb.log.slice(-2))}</div>
        <button class="bs-logbtn" data-overlay="log" title="Journal du combat">${iconHtml(104, 32)}</button>
      </header>
      <div class="bs-stage"><canvas id="battleStage"></canvas></div>
      <div class="bs-bottom">
        <section class="win bs-party" aria-label="Équipe">${cb.party.map((h, i) => heroRow(h, i, h === acting?.unit)).join('')}</section>
        <section class="win bs-commands" aria-label="Commandes">${hero ? commands(hero) : waiting(acting)}</section>
        <section class="win bs-info" aria-label="Informations" id="bsInfo">${hero ? info(hero) : ''}</section>
      </div>
      ${overlay()}
    </div>`;

  attachStage(app.querySelector('#battleStage'), cb);
  fitStage();
  wire(app, hero);
}

// ---- Équipe ----

function heroRow(hero, i, active) {
  const cls = getClass(hero);
  const stats = statsOf(hero);
  const max = comboMax(hero);
  const combo = max && hero.alive ? `<span class="bs-combo" title="Points de combo">${'●'.repeat(comboOf(hero))}${'○'.repeat(max - comboOf(hero))}</span>` : '';
  // Âmes du Macabre : une icône parmi ses effets (nombre d'âmes en indice), effet actuel
  // (bonus de son orientation, contrecoup) détaillé au survol ; rouge au maximum.
  const souls = usesSouls(cls) && hero.alive && soulsOf(hero) > 0
    ? `<span class="st souls ${soulsOf(hero) >= stats.soulMax ? 'full' : ''}" data-fx-tip="${esc(soulTip(hero, stats))}">${iconHtml(SOUL_ICON, 20)}<sub>${soulsOf(hero)}</sub></span>` : '';
  return `
    <button class="bs-hero ${active ? 'active' : ''} ${hero.alive ? '' : 'dead'}" data-hero="${i}" style="--c:${cls.color}" title="Voir les statistiques de ${esc(hero.name)}">
      <span class="bs-name">${active ? '▶ ' : ''}${iconHtml(CLASS_ICONS[hero.classKey], 16)} ${esc(hero.name)} <span class="bs-row" title="${hero.row === 'melee' ? 'Corps à corps' : 'Distance'}">${iconHtml(hero.row === 'melee' ? 720 : 1482, 16)}</span></span>
      <span class="bs-bars">
        ${meter(hero.hp, stats.pv, 'hp')}
        ${usesHp(cls) ? '<span class="meter-gap"></span>' : meter(hero.res, stats.resMax, `res ${resourceKind(cls.resource.name)}`, cls.resource.name)}
        ${xpMeter(hero)}
      </span>
      <span class="bs-status">${combo}<span class="bs-effects">${souls}${statusIcons(hero)}</span></span>
    </button>`;
}

// Barre d'expérience, fine et sans texte (détail au survol), sous la ressource.
function xpMeter(hero) {
  const maxed = hero.level >= XP.maxLevel;
  const need = xpToNext(hero.level);
  const pct = maxed ? 100 : Math.max(0, Math.min(100, (hero.xp / need) * 100));
  const text = maxed ? `Niveau ${hero.level} (maximum)` : `Niveau ${hero.level} : ${hero.xp} / ${need} XP`;
  return `<span class="meter xp thin" title="${esc(text)}"><span class="fill" style="width:${pct}%"></span></span>`;
}

function meter(value, max, kind, label = 'PV') {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const low = kind === 'hp' && pct <= 25 ? 'low' : '';
  return `<span class="meter ${kind} ${low}"><span class="fill" style="width:${pct}%"></span><span class="txt">${label} ${value}/${max}</span></span>`;
}

const SOUL_ICON = 862; // crâne (planche d'icônes)

// Fiche des âmes du Macabre : bonus actuels (selon son orientation) et contrecoup à venir.
function soulTip(hero, stats) {
  const n = soulsOf(hero);
  const lines = [`Âmes : ${n} / ${stats.soulMax}`];
  if (!n) {
    lines.push("Aucune âme : ni bonus, ni contrecoup. Il absorbe l'âme de chaque ennemi qui meurt.");
    return lines.join('\n');
  }
  const pct = (v) => String(+(v * n).toFixed(1)).replace('.', ',');
  const bonus = [
    stats.soulPhys ? `+${pct(stats.soulPhys)} % de puissance physique` : '',
    stats.soulMag ? `+${pct(stats.soulMag)} % de puissance magique` : '',
    stats.soulDef ? `+${pct(stats.soulDef)} % de Défense et Défense magique` : '',
    stats.soulCrit ? `+${pct(stats.soulCrit)} % de Coup critique` : '',
    stats.soulBlock ? `+${pct(stats.soulBlock)} % de Blocage` : '',
    stats.soulLifesteal ? `${pct(stats.soulLifesteal)} % de vol de vie` : '',
  ].filter(Boolean);
  lines.push(bonus.length ? `Bonus actuel : ${bonus.join(', ')}.` : 'Aucun bonus (pas encore de talent qui en donne).');
  const back = backlashPct(stats, n, n >= stats.soulMax ? hero.soulHeld ?? 0 : 0);
  const fmt = (v) => String(v).replace('.', ',');
  lines.push(`Contrecoup à la fin de son tour : −${fmt(back.self)} % de ses PV max (≈ ${Math.round(stats.pv * back.self / 100)} PV).`);
  if (back.allies) lines.push(`Au maximum : ses alliés perdent aussi ${fmt(back.allies)} % de leurs PV (sans en mourir), et le contrecoup augmente à chaque tour.`);
  else if (stats.soulBulwark && n >= stats.soulMax) lines.push('Au maximum : ses alliés sont épargnés, il encaisse lui-même le débordement (compris ci-dessus), et le contrecoup augmente à chaque tour.');
  lines.push('Libération des âmes les relâche toutes, sans autre effet.');
  return lines.join('\n');
}

// Fiche détaillée d'un effet (bulle au survol) : nom, description, valeur, durée, lanceur.
function effectTip(unit, s) {
  const lines = [`${s.kind === 'buff' ? 'Effet positif' : 'Effet négatif'} : ${s.name}`];
  if (EFFECTS[s.key]?.desc) lines.push(EFFECTS[s.key].desc);
  if (s.shield) lines.push(`Absorbe encore ${s.shield} dégâts.`);
  if (s.dot) lines.push(`${s.dot} dégâts au début de chaque tour${s.doses?.length > 1 ? ` (${s.doses.length} doses cumulées)` : ''}.`);
  if (s.hot) lines.push(`+${s.hot} PV au début de chaque tour.`);
  if (s.trap) lines.push(`Se déclenche au prochain tour : ${s.trap} dégâts.`);
  lines.push(s.lasting ? "Dure jusqu'à la fin du combat." : s.stun ? 'Perd son prochain tour.' : `Encore ${s.turns} tour${s.turns > 1 ? 's' : ''}.`);
  if (s.source && s.source !== unit && s.source.name) lines.push(`Posé par ${s.source.name}.`);
  if (s.kind === 'debuff' && state.combat?.party.includes(unit)) lines.push('Reste après le combat, jusqu\'à un remède, une purification ou le retour au village.');
  return lines.join('\n');
}

function statusIcons(unit) {
  if (!unit.alive) return '<span class="ko">K.O.</span>';
  const icons = [];
  if (unit.guard) icons.push(`<span class="st buff" data-fx-tip="${esc('En garde\nDégâts subis réduits de moitié jusqu\'à son prochain tour.')}">${iconHtml(COMMAND_ICONS.defend, 20)}</span>`);
  for (const s of statusesOf(unit)) {
    icons.push(`<span class="st ${s.kind}" data-fx-tip="${esc(effectTip(unit, s))}">${iconHtml(effectIcon(s.key), 20)}${s.stun || s.lasting ? '' : `<sub>${s.turns}</sub>`}</span>`);
  }
  return icons.join('');
}

// Bulle des effets (survol, curseur de la manette) : posée au-dessus de l'icône.
function wireEffectTips(app) {
  let bubble = document.getElementById('fxTip');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'fxTip';
    bubble.className = 'fx-tip';
    document.body.append(bubble);
  }
  bubble.hidden = true;
  app.querySelectorAll('[data-fx-tip]').forEach((el) => {
    const show = () => {
      const [title, ...rest] = el.dataset.fxTip.split('\n');
      bubble.innerHTML = `<b class="${el.classList.contains('debuff') ? 'debuff' : 'buff'}">${esc(title)}</b>${rest.map((l) => `<span>${esc(l)}</span>`).join('')}`;
      bubble.hidden = false;
      const r = el.getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      bubble.style.left = `${Math.max(6, Math.min(window.innerWidth - b.width - 6, r.left + r.width / 2 - b.width / 2))}px`;
      bubble.style.top = `${Math.max(6, r.top - b.height - 8)}px`;
    };
    el.addEventListener('mouseenter', show);
    el.addEventListener('focus', show);
    el.addEventListener('mouseleave', () => { bubble.hidden = true; });
    el.addEventListener('blur', () => { bubble.hidden = true; });
  });
}

// ---- Commandes ----

function commands(hero) {
  const cb = state.combat;
  if (ui.mode === 'skills') return subMenu(skillButtons(hero));
  if (ui.mode === 'items') return subMenu(itemButtons(), 'item-grid');
  if (ui.mode === 'target' || ui.mode === 'confirm') return subMenu(`<p class="bs-pick">${ui.mode === 'target' ? 'Choisissez la cible' : 'Confirmez l\'action'} →</p>`);
  const cost = (type) => (actionCost(hero, type) ? `<small>${actionCost(hero, type)}</small>` : '');
  const atkEst = range(estimateHit(statsOf(hero), BASIC_ATTACK));
  const items = CONSUMABLE_ORDER.reduce((n, k) => n + countOf(cb.consumables, k), 0);
  const skills = getSkills(hero);
  const cmd = (key, id, icon, label, enabled, extra = '') =>
    `<button class="cmd" id="${id}" data-key="${key}" ${enabled ? '' : 'disabled'}><span class="ico">${icon}</span>${label}${extra}</button>`;
  return `
    <div class="cmd-grid">
      ${cmd(1, 'actAttack', iconHtml(COMMAND_ICONS.attack), 'Attaquer', canDoAction(cb, hero, 'attack'), `<small class="est">~${atkEst}</small>${cost('attack')}`)}
      ${cmd(2, 'actSkills', iconHtml(COMMAND_ICONS.skills), 'Compétences', skills.length > 0)}
      ${cmd(3, 'actItem', iconHtml(COMMAND_ICONS.items), 'Objets', CONSUMABLE_ORDER.some((k) => canUseItem(cb, k)), `<small>${items}</small>`)}
      ${cmd(4, 'actDefend', iconHtml(COMMAND_ICONS.defend), hero.guard ? 'En garde' : 'Défendre', canDoAction(cb, hero, 'defend'), cost('defend'))}
      ${cmd(5, 'actMove', iconHtml(COMMAND_ICONS.move), hero.row === 'melee' ? 'Reculer' : 'Avancer', canMove(hero))}
      ${cmd(6, 'actEnd', iconHtml(COMMAND_ICONS.end), isMultiAction(hero) ? 'Finir le tour' : 'Passer', true)}
    </div>`;
}

function subMenu(content, cls = '') {
  return `<div class="sub-list ${cls}">${content}</div><button class="cmd back" id="actBack" data-key="Escape">◂ Retour <small>Échap</small></button>`;
}

function skillButtons(hero) {
  const cb = state.combat;
  const stats = statsOf(hero);
  const cls = getClass(hero);
  return getSkills(hero).map((base, i) => {
    const s = base.sacrifice || base.allSouls ? effectiveSkill(hero, base) : atCombo(base, Math.max(1, comboOf(hero)));
    const soulsPart = s.soulCost ? ` +${s.soulCost}◈` : '';
    const cost = usesHp(cls) ? (s.sacrifice ? 'tout' : `${hpCost(hero, s)} PV`) : `${s.cost}${soulsPart}`;
    const problem = skillWeaponProblem(hero, s);
    return `<button class="cmd skill" data-skill="${i}" ${canUseSkill(cb, hero, base) ? '' : 'disabled'} title="${esc(problem ? `${s.name} : ${problem}` : s.name)}">
      <span class="ico">${skillIcon(s)}</span><span class="lbl">${esc(s.name)}</span>
      <small class="est">${esc(skillShortEstimate(stats, s))}</small><small class="cost${usesHp(cls) ? ' hp' : ''}" title="${esc(skillCostLabel(cls, s, hero))}">${cost}</small></button>`;
  }).join('');
}

function itemButtons() {
  const cb = state.combat;
  return CONSUMABLE_ORDER.filter((k) => countOf(cb.consumables, k) > 0 && usableIn(k, 'combat')).map((k) => {
    const c = CONSUMABLES[k];
    // Inutilisable : grisé mais survolable (aria-disabled plutôt que disabled) pour lire son effet.
    const off = canUseItem(cb, k) ? '' : ' off" aria-disabled="true';
    return `<button class="cmd item-cell${off}" data-item="${k}" aria-label="${esc(c.name)}"><span class="ico">${itemIc(k, 24)}</span><small class="qty">×${countOf(cb.consumables, k)}</small></button>`;
  }).join('') || '<p class="hint">Aucun objet utilisable.</p>';
}

function waiting(acting) {
  const result = state.combat.result;
  const text = result === 'victory' ? '🏆 Victoire !'
    : result === 'defeat' ? "💀 L'équipe est vaincue..."
    : acting?.side === 'enemy' ? `${esc(acting.unit.name)} agit...` : 'Préparation du tour...';
  return `<p class="bs-wait">${text}</p>`;
}

// ---- Infos ----

// Fenêtre d'infos par défaut : à qui le tour, et l'aide de la commande survolée.
function info(hero) {
  if (ui.mode === 'target' || ui.mode === 'confirm') return targetInfo(hero);
  const cls = getClass(hero);
  const multi = isMultiAction(hero);
  return `
    <p class="bs-turn">Au tour de <b style="color:${cls.color}">${esc(hero.name)}</b> <small>${esc(heroClassTitle(hero))} · ${hero.row === 'melee' ? 'corps à corps' : 'distance'}</small></p>
    ${multi ? `<p class="hint">${hero.res} ${cls.resource.name} : plusieurs actions possibles ce tour-ci.</p>` : ''}
    <p class="bs-help" id="bsHelp">${ui.mode === 'items' ? 'Survolez un objet pour voir son effet.' : 'Survolez une commande pour voir son effet.'}</p>`;
}

function targetInfo(hero) {
  const cb = state.combat;
  const action = ui.action;
  const targets = targetsFor(cb, action);
  const title = `<p class="bs-turn">${actionTitle(hero, action)}</p>`;
  if (!targets) return `${title}<p class="bs-help">${esc(actionDesc(hero, action))}</p><button class="btn-primary bs-confirm" id="actConfirm">Confirmer <small>Entrée</small></button>`;
  const list = targets.side === 'enemy' ? cb.enemies : cb.party;
  const verb = targets.units.some((u) => !u.alive) ? 'Relever' : '';
  return `${title}
    <div class="bs-targets">${targets.units.map((u) => `
      <button class="target" data-target="${list.indexOf(u)}">${verb ? `${verb} ` : ''}<b>${esc(u.name)}</b>${u.alive ? ` <small>${u.hp} PV</small>` : ''}<span class="est">${esc(targetEstimate(hero, action, u))}</span></button>`).join('')}
    </div>
    <p class="hint">…ou cliquez sur le personnage.</p>`;
}

function actionTitle(hero, action) {
  if (action.type === 'attack') return `${iconHtml(COMMAND_ICONS.attack, 16)} Attaquer`;
  if (action.type === 'item') return `${itemIc(action.item, 16)} ${esc(CONSUMABLES[action.item].name)}`;
  const s = getSkills(hero)[action.skill];
  return `${skillIcon(s, 16)} ${esc(s.name)}`;
}

function actionDesc(hero, action) {
  const stats = statsOf(hero);
  if (action.type === 'item') return CONSUMABLES[action.item].desc;
  if (action.type === 'attack') return 'Attaque simple avec l\'arme équipée.';
  return skillEffectLabel(stats, effectiveSkill(hero, getSkills(hero)[action.skill]));
}

// Estimation affichée sur chaque cible (défense de la cible comprise).
function targetEstimate(hero, action, unit) {
  const stats = statsOf(hero);
  if (action.type === 'attack') return `~${range(estimateHit(stats, BASIC_ATTACK, statsOf(unit)))}`;
  if (action.type === 'item') return consumableEstimate(action.item, unit);
  const skill = effectiveSkill(hero, getSkills(hero)[action.skill]);
  return skillShortEstimate(stats, skill, unit.alive ? statsOf(unit) : null);
}

// Aide affichée au survol d'une commande.
function helpFor(hero, el) {
  const stats = statsOf(hero);
  const cls = getClass(hero);
  const res = cls.resource.name;
  const takesTurn = isMultiAction(hero) ? '' : ' Prend le tour du héros.';
  const crit = `Critique : ${Math.min(stats.critChance, COMBAT.caps.critChance)} %, +${stats.critDmg} % de dégâts.`;
  if (el.dataset.skill !== undefined) {
    const base = getSkills(hero)[Number(el.dataset.skill)];
    const s = base.sacrifice || base.allSouls ? effectiveSkill(hero, base) : atCombo(base, Math.max(1, comboOf(hero)));
    const problem = skillWeaponProblem(hero, s);
    const weapon = problem ? ` ${problem}` : s.weapons ? (usesWeapon(s) ? " Frappe avec l'arme." : ' Sort lancé avec son arme.') : '';
    return `<b>${skillIcon(s, 16)} ${esc(s.name)}</b> — ${esc(skillCostLabel(cls, s, hero))}${s.comboGain ? ` · +${s.comboGain} combo` : ''}${s.finisher ? ` · ${comboOf(hero)} combo` : ''}<br>${esc(s.desc)}. ${esc(skillEffectLabel(stats, s))}.${s.boosted ? ' ★ Renforcée.' : ''}${s.finisher && !comboOf(hero) ? ' Demande au moins 1 point de combo.' : ''}${esc(weapon)}`;
  }
  if (el.dataset.item) {
    const c = CONSUMABLES[el.dataset.item];
    const n = countOf(state.combat.consumables, el.dataset.item);
    const why = canUseItem(state.combat, el.dataset.item) ? '' : ' <i>Personne n\'en a besoin pour l\'instant.</i>';
    return `<b>${itemIc(el.dataset.item, 16)} ${esc(c.name)}</b> <small>×${n}</small><br>${esc(c.desc)}${takesTurn}${why}`;
  }
  switch (el.id) {
    case 'actAttack': return `<b>${iconHtml(COMMAND_ICONS.attack, 16)} Attaquer</b> — ~${range(estimateHit(stats, BASIC_ATTACK))} avant défense<br>Dégâts physiques : Attaque des armes + ${STATS[cls.physStat].label}. ${crit}${weaponBlockedReason(hero) ? ` ${esc(weaponBlockedReason(hero))}` : ''}`;
    case 'actSkills': return `<b>${iconHtml(COMMAND_ICONS.skills, 16)} Compétences</b><br>Les sorts et techniques appris par le héros.`;
    case 'actItem': return `<b>${iconHtml(COMMAND_ICONS.items, 16)} Objets</b><br>Potions, remèdes, plume de phénix…${takesTurn}`;
    case 'actDefend': return `<b>${iconHtml(COMMAND_ICONS.defend, 16)} Défendre</b><br>Dégâts subis réduits de moitié jusqu'au prochain tour du héros.${takesTurn}`;
    case 'actMove': return `<b>${iconHtml(COMMAND_ICONS.move, 16)} ${hero.row === 'melee' ? 'Reculer (distance)' : 'Avancer (corps à corps)'}</b><br>${hasFreeMove(hero) ? 'Plume légère : ne prend pas le tour (une fois par tour).' : `Prend tout le tour${isMultiAction(hero) ? ", seulement avant d'avoir agi" : ''}.`} Au corps à corps, on est plus souvent ciblé ; l'arc ne sert qu'à distance, les autres armes qu'au corps à corps.`;
    case 'actEnd': return isMultiAction(hero) ? `<b>${iconHtml(COMMAND_ICONS.end, 16)} Finir le tour</b><br>L'${esc(res)} restante est conservée.` : `<b>${iconHtml(COMMAND_ICONS.end, 16)} Passer</b><br>${esc(hero.name)} ne fait rien ce tour-ci.`;
    default: return '';
  }
}

// ---- Fenêtres superposées ----

function overlay() {
  if (!ui.overlay) return '';
  const cb = state.combat;
  if (ui.overlay === 'log') {
    return `<div class="bs-modal"><div class="win"><h3>${iconHtml(104, 32)} Journal du combat</h3><div class="log">${logLines(cb.log)}</div><button id="closeOverlay">Fermer <small>Échap</small></button></div></div>`;
  }
  const hero = cb.party[ui.overlay.hero];
  if (!hero) return '';
  const cls = getClass(hero);
  return `<div class="bs-modal"><div class="win"><h3>${iconHtml(CLASS_ICONS[hero.classKey], 32)} ${esc(hero.name)} <small>${esc(heroClassTitle(hero))} · niv. ${hero.level}</small></h3>
    <div class="stat-list">${statsList(hero)}</div>
    <div class="bs-status big">${statusIcons(hero)}</div>
    <button id="closeOverlay">Fermer <small>Échap</small></button></div></div>`;
}

// ---- Événements ----

function act(action) {
  Object.assign(ui, { mode: 'main', action: null });
  setStagePick(null);
  playerAction(action);
}

function rerender() {
  const app = document.getElementById('app');
  if (app && state.screen === 'combat') renderCombat(app);
}

function choose(action) {
  const targets = targetsFor(state.combat, action);
  Object.assign(ui, { mode: targets ? 'target' : 'confirm', action });
  rerender();
}

// Unités touchées par une action sans cible à choisir (zone, groupe, soi-même) : toutes
// désignées sur la scène en attendant la confirmation. { units, tone } ou null.
function affected(cb, hero, action) {
  const alive = (list) => list.filter((u) => u.alive);
  if (action.type === 'skill') {
    const s = getSkills(hero)[action.skill];
    if (s.target === 'allEnemies') return { units: alive(cb.enemies), tone: 'hostile' };
    if (s.target === 'allAllies') return { units: alive(cb.party), tone: 'friendly' };
    if (s.target === 'self') return { units: [hero], tone: 'friendly' };
  }
  if (action.type === 'item') return { units: alive(cb.party), tone: 'friendly' };
  if (action.type === 'defend') return { units: [hero], tone: 'friendly' };
  return null;
}

// Ciblage sur la scène : flèche rouge (ennemis : attaques, effets négatifs) ou verte (alliés :
// soins, effets positifs) sur la cible désignée ; action de zone : toutes les cibles.
function stagePick(hero) {
  const cb = state.combat;
  if (ui.mode === 'target') {
    const targets = targetsFor(cb, ui.action);
    const list = targets.side === 'enemy' ? cb.enemies : cb.party;
    setStagePick(targets.units, (u) => act({ ...ui.action, target: list.indexOf(u) }), { tone: targets.side === 'enemy' ? 'hostile' : 'friendly' });
  } else if (ui.mode === 'confirm') {
    const aff = affected(cb, hero, ui.action);
    if (aff?.units.length) setStagePick(aff.units, () => act(ui.action), { tone: aff.tone, all: true });
  }
}

function back() {
  if (ui.overlay) ui.overlay = null;
  else if (ui.mode === 'target' || ui.mode === 'confirm') ui.mode = ui.action?.type === 'skill' ? 'skills' : ui.action?.type === 'item' ? 'items' : 'main';
  else ui.mode = 'main';
  if (ui.mode !== 'target') ui.action = ui.mode === 'main' ? null : ui.action;
  setStagePick(null);
  rerender();
}

function wire(app, hero) {
  wireEffectTips(app);
  app.querySelectorAll('[data-overlay]').forEach((b) => { b.onclick = () => { ui.overlay = b.dataset.overlay; rerender(); }; });
  app.querySelector('#closeOverlay')?.addEventListener('click', () => { ui.overlay = null; rerender(); });
  app.querySelectorAll('[data-hero]').forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.hero);
      // En plein ciblage d'un allié : cliquer sa ligne le choisit.
      if (ui.mode === 'target') {
        const targets = targetsFor(state.combat, ui.action);
        if (targets?.side === 'hero' && targets.units.includes(state.combat.party[i])) return act({ ...ui.action, target: i });
      }
      ui.overlay = { hero: i };
      rerender();
    };
  });
  if (!hero) return;
  stagePick(hero);
  // La flèche suit le bouton de cible survolé (souris) ou désigné (manette, clavier).
  if (ui.mode === 'target') {
    const targets = targetsFor(state.combat, ui.action);
    const list = targets.side === 'enemy' ? state.combat.enemies : state.combat.party;
    app.querySelectorAll('[data-target]').forEach((b) => {
      const show = () => setStageFocus(list[Number(b.dataset.target)]);
      b.addEventListener('mouseenter', show);
      b.addEventListener('focus', show);
    });
  }
  const help = app.querySelector('#bsHelp');
  app.querySelectorAll('.bs-commands .cmd').forEach((b) => {
    b.addEventListener('mouseenter', () => { if (help) help.innerHTML = helpFor(hero, b) || help.innerHTML; });
    b.addEventListener('focus', () => { if (help) help.innerHTML = helpFor(hero, b) || help.innerHTML; });
  });
  const on = (id, fn) => { const el = app.querySelector(`#${id}`); if (el) el.onclick = fn; };
  on('actAttack', () => choose({ type: 'attack' }));
  on('actSkills', () => { ui.mode = 'skills'; rerender(); });
  on('actItem', () => { ui.mode = 'items'; rerender(); });
  on('actDefend', () => act({ type: 'defend' }));
  on('actMove', () => act({ type: 'move' }));
  on('actEnd', () => act({ type: 'endTurn' }));
  on('actBack', back);
  on('actConfirm', () => act(ui.action));
  app.querySelectorAll('[data-skill]').forEach((b) => { b.onclick = () => choose({ type: 'skill', skill: Number(b.dataset.skill) }); });
  app.querySelectorAll('[data-item]').forEach((b) => { b.onclick = () => { if (!b.classList.contains('off')) choose({ type: 'item', item: b.dataset.item }); }; });
  app.querySelectorAll('[data-target]').forEach((b) => { b.onclick = () => act({ ...ui.action, target: Number(b.dataset.target) }); });
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (ev) => {
    if (state.screen !== 'combat' || !state.combat) return;
    if (ev.key === 'Escape') { ev.preventDefault(); back(); return; }
    if (!ui.hero || ui.overlay) return;
    if (ui.mode === 'confirm' && ev.key === 'Enter') { ev.preventDefault(); act(ui.action); return; }
    if (ui.mode === 'main' && /^[1-6]$/.test(ev.key)) {
      const btn = document.querySelector(`.bs-commands [data-key="${ev.key}"]`);
      if (btn && !btn.disabled) { ev.preventDefault(); btn.click(); }
    }
  });
  window.addEventListener('resize', () => { if (state.screen === 'combat') fitStage(); });
}
