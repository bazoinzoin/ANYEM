// Autotiles RPG Maker MV (planches Raven Fantasy réduites en tuiles de 16 px) : chaque quart
// de case (8 × 8 px) est pris dans le bloc de l'autotile selon les cases voisines.
// `same(dx, dy)` : vrai si la case voisine est du même terrain. Quart `q` : 0 haut-gauche,
// 1 haut-droite, 2 bas-gauche, 3 bas-droite. Retour : [colonne, ligne] du quart dans le bloc,
// en quarts (8 px).

// Sol (A1, A2, dessus des murs A4) : bloc de 2 × 3 tuiles = 4 × 6 quarts. Ligne 0 : aperçu
// (quarts 0-1) et coins intérieurs (quarts 2-3) ; lignes 1-2 : bords, coins et centre.
export function mvFloorQuarter(same, q) {
  const qx = q % 2;
  const qy = q >> 1;
  const h = same(qx ? 1 : -1, 0);
  const v = same(0, qy ? 1 : -1);
  if (h && v) return same(qx ? 1 : -1, qy ? 1 : -1) ? [qx ? 1 : 2, qy ? 3 : 4] : [2 + qx, qy];
  if (h) return [qx ? 1 : 2, qy ? 5 : 2];
  if (v) return [qx ? 3 : 0, qy ? 3 : 4];
  return [qx ? 3 : 0, qy ? 5 : 2];
}

// Face d'un mur (A4) : bloc de 2 × 2 tuiles = 4 × 4 quarts ; bords gauche/droite selon les
// faces voisines, haut/bas selon que la face continue au-dessus / en dessous.
export function mvWallQuarter(same, q) {
  const qx = q % 2;
  const qy = q >> 1;
  const h = same(qx ? 1 : -1, 0);
  const v = same(0, qy ? 1 : -1);
  return [qx ? (h ? 1 : 3) : (h ? 2 : 0), qy ? (v ? 1 : 3) : (v ? 2 : 0)];
}
