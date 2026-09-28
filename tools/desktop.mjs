// Prépare la version Windows (Electron) : copie dist/anyem.html et l'icône dans desktop/game/,
// reporte la version de package.json dans desktop/package.json. La fabrication du .exe se fait
// ensuite dans desktop/ (npm install puis npm run dist), sur Windows : c'est ce que fait le
// workflow GitHub .github/workflows/release.yml. Usage : npm run desktop
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const game = join(root, 'desktop', 'game');
await mkdir(game, { recursive: true });
await copyFile(join(root, 'dist', 'anyem.html'), join(game, 'anyem.html'));
await copyFile(join(root, 'dist', 'anyem.ico'), join(game, 'anyem.ico'));
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const pkgPath = join(root, 'desktop', 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
if (pkg.version !== version) {
  pkg.version = version;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}
console.log(`Version Windows prête (${version}) : desktop/game/`);
