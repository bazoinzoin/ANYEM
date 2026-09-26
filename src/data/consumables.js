// Consommables vendus par le Marchand et utilisables en combat (action « Objet »).
// Données pures. Effets (voir game/consumables.js) :
//   healPct      soigne ce % des PV max de la cible
//   resourcePct  rend ce % de la ressource max (Rage, Énergie, Mana)
//   cleanse      retire les effets négatifs (poison, ralentissement…)
//   revivePct    relève un allié tombé avec ce % de ses PV
// target : 'ally' (allié en vie) ou 'deadAlly' (allié tombé).

export const CONSUMABLES = {
  potion: {
    name: 'Potion de soin', icon: '🧪', price: 20, target: 'ally',
    effect: { healPct: 30 }, desc: 'Rend 30 % des PV max à un allié.',
  },
  grandePotion: {
    name: 'Grande potion de soin', icon: '⚗️', price: 50, target: 'ally',
    effect: { healPct: 60 }, desc: 'Rend 60 % des PV max à un allié.',
  },
  elixir: {
    name: 'Élixir', icon: '💧', price: 35, target: 'ally',
    effect: { resourcePct: 50 }, desc: 'Rend 50 % de sa ressource (Rage, Énergie ou Mana) à un allié.',
  },
  remede: {
    name: 'Remède', icon: '🌿', price: 25, target: 'ally',
    effect: { cleanse: true }, desc: 'Retire tous les effets négatifs (poison, ralentissement, confusion…) d\'un allié.',
  },
  plumeDePhenix: {
    name: 'Plume de phénix', icon: '🪶', price: 100, target: 'deadAlly',
    effect: { revivePct: 30 }, desc: 'Relève un allié tombé avec 30 % de ses PV.',
  },
};

export const CONSUMABLE_ORDER = Object.keys(CONSUMABLES);
