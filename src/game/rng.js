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

// Générateur local (mulberry32) initialisé par un tirage de la source : pour les
// générations qui demandent beaucoup de tirages variés (cartes d'étage), même quand
// la source est remplacée par une constante dans les tests.
export function seededRandom(seed = source()) {
  let a = Math.floor(seed * 4294967296) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
