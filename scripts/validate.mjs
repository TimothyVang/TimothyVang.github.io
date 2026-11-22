// Fails (exit 1) if data/standards.json is malformed, so a bad omp edit never gets pushed.
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../data/standards.json', import.meta.url), 'utf8'));
const errs = [];
const need = ['id', 'name', 'layer', 'backers', 'body', 'status', 'summary', 'url', 'added', 'verified'];
const ids = new Set();
const date = /^\d{4}-\d{2}-\d{2}$/;

if (!date.test(data.updated)) errs.push('updated must be YYYY-MM-DD');
if (!Array.isArray(data.layers) || !data.layers.length) errs.push('layers missing');
for (const [i, s] of (data.standards || []).entries()) {
  const at = `standards[${i}] ${s.id || ''}`;
  for (const k of need) if (s[k] === undefined || s[k] === '') errs.push(`${at}: missing ${k}`);
  if (ids.has(s.id)) errs.push(`${at}: duplicate id`);
  ids.add(s.id);
  if (!/^[a-z0-9-]+$/.test(s.id || '')) errs.push(`${at}: id must be kebab-case`);
  if (!data.layers.includes(s.layer)) errs.push(`${at}: unknown layer "${s.layer}"`);
  if (!Array.isArray(s.backers) || !s.backers.length) errs.push(`${at}: backers must be a non-empty array`);
  if (!/^https:\/\//.test(s.url || '')) errs.push(`${at}: url must be https`);
  if (!date.test(s.added || '')) errs.push(`${at}: added must be YYYY-MM-DD`);
  if (typeof s.verified !== 'boolean') errs.push(`${at}: verified must be true or false`);
}
// ids that were later removed stay valid in older entries, so history isn't rewritten
for (const c of data.changelog || []) for (const r of c.removed || []) if (r && r.id) ids.add(r.id);
for (const c of data.changelog || []) {
  const at = `changelog ${c.date}`;
  for (const r of c.removed || []) if (!r || !r.id || !r.name) errs.push(`${at}: removed entries need { id, name }`);
  if (!date.test(c.date || '')) errs.push(`${at}: date must be YYYY-MM-DD`);
  if (c.change !== undefined) errs.push(`${at}: use note/added/updated/verified, not free-text "change"`);
  if (!c.note && !['added', 'updated', 'verified', 'removed'].some(k => c[k]?.length)) errs.push(`${at}: needs a note or a non-empty added/updated/verified/removed list`);
  for (const k of ['added', 'updated', 'verified'])
    for (const id of c[k] || []) if (!ids.has(id)) errs.push(`${at}: ${k} lists unknown id "${id}"`);
}

if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`valid: ${data.standards.length} standards, ${data.layers.length} layers`);
