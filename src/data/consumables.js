// Consommables vendus par le Marchand. Données pures (effets : game/consumables.js).
//
// category : 'soin' | 'remede' | 'utilitaire' (regroupement à l'affichage)
// use      : où l'objet s'utilise : 'combat' (action « Objet ») et/ou 'map'
//            (entre deux étages d'un donjon)
// target   : 'ally' (allié en vie), 'deadAlly' (allié tombé), 'party' (toute
//            l'équipe, sans ciblage) ou 'none' (effet global, sans ciblage)
// drop     : poids de tirage quand un ennemi laisse un consommable (0 ou absent : jamais)
// effect :
//   healPct         soigne ce % des PV max de la cible
//   resourcePct     rend ce % de la ressource max (Rage, Énergie, Mana)
//   cure            retire les effets négatifs de ces clés (voir DEBUFF_KEYS)
//   cleanse         retire tous les effets négatifs
//   revivePct       relève un allié tombé avec ce % de ses PV
//   restorePartyPct rend ce % des PV et de la ressource à chaque héros en vie
//   escape          quitte le donjon et ramène l'équipe au village, sans perte

export const CONSUMABLES = {
  // ---- Soins ----
  potion: {
    name: 'Potion de soin', icon: '🧪', price: 20, drop: 30, category: 'soin', use: ['combat', 'map'], target: 'ally',
    effect: { healPct: 30 }, desc: 'Rend 30 % des PV max à un allié.',
  },
  grandePotion: {
    name: 'Grande potion de soin', icon: '⚗️', price: 50, drop: 8, category: 'soin', use: ['combat', 'map'], target: 'ally',
    effect: { healPct: 60 }, desc: 'Rend 60 % des PV max à un allié.',
  },
  elixir: {
    name: 'Élixir', icon: '💧', price: 35, drop: 12, category: 'soin', use: ['combat', 'map'], target: 'ally',
    effect: { resourcePct: 50 }, desc: 'Rend 50 % de sa ressource (Rage, Énergie ou Mana) à un allié.',
  },
  plumeDePhenix: {
    name: 'Plume de phénix', icon: '🪶', price: 100, drop: 3, category: 'soin', use: ['combat', 'map'], target: 'deadAlly',
    effect: { revivePct: 30 }, desc: 'Relève un allié tombé avec 30 % de ses PV.',
  },

  // ---- Remèdes : un remède bon marché par effet négatif, et le Remède universel.
  // En combat seulement : les effets négatifs disparaissent à la fin de chaque combat. ----
  antidote: {
    name: 'Antidote', icon: '🧴', price: 12, drop: 6, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cure: ['poison', 'peste'] }, desc: 'Guérit le poison.',
  },
  bandage: {
    name: 'Bandage', icon: '🩹', price: 12, drop: 6, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cure: ['saignement'] }, desc: 'Arrête un saignement.',
  },
  onguent: {
    name: 'Onguent', icon: '🫙', price: 12, drop: 4, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cure: ['brulure'] }, desc: 'Soigne une brûlure.',
  },
  selsRevigorants: {
    name: 'Sels revigorants', icon: '🧂', price: 15, drop: 4, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cure: ['etourdi'] }, desc: "Réveille un allié étourdi (il pourra jouer à son prochain tour).",
  },
  tisaneDeClarte: {
    name: 'Tisane de clarté', icon: '🍵', price: 15, drop: 3, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cure: ['confus'] }, desc: "Dissipe la confusion d'un allié.",
  },
  tonique: {
    name: 'Tonique', icon: '🥤', price: 12, drop: 4, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cure: ['ralenti'] }, desc: 'Annule un ralentissement.',
  },
  fortifiant: {
    name: 'Fortifiant', icon: '🍖', price: 12, drop: 3, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cure: ['affaibli'] }, desc: 'Annule un affaiblissement.',
  },
  potionDeCourage: {
    name: 'Potion de courage', icon: '🦁', price: 15, drop: 3, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cure: ['terreur'] }, desc: 'Chasse la terreur.',
  },
  eauBenite: {
    name: 'Eau bénite', icon: '⛲', price: 18, drop: 3, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cure: ['maudit', 'douleur', 'fleau'] }, desc: 'Lève une malédiction et purifie les ténèbres.',
  },
  remede: {
    name: 'Remède universel', icon: '🌿', price: 60, drop: 2, category: 'remede', use: ['combat'], target: 'ally',
    effect: { cleanse: true }, desc: "Retire tous les effets négatifs d'un allié, quels qu'ils soient.",
  },

  // ---- Utilitaires ----
  corde: {
    name: "Corde d'évasion", icon: '🪢', price: 150, drop: 1, category: 'utilitaire', use: ['combat', 'map'], target: 'none',
    effect: { escape: true }, desc: "Ramène l'équipe au village, même au milieu d'un donjon ou d'un combat, sans rien perdre. La progression reste au dernier boss vaincu.",
  },
  tente: {
    name: 'Tente', icon: '⛺', price: 100, drop: 2, category: 'utilitaire', use: ['map'], target: 'party',
    effect: { restorePartyPct: 100 }, desc: "Entre deux étages : restaure entièrement les PV et la ressource de toute l'équipe (sauf les héros tombés).",
  },
};

export const CONSUMABLE_ORDER = Object.keys(CONSUMABLES);

export const CONSUMABLE_CATEGORIES = {
  soin: 'Soins',
  remede: 'Remèdes',
  utilitaire: 'Utilitaires',
};

// Clés des effets négatifs du jeu (statuts et effets sur la durée), pour vérifier
// que chacun a un remède dédié (voir tests/consumables.test.js).
export const DEBUFF_KEYS = [
  'poison', 'peste', 'saignement', 'brulure', 'douleur', 'fleau',
  'ralenti', 'etourdi', 'confus', 'affaibli', 'maudit', 'terreur',
];
