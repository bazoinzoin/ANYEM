// Scène de combat : l'équipe à gauche (tournée vers la droite), les monstres à droite
// (tournés vers la gauche), sur fond neutre. Sprites RPG Maker 2003 (ui/spriteCatalog.js)
// animés par le code : respiration, marche sur place de l'unité active, bond et coup
// d'arme, halo de sort, recul et éclair blanc à l'impact, chiffres de dégâts / soins,
// clignement puis disparition à la mort. Au ciblage, on peut cliquer sur un personnage.
//
// L'écran (ui/screens/combat.js) recrée le canvas à chaque rendu : l'état des animations
// vit ici, par combat, et une boucle d'animation redessine le canvas courant.

import { drawActor } from './actors.js';
import { CLASS_SPRITES, ENEMY_SPRITES } from './spriteCatalog.js';
import { statsOf } from '../game/units.js';
import { statusesOf } from '../game/statuses.js';
import { image, isReady } from './sprites.js';
import { effectIcon, COMMAND_ICONS } from './icons.js';
import { diffBattle } from './battleDiff.js';

const W = 512;             // taille du canvas (pixels ; affiché agrandi, net)
const H = 280;
const SCALE = 2;           // zoom des sprites (24 × 32 → 48 × 64)
const BOSS_SCALE = 3;
const TOP = 96;            // ligne des pieds du premier et du dernier personnage d'un camp
const BOTTOM = 246;
const LUNGE = 44;          // longueur du bond d'une attaque (px)
const HIT_DELAY = 190;     // l'impact tombe au sommet du bond (ms)

const COLORS = {
  damage: '#fff4e0',
  crit: '#ffd34d',
  heal: '#7ee07e',
  buff: '#9fd08f',
  debuff: '#e6a59a',
  cast: '#8fc8ff',
  castEnemy: '#d68cff',
  revive: '#ffe28a',
};

let cb = null;             // combat affiché
let vis = new WeakMap();   // unité → { x, y, fx: [...] }
let popups = [];           // chiffres et textes qui s'envolent
let pick = null;           // ciblage en cours : { units: Set, onPick }
let canvas = null;
let running = false;
const off = typeof document !== 'undefined' ? document.createElement('canvas') : null;

// Branche le canvas de l'écran de combat (appelé à chaque rendu).
export function attachStage(el, combat) {
  if (combat !== cb) {
    cb = combat;
    vis = new WeakMap();
    popups = [];
  }
  canvas = el;
  pick = null;
  canvas.width = W;
  canvas.height = H;
  canvas.onclick = onClick;
  canvas.onmousemove = onHover;
  draw(performance.now());
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
}

// Taille d'affichage : la plus grande qui tient dans le parent, proportions gardées.
export function fitStage() {
  const parent = canvas?.parentElement;
  if (!parent) return;
  const k = Math.min(parent.clientWidth / W, parent.clientHeight / H);
  if (!(k > 0)) return;
  canvas.style.width = `${Math.floor(W * k)}px`;
  canvas.style.height = `${Math.floor(H * k)}px`;
}

// Ciblage : met en évidence les cibles valides ; un clic sur l'une appelle onPick(unité).
// Sans argument : fin du ciblage.
export function setStagePick(units, onPick) {
  pick = units ? { units: new Set(units), onPick } : null;
  if (canvas) canvas.style.cursor = '';
}

// Anime l'issue d'une action : geste de l'acteur ('lunge' | 'cast' | null), impacts,
// chiffres, effets posés, chutes et relevés (voir ui/battleDiff.js).
export function playAction(combat, actor, before, gesture = null) {
  if (combat !== cb) return;
  const now = performance.now();
  const diff = diffBattle(combat, before);
  const actorSide = actor && combat.party.includes(actor) ? 'hero' : 'enemy';
  let impact = 0;
  if (actor && gesture) {
    const v = visOf(actor);
    if (gesture === 'lunge') {
      v.fx.push({ type: 'lunge', t0: now, dur: 420 });
      impact = HIT_DELAY;
    } else {
      v.fx.push({ type: 'cast', t0: now, dur: 560, color: actorSide === 'hero' ? COLORS.cast : COLORS.castEnemy });
      impact = 300;
    }
  }
  for (const c of diff.changes) {
    const v = visOf(c.unit);
    // Riposte : l'acteur blessé par sa cible encaisse après son propre coup.
    const t0 = now + (c.unit === actor && c.delta < 0 ? impact + 220 : c.side !== actorSide || !actor ? impact : impact * 0.6);
    if (c.delta < 0) {
      v.fx.push({ type: 'hit', t0, dur: 320 });
      if (gesture === 'lunge' && c.unit !== actor) v.fx.push({ type: 'slash', t0: t0 - 60, dur: 240 });
      popup(c.unit, `${-c.delta}`, diff.crit ? COLORS.crit : COLORS.damage, t0, diff.crit);
    } else if (c.delta > 0) {
      v.fx.push({ type: 'sparkle', t0, dur: 700, color: c.revived ? COLORS.revive : COLORS.heal });
      popup(c.unit, `+${c.delta}`, COLORS.heal, t0);
    }
    c.added.forEach((s, i) => {
      if (c.delta <= 0) v.fx.push({ type: 'sparkle', t0, dur: 600, color: COLORS[s.kind] ?? COLORS.buff });
      popup(c.unit, `${s.icon ?? ''} ${s.name}`, COLORS[s.kind] ?? COLORS.buff, t0 + 160 * (i + (c.delta ? 1 : 0)), false, true);
    });
    if (c.died) v.fx.push({ type: 'die', t0: t0 + 150, dur: 750 });
  }
}

// ---- État visuel ----

function sideOf(unit) {
  return cb.party.includes(unit) ? 'hero' : 'enemy';
}

// Place d'un personnage : les héros en colonne à gauche, en quinconce ; les unités au
// corps à corps plus près du centre.
function slotOf(unit) {
  const side = sideOf(unit);
  const list = side === 'hero' ? cb.party : cb.enemies;
  const i = list.indexOf(unit);
  const n = list.length;
  const y = n === 1 ? (TOP + BOTTOM) / 2 + 20 : TOP + ((BOTTOM - TOP) * i) / (n - 1);
  const x = (unit.row === 'melee' ? 184 : 112) + (i % 2) * 22 - (unit.boss ? 16 : 0);
  return { x: side === 'hero' ? x : W - x, y };
}

function visOf(unit) {
  let v = vis.get(unit);
  if (!v) {
    const s = slotOf(unit);
    // Entrée en scène : chacun arrive de son bord.
    v = { x: s.x + (sideOf(unit) === 'hero' ? -90 : 90), fx: [], phase: Math.random() * 6 };
    vis.set(unit, v);
  }
  return v;
}

// Un texte qui s'envole ; ceux qui partent presque en même temps du même personnage
// s'empilent au lieu de se recouvrir.
function popup(unit, text, color, t0, big = false, small = false) {
  const stack = popups.filter((p) => p.unit === unit && Math.abs(p.t0 - t0) < 500).length;
  popups.push({ unit, text, color, t0, big, small, stack });
}

// ---- Boucle ----

let last = 0;
function loop(now) {
  if (!canvas || !canvas.isConnected || !cb) {
    running = false;
    canvas = null;
    return;
  }
  draw(now);
  requestAnimationFrame(loop);
}

function draw(now) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawBackground(ctx);

  const units = [...cb.party, ...cb.enemies];
  const placed = units.map((u) => {
    const v = visOf(u);
    const slot = slotOf(u);
    const gap = slot.x - v.x;
    v.x += Math.abs(gap) < 0.5 ? gap : gap * Math.min(1, dt * 5);
    v.walking = Math.abs(gap) > 2;
    v.fx = v.fx.filter((f) => now < f.t0 + f.dur || f.type === 'die');
    return { u, v, y: slot.y };
  }).sort((a, b) => a.y - b.y);

  for (const p of placed) drawUnit(ctx, p.u, p.v, p.y, now);
  for (const p of placed) drawBars(ctx, p.u, p.v, p.y, now);
  drawPopups(ctx, now);
}

function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a2119');
  g.addColorStop(0.42, '#3a2e22');
  g.addColorStop(0.43, '#4a3b2a');
  g.addColorStop(1, '#2b2218');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Sol : quelques lignes en perspective, discrètes.
  ctx.strokeStyle = 'rgba(0,0,0,.18)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = Math.round(H * 0.43 + i * i * 4.4);
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
}

function spriteOf(unit) {
  return sideOf(unit) === 'hero'
    ? CLASS_SPRITES[unit.classKey] ?? CLASS_SPRITES.paladin
    : ENEMY_SPRITES[unit.enemyKey];
}

// Progression (0 à 1) d'un effet en cours, ou null.
function running01(f, now) {
  const k = (now - f.t0) / f.dur;
  return k >= 0 && k <= 1 ? k : null;
}

function drawUnit(ctx, unit, v, y, now) {
  const hero = sideOf(unit) === 'hero';
  const facing = hero ? 1 : -1;
  const scale = unit.boss ? BOSS_SCALE : SCALE;
  const active = cb.acting?.unit === unit;
  const die = v.fx.find((f) => f.type === 'die');
  if (die && unit.alive) v.fx = v.fx.filter((f) => f !== die); // relevé entre-temps
  const dying = die && unit.alive === false ? Math.max(0, (now - die.t0) / die.dur) : null;
  if (!unit.alive && !hero && (dying === null || dying >= 1)) return; // monstre vaincu : parti

  let dx = 0;
  let dy = 0;
  let flash = 0;
  let alpha = 1;
  for (const f of v.fx) {
    const k = running01(f, now);
    if (k === null) continue;
    if (f.type === 'lunge') dx += facing * LUNGE * Math.sin(Math.PI * k);
    if (f.type === 'cast') dy -= 5 * Math.sin(Math.PI * Math.min(1, k * 1.6));
    if (f.type === 'hit') {
      dx -= facing * 6 * Math.sin(Math.PI * k) + Math.sin(k * 40) * 2 * (1 - k);
      flash = Math.max(flash, 1 - k);
    }
  }
  if (dying !== null && dying < 1) {
    // Clignement, puis fondu.
    if (dying < 0.5) alpha = Math.floor(dying * 16) % 2 ? 0.25 : 1;
    else alpha = hero ? 1 - (dying - 0.5) * 1.1 : 1 - (dying - 0.5) * 2;
  }

  const x = v.x + dx;
  const bob = unit.alive ? Math.round(Math.sin(now / 420 + v.phase)) : 0;
  const sprite = spriteOf(unit);

  // Ombre, anneau de cible, halo de l'unité active.
  const rx = unit.boss ? 30 : 18;
  if (unit.alive || dying !== null) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (pick?.units.has(unit)) {
    ctx.strokeStyle = `rgba(255,210,90,${0.55 + 0.45 * Math.sin(now / 140)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 5, (rx + 5) * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (active) {
    ctx.fillStyle = 'rgba(255,210,90,.22)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 3, (rx + 3) * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!unit.alive && hero && (dying === null || dying >= 1)) {
    drawFallen(ctx, sprite, x, y, scale);
  } else if (sprite) {
    // Marche sur place pour l'unité active ou pendant un déplacement.
    const walk = active || v.walking || v.fx.some((f) => f.type === 'lunge' && running01(f, now) !== null);
    const period = v.walking ? 180 : 260;
    const img = spriteImage(sprite, scale, hero ? 'right' : 'left', walk, now, period, flash);
    if (img) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 4 + dy + bob));
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.globalAlpha = alpha;
    ctx.font = `${unit.boss ? 60 : 40}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(unit.icon ?? '👾', x, y + dy + bob);
    ctx.globalAlpha = 1;
  }

  // Effets par-dessus le personnage.
  const top = y - 32 * scale;
  for (const f of v.fx) {
    const k = running01(f, now);
    if (k === null) continue;
    if (f.type === 'cast') drawCastHalo(ctx, x, y, top, k, f.color, scale);
    if (f.type === 'sparkle') drawSparkles(ctx, x, y, top, k, f.color);
    if (f.type === 'slash') drawSlash(ctx, v.x, y - 16 * scale, k, -facing);
  }
  if (active && unit.alive) {
    const ay = top - 8 + Math.sin(now / 160) * 3;
    ctx.fillStyle = '#ffd35a';
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 6, ay - 7);
    ctx.lineTo(x + 6, ay - 7);
    ctx.lineTo(x, ay);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// Image du personnage prête à poser (pieds en bas, 4 px de marge), avec l'éclair blanc
// de l'impact. Canvas partagé, redessiné à chaque appel.
function spriteImage(sprite, scale, dir, walk, now, period, flash) {
  const w = sprite.frameW * scale + 8;
  const h = sprite.frameH * scale + 8;
  off.width = w;
  off.height = h;
  const o = off.getContext('2d');
  o.imageSmoothingEnabled = false;
  const size = sprite.frameH * scale;
  const stride = Math.floor(now / period);
  drawActor(o, { sx: (w - size) / 2, sy: h - size - 4 - sprite.footOffset * scale, size, scale, dir, moving: walk, stride, progress: (now % period) / period, now, sprite, shadow: false });
  if (flash > 0) {
    o.globalCompositeOperation = 'source-atop';
    o.fillStyle = `rgba(255,255,255,${Math.min(0.85, flash)})`;
    o.fillRect(0, 0, w, h);
    o.globalCompositeOperation = 'source-over';
  }
  return off;
}

// Héros à terre : couché, grisé.
function drawFallen(ctx, sprite, x, y, scale) {
  if (!sprite) return;
  const img = spriteImage(sprite, scale, 'down', false, 0, 1, 0);
  ctx.save();
  ctx.globalAlpha = 0.55;
  if ('filter' in ctx) ctx.filter = 'grayscale(1) brightness(.8)';
  ctx.translate(x, y - 12);
  ctx.rotate(-Math.PI / 2); // la tête à gauche
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

function drawCastHalo(ctx, x, y, top, k, color, scale) {
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const r = 10 + k * 22 * (scale / SCALE);
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + k * 3;
    const px = x + Math.cos(a) * r;
    const py = y - (y - top) * k * (0.4 + (i % 3) * 0.25) + Math.sin(a) * r * 0.38;
    ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
  }
  ctx.restore();
}

function drawSparkles(ctx, x, y, top, k, color) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
  ctx.fillStyle = color;
  for (let i = 0; i < 10; i++) {
    const px = x + Math.sin(i * 2.3) * 16;
    const py = y - ((y - top) * ((k + i * 0.13) % 1));
    const s = i % 3 === 0 ? 3 : 2;
    ctx.fillRect(Math.round(px), Math.round(py), s, s);
  }
  ctx.restore();
}

// Coup d'arme : trois traits blancs en diagonale sur la cible.
function drawSlash(ctx, x, y, k, dir) {
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  const len = 20 + k * 14;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + dir * -len + i * 7, y - len);
    ctx.lineTo(x + dir * len + i * 7, y + len * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

// Barres de vie sous les pieds.
function drawBars(ctx, unit, v, y) {
  if (!unit.alive) return;
  const max = sideOf(unit) === 'hero' ? statsOf(unit).pv : unit.stats.pv;
  const w = unit.boss ? 56 : 36;
  const x = Math.round(v.x - w / 2);
  const by = Math.round(y + 7);
  ctx.fillStyle = 'rgba(0,0,0,.75)';
  ctx.fillRect(x - 1, by - 1, w + 2, 6);
  const k = Math.max(0, Math.min(1, unit.hp / max));
  ctx.fillStyle = k > 0.5 ? '#6fcf5a' : k > 0.25 ? '#e0b23c' : '#e0523c';
  ctx.fillRect(x, by, Math.round(w * k), 4);
  // Monstres : nom sous la barre ; tout le monde : effets en cours au-dessus de la tête.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (sideOf(unit) === 'enemy') {
    ctx.font = 'bold 9px sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText(unit.name, v.x, by + 6);
    ctx.fillStyle = unit.boss ? '#ffb0a0' : '#f0e6d2';
    ctx.fillText(unit.name, v.x, by + 6);
  }
  const icons = [...(unit.guard ? [COMMAND_ICONS.defend] : []), ...statusesOf(unit).map((st) => effectIcon(st.key))];
  const sheet = image('icons/raven16');
  if (icons.length && isReady(sheet)) {
    const scale = unit.boss ? BOSS_SCALE : SCALE;
    const size = 12;
    const left = Math.round(v.x - (icons.length * (size + 1)) / 2);
    const top = Math.round(y - 30 * scale - size - 2);
    icons.forEach((ix, i) => ctx.drawImage(sheet, (ix % 16) * 16, Math.floor(ix / 16) * 16, 16, 16, left + i * (size + 1), top, size, size));
  }
}

function drawPopups(ctx, now) {
  popups = popups.filter((p) => now < p.t0 + 1000);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const p of popups) {
    const k = (now - p.t0) / 1000;
    if (k < 0) continue;
    const v = vis.get(p.unit);
    if (!v) continue;
    const scale = p.unit.boss ? BOSS_SCALE : SCALE;
    const y = Math.max(18 + p.stack * 16, slotOf(p.unit).y - 30 * scale - Math.min(1, k * 3) * 14 - k * 10 - p.stack * 16);
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.font = p.small ? 'bold 11px sans-serif' : `bold ${p.big ? 20 : 16}px sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a0f06';
    ctx.strokeText(p.text, v.x, y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, v.x, y);
  }
  ctx.globalAlpha = 1;
}

// ---- Clic : ciblage ----

function unitAt(ev) {
  const r = canvas.getBoundingClientRect();
  const px = ((ev.clientX - r.left) / r.width) * W;
  const py = ((ev.clientY - r.top) / r.height) * H;
  let best = null;
  for (const u of [...cb.party, ...cb.enemies]) {
    const v = vis.get(u);
    if (!v) continue;
    const scale = u.boss ? BOSS_SCALE : SCALE;
    const { y } = slotOf(u);
    if (Math.abs(px - v.x) < 12 * scale && py < y + 10 && py > y - 30 * scale) {
      if (!best || y > best.y) best = { u, y };
    }
  }
  return best?.u ?? null;
}

function onClick(ev) {
  if (!pick) return;
  const u = unitAt(ev);
  if (u && pick.units.has(u)) pick.onPick(u);
}

function onHover(ev) {
  const u = pick ? unitAt(ev) : null;
  canvas.style.cursor = u && pick.units.has(u) ? 'pointer' : '';
}
