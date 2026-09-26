import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { build, OUTPUT } from '../tools/build.mjs';

test('dist/anyem.html est à jour (sinon : npm run build)', async () => {
  const expected = await build();
  const actual = await readFile(OUTPUT, 'utf8').catch(() => '');
  assert.ok(actual === expected, 'dist/anyem.html est périmé : lance « npm run build » et commite le résultat.');
});
