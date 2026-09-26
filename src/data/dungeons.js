// Zones (donjons) : une zone couvre environ 10 niveaux et se découpe en 3 sous-zones
// de 5 étages ; le 5e étage d'une sous-zone est gardé par son boss. Le niveau des
// ennemis monte de minLevel à maxLevel au fil des 5 étages de la sous-zone (le boss
// est au niveau maximum). Terminer une zone ouvre la suivante (ordre ci-dessous),
// jusqu'au niveau 50.
//
// Sous-zone : { name, minLevel, maxLevel, pool, elites, boss }
//   pool   : ennemis ordinaires (tirés au hasard)
//   elites : ennemis renforcés, qui remplacent parfois un ennemi ordinaire (DUNGEON.eliteChance)
//   boss   : boss du 5e étage
// Champs calculés par zone() : floors, bossEvery, minLevel, maxLevel, pool, bosses.

export const FLOORS_PER_SUBZONE = 5;

function zone(def) {
  const subs = def.subzones;
  return {
    ...def,
    floors: subs.length * FLOORS_PER_SUBZONE,
    bossEvery: FLOORS_PER_SUBZONE,
    minLevel: subs[0].minLevel,
    maxLevel: subs[subs.length - 1].maxLevel,
    pool: [...new Set(subs.flatMap((s) => [...s.pool, ...(s.elites ?? [])]))],
    bosses: subs.map((s) => s.boss),
  };
}

export const DUNGEONS = {
  foretMaudite: zone({
    name: 'Forêt Maudite',
    icon: '🌲',
    desc: 'Gobelins, loups et araignées rôdent sous les arbres morts.',
    subzones: [
      { name: 'La Lisière', minLevel: 1, maxLevel: 3, pool: ['gobelin', 'loup'], boss: 'chefGobelin' },
      { name: 'Les Sous-bois', minLevel: 4, maxLevel: 6, pool: ['gobelin', 'loup', 'araignee'], elites: ['loupAlpha'], boss: 'mereAraignee' },
      { name: 'Le Cœur de la forêt', minLevel: 7, maxLevel: 10, pool: ['loup', 'araignee', 'gobelin'], elites: ['loupAlpha', 'sylvainCorrompu'], boss: 'reineSylvestre' },
    ],
  }),
  catacombes: zone({
    name: 'Catacombes oubliées',
    icon: '⚰️',
    desc: 'Les morts ne reposent pas en paix sous le vieux cimetière.',
    subzones: [
      { name: 'Le Vieux cimetière', minLevel: 11, maxLevel: 13, pool: ['squelette', 'zombie'], boss: 'chevalierSquelette' },
      { name: "L'Ossuaire", minLevel: 14, maxLevel: 17, pool: ['squelette', 'zombie', 'spectre'], elites: ['abomination'], boss: 'necromancien' },
      { name: 'La Crypte royale', minLevel: 18, maxLevel: 20, pool: ['spectre', 'squelette', 'zombie'], elites: ['abomination', 'banshee'], boss: 'liche' },
    ],
  }),
  cavernesArdentes: zone({
    name: 'Cavernes ardentes',
    icon: '🌋',
    desc: 'Sous la montagne, les galeries des kobolds plongent vers un lac de lave.',
    subzones: [
      { name: 'Les Galeries', minLevel: 21, maxLevel: 23, pool: ['kobold', 'salamandre'], boss: 'roiKobold' },
      { name: 'Les Forges noyées', minLevel: 24, maxLevel: 27, pool: ['kobold', 'salamandre', 'diablotin'], elites: ['golemMagma'], boss: 'salamandreAncestrale' },
      { name: 'Le Lac de lave', minLevel: 28, maxLevel: 30, pool: ['salamandre', 'diablotin', 'kobold'], elites: ['golemMagma'], boss: 'seigneurDesBraises' },
    ],
  }),
  picsGeles: zone({
    name: 'Pics gelés',
    icon: '🏔️',
    desc: 'Un blizzard éternel souffle sur les sommets où dort un dragon.',
    subzones: [
      { name: 'Les Contreforts', minLevel: 31, maxLevel: 33, pool: ['loupDeGivre', 'harpie'], boss: 'reineHarpie' },
      { name: 'Le Col des tempêtes', minLevel: 34, maxLevel: 37, pool: ['loupDeGivre', 'harpie', 'elementaireDeGlace'], elites: ['yeti'], boss: 'geantDuGivre' },
      { name: 'Le Nid du dragon', minLevel: 38, maxLevel: 40, pool: ['elementaireDeGlace', 'harpie', 'loupDeGivre'], elites: ['yeti'], boss: 'dragonDeGlace' },
    ],
  }),
  abimeInfernal: zone({
    name: 'Abîme infernal',
    icon: '🔥',
    desc: "Au fond du monde, une porte s'ouvre sur le royaume des démons.",
    subzones: [
      { name: 'La Porte', minLevel: 41, maxLevel: 43, pool: ['demon', 'chevalierInfernal'], boss: 'gardienDeLaPorte' },
      { name: 'Le Palais des tourments', minLevel: 44, maxLevel: 47, pool: ['demon', 'succube', 'chevalierInfernal'], elites: ['behemoth'], boss: 'reineSuccube' },
      { name: 'Le Trône de l\'Abîme', minLevel: 48, maxLevel: 50, pool: ['succube', 'chevalierInfernal', 'demon'], elites: ['behemoth'], boss: 'seigneurDeLAbime' },
    ],
  }),
};

export const DUNGEON_ORDER = Object.keys(DUNGEONS);
