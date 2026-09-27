// Carte de l'étage (écran d'expédition) : rendu sur canvas avec une caméra qui suit le
// groupe, déplacement animé (héros qui marche case à case), au clavier (flèches, ZQSD,
// WASD), à la souris ou au doigt (clic sur une case : le groupe y marche pas à pas),
// et croix directionnelle pour le tactile.
// Décors : thèmes par sous-zone (ui/mapThemes.js) ; monstres et héros : sprites
// (ui/spriteCatalog.js) ; échelle et événements : marqueurs dessinés.
// Le canvas occupe tout l'écran d'expédition (fitCanvas), l'interface est posée dessus.

import { state } from '../state.js';
import { visibleFrom, stepToward, idx, isFloor } from '../game/floorMap.js';
import { stepParty, takeLadder, canExplore } from '../game/dungeon.js';
import { goTo } from './router.js';
import { startFloor } from './encounter.js';
import { staticLayer, themeOf, TILE, sheet } from './mapThemes.js';
import { drawActor, dirBetween } from './actors.js';
import { holdToWalk } from './heldKeys.js';
import { heroSprite, lookSprite } from './heroSprite.js';
import { EVENTS } from '../data/events.js';
import { enemySprite, mobScale, mobTier } from './mobSprites.js';
import { clampView, fitCanvas } from './viewport.js';

const SCALE = 3;           // pixels d'écran par pixel de sprite
const STEP_MS = 180;       // durée d'un pas (animation), aussi le rythme de marche
const WALK_MS = STEP_MS;   // délai entre deux pas d'une marche automatique
const ENCOUNTER_MS = 400;  // le monstre touché reste visible un instant avant le combat

// Marche automatique en cours (clic sur une case) : { target, timer }.
let walk = null;
let busy = false; // combat en cours de déclenchement
// Animation : positions affichées (interpolées) du groupe et des monstres.
// followers : compagnons en file indienne derrière le meneur (ils reprennent ses cases).
const anim = { map: null, party: null, followers: [], dir: 'down', facing: 'right', mobs: new Map(), highlight: null };
let frameRequested = false;

function stopWalk() {
  if (walk) clearTimeout(walk.timer);
  walk = null;
}

// Carte plein écran (le canvas prend la taille de son conteneur, voir fitCanvas).
export function mapCanvas() {
  return '<canvas id="floorMap" class="map-full" width="960" height="540"></canvas>';
}

// Croix directionnelle (tactile), bouton de l'échelle et aide, pour le HUD.
export function mapControls() {
  const map = state.expedition.map;
  const onLadder = !!map.ladder && map.party.x === map.ladder.x && map.party.y === map.ladder.y;
  const hasBoss = map.mobs.some((m) => m.boss);
  return `
    <div class="dpad">
      <button data-step="0,-1" aria-label="Haut">▲</button>
      <button data-step="-1,0" aria-label="Gauche">◀</button>
      <button data-step="1,0" aria-label="Droite">▶</button>
      <button data-step="0,1" aria-label="Bas">▼</button>
    </div>
    <p class="hint map-help">Flèches / ZQSD, clic sur une case ou croix. Les monstres bougent à chaque pas ; s'ils vous voient (<b>!</b>), ils vous poursuivent. ${hasBoss ? 'Le boss garde la salle la plus éloignée.' : 'Trouvez l\'échelle pour descendre ; éviter les monstres est possible, sans XP ni butin.'} Les personnages et objets marqués d'un « ! » sont des événements.</p>
    ${map.ladder ? `<button id="ladderBtn" class="btn-primary" ${onLadder && canExplore(state) ? '' : 'disabled'}>Descendre à l'étage suivant</button>` : ''}`;
}

export function bindMap(app) {
  const canvas = app.querySelector('#floorMap');
  if (!canvas) return;
  syncAnim(true);
  requestFrame();
  app.querySelectorAll('[data-step]').forEach((btn) => {
    btn.onclick = () => {
      stopWalk();
      const [dx, dy] = btn.dataset.step.split(',').map(Number);
      step(dx, dy);
    };
  });
  canvas.onclick = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const cam = camera(canvas);
    const px = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    startWalk({ x: Math.floor((px + cam.x) / (TILE * SCALE)), y: Math.floor((py + cam.y) / (TILE * SCALE)) });
  };
  app.querySelector('#ladderBtn')?.addEventListener('click', () => {
    stopWalk();
    if (takeLadder(state)) goTo('dungeon');
  });
}

// ---- Déplacement ----

const DIR_NAMES = { '1,0': 'right', '-1,0': 'left', '0,1': 'down', '0,-1': 'up' };

// Un pas ; retourne vrai si la marche peut continuer.
function step(dx, dy) {
  if (busy || state.screen !== 'dungeon' || !canExplore(state)) return false;
  // Un pas à la fois : le précédent doit être (presque) fini.
  if (anim.party && performance.now() - anim.party.t0 < STEP_MS - 20) return false;
  anim.dir = DIR_NAMES[`${dx},${dy}`] ?? anim.dir;
  if (dx) anim.facing = dx > 0 ? 'right' : 'left';
  const r = stepParty(state, dx, dy);
  syncAnim();
  requestFrame();
  if (r.encounter) {
    stopWalk();
    busy = true;
    anim.highlight = r.encounter.id;
    setTimeout(() => {
      busy = false;
      anim.highlight = null;
      startFloor();
    }, ENCOUNTER_MS);
    return false;
  }
  if (r.event || r.ladder) {
    stopWalk();
    setTimeout(() => goTo('dungeon'), STEP_MS); // panneau d'événement / bouton de l'échelle
    return false;
  }
  return r.moved;
}

function startWalk(target) {
  stopWalk();
  const map = state.expedition?.map;
  if (!map || !isFloor(map, target.x, target.y) || !map.seen[idx(map, target.x, target.y)]) return;
  walk = { target, timer: null };
  const tick = () => {
    if (!walk) return;
    const m = state.expedition?.map;
    if (!m || (m.party.x === target.x && m.party.y === target.y)) return stopWalk();
    const chasedBefore = m.mobs.filter((mob) => mob.chasing).length;
    const next = stepToward(m, m.party, target, (x, y) => !m.seen[idx(m, x, y)]);
    if (!next || !step(next.x - m.party.x, next.y - m.party.y)) return stopWalk();
    // Un monstre vient de repérer le groupe : la marche s'arrête pour laisser réagir.
    if (state.expedition?.map.mobs.filter((mob) => mob.chasing).length > chasedBefore) return stopWalk();
    walk.timer = setTimeout(tick, WALK_MS);
  };
  tick();
}

// Clavier : un pas par appui, puis au rythme de la marche tant que la touche est enfoncée.
holdToWalk({
  active: () => state.screen === 'dungeon' && !!state.expedition?.map,
  onMove: (dx, dy) => {
    stopWalk();
    step(dx, dy);
  },
  interval: STEP_MS,
});

// ---- Animation ----

// Démarre une interpolation vers la position actuelle du groupe et des monstres.
function syncAnim(reset = false) {
  const map = state.expedition?.map;
  if (!map) return;
  const now = performance.now();
  if (reset || anim.map !== map) {
    anim.map = map;
    anim.party = tween(map.party, map.party, now);
    anim.followers = state.party.slice(1).map(() => tween(map.party, map.party, now));
    anim.mobs = new Map();
  }
  const moveTo = (current, pos) => (current.to.x === pos.x && current.to.y === pos.y ? current : tween(posOf(current, now), pos, now, (current.n ?? 0) + 1));
  if (anim.party.to.x !== map.party.x || anim.party.to.y !== map.party.y) {
    // Chaque compagnon prend la case que quitte celui qui le précède.
    const targets = [anim.party.to, ...anim.followers.map((f) => f.to)];
    anim.followers = anim.followers.map((f, i) => moveTo(f, targets[i]));
  }
  anim.party = moveTo(anim.party, map.party);
  for (const mob of map.mobs) {
    const current = anim.mobs.get(mob.id);
    anim.mobs.set(mob.id, current ? moveTo(current, mob) : tween(mob, mob, now));
  }
}

// n : nombre de pas faits (alterne le pied gauche et le pied droit).
const tween = (from, to, t0, n = 0) => ({ from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, t0, n, dir: dirBetween(from, to) });

function posOf(t, now) {
  const k = Math.min(1, (now - t.t0) / STEP_MS);
  return { x: t.from.x + (t.to.x - t.from.x) * k, y: t.from.y + (t.to.y - t.from.y) * k, moving: k < 1, k, n: t.n ?? 0 };
}

function requestFrame() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(frame);
}

// Boucle d'affichage : tourne tant que la carte est à l'écran.
function frame(now) {
  frameRequested = false;
  const canvas = document.querySelector('#floorMap');
  if (!canvas || !state.expedition?.map) return;
  fitCanvas(canvas);
  draw(canvas, now);
  requestFrame();
}

// Trappe ouverte sur une échelle (pack Green Dungeon, dungeon_obj), mise en valeur : halo
// doré qui pulse, étincelles qui montent et flèche qui rebondit au-dessus.
const HATCH = [0, 32, 16, 16];
function drawLadder(ctx, sx, sy, size, now) {
  const cx = sx + size / 2;
  const cy = sy + size / 2;
  const pulse = 0.5 + 0.5 * Math.sin(now / 350);
  const glow = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * (0.9 + 0.15 * pulse));
  glow.addColorStop(0, `rgba(255,214,120,${0.45 + 0.25 * pulse})`);
  glow.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - size, sy - size, size * 3, size * 3);
  const img = sheet('dungeon_obj');
  if (img) ctx.drawImage(img, ...HATCH, sx, sy, size, size);
  ctx.strokeStyle = `rgba(255,232,160,${0.55 + 0.45 * pulse})`;
  ctx.lineWidth = SCALE;
  ctx.strokeRect(sx + SCALE / 2, sy + SCALE / 2, size - SCALE, size - SCALE);
  // Étincelles : 4 points qui montent en boucle.
  for (let i = 0; i < 4; i++) {
    const t = ((now / 1400) + i / 4) % 1;
    ctx.fillStyle = `rgba(255,240,190,${1 - t})`;
    ctx.fillRect(Math.round(sx + size * (0.2 + 0.2 * i)), Math.round(sy + size * (0.8 - t)), SCALE, SCALE);
  }
  // Flèche vers le bas au-dessus de la trappe.
  const u = SCALE;
  const ay = sy - size * 0.55 + Math.round(Math.sin(now / 250) * 2) * u;
  ctx.fillStyle = '#1a0f2a';
  for (let r = 0; r < 5; r++) ctx.fillRect(cx - (5 - r) * u - u, ay + r * u - u, (5 - r) * 2 * u + 2 * u, 3 * u);
  ctx.fillStyle = '#f3d58c';
  for (let r = 0; r < 5; r++) ctx.fillRect(cx - (5 - r) * u, ay + r * u, (5 - r) * 2 * u, u);
}

// Événements de la carte (data/events.js, `look`) : un objet (coffre, autel, source,
// dépouille) ou un personnage, mis en valeur par un halo qui pulse et un « ! » qui flotte.
const eventSprites = new Map();
function eventLook(e) {
  return EVENTS[e.key]?.look ?? null;
}
function drawEventGround(ctx, e, sx, sy, size, now) {
  const look = eventLook(e);
  const cx = sx + size / 2;
  const cy = sy + size * 0.8;
  const pulse = 0.5 + 0.5 * Math.sin(now / 400 + e.x);
  const color = look?.hero ? '120,190,255' : '255,210,110';
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * (0.75 + 0.1 * pulse));
  glow.addColorStop(0, `rgba(${color},${0.35 + 0.25 * pulse})`);
  glow.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.8, size * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawObject(ctx, obj, sx, sy, size) {
  const [name, x, y, w, h] = obj;
  const img = sheet(name);
  if (!img) return;
  // Posé sur la case : centré, pieds en bas de la case.
  const dw = w * SCALE;
  const dh = h * SCALE;
  ctx.drawImage(img, x, y, w, h, Math.round(sx + (size - dw) / 2), Math.round(sy + size - dh), dw, dh);
}
function drawEventMarker(ctx, e, sx, sy, size, now) {
  const look = eventLook(e);
  if (!look) return;
  if (look.object) drawObject(ctx, look.object, sx, sy, size);
  if (look.hero) {
    if (!eventSprites.has(e.key)) eventSprites.set(e.key, lookSprite(look.hero));
    if (look.extra) drawObject(ctx, look.extra, sx + size * 0.55, sy + size * 0.1, size);
    const hurt = look.pose === 'hit';
    drawActor(ctx, { sx, sy, size, scale: SCALE, dir: 'down', now: now + e.x * 97, sprite: eventSprites.get(e.key), anim: hurt ? 'hit' : null, animT: 0.5, shadow: true });
  }
  // « ! » qui flotte au-dessus.
  const u = SCALE;
  const bob = Math.round(Math.sin(now / 300 + e.y) * 2) * u;
  const x = Math.round(sx + size / 2 - u);
  const y = Math.round(sy - size * (look.hero ? 0.55 : 0.2)) + bob;
  ctx.fillStyle = '#1a0f2a';
  ctx.fillRect(x - u, y - u, 4 * u, 8 * u);
  ctx.fillRect(x - u, y + 8 * u, 4 * u, 4 * u);
  ctx.fillStyle = look.hero ? '#8ec5ff' : '#f3d58c';
  ctx.fillRect(x, y, 2 * u, 6 * u);
  ctx.fillRect(x, y + 9 * u, 2 * u, 2 * u);
}

// Position (pixels d'écran) du coin haut-gauche de la vue : centrée sur le groupe.
function camera(canvas, now = performance.now()) {
  const map = state.expedition.map;
  const p = anim.party ? posOf(anim.party, now) : map.party;
  const size = TILE * SCALE;
  return {
    x: Math.round(clampView((p.x + 0.5) * size - canvas.width / 2, map.w * size - canvas.width)),
    y: Math.round(clampView((p.y + 0.5) * size - canvas.height / 2, map.h * size - canvas.height)),
  };
}

function draw(canvas, now) {
  const exp = state.expedition;
  const map = exp.map;
  if (anim.map !== map) syncAnim(true);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const size = TILE * SCALE;
  const cam = camera(canvas, now);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Décor (sol, arbres, rochers), dessiné une fois par étage puis recopié.
  const layer = staticLayer(map, exp.dungeonKey, exp.floor);
  ctx.drawImage(layer, cam.x / SCALE, cam.y / SCALE, canvas.width / SCALE, canvas.height / SCALE, 0, 0, canvas.width, canvas.height);

  const x0 = Math.floor(cam.x / size);
  const y0 = Math.floor(cam.y / size);
  const visible = visibleFrom(map, map.party);
  const at = (x, y) => [x * size - cam.x, y * size - cam.y];

  // Marqueurs (échelle, événements) sous les personnages.
  const glyph = (x, y, text, bg, ring = null) => {
    const [sx, sy] = at(x, y);
    const cx = sx + size / 2;
    const cy = sy + size / 2;
    if (bg) {
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(cx, cy + size * 0.28, size * 0.42, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (ring) {
      ctx.strokeStyle = ring;
      ctx.lineWidth = SCALE;
      ctx.beginPath();
      ctx.ellipse(cx, cy + size * 0.28, size * 0.46, size * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (text === 'ladder') return drawLadder(ctx, sx, sy, size, now);
    ctx.font = `bold ${Math.round(size * 0.6)}px FantasyRPGtitle, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = SCALE;
    ctx.strokeStyle = '#1a0f2a';
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = '#f3d58c';
    ctx.fillText(text, cx, cy);
  };
  if (map.ladder && map.seen[idx(map, map.ladder.x, map.ladder.y)]) glyph(map.ladder.x, map.ladder.y, 'ladder', null);
  const eventActors = [];
  for (const e of map.events) {
    if (!map.seen[idx(map, e.x, e.y)]) continue;
    const [sx, sy] = at(e.x, e.y);
    drawEventGround(ctx, e, sx, sy, size, now);
    eventActors.push({ y: e.y, draw: () => drawEventMarker(ctx, e, sx, sy, size, now) });
  }

  // Personnages, triés de haut en bas (les plus bas passent devant).
  const actors = [...eventActors];
  for (const mob of map.mobs) {
    if (!visible.has(idx(map, mob.x, mob.y)) && mob.id !== anim.highlight) continue;
    const t = anim.mobs.get(mob.id) ?? tween(mob, mob, 0);
    const p = posOf(t, now);
    actors.push({ y: p.y, draw: () => drawMob(ctx, mob, p, t.dir ?? 'down', at, size, now) });
  }
  const hp = posOf(anim.party, now);
  actors.push({ y: hp.y + 0.02, draw: () => drawHero(ctx, state.party[0], hp, anim.dir, at, now) });
  anim.followers.forEach((f, i) => {
    const hero = state.party[i + 1];
    if (!hero) return;
    const fp = posOf(f, now);
    actors.push({ y: fp.y + 0.01 - i * 0.001, draw: () => drawHero(ctx, hero, fp, f.dir ?? anim.dir, at, now) });
  });
  actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());

  // Brouillard : jamais vu = noir ; déjà vu mais hors de vue = assombri.
  for (let y = y0; y <= y0 + Math.ceil(canvas.height / size); y++) {
    for (let x = x0; x <= x0 + Math.ceil(canvas.width / size); x++) {
      if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
      const i = idx(map, x, y);
      const [sx, sy] = at(x, y);
      if (!map.seen[i]) {
        ctx.fillStyle = '#000';
        ctx.fillRect(sx, sy, size, size);
      } else if (!visible.has(i)) {
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fillRect(sx, sy, size, size);
      }
    }
  }
  if (themeOf(exp.dungeonKey, exp.floor)?.weather === 'snow') drawSnow(ctx, canvas, now, cam);
}

function drawMob(ctx, mob, p, dir, at, size, now) {
  const [sx, sy] = at(p.x, p.y);
  const cx = sx + size / 2;
  const lead = leadOf(mob);
  if (mob.boss || mob.id === anim.highlight) {
    ctx.strokeStyle = mob.id === anim.highlight ? '#fff' : '#f0c060';
    ctx.lineWidth = SCALE;
    ctx.beginPath();
    ctx.ellipse(cx, sy + size * 0.9, size * 0.46, size * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Le plus fort du groupe le représente ; élites et boss sont dessinés plus grands.
  const sprite = enemySprite(lead);
  if (sprite) {
    const scale = mobScale(lead, SCALE, size * 2.2);
    drawActor(ctx, { sx, sy, size, scale, dir, moving: p.moving, stride: p.n, progress: p.k, now: now + mob.x * 53, sprite, shadow: false });
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (mob.enemies.length > 1) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(size * 0.3)}px sans-serif`;
    ctx.fillText(`×${mob.enemies.length}`, sx + size * 0.85, sy + size * 0.85);
  }
  if (mob.chasing) {
    ctx.fillStyle = '#ffd24a';
    ctx.font = `bold ${Math.round(size * 0.5)}px sans-serif`;
    ctx.fillText('!', cx, sy - size * 0.15);
  }
}

// Monstre qui représente un groupe sur la carte : boss, sinon élite, sinon le premier.
function leadOf(mob) {
  const rank = { boss: 2, elite: 1, normal: 0 };
  return mob.enemies.reduce((best, key) => (rank[mobTier(key)] > rank[mobTier(best)] ? key : best), mob.enemies[0]);
}

// Héros : son apparence (marche pendant un pas, attente sinon), pieds au bas de la case.
function drawHero(ctx, hero, p, dir, at, now) {
  const [sx, sy] = at(p.x, p.y);
  const sprite = heroSprite(hero);
  drawActor(ctx, { sx, sy, size: TILE * SCALE, scale: SCALE, dir: dir ?? 'down', facing: anim.facing, moving: p.moving, stride: p.n, progress: p.k, now, sprite });
}

// Neige qui tombe (Pics gelés) : flocons en espace monde, qui dérivent doucement, et
// léger voile froid.
function drawSnow(ctx, canvas, now, cam) {
  ctx.fillStyle = 'rgba(170,200,255,.07)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const t = now / 1000;
  const w = canvas.width;
  const h = canvas.height;
  for (let i = 0; i < 90; i++) {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const r = seed - Math.floor(seed);
    const speed = 18 + r * 30;
    const size = SCALE * (r < 0.3 ? 2 : 1);
    const x = ((r * 7919 * w + Math.sin(t * (0.6 + r) + i) * 14 * SCALE - cam.x * 0.3) % w + w) % w;
    const y = ((((i * 97.3) % h) + t * speed * SCALE - cam.y * 0.3) % h + h) % h;
    ctx.fillStyle = r < 0.3 ? 'rgba(255,255,255,.95)' : 'rgba(235,245,255,.7)';
    ctx.fillRect(Math.round(x / SCALE) * SCALE, Math.round(y / SCALE) * SCALE, size, size);
  }
}
