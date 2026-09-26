// Source d'aléatoire unique du jeu, remplaçable pour les tests (ou pour un futur seed).

let source = Math.random;

export function setRandomSource(fn) {
  source = fn ?? Math.random;
}

export function random() {
  return source();
}

export function rand(min, max) {
  return min + source() * (max - min);
}

export function pick(list) {
  return list[Math.floor(source() * list.length)];
}
