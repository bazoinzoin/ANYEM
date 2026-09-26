// Donjons (DESIGN_DOC §5-6) : des lieux à thème de plusieurs étages, un boss
// tous les `bossEvery` étages. Le niveau des ennemis monte de minLevel (étage 1)
// à maxLevel (dernier étage), comme dans le design doc (1 à 20, puis 20 à 30).
// Terminer un donjon débloque le suivant (ordre ci-dessous).
//
// pool   : ennemis des étages ordinaires (tirés au hasard)
// bosses : boss dans l'ordre des paliers (un par palier : étages 5, 10, 15…)

export const DUNGEONS = {
  foretMaudite: {
    name: 'Forêt Maudite',
    icon: '🌲',
    desc: 'Gobelins, loups et araignées rôdent sous les arbres morts.',
    floors: 25,
    bossEvery: 5,
    minLevel: 1,
    maxLevel: 20,
    pool: ['gobelin', 'loup', 'araignee'],
    bosses: ['chefGobelin', 'mereAraignee', 'loupAlpha', 'sylvainCorrompu', 'reineSylvestre'],
  },
  catacombes: {
    name: 'Catacombes oubliées',
    icon: '⚰️',
    desc: 'Les morts ne reposent pas en paix sous le vieux cimetière.',
    floors: 25,
    bossEvery: 5,
    minLevel: 20,
    maxLevel: 30,
    pool: ['squelette', 'zombie', 'spectre'],
    bosses: ['chevalierSquelette', 'necromancien', 'abomination', 'banshee', 'liche'],
  },
};

export const DUNGEON_ORDER = Object.keys(DUNGEONS);
