// Merge a batch of new entries into data/standards.json, skipping ids (or names) that already exist.
// Usage: bun scripts/merge.mjs <additions.json> "<changelog line>"
import { readFile, writeFile } from 'node:fs/promises';

const [file, note] = process.argv.slice(2);
const target = new URL('../data/standards.json', import.meta.url);
const data = JSON.parse(await readFile(target, 'utf8'));
const add = JSON.parse(await readFile(file, 'utf8'));
const today = new Date().toISOString().slice(0, 10);

for (const l of add.newLayers || []) if (!data.layers.includes(l)) data.layers.push(l);
const ids = new Set(data.standards.map(s => s.id));
const names = new Set(data.standards.map(s => s.name.toLowerCase()));
const added = add.standards.filter(s => !ids.has(s.id) && !names.has(s.name.toLowerCase()));
data.standards.push(...added);
if (added.length) {
  data.updated = today;
  data.changelog.push({ date: today, note: note || 'Manual research pass.', added: added.map(s => s.id) });
}
await writeFile(target, JSON.stringify(data, null, 2) + '\n');
console.log(`merged ${added.length}, skipped ${add.standards.length - added.length}`);
