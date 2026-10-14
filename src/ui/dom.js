// Petits outils DOM.

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

// Remplace le contenu d'un élément en gardant sa position de défilement.
export function setHtml(el, html) {
  if (!el) return;
  const top = el.scrollTop;
  const left = el.scrollLeft;
  el.innerHTML = html;
  el.scrollTop = top;
  el.scrollLeft = left;
}

// Canvas net sur les écrans haute densité : renvoie le contexte 2D mis à l'échelle.
export function fitCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
}

export function roundRect(g, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

// Couleur hexadécimale éclaircie (amount > 0) ou assombrie (< 0), avec opacité optionnelle.
export function shade(hex, amount, alpha = 1) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let gr = (n >> 8) & 255;
  let b = n & 255;
  const f = (c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  r = f(r); gr = f(gr); b = f(b);
  return `rgba(${r},${gr},${b},${alpha})`;
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function pickFile(accept, multiple = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => resolve([...input.files]);
    input.click();
  });
}

export function safeFileName(name) {
  return (name || 'projet').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'projet';
}

// Double-clic détecté à l'appui (les événements « pointerdown » ne comptent pas les clics).
let lastDown = { t: 0, x: 0, y: 0, el: null };
export function isDoubleDown(e) {
  const now = performance.now();
  const dbl = lastDown.el === e.currentTarget && now - lastDown.t < 380 && Math.abs(e.clientX - lastDown.x) < 6 && Math.abs(e.clientY - lastDown.y) < 6;
  lastDown = dbl ? { t: 0, x: 0, y: 0, el: null } : { t: now, x: e.clientX, y: e.clientY, el: e.currentTarget };
  return dbl;
}
