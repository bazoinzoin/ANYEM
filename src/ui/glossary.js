// Lexique au survol : les mots du lexique (data/glossary.js) sont soulignés dans les textes
// affichés et expliqués dans une bulle qui suit la souris. Un observateur repère le texte
// ajouté à la page (chaque écran se redessine) : aucun écran n'a à s'en occuper.
// Pas de soulignement dans les boutons, les champs de saisie, ni dans un texte qui a déjà
// sa propre infobulle.

import { GLOSSARY } from '../data/glossary.js';
import { esc } from './html.js';

const LETTER = '[\\p{L}\\p{N}]';
const quote = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Terme → clé du lexique (en minuscules pour les termes insensibles à la casse).
const CS = new Map();
const CI = new Map();
for (const [key, entry] of Object.entries(GLOSSARY)) {
  for (const term of entry.terms) (entry.cs ? CS : CI).set(entry.cs ? term : term.toLowerCase(), key);
}
const pattern = (terms, flags) => (terms.length
  ? new RegExp(`(?<!${LETTER})(${[...terms].sort((a, b) => b.length - a.length).map(quote).join('|')})(?!${LETTER})`, flags)
  : null);
const RE_CS = pattern([...CS.keys()], 'gu');
const RE_CI = pattern([...CI.keys()], 'giu');

/**
 * Découpe un texte en morceaux : [{ text, key? }]. Chaque terme n'est souligné qu'à sa
 * première apparition dans le texte (et pas s'il est dans `skip`, déjà souligné à côté).
 * Pur (testé).
 */
export function splitGloss(text, skip = new Set()) {
  const found = [];
  for (const [re, map, lower] of [[RE_CS, CS, false], [RE_CI, CI, true]]) {
    if (!re) continue;
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const key = map.get(lower ? m[1].toLowerCase() : m[1]);
      if (key) found.push({ start: m.index, end: m.index + m[1].length, key });
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const parts = [];
  const used = new Set(skip);
  let at = 0;
  for (const f of found) {
    if (f.start < at || used.has(f.key)) continue;
    used.add(f.key);
    if (f.start > at) parts.push({ text: text.slice(at, f.start) });
    parts.push({ text: text.slice(f.start, f.end), key: f.key });
    at = f.end;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
}

// ---- Dans la page ----

const SKIP = 'button, input, textarea, select, canvas, script, style, h1, h2, .scr-title, .gloss, .tooltip, [data-tip], .no-gloss, .tal-node, .bag-cell';
const done = new WeakSet();

// Souligne les termes du lexique dans les textes sous `root`.
export function glossify(root) {
  if (!root || typeof document === 'undefined') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (done.has(n) || !n.nodeValue.trim() || n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
  for (const node of nodes) {
    done.add(node);
    // Un terme déjà souligné dans le même bloc ne l'est pas une seconde fois.
    const block = node.parentElement?.closest('p, li, td, h1, h2, h3, h4, div, section') ?? node.parentElement;
    const skip = new Set([...(block?.querySelectorAll('.gloss') ?? [])].map((g) => g.dataset.gloss));
    const parts = splitGloss(node.nodeValue, skip);
    if (!parts.some((p) => p.key)) continue;
    const frag = document.createDocumentFragment();
    for (const p of parts) {
      if (!p.key) {
        const t = document.createTextNode(p.text);
        done.add(t);
        frag.appendChild(t);
        continue;
      }
      const span = document.createElement('span');
      span.className = 'gloss';
      span.dataset.gloss = p.key;
      span.textContent = p.text;
      frag.appendChild(span);
    }
    node.replaceWith(frag);
  }
}

// Bulle qui suit la souris.
let bubble = null;
let hovered = null;
function showBubble(target, ev) {
  hovered = target;
  const entry = GLOSSARY[target.dataset.gloss];
  if (!entry) return;
  bubble ??= Object.assign(document.createElement('div'), { id: 'glossTip', className: 'gloss-tip' });
  if (!bubble.isConnected) document.body.appendChild(bubble);
  bubble.innerHTML = `<b>${esc(target.textContent)}</b><br>${esc(entry.desc)}`;
  bubble.style.display = 'block';
  moveBubble(ev);
}
function moveBubble(ev) {
  if (!bubble || bubble.style.display !== 'block') return;
  const pad = 14;
  const w = bubble.offsetWidth;
  const h = bubble.offsetHeight;
  const x = Math.min(window.innerWidth - w - 4, ev.clientX + pad);
  const y = ev.clientY + pad + h > window.innerHeight ? ev.clientY - h - pad : ev.clientY + pad;
  bubble.style.left = `${Math.max(4, x)}px`;
  bubble.style.top = `${Math.max(4, y)}px`;
}
function hideBubble() {
  if (bubble) bubble.style.display = 'none';
}

// Lance l'observation de la page (une fois, au démarrage).
export function startGlossary() {
  if (typeof document === 'undefined') return;
  let queued = false;
  const run = () => { queued = false; glossify(document.getElementById('app')); glossify(document.getElementById('pauseMenu')); };
  new MutationObserver(() => {
    if (hovered && !hovered.isConnected) hideBubble();
    if (!queued) { queued = true; requestAnimationFrame(run); }
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('mouseover', (ev) => {
    const g = ev.target.closest?.('.gloss');
    if (g) showBubble(g, ev);
  });
  document.addEventListener('mousemove', (ev) => { if (ev.target.closest?.('.gloss')) moveBubble(ev); });
  document.addEventListener('mouseout', (ev) => { if (ev.target.closest?.('.gloss')) hideBubble(); });
  run();
}
