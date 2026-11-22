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
for (const c of data.changelog || []) if (!date.test(c.date) || !c.change) errs.push(`changelog entry malformed: ${JSON.stringify(c)}`);

if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`valid: ${data.standards.length} standards, ${data.layers.length} layers`);
