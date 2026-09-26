// Bestiaire. Les stats évoluent avec le niveau du donjon :
// valeur = base + perLevel * niveau ; la vitesse est tirée dans [min, max].
// Stats non précisées (critique, esquive, blocage…) : 0.

export const ENEMIES = {
  gobelin: {
    name: 'Gobelin',
    icon: '👹',
    pv: { base: 40, perLevel: 8 },
    atq: { base: 8, perLevel: 2 },
    def: { base: 2, perLevel: 1 },
    defMag: { base: 0, perLevel: 1 },
    vit: { min: 6, max: 11 },
  },
};
