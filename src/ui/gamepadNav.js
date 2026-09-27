// Navigation à la manette dans les menus : choix de l'élément voisin dans une direction.
// Pur (testé) : on travaille sur des rectangles { x, y, w, h }.

const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * Index du rectangle le plus proche de `from` dans la direction { dx, dy } (une seule des
 * deux vaut ±1), ou -1. Un candidat doit être devant (au-delà du centre de départ) ; on
 * préfère ce qui est aligné : distance dans l'axe + 2 × écart sur l'autre axe.
 */
export function pickNext(from, rects, { dx, dy }) {
  const a = center(from);
  let best = -1;
  let bestScore = Infinity;
  rects.forEach((r, i) => {
    const b = center(r);
    const along = dx ? (b.x - a.x) * dx : (b.y - a.y) * dy;
    if (along <= 1) return;
    const across = dx ? Math.abs(b.y - a.y) : Math.abs(b.x - a.x);
    // Chevauchement sur l'autre axe : considéré comme aligné.
    const overlap = dx ? r.y < from.y + from.h && r.y + r.h > from.y : r.x < from.x + from.w && r.x + r.w > from.x;
    const score = along + (overlap ? 0 : 2 * across);
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}

// Index du rectangle dont le centre est le plus proche du point (x, y), ou -1.
export function nearest(point, rects) {
  let best = -1;
  let bestD = Infinity;
  rects.forEach((r, i) => {
    const c = center(r);
    const d = (c.x - point.x) ** 2 + (c.y - point.y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

// Direction d'une manette standard : croix (boutons 12 à 15) ou stick gauche (seuil 0,5,
// axe dominant). Retourne { dx, dy } ou null.
export function padDirection(buttons, axes) {
  const pressed = (i) => !!buttons[i]?.pressed;
  if (pressed(12)) return { dx: 0, dy: -1 };
  if (pressed(13)) return { dx: 0, dy: 1 };
  if (pressed(14)) return { dx: -1, dy: 0 };
  if (pressed(15)) return { dx: 1, dy: 0 };
  const [x = 0, y = 0] = axes ?? [];
  if (Math.max(Math.abs(x), Math.abs(y)) < 0.5) return null;
  return Math.abs(x) > Math.abs(y) ? { dx: Math.sign(x), dy: 0 } : { dx: 0, dy: Math.sign(y) };
}
