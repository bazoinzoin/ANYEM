import { test } from 'node:test';
import assert from 'node:assert/strict';

import { splitGloss } from '../src/ui/glossary.js';
import { GLOSSARY } from '../src/data/glossary.js';

const keys = (text, skip) => splitGloss(text, skip).filter((p) => p.key).map((p) => [p.text, p.key]);

test('lexique : les termes sont repérés, le plus long l\'emporte, une seule fois par texte', () => {
  assert.deepEqual(keys('Rapporte des matéria et une matéria rare.'), [['matéria', 'materia']]);
  assert.deepEqual(keys('+10 % Puissance physique'), [['Puissance physique', 'puissancePhysique']]);
  assert.deepEqual(keys('La cible reçoit Puissance.'), [['Puissance', 'effet:puissance']]);
  assert.deepEqual(keys('Un Légendaire et un légendaire'), [['Légendaire', 'legendaire']], 'insensible à la casse');
});

test('lexique : les mots courants ne sont soulignés qu\'avec leur majuscule', () => {
  assert.deepEqual(keys('Force les ennemis à attaquer'), [['Force', 'force']]);
  assert.deepEqual(keys('le guerrier force le passage'), []);
  assert.deepEqual(keys('les attaques'), [], 'pas de morceau de mot');
});

test('lexique : le texte est conservé tel quel ; un terme déjà souligné à côté est ignoré', () => {
  const text = 'Chaque matéria compte ; on peut améliorer les objets.';
  assert.equal(splitGloss(text).map((p) => p.text).join(''), text);
  assert.deepEqual(keys(text, new Set(['materia'])).map(([, k]) => k), ['amelioration']);
  for (const [k, e] of Object.entries(GLOSSARY)) assert.ok(e.desc && e.terms.length, k);
});
