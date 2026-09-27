// Caméra des cartes plein écran (village, étages) : bord de la vue en pixels.

// Coin de la vue sur un axe : centré sur `v` mais dans la carte ; carte centrée si elle
// est plus petite que l'écran (`max` < 0 = taille de la carte - taille de la vue).
export function clampView(v, max) {
  return max < 0 ? max / 2 : Math.max(0, Math.min(v, max));
}

// Ajuste la résolution d'un canvas à sa taille affichée (1 pixel de canvas = 1 pixel CSS),
// pour que la carte remplisse l'écran sans flou ni déformation.
export function fitCanvas(canvas) {
  const w = Math.max(1, Math.round(canvas.clientWidth));
  const h = Math.max(1, Math.round(canvas.clientHeight));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
