// Intègre les images de assets/ au jeu : génère src/ui/assetData.js, qui exporte
// chaque PNG en data URI (le jeu reste un seul fichier, jouable en double-clic).
// Lancé par « npm run build » ; un test vérifie que le fichier est à jour.
//
// Clé d'une image : son chemin sous assets/, sans extension (ex. « fantasy/Tree_Emerald_1 »).

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const ASSET_MODULE = join(root, 'src/ui/assetData.js');

async function pngFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, e.name);
    if (e.isDirectory()) files.push(...await pngFiles(path));
    else if (e.name.endsWith('.png')) files.push(path);
  }
  return files;
}

export async function assetModule() {
  const lines = [
    '// Fichier généré par tools/assets.mjs (npm run build) : ne pas modifier à la main.',
    '// Images de assets/ en data URI ; voir ui/sprites.js et assets/CREDITS.md.',
    '',
    'export const ASSET_DATA = {',
  ];
  for (const file of await pngFiles(join(root, 'assets'))) {
    const key = relative(join(root, 'assets'), file).replaceAll('\\', '/').replace(/\.png$/, '');
    const data = (await readFile(file)).toString('base64');
    lines.push(`  ${JSON.stringify(key)}: 'data:image/png;base64,${data}',`);
  }
  lines.push('};', '');
  return lines.join('\n');
}

export async function writeAssets() {
  await writeFile(ASSET_MODULE, await assetModule());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeAssets();
  console.log(`Écrit : ${relative(root, ASSET_MODULE)}`);
}
