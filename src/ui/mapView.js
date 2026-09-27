// Carte de l'étage (écran d'expédition) : rendu sur canvas avec une caméra qui suit le
// groupe, déplacement animé (héros qui marche case à case), au clavier (flèches, ZQSD,
// WASD), à la souris ou au doigt (clic sur une case : le groupe y marche pas à pas),
// et croix directionnelle pour le tactile.
// Décors : tuiles et sprites du pack Fan-tasy pour la Forêt Maudite (ui/mapThemes.js) ;
// couleurs unies pour les autres zones en attendant leurs graphismes. Monstres,
// événements et échelle : emoji provisoires.

import { state } from '../state.js';
import { ENEMIES } from '../data/enemies.js';
import { visibleFrom, stepToward, idx, isFloor } from '../game/floorMap.js';
import { stepParty, takeLadder, canExplore } from '../game/dungeon.js';
import { goTo } from './router.js';
import { startFloor } from './encounter.js';
import { staticLayer, themeOf, TILE } from './mapThemes.js';
import { drawActor, dirBetween } from './actors.js';
import { holdToWalk } from './heldKeys.js';
import { CLASS_SPRITES, ENEMY_SPRITES } from './spriteCatalog.js';

const SCALE = 3;           // pixels d'écran par pixel de sprite
const VIEW_W = 21;         // cases visibles (largeur × hauteur)
const VIEW_H = 13;
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

export function mapCard() {
  const exp = state.expedition;
  const map = exp.map;
  const onLadder = !!map.ladder && map.party.x === map.ladder.x && map.party.y === map.ladder.y;
  const hasBoss = map.mobs.some((m) => m.boss);
  return `
    <div class="card map-card">
      <canvas id="floorMap" width="${VIEW_W * TILE * SCALE}" height="${VIEW_H * TILE * SCALE}"></canvas>
      <div class="map-controls">
        <div class="dpad">
          <button data-step="0,-1" aria-label="Haut">▲</button>
          <button data-step="-1,0" aria-label="Gauche">◀</button>
          <button data-step="1,0" aria-label="Droite">▶</button>
          <button data-step="0,1" aria-label="Bas">▼</button>
        </div>
        <div class="map-help">
          <p class="hint">Déplacement : flèches ou ZQSD, clic sur une case, ou la croix. Chaque pas, les monstres bougent aussi : s'ils vous voient (<b>!</b>), ils vous poursuivent. Toucher un groupe lance le combat.</p>
          <p class="hint">${hasBoss ? '☠️ Le boss garde la salle la plus éloignée : le vaincre termine la sous-zone.' : '🪜 Trouvez l\'échelle pour descendre. Éviter les monstres est possible, mais sans XP ni butin.'} ❔ = événement.</p>
          ${map.ladder ? `<button id="ladderBtn" class="btn-primary" ${onLadder && canExplore(state) ? '' : 'disabled'}>🪜 Descendre à l'étage suivant</button>` : ''}
        </div>
      </div>
    </div>`;
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
  draw(canvas, now);
  requestFrame();
}

// Position (pixels d'écran) du coin haut-gauche de la vue : centrée sur le groupe.
function camera(canvas, now = performance.now()) {
  const map = state.expedition.map;
  const p = anim.party ? posOf(anim.party, now) : map.party;
  const size = TILE * SCALE;
  const clamp = (v, max) => Math.max(0, Math.min(v, max));
  return {
    x: Math.round(clamp((p.x + 0.5) * size - canvas.width / 2, map.w * size - canvas.width)),
    y: Math.round(clamp((p.y + 0.5) * size - canvas.height / 2, map.h * size - canvas.height)),
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
    ctx.font = `${Math.round(size * 0.72)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
  };
  if (map.ladder && map.seen[idx(map, map.ladder.x, map.ladder.y)]) glyph(map.ladder.x, map.ladder.y, '🪜', 'rgba(0,0,0,.45)');
  for (const e of map.events) if (map.seen[idx(map, e.x, e.y)]) glyph(e.x, e.y, '❔', 'rgba(90,50,160,.5)');

  // Personnages, triés de haut en bas (les plus bas passent devant).
  const actors = [];
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
  for (let y = y0; y <= y0 + VIEW_H; y++) {
    for (let x = x0; x <= x0 + VIEW_W; x++) {
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
  const cy = sy + size / 2;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(cx, sy + size * 0.85, size * 0.38, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  if (mob.boss || mob.id === anim.highlight) {
    ctx.strokeStyle = mob.id === anim.highlight ? '#fff' : '#f0c060';
    ctx.lineWidth = SCALE;
    ctx.beginPath();
    ctx.ellipse(cx, sy + size * 0.85, size * 0.46, size * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const sprite = ENEMY_SPRITES[mob.enemies[0]];
  if (sprite) {
    drawActor(ctx, { sx, sy, size, scale: SCALE, dir, moving: p.moving, stride: p.n, progress: p.k, now: now + mob.x * 53, sprite, shadow: false });
  } else {
    ctx.font = `${Math.round(size * (mob.boss ? 0.95 : 0.78))}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ENEMIES[mob.enemies[0]].icon, cx, cy);
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

// Héros : sprite de sa classe (marche pendant un pas, attente sinon), pieds au bas de la case.
function drawHero(ctx, hero, p, dir, at, now) {
  const [sx, sy] = at(p.x, p.y);
  const sprite = CLASS_SPRITES[hero?.classKey] ?? CLASS_SPRITES.paladin;
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
