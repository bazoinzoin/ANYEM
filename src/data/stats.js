// Catalogue des statistiques (voir DESIGN_DOC §2).
// suffix '%' : la valeur est un pourcentage.

export const STATS = {
  // Principales
  force: { label: 'Force' },
  agilite: { label: 'Agilité' },
  intelligence: { label: 'Intelligence' },
  // Secondaires offensives
  atq: { label: 'Attaque' },            // dégâts des armes (stat d'objet)
  vit: { label: 'Vitesse' },
  critChance: { label: 'Taux critique', suffix: '%' },
  critDmg: { label: 'Dégâts critiques', suffix: '%' },
  // Secondaires défensives
  pv: { label: 'PV' },
  def: { label: 'Défense' },
  defMag: { label: 'Défense magique' },
  esquive: { label: 'Esquive', suffix: '%' },
  blocage: { label: 'Blocage', suffix: '%' },
  riposte: { label: 'Riposte', suffix: '%' }, // chance de contre-attaquer au corps à corps
};

export const PRIMARY_STATS = ['force', 'agilite', 'intelligence'];

// Ordre d'affichage sur les feuilles de personnage.
export const STAT_ORDER = [
  'force', 'agilite', 'intelligence',
  'atq', 'vit', 'critChance', 'critDmg',
  'pv', 'def', 'defMag', 'esquive', 'blocage', 'riposte',
];

export function zeroStats() {
  return Object.fromEntries(Object.keys(STATS).map((k) => [k, 0]));
}
