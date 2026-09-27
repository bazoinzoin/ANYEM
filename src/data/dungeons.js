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
    desc: 'Gobelins, loups et créatures des fées rôdent sous les arbres morts.',
    subzones: [
      { name: 'La Lisière', minLevel: 1, maxLevel: 3, pool: ['gobelin', 'loup', 'slime'], boss: 'chefGobelin' },
      { name: 'Les Sous-bois', minLevel: 4, maxLevel: 6, pool: ['gobelin', 'loup', 'serpentAile', 'lapinSoldat', 'orque'], elites: ['loupAlpha', 'fauveEclipse'], boss: 'ogre' },
      { name: 'Le Cœur de la forêt', minLevel: 7, maxLevel: 10, pool: ['lutin', 'satyre', 'chienVioloneux', 'escargotAncien', 'serpentAile'], elites: ['oursHibou', 'dragonFeerique', 'reineSylvestre'], boss: 'wendigo' },
    ],
  }),
  catacombes: zone({
    name: 'Catacombes oubliées',
    icon: '⚰️',
    desc: 'Les morts ne reposent pas en paix sous le vieux cimetière.',
    subzones: [
      { name: 'Le Vieux cimetière', minLevel: 11, maxLevel: 13, pool: ['squelette', 'zombie', 'chauveSouris'], boss: 'chevalierMort' },
      { name: "L'Ossuaire", minLevel: 14, maxLevel: 17, pool: ['squelette', 'zombie', 'spectre', 'momie'], elites: ['abomination', 'gardienAnubis'], boss: 'eveque' },
      { name: 'La Crypte royale', minLevel: 18, maxLevel: 20, pool: ['spectre', 'momie', 'chauveSouris', 'squelette'], elites: ['banshee', 'vampire'], boss: 'liche' },
    ],
  }),
  cavernesArdentes: zone({
    name: 'Cavernes ardentes',
    icon: '🌋',
    desc: 'Sous la montagne, les galeries des kobolds plongent vers un lac de lave.',
    subzones: [
      { name: 'Les Galeries', minLevel: 21, maxLevel: 23, pool: ['kobold', 'salamandre', 'chienDesEnfers'], boss: 'minotaure' },
      { name: 'Les Forges noyées', minLevel: 24, maxLevel: 27, pool: ['kobold', 'salamandre', 'diablotin', 'gog'], elites: ['golemMagma', 'fouisseur', 'blemmye', 'verGeant'], boss: 'efrit' },
      { name: 'Le Lac de lave', minLevel: 28, maxLevel: 30, pool: ['salamandre', 'diablotin', 'gog', 'chienDesEnfers'], elites: ['golemMagma', 'cyclopeDesForges'], boss: 'dragonRouge' },
    ],
  }),
  picsGeles: zone({
    name: 'Pics gelés',
    icon: '🏔️',
    desc: 'Un blizzard éternel souffle sur les sommets où dort un dragon.',
    subzones: [
      { name: 'Les Contreforts', minLevel: 31, maxLevel: 33, pool: ['loupDeGivre', 'bonnetRouge', 'salamandreGivre'], boss: 'wendigoDesNeiges' },
      { name: 'Le Col des tempêtes', minLevel: 34, maxLevel: 37, pool: ['loupDeGivre', 'griffon', 'kappa', 'ronin', 'elementaireDeGlace'], elites: ['yeti', 'samourai', 'sorciereDesNeiges'], boss: 'demonDeGivre' },
      { name: 'Le Nid du dragon', minLevel: 38, maxLevel: 40, pool: ['elementaireDeGlace', 'griffon', 'dragonnet', 'ronin'], elites: ['yeti', 'oni', 'tengu', 'geantDuGivre'], boss: 'dragonDeGlace' },
    ],
  }),
  abimeInfernal: zone({
    name: 'Abîme infernal',
    icon: '🔥',
    desc: "Au fond du monde, une porte s'ouvre sur le royaume des démons.",
    subzones: [
      { name: 'La Porte', minLevel: 41, maxLevel: 43, pool: ['demon', 'chevalierInfernal', 'chienDesEnfers'], elites: ['gardienDeLaPorte'], boss: 'demonAile' },
      { name: 'Le Palais des tourments', minLevel: 44, maxLevel: 47, pool: ['demon', 'succube', 'chevalierInfernal', 'sorcierNoir'], elites: ['behemoth', 'djinnNoir'], boss: 'gorgone' },
      { name: "Le Trône de l'Abîme", minLevel: 48, maxLevel: 50, pool: ['succube', 'chevalierInfernal', 'demon', 'sorcierNoir'], elites: ['behemoth', 'djinnNoir', 'angeDechu'], boss: 'seigneurDeLAbime' },
    ],
  }),
};

export const DUNGEON_ORDER = Object.keys(DUNGEONS);
