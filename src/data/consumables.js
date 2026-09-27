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
//   cure            retire ces effets négatifs (clés du catalogue data/effects.js)
//   cleanse         retire tous les effets négatifs
//   revivePct       relève un allié tombé avec ce % de ses PV
//   restorePartyPct rend ce % des PV et de la ressource à chaque héros en vie
//   oncePerTier     utilisable une seule fois par palier du donjon (entre deux boss)

import { EFFECTS } from './effects.js';

export const CONSUMABLES = {
  // ---- Soins ----
  potion: {
    name: 'Potion de soin', icon: '🧪', price: 40, drop: 30, category: 'soin', use: ['combat', 'map'], target: 'ally',
    effect: { healPct: 30 }, desc: 'Rend 30 % des PV max à un allié.',
  },
  grandePotion: {
    name: 'Grande potion de soin', icon: '⚗️', price: 100, drop: 8, category: 'soin', use: ['combat', 'map'], target: 'ally',
    effect: { healPct: 60 }, desc: 'Rend 60 % des PV max à un allié.',
  },
  elixir: {
    name: 'Élixir', icon: '💧', price: 70, drop: 12, category: 'soin', use: ['combat', 'map'], target: 'ally',
    effect: { resourcePct: 50 }, desc: 'Rend 50 % de sa ressource (Rage, Énergie ou Mana) à un allié.',
  },
  plumeDePhenix: {
    name: 'Plume de phénix', icon: '🪶', price: 200, drop: 3, category: 'soin', use: ['combat', 'map'], target: 'deadAlly',
    effect: { revivePct: 30 }, desc: 'Relève un allié tombé avec 30 % de ses PV.',
  },

  // ---- Remèdes : un remède bon marché par effet négatif, et le Remède universel.
  // Utilisables aussi entre deux combats : les effets négatifs restent d'un combat
  // à l'autre (jusqu'au retour au village). ----
  antidote: {
    name: 'Antidote', icon: '🧴', price: 24, drop: 6, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['poison'] }, desc: 'Guérit le poison.',
  },
  bandage: {
    name: 'Bandage', icon: '🩹', price: 24, drop: 6, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['saignement'] }, desc: 'Arrête un saignement.',
  },
  onguent: {
    name: 'Onguent', icon: '🫙', price: 24, drop: 4, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['brulure'] }, desc: 'Soigne une brûlure.',
  },
  selsRevigorants: {
    name: 'Sels revigorants', icon: '🧂', price: 30, drop: 4, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['etourdi'] }, desc: "Réveille un allié étourdi (il pourra jouer à son prochain tour).",
  },
  tisaneDeClarte: {
    name: 'Tisane de clarté', icon: '🍵', price: 30, drop: 3, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['confus'] }, desc: "Dissipe la confusion d'un allié.",
  },
  tonique: {
    name: 'Tonique', icon: '🥤', price: 24, drop: 4, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['ralenti'] }, desc: 'Annule un ralentissement.',
  },
  fortifiant: {
    name: 'Fortifiant', icon: '🍖', price: 24, drop: 3, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['affaibli'] }, desc: 'Annule un affaiblissement (dont les malédictions).',
  },
  potionDeCourage: {
    name: 'Potion de courage', icon: '🦁', price: 30, drop: 3, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['terreur'] }, desc: 'Chasse la terreur.',
  },
  eauBenite: {
    name: 'Eau bénite', icon: '⛲', price: 36, drop: 3, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['tenebres'] }, desc: 'Purifie les ténèbres.',
  },
  outilsDeDesamorcage: {
    name: 'Outils de désamorçage', icon: '🔧', price: 30, drop: 2, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cure: ['piege', 'piegeDeGivre'] }, desc: "Désamorce les pièges posés sur un allié.",
  },
  remede: {
    name: 'Remède universel', icon: '🌿', price: 120, drop: 2, category: 'remede', use: ['combat', 'map'], target: 'ally',
    effect: { cleanse: true }, desc: "Retire tous les effets négatifs d'un allié, quels qu'ils soient.",
  },

  // ---- Utilitaires ----
  tente: {
    name: 'Tente', icon: '⛺', price: 300, drop: 2, category: 'utilitaire', use: ['map'], target: 'party',
    effect: { restorePartyPct: 30, oncePerTier: true }, desc: "Entre deux étages : rend 30 % des PV et de la ressource à toute l'équipe (sauf les héros tombés). Une seule fois par palier de 5 étages.",
  },
};

export const CONSUMABLE_ORDER = Object.keys(CONSUMABLES);

export const CONSUMABLE_CATEGORIES = {
  soin: 'Soins',
  remede: 'Remèdes',
  utilitaire: 'Utilitaires',
};

// Effets négatifs du catalogue : chacun doit avoir un remède dédié (vérifié par
// tests/consumables.test.js).
export const DEBUFF_KEYS = Object.keys(EFFECTS).filter((k) => EFFECTS[k].kind === 'debuff');
