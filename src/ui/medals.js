// Médailles de zone (règles : game/medals.js), dessinées en pixel art (SVG, une case =
// un pixel) : le ruban, l'emblème et les couleurs changent selon la zone ; le métal, les
// ornements et l'éclat selon le rang de la difficulté (bronze, puis or, puis prisme ;
// perles, laurier et gemmes, rayons et lueur pour la plus difficile, qui est aussi la plus
// grande). Le rang est relatif au nombre de difficultés à médaille : une difficulté
// ajoutée reprend la même logique. `medalPixels` est pur (testé).

import { DIFFICULTIES } from '../config.js';
import { DUNGEONS } from '../data/dungeons.js';
import { esc } from './html.js';

export const MEDAL_W = 20;
export const MEDAL_H = 26;

// Métaux, du moins au plus précieux : sombre, moyen, clair.
const METALS = [
  { dark: '#5a2f16', mid: '#a4642e', light: '#e0a066', glow: 'rgba(200,120,60,.45)' },   // bronze
  { dark: '#4a5058', mid: '#a9b3bd', light: '#f2f6fa', glow: 'rgba(210,225,240,.55)' },  // argent
  { dark: '#6b4308', mid: '#e0a91e', light: '#fff09a', glow: 'rgba(255,210,80,.7)' },    // or
  { dark: '#5c4a8a', mid: '#e8e4ff', light: '#ffffff', glow: 'rgba(230,220,255,.8)' },   // platine
  { dark: '#3a1e6e', mid: 'prism', light: '#ffffff', glow: 'rgba(255,140,255,.9)' },     // prisme
];

// Zones : ruban (deux couleurs), gemmes et emblème (7 × 7, # = pixel).
const ZONES = {
  foretMaudite: { ribbon: ['#1f5a2a', '#58b04a'], gem: '#6cff7a', emblem: ['...#...', '..###..', '.#####.', '..###..', '.#####.', '#######', '...#...'] },
  catacombes: { ribbon: ['#3b2d52', '#8f7ab8'], gem: '#c9a6ff', emblem: ['.#####.', '#######', '#..#..#', '#######', '.##.##.', '..###..', '..#.#..'] },
  cavernesArdentes: { ribbon: ['#7a1f0c', '#f07a1e'], gem: '#ffb02e', emblem: ['...#...', '..##...', '..###..', '.####..', '.#####.', '#######', '.#####.'] },
  picsGeles: { ribbon: ['#1d4f7a', '#8fd4ff'], gem: '#9ff0ff', emblem: ['#..#..#', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#'] },
  abimeInfernal: { ribbon: ['#2a0a0e', '#c81e2c'], gem: '#ff3b3b', emblem: ['#.....#', '##...##', '.#####.', '##.#.##', '#######', '.#...#.', '..###..'] },
};
const DEFAULT_ZONE = { ribbon: ['#3a3a3a', '#9a9a9a'], gem: '#ffffff', emblem: ['...#...', '...#...', '.#####.', '#######', '.#####.', '.#...#.', '#.....#'] };
const EMPTY = { dark: '#2a2622', mid: '#3a342e', light: '#4a433b', glow: 'transparent' };

// Métal d'un rang (0 = premier) parmi `count` médailles : du bronze au prisme.
export function medalMetal(rank, count) {
  const t = count > 1 ? rank / (count - 1) : 1;
  return Math.round(t * (METALS.length - 1));
}

const hsl = (h, l = 70) => `hsl(${Math.round(h) % 360}, 90%, ${l}%)`;

/**
 * Pixels d'une médaille : { w, h, px: [[x, y, couleur]], sparks: [[x, y]], glow }.
 * `medal` = { rank, count, major } (voir game/medals.js) ; `empty` : emplacement vide.
 */
export function medalPixels(zone, medal, empty = false) {
  const z = ZONES[zone] ?? DEFAULT_ZONE;
  const t = medal.count > 1 ? medal.rank / (medal.count - 1) : 1;
  const metal = empty ? EMPTY : METALS[medalMetal(medal.rank, medal.count)];
  const cells = new Map();
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < MEDAL_W && y < MEDAL_H) cells.set(`${x},${y}`, [x, y, c]); };
  const cx = 9.5;
  const cy = 16.5;
  const face = (x, y) => (metal.mid === 'prism' ? hsl((x + y) * 24, 78) : metal.mid);
  const ribbon = empty ? [EMPTY.dark, EMPTY.mid] : z.ribbon;

  // Rayons (médaille majeure) : huit pointes derrière le disque.
  if (medal.major && !empty) {
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4 + Math.PI / 8;
      for (let r = 6.5; r <= 9.4; r += 0.5) put(Math.floor(cx + Math.cos(ang) * r), Math.floor(cy + Math.sin(ang) * r), r > 8.4 ? metal.light : metal.mid === 'prism' ? hsl(a * 45, 70) : metal.mid);
    }
  }
  // Ruban : deux bandes en V, bord foncé et centre clair ; un fil de métal à partir du rang moyen.
  for (let y = 0; y <= 11; y++) {
    const left = 4 + Math.floor(y * 0.25);
    for (let i = 0; i < 4; i++) {
      const c = i === 0 || i === 3 ? ribbon[0] : ribbon[1];
      put(left + i, y, c);
      put(MEDAL_W - 1 - left - i, y, c);
    }
    if (t >= 0.34 && !empty) { put(left + 1, y, metal.light); put(MEDAL_W - 2 - left, y, metal.light); }
  }
  // Laurier (rang élevé) : feuilles autour du bas du disque (y vers le bas).
  if (t >= 0.67 && !empty) {
    for (let deg = 5; deg <= 175; deg += 10) {
      if (deg > 70 && deg < 110) continue;
      const ang = (deg * Math.PI) / 180;
      put(Math.floor(cx + Math.cos(ang) * 7.7), Math.floor(cy + Math.sin(ang) * 7.7), deg % 20 === 5 ? '#2e7d32' : '#66bb4a');
    }
  }
  // Disque : bord, face, reflet en haut à gauche, perles sur le bord à partir du rang moyen.
  for (let y = 0; y < MEDAL_H; y++) {
    for (let x = 0; x < MEDAL_W; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > 6.8) continue;
      if (d > 5.6) {
        const bead = t >= 0.34 && !empty && (x + y) % 2 === 0;
        put(x, y, bead ? metal.light : metal.dark);
      } else if (d > 4.4 && dx + dy < -2) put(x, y, metal.light);
      else put(x, y, face(x, y));
    }
  }
  // Emblème de la zone (en creux : couleur sombre du métal).
  if (!empty) {
    z.emblem.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '#') put(6 + i, 13 + j, metal.dark);
    }));
  }
  // Gemmes (rang élevé) : aux quatre points cardinaux du bord.
  if (t >= 0.67 && !empty) {
    for (const [x, y] of [[9, 10], [10, 10], [3, 16], [16, 16], [9, 23], [10, 23]]) put(x, y, z.gem);
  }
  // Étincelles animées : plus nombreuses avec le rang.
  const sparks = empty ? [] : [[2, 11], [17, 12], [15, 24], [3, 22], [17, 20], [1, 17]].slice(0, 1 + medal.rank * 2 + (medal.major ? 1 : 0));
  return { w: MEDAL_W, h: MEDAL_H, px: [...cells.values()], sparks, glow: metal.glow };
}

// SVG d'une médaille (ou de son emplacement vide), largeur en pixels d'écran.
function medalSvg(zone, medal, empty, width) {
  const { w, h, px, sparks } = medalPixels(zone, medal, empty);
  const rects = px.map(([x, y, c]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`).join('');
  const sp = sparks.map(([x, y], i) => `<rect class="medal-spark" style="animation-delay:${(i * 0.37).toFixed(2)}s" x="${x}" y="${y}" width="1" height="1" fill="#fff"/>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="${width}" height="${Math.round((width * h) / w)}" shape-rendering="crispEdges" aria-hidden="true">${rects}${sp}</svg>`;
}

// Rangée de médailles d'une zone : [{ difficulty, won, rank, count, major }] (zoneMedals).
export function medalRow(zone, medals) {
  const zoneName = DUNGEONS[zone]?.name ?? '';
  return `<div class="medals">${medals.map((m) => {
    const diff = DIFFICULTIES[m.difficulty].name;
    const tip = m.won ? `Médaille ${diff} — ${zoneName}` : `Médaille ${diff} à gagner : vaincre le dernier boss de la zone en ${diff}`;
    const width = m.major ? 58 : 42;
    const glow = m.won ? medalPixels(zone, m).glow : 'transparent';
    return `<span class="medal ${m.won ? 'won' : 'empty'} ${m.major ? 'major' : ''} medal-r${m.rank}" style="--medal-glow:${glow}" title="${esc(tip)}">${medalSvg(zone, m, !m.won, width)}</span>`;
  }).join('')}</div>`;
}
