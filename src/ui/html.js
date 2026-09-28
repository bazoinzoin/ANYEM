// Petits utilitaires de rendu HTML.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// À utiliser pour tout texte dynamique inséré dans un template (noms saisis, etc.).
export function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

// Attributs d'une infobulle : <button ${tip('...')}> ou avec classes additionnelles.
export function tip(text, extraClass = '') {
  return `class="tooltip ${extraClass}" data-tip="${esc(text)}"`;
}

// Classe CSS d'une ressource, pour la couleur de sa barre : mana (bleu), energy (jaune), rage (rouge).
const RESOURCE_KINDS = { Mana: 'mana', 'Énergie': 'energy', Rage: 'rage' };
export function resourceKind(name) {
  return RESOURCE_KINDS[name] ?? 'mana';
}

export function bar(value, max, color) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return `<div class="barwrap"><div class="bar" style="width:${pct}%; background:${color}"></div></div>`;
}

export function range({ lo, hi }) {
  return lo === hi ? `${lo}` : `${lo}-${hi}`;
}
