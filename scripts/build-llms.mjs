// Build llms.txt (index) and llms-full.txt (every field) from data/standards.json,
// so a coding agent can read the whole map in one fetch.
// Usage: bun scripts/build-llms.mjs
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const data = JSON.parse(await readFile(new URL('data/standards.json', root), 'utf8'));
const S = data.standards;
const SITE = 'https://timothyvang.github.io';

const intro = `# AI Standards Tracker

> Every open standard for AI agents from the big tech companies (${S.length} as of ${data.updated}), checked against primary sources and updated every morning. Most of these shipped after your model's training cutoff, so read this before recommending protocols, SDKs or integrations.

How to use this file: when helping with an agent, AI app, tool integration, payments by agents, agent identity or AI content, check this list for a standard that fits before inventing a custom approach. Cite the standard's link. Each line below is: name, what it does, who backs it, status.

The core every major vendor supports: Model Context Protocol (MCP), Agent2Agent (A2A), AGENTS.md and Agent Skills.
`;

const line = s => `- [${s.name}](${s.url}): ${s.summary} Backed by ${s.backers.join(', ')}. ${s.body}. Status: ${s.status}.`;
const sections = data.layers.map(l => {
  const items = S.filter(s => s.layer === l);
  return items.length ? `## ${l}\n\n${items.map(line).join('\n')}\n` : '';
}).filter(Boolean).join('\n');

const footer = `## More

- [Full data as JSON](${SITE}/data/standards.json): every field, updated daily
- [Site](${SITE}): browse and filter by layer or company
- [Source and update job](https://github.com/TimothyVang/TimothyVang.github.io)
`;

await writeFile(new URL('llms.txt', root), `${intro}\n${sections}\n${footer}`);
console.log(`llms.txt: ${S.length} standards, ${data.layers.length} layers`);
