// Création de l'équipe, plein écran : quatre colonnes (une par héros) avec l'aperçu animé
// du personnage, son nom, sa classe et son apparence (coupe, couleur des cheveux, yeux,
// peau, haut et bas du corps : data/appearance.js). « Classes et légendaires » ouvre une
// fenêtre à deux onglets : le détail d'une classe (stats, sorts et équipement de départ,
// orientations) et tous les légendaires en icônes.

import { state } from '../../state.js';
import { PARTY_ORDER, CLASS_ORDER, XP } from '../../config.js';
import { CLASSES } from '../../data/classes.js';
import { STATS } from '../../data/stats.js';
import { LEGENDARIES, RARITIES } from '../../data/items.js';
import { TALENTS, nodeSkills } from '../../data/talents.js';
import { createParty, createHero, getStats, classTitle, hasFeminine, usesHp } from '../../game/party.js';
import { equippedItems } from '../../game/equipment.js';
import { generateItem, possibleSecondaries } from '../../game/items.js';
import { esc } from '../html.js';
import { statsList } from '../heroStats.js';
import { skillEffectLabel, skillCostLabel } from '../format.js';
import { goTo } from '../router.js';
import { saveGame } from '../saves.js';
import { iconHtml, itemIcon, branchIcon, skillIconIndex, CLASS_ICONS } from '../icons.js';
import { frame, wireFrame, itemDetail } from '../screenFrame.js';
import { portrait, drawPortraits } from '../portraits.js';
import { LOOK_PARTS, BODIES, TOPS } from '../../data/appearance.js';
import { defaultLook, cycleLook, randomLook, lookKey } from '../../game/appearance.js';
import { lookSprite } from '../heroSprite.js';
import { drawActor } from '../actors.js';

// Choix en cours (classes et noms), conservés quand on change une classe.
// Détails ouverts : { tab: 'classes' | 'legendaries', classKey } ou null.
// feminine : forme féminine du nom de classe (« La Dissimulée »), par héros.
const draft = { classes: [...PARTY_ORDER], names: PARTY_ORDER.map((k) => CLASSES[k].name), feminine: PARTY_ORDER.map(() => false), looks: PARTY_ORDER.map(defaultLook), details: null };
// Nom proposé par défaut : le nom de la classe, accordé.
const defaultName = (key, feminine) => (feminine ? CLASSES[key].nameF : CLASSES[key].name);

// Parties de l'apparence, dans l'ordre de l'écran.
const PART_LABELS = { hair: 'Coupe', hairColor: 'Cheveux', eyes: 'Yeux', skin: 'Peau', top: 'Haut', bottom: 'Bas' };

export function renderCreate(app) {
  app.innerHTML = `${frame({
    title: 'Nouvelle partie', icon: 720, layout: 'lay-create', gold: false, back: '← Menu principal',
    extras: `<span class="hint">Composez votre équipe de quatre héros (une classe peut revenir plusieurs fois).</span>
      <button id="detailsBtn">${iconHtml(96, 16)} Classes et légendaires</button>
      <button id="startBtn" class="btn-primary">Commencer l'aventure</button>`,
    body: draft.classes.map(heroColumn).join(''),
  })}${draft.details ? detailsWindow() : ''}`;
  app.querySelectorAll('canvas[data-preview]').forEach((c) => animatePreview(c, draft.looks[Number(c.dataset.preview)]));

  const rerender = (change) => () => {
    readNames(app);
    change();
    renderCreate(app);
  };
  wireFrame(app, () => goTo('title'));
  drawPortraits(app);
  app.querySelectorAll('[data-class-slot]').forEach((btn) => {
    btn.onclick = rerender(() => {
      const i = Number(btn.dataset.classSlot);
      // Nom par défaut (celui de la classe) : il suit la nouvelle classe.
      if (draft.names[i] === defaultName(draft.classes[i], draft.feminine[i])) draft.names[i] = defaultName(btn.dataset.class, draft.feminine[i]);
      // Apparence encore celle de l'ancienne classe : elle suit aussi.
      if (lookKey(draft.looks[i]) === lookKey(defaultLook(draft.classes[i]))) draft.looks[i] = defaultLook(btn.dataset.class);
      draft.classes[i] = btn.dataset.class;
    });
  });
  app.querySelectorAll('[data-feminine]').forEach((btn) => {
    btn.onclick = rerender(() => {
      const i = Number(btn.dataset.feminine);
      const key = draft.classes[i];
      const wasDefault = draft.names[i] === defaultName(key, draft.feminine[i]);
      draft.feminine[i] = !draft.feminine[i];
      if (wasDefault) draft.names[i] = defaultName(key, draft.feminine[i]);
    });
  });
  app.querySelectorAll('[data-look]').forEach((btn) => {
    btn.onclick = rerender(() => {
      const [i, part, step] = btn.dataset.look.split(':');
      draft.looks[i] = cycleLook(draft.looks[i], part, Number(step));
    });
  });
  app.querySelectorAll('[data-random]').forEach((btn) => {
    btn.onclick = rerender(() => { draft.looks[Number(btn.dataset.random)] = randomLook(); });
  });
  app.querySelectorAll('[data-reset]').forEach((btn) => {
    btn.onclick = rerender(() => { const i = Number(btn.dataset.reset); draft.looks[i] = defaultLook(draft.classes[i]); });
  });
  app.querySelector('#detailsBtn').onclick = rerender(() => { draft.details = { tab: 'classes', classKey: draft.classes[0] }; });
  app.querySelector('#closeDetails')?.addEventListener('click', rerender(() => { draft.details = null; }));
  app.querySelectorAll('[data-details-tab]').forEach((btn) => {
    btn.onclick = rerender(() => { draft.details.tab = btn.dataset.detailsTab; });
  });
  app.querySelectorAll('[data-details-class]').forEach((btn) => {
    btn.onclick = rerender(() => { draft.details.classKey = btn.dataset.detailsClass; });
  });
  const legBox = app.querySelector('#legDetail');
  app.querySelectorAll('[data-legendary]').forEach((cell) => {
    cell.onmouseenter = () => { legBox.innerHTML = legendaryDetail(cell.dataset.legendary); };
  });
  app.querySelector('#startBtn').onclick = () => {
    readNames(app);
    draft.details = null;
    state.party = createParty(draft.names, draft.classes, draft.looks, draft.classes.map((k, i) => hasFeminine(k) && draft.feminine[i]));
    saveGame(); // l'aventure occupe son emplacement dès le départ
    goTo('hub');
  };
}

function readNames(app) {
  draft.names = draft.classes.map((_, i) => app.querySelector(`#name${i}`)?.value ?? draft.names[i]);
}

function heroColumn(key, i) {
  const cls = CLASSES[key];
  const look = draft.looks[i];
  return `
    <section class="win create-hero" style="--c:${cls.color}">
      <h3 title="Héros ${i + 1}">${esc(classTitle(key, draft.feminine[i]))}${hasFeminine(key) ? ` <button class="gender-pick" data-feminine="${i}" title="Nom de classe au ${draft.feminine[i] ? 'masculin' : 'féminin'} : ${esc(classTitle(key, !draft.feminine[i]))}" aria-label="Changer la forme du nom de classe">⇄</button>` : ''}</h3>
      <div class="create-portrait"><canvas data-preview="${i}" width="120" height="130" class="portrait"></canvas></div>
      <input type="text" id="name${i}" placeholder="Nom du héros" value="${esc(draft.names[i])}" maxlength="24">
      <div class="create-classes" role="group" aria-label="Classe du héros ${i + 1}">
        ${CLASS_ORDER.map((k) => `<button data-class-slot="${i}" data-class="${k}" class="class-pick ${k === key ? 'selected' : ''}" style="--c:${CLASSES[k].color}" title="${esc(classTitle(k, draft.feminine[i]))}">${iconHtml(CLASS_ICONS[k], 32)}</button>`).join('')}
      </div>
      <p class="create-meta" title="${esc(cls.desc)}">${esc(usesHp(cls) ? 'Sang (PV)' : cls.resource.name)} · ${STATS[cls.mainStat].label}${['paladin', 'scarifie'].includes(key) ? ' ou Intelligence' : ''} · ${TALENTS[key].map((b) => iconHtml(branchIcon(b), 16, '', esc(b.name))).join('')}</p>
      <div class="look-rows">${Object.entries(PART_LABELS).map(([part, label]) => lookRow(i, look, part, label)).join('')}</div>
      <div class="look-actions"><button data-random="${i}">Au hasard</button><button data-reset="${i}">Tenue de la classe</button></div>
    </section>`;
}

// Une ligne « Coupe ◀ Courts ▶ » avec un échantillon de couleur pour les teintes.
function lookRow(i, look, part, label) {
  const option = LOOK_PARTS[part][look[part]];
  const name = typeof option === 'string' ? option : option.label;
  const swatch = part === 'hairColor' || part === 'skin' ? option.ramp[0] : part === 'eyes' ? option.colors[1] : part === 'bottom' ? option.pants[1] : null;
  const hidden = part === 'bottom' && BODIES[TOPS[look.top].body].robe;
  return `
    <div class="look-row ${hidden ? 'hidden-part' : ''}">
      <span class="look-label">${label}</span>
      <button class="look-step" data-look="${i}:${part}:-1" aria-label="${label} précédent">◀</button>
      <span class="look-value">${swatch ? `<i class="swatch" style="background:${swatch}"></i>` : ''}${esc(name)}${hidden ? ' <small>(sous la robe)</small>' : ''}</span>
      <button class="look-step" data-look="${i}:${part}:1" aria-label="${label} suivant">▶</button>
    </div>`;
}

// Aperçu animé : le héros tourne sur lui-même en marchant.
const DIRS = ['down', 'left', 'up', 'right'];
function animatePreview(canvas, look) {
  const sprite = lookSprite(look);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const draw = (now) => {
    if (!canvas.isConnected) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dir = DIRS[Math.floor(now / 1600) % 4];
    drawActor(ctx, { sx: 0, sy: -2, size: 120, scale: 5, dir, now, sprite, shadow: false, anim: 'walk' });
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

// ---- Fenêtre de détails ----

function detailsWindow() {
  const { tab } = draft.details;
  return `
    <div class="bs-modal create-modal">
      <div class="win">
        <header class="scr-top">
          <button data-details-tab="classes" class="tab ${tab === 'classes' ? 'selected' : ''}">${iconHtml(610, 16)} Détail des classes</button>
          <button data-details-tab="legendaries" class="tab ${tab === 'legendaries' ? 'selected' : ''}">${iconHtml(1447 + 80, 16)} Légendaires</button>
          <span style="flex:1"></span>
          <button id="closeDetails">Fermer</button>
        </header>
        ${tab === 'legendaries' ? legendariesTab() : classesTab()}
      </div>
    </div>`;
}

// Détail d'une classe : héros de niveau 1 avec son équipement de départ, sorts de départ
// (palier 0) et signature de chaque orientation.
function classesTab() {
  const key = draft.details.classKey;
  const cls = CLASSES[key];
  const hero = createHero(key);
  const stats = getStats(hero);
  const r = cls.resource;
  const resourceText = r.hp
    ? 'Aucune ressource : chaque compétence coûte un pourcentage de ses PV max (jamais le dernier PV). Une fois par combat, il peut se relever quand il tombe (talents).'
    : r.multiAction
    ? `${r.name} : ${r.max} au maximum, pleine au début de chaque combat, +${r.regen} par tour. Chaque action en coûte (Attaquer ${r.actionCosts.attack}, Défendre ${r.actionCosts.defend}, Objet ${r.actionCosts.item}) : plusieurs actions par tour.`
    : r.onHitTaken
      ? `${r.name} : ${r.max} au maximum, commence à ${r.start}. +${r.regen} par tour, +${r.onAttack} par attaque simple, +${r.onHitTaken} par coup encaissé.`
      : `${r.name} : ${r.max} au maximum, +${r.regen} au début de chaque tour.`;
  return `
    <div class="create-classes details">
      ${CLASS_ORDER.map((k) => `<button data-details-class="${k}" class="choice ${k === key ? 'selected' : ''}">${iconHtml(CLASS_ICONS[k], 32)}<span>${esc(CLASSES[k].title)}</span></button>`).join('')}
    </div>
    <div class="details-body">
      <div class="details-col">
        <div class="beast-head">${portrait(`classe:${key}`, 3)}<div><h3>${esc(hasFeminine(key) ? `${cls.title} · ${cls.titleF}` : cls.title)}</h3><p class="hint">${esc(cls.desc)}</p></div></div>
        <div class="stats sheet stats-cols">${statsList(hero)}</div>
      </div>
      <div class="details-col">
        <p class="hint">${esc(resourceText)} Position de départ : ${cls.position === 'ranged' ? 'distance' : 'corps à corps'}. Par niveau : ${Object.entries(cls.growth).map(([k, v]) => `+${v} ${STATS[k].label}`).join(', ')}.</p>
        <h4>Orientations <small class="hint">— le premier point dans une orientation apprend son sort de départ ; gros paliers obligatoires, petits paliers au choix, signature au palier 14</small></h4>
        <div class="skill-list">${TALENTS[key].map((b) => {
          const starterNode = b.nodes.find((n) => n.tier === 0 && nodeSkills(n).length);
          const starter = starterNode ? nodeSkills(starterNode)[0] : null;
          const sig = b.nodes.find((n) => n.kind === 'signature');
          return `
            <div class="skill-item">${iconHtml(branchIcon(b), 32)}<div><b>${esc(b.name)}</b> <small class="hint">${esc(b.desc)}</small><br>
              ${starter ? `<small>${iconHtml(skillIconIndex(starter), 16)} <b>${esc(starter.name)}</b> (${esc(skillCostLabel(cls, starter))}) : ${esc(skillEffectLabel(stats, starter))}</small><br>` : ''}
              ${sig ? `<small>${iconHtml(skillIconIndex(sig.skill), 16)} Signature : <b>${esc(sig.name)}</b></small>` : ''}</div></div>`;
        }).join('')}</div>
        <h4>Équipement de départ</h4>
        <div class="cells">${equippedItems(hero).map((item) => `<div class="bag-cell" style="--rc:${RARITIES[item.rarity].color}" title="${esc(item.name ?? '')}">${iconHtml(itemIcon(item), 32)}</div>`).join('')}</div>
      </div>
    </div>`;
}

// Tous les légendaires en icônes, classés par classe puis neutres ; fiche au survol.
function legendariesTab() {
  const order = (key) => (LEGENDARIES[key].classKey ? CLASS_ORDER.indexOf(LEGENDARIES[key].classKey) : CLASS_ORDER.length);
  const keys = Object.keys(LEGENDARIES).sort((a, b) => order(a) - order(b));
  const groups = [...CLASS_ORDER, null].map((classKey) => [classKey, keys.filter((k) => (LEGENDARIES[k].classKey ?? null) === classKey)]).filter(([, list]) => list.length);
  return `
    <p class="hint">Un légendaire tombe rarement (plus souvent sur les boss), au niveau du donjon, avec ${RARITIES.legendaire.secondaries} stats secondaires aléatoires. Trois par orientation (chacun renforce une compétence ou un passif de ses gros paliers, qu'il faut avoir appris) et quelques-uns pour toutes les classes. Un objet divin peut absorber le pouvoir (et le nom) d'un légendaire à la Forge.</p>
    <div class="details-body">
      <div class="details-col leg-groups">${groups.map(([classKey, list]) => `
        <div class="leg-group"><span class="leg-class">${classKey ? `${iconHtml(CLASS_ICONS[classKey], 16)} ${esc(CLASSES[classKey].title)}` : 'Toutes classes'}</span>
          <div class="cells">${list.map((k) => `<div class="bag-cell pick" data-legendary="${k}" style="--rc:${RARITIES.legendaire.color}">${iconHtml(itemIcon(sample(k)), 32)}</div>`).join('')}</div>
        </div>`).join('')}
      </div>
      <div class="details-col" id="legDetail">${legendaryDetail(keys[0])}</div>
    </div>`;
}

// Exemplaire de démonstration d'un légendaire au niveau maximum, sans secondaires : elles
// sont listées à part, toutes, avec leur fourchette.
const SAMPLE_LEVEL = XP.maxLevel;
const samples = new Map();
function sample(key) {
  if (!samples.has(key)) samples.set(key, { ...generateItem({ level: SAMPLE_LEVEL, legendary: key }), bonus: {} });
  return samples.get(key);
}

function legendaryDetail(key) {
  const leg = LEGENDARIES[key];
  const cls = leg.classKey ? CLASSES[leg.classKey] : null;
  const item = sample(key);
  const count = RARITIES[item.rarity].secondaries;
  const lines = possibleSecondaries(item).map(({ stat, lo, hi }) => {
    const def = STATS[stat];
    return `<li>${def.label} <b>+${lo} à ${hi}${def.suffix ? ` ${def.suffix}` : ''}</b></li>`;
  });
  return `${itemDetail(item)}
    <p class="hint">${cls ? `Réservé aux ${esc(cls.plural)}.` : 'Utilisable par toutes les classes.'} Stats pour un exemplaire de niveau ${SAMPLE_LEVEL}.</p>
    <div class="leg-secondaries"><b>Stats secondaires possibles</b> <small>(en jeu, ${count} tirées au hasard parmi celles-ci)</small>
      <ul>${lines.join('')}</ul></div>`;
}
