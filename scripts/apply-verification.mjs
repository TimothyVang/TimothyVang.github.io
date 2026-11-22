// Apply fact-check results to data/standards.json.
// Usage: bun scripts/apply-verification.mjs <result.json> [more.json ...]
// Each result file is a JSON array of entries (same fields as standards[]) plus optional
// "drop": true (remove it), "why" and "source_checked" (both discarded after use).
import { readFile, writeFile } from 'node:fs/promises';

const target = new URL('../data/standards.json', import.meta.url);
const data = JSON.parse(await readFile(target, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const FIELDS = ['id', 'name', 'layer', 'backers', 'body', 'status', 'summary', 'url', 'added', 'verified'];

const verified = [], updated = [], removed = [], still = [];
for (const file of process.argv.slice(2)) {
  for (const r of JSON.parse(await readFile(file, 'utf8'))) {
    const i = data.standards.findIndex(s => s.id === r.id);
    if (i < 0) { console.error(`skip unknown id ${r.id}`); continue; }
    const old = data.standards[i];
    if (r.drop) { removed.push({ id: old.id, name: old.name }); data.standards.splice(i, 1); console.log(`drop  ${r.id}: ${r.why || ''}`); continue; }
    const next = Object.fromEntries(FIELDS.map(k => [k, r[k] ?? old[k]]));
    next.id = old.id; next.layer = old.layer; next.added = old.added;      // never moved by a check
    if (!/^https:\/\//.test(next.url)) next.url = old.url;
    const changed = ['name', 'backers', 'body', 'status', 'summary', 'url'].some(k => JSON.stringify(next[k]) !== JSON.stringify(old[k]));
    data.standards[i] = next;
    if (next.verified && !old.verified) verified.push(next.id);
    else if (changed) updated.push(next.id);
    if (!next.verified) still.push(`${next.id}: ${r.why || 'not confirmed'}`);
  }
}

if (verified.length || updated.length || removed.length) {
  data.updated = today;
  const entry = { date: today, note: 'Fact-check pass against primary sources.' };
  if (verified.length) entry.verified = verified;
  if (updated.length) entry.updated = updated;
  if (removed.length) entry.removed = removed;
  data.changelog.push(entry);
}
await writeFile(target, JSON.stringify(data, null, 2) + '\n');
console.log(`verified ${verified.length}, updated ${updated.length}, removed ${removed.length}, still unconfirmed ${still.length}`);
for (const s of still) console.log('  still:', s);
