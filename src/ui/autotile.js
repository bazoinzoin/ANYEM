// Tuiles « blob » (47 formes + vide) des tilesets du pack Fan-tasy : la tuile d'une case
// dépend de ses 8 voisines. Gabarit : assets Tileset_Layout (6 × 8 tuiles), lu case par
// case (haut-gauche, haut, haut-droite, gauche, centre, droite, bas-gauche, bas, bas-droite).
// Un coin ne compte que si ses deux côtés voisins sont aussi du même terrain.

const LAYOUT = [
  '000010010 000011011 000111111 000110110 000111011 010110110',
  '010010010 011011011 111111111 110110110 011011010 110111000',
  '010010000 011011000 111111000 110110000 010011011 000111110',
  '000010000 000011000 000111000 000110000 011111000 110110010',
  '111111110 111111011 000011010 000110010 010111111 110111110',
  '110111111 011111111 010011000 010110000 011111011 111111010',
  '010111011 010111110 010111000 010011010 011111110 110111011',
  '011111010 110111010 010110010 000111010 010111010 000000000',
];

const BY_PATTERN = new Map();
LAYOUT.forEach((row, ty) => row.split(' ').forEach((pattern, tx) => BY_PATTERN.set(pattern, [tx, ty])));

/**
 * Position [colonne, ligne] dans le gabarit de la tuile d'une case, selon `same(dx, dy)`
 * (vrai si la voisine est du même terrain). Case hors terrain : la tuile vide.
 */
export function blobTile(same) {
  if (!same(0, 0)) return BY_PATTERN.get('000000000');
  const n = same(0, -1);
  const s = same(0, 1);
  const w = same(-1, 0);
  const e = same(1, 0);
  const cells = [
    n && w && same(-1, -1), n, n && e && same(1, -1),
    w, true, e,
    s && w && same(-1, 1), s, s && e && same(1, 1),
  ];
  return BY_PATTERN.get(cells.map((c) => (c ? 1 : 0)).join(''));
}

// Autotiles RPG Maker 2000/2003 (bloc de 3 × 4 tuiles de 16 px) : chaque quart de case
// (8 × 8 px) est pris dans le bloc selon ses voisins. Ligne 0 : tuile isolée, (inutilisée),
// coins intérieurs ; lignes 1 à 3 : bords et centre (3 × 3).
// Retourne pour le quart `q` (0 haut-gauche, 1 haut-droite, 2 bas-gauche, 3 bas-droite)
// [colonne, ligne] de la tuile source dans le bloc ; `same(dx, dy)` comme blobTile.
export function rmQuarter(same, q) {
  const qx = q % 2;
  const qy = q >> 1;
  const hx = qx ? 1 : -1;
  const vy = qy ? 1 : -1;
  const h = same(hx, 0);
  const v = same(0, vy);
  if (h && v) return same(hx, vy) ? [1, 2] : [2, 0];
  if (h) return [1, qy ? 3 : 1];
  if (v) return [qx ? 2 : 0, 2];
  return [qx ? 2 : 0, qy ? 3 : 1];
}
