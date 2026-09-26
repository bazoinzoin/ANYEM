import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { build, OUTPUT } from '../tools/build.mjs';
import { assetModule, ASSET_MODULE } from '../tools/assets.mjs';

test('dist/anyem.html est à jour (sinon : npm run build)', async () => {
  const expected = await build();
  const actual = await readFile(OUTPUT, 'utf8').catch(() => '');
  assert.ok(actual === expected, 'dist/anyem.html est périmé : lance « npm run build » et commite le résultat.');
});

// Les tests unitaires n'importent pas les écrans (src/ui) : on vérifie ici que
// tout le code du jeu, écrans compris, est syntaxiquement valide.
test('le jeu en un seul fichier ne contient pas d\'erreur de syntaxe', async () => {
  const html = await build();
  const start = html.indexOf('<script>\n"use strict";');
  const code = html.slice(start + '<script>'.length, html.indexOf('</script>', start));
  assert.doesNotThrow(() => new Function(code), 'erreur de syntaxe dans le code du jeu');
});

test('src/ui/assetData.js contient les images de assets/ (sinon : npm run build)', async () => {
  const expected = await assetModule();
  const actual = await readFile(ASSET_MODULE, 'utf8').catch(() => '');
  assert.ok(actual === expected, 'src/ui/assetData.js est périmé : lance « npm run build » et commite le résultat.');
});
