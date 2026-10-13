// Extrait de CHANGELOG.md la section d'une version (texte de la page de téléchargement GitHub).
// Usage (dans studio/) : node tools/changelog.mjs 0.1.0 > notes.md
import { readFile } from 'node:fs/promises';

export function changelogSection(text, version) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## ['));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}

if (process.argv[1]?.endsWith('changelog.mjs')) {
  const version = process.argv[2];
  const text = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  const section = changelogSection(text, version);
  if (!section) { console.error(`Pas de section ${version} dans CHANGELOG.md`); process.exit(1); }
  console.log(section);
}
