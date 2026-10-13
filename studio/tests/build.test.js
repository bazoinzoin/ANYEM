import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build, OUTPUT } from '../tools/build.mjs';
import { changelogSection } from '../tools/changelog.mjs';
import { VERSION } from '../src/version.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('dist/onde-studio.html est à jour (sinon : npm run build dans studio/)', async () => {
  const expected = await build();
  const actual = await readFile(OUTPUT, 'utf8').catch(() => '');
  assert.ok(actual === expected, 'studio/dist/onde-studio.html est périmé : lance « npm run build » dans studio/ et commite le résultat.');
});

// Les tests unitaires n'importent pas l'interface : on vérifie ici que tout le code est valide.
test('le logiciel en un seul fichier ne contient pas d\'erreur de syntaxe', async () => {
  const html = await build();
  const start = html.indexOf('<script>\n"use strict";');
  const code = html.slice(start + '<script>'.length, html.indexOf('</script>', start));
  assert.doesNotThrow(() => new Function(code), 'erreur de syntaxe');
});

test('couches respectées : core → audio → ui', async () => {
  for (const [dir, forbidden] of [['core', ['../audio/', '../ui/']], ['audio', ['../ui/']]]) {
    for (const f of await readdir(join(root, 'src', dir))) {
      const code = await readFile(join(root, 'src', dir, f), 'utf8');
      for (const bad of forbidden) assert.ok(!code.includes(`from '${bad}`), `src/${dir}/${f} importe ${bad}`);
    }
  }
});

test('version : package.json = src/version.js = desktop/package.json, journal à jour', async () => {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const desk = JSON.parse(await readFile(join(root, 'desktop', 'package.json'), 'utf8'));
  assert.equal(pkg.version, VERSION);
  assert.equal(desk.version, VERSION, 'lance « npm run desktop » dans studio/');
  const log = await readFile(join(root, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelogSection(log, VERSION), `CHANGELOG.md doit avoir une section [${VERSION}]`);
});
