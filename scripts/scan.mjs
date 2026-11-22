// Gathers candidate "new AI standard" items from GitHub, IETF and company blogs.
// No model calls: it only collects and dedupes. The omp agent judges the candidates.
// Usage: bun scripts/scan.mjs   (or node >= 18). Set GH_TOKEN for higher GitHub rate limits.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url);
const path = p => new URL(p, ROOT);
const DAYS = Number(process.env.SCAN_DAYS || 8);
const since = new Date(Date.now() - DAYS * 864e5);
const sinceISO = since.toISOString().slice(0, 10);

// Companies and bodies we watch. Add an org here to widen coverage.
const GITHUB_ORGS = [
  'modelcontextprotocol', 'a2aproject', 'google', 'google-agentic-commerce', 'openai', 'anthropics', 'microsoft',
  'aws', 'awslabs', 'stripe', 'Shopify', 'salesforce', 'ibm', 'cisco', 'agntcy', 'meta-llama', 'facebookresearch',
  'NVIDIA', 'cloudflare', 'coinbase', 'paypal', 'visa', 'mastercard', 'huggingface', 'alibaba', 'block', 'okta',
  'vercel', 'open-telemetry', 'c2pa-org', 'aaif', 'ag-ui-protocol', 'nlweb-ai', 'webmachinelearning', 'x402-foundation',
  'zed-industries', 'agentclientprotocol', 'JetBrains', 'docker', 'sigstore', 'ossf', 'cosai-oasis', 'CycloneDX',
  'spdx', 'mlcommons', 'OWASP', 'apple', 'oracle', 'SAP', 'ServiceNow', 'databricks', 'snowflakedb', 'langchain-ai',
];

const FEEDS = {
  'MCP blog': 'https://blog.modelcontextprotocol.io/index.xml',
  'OpenAI': 'https://openai.com/news/rss.xml',
  'Google Developers': 'https://developers.googleblog.com/feeds/posts/default',
  'Google Cloud': 'https://cloudblog.withgoogle.com/rss/',
  'Microsoft DevBlogs': 'https://devblogs.microsoft.com/feed/',
  'AWS ML': 'https://aws.amazon.com/blogs/machine-learning/feed/',
  'Stripe': 'https://stripe.com/blog/feed.rss',
  'Cloudflare': 'https://blog.cloudflare.com/rss/',
  'Hugging Face': 'https://huggingface.co/blog/feed.xml',
  'Shopify Engineering': 'https://shopify.engineering/blog.atom',
  'Salesforce Developers': 'https://developer.salesforce.com/blogs/feed',
  'NVIDIA Developer': 'https://developer.nvidia.com/blog/feed/',
  'Linux Foundation': 'https://www.linuxfoundation.org/blog/rss.xml',
  'W3C': 'https://www.w3.org/blog/news/feed/',
  'FIDO Alliance': 'https://fidoalliance.org/feed/',
  'OpenID Foundation': 'https://openid.net/feed/',
  'Zed': 'https://zed.dev/blog.rss',
  'JetBrains AI': 'https://blog.jetbrains.com/ai/feed/',
  'OpenSSF': 'https://openssf.org/feed/',
  'CoSAI': 'https://www.coalitionforsecureai.org/feed/',
  'NVIDIA Newsroom': 'https://nvidianews.nvidia.com/rss',
  'Anthropic (GitHub releases)': 'https://github.com/modelcontextprotocol/modelcontextprotocol/releases.atom',
  'A2A releases': 'https://github.com/a2aproject/A2A/releases.atom',
  'IETF agentproto': 'https://datatracker.ietf.org/feed/group-changes/agentproto/',
};

const AI = /\b(ai|agent|agents|agentic|llm|model context|mcp|a2a|genai|gen_ai)\b/i;
const STD = /\b(protocol|standard|specification|spec|open[- ]source|rfc|draft|foundation|interoperab|schema|extension|sdk|format)\b/i;
const UA = { 'User-Agent': 'ai-standards-tracker' };

async function getJSON(url, headers = {}) {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function github() {
  const out = [];
  const h = process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {};
  // Batch orgs into a few queries to stay under search limits.
  for (let i = 0; i < GITHUB_ORGS.length; i += 6) {
    const orgs = GITHUB_ORGS.slice(i, i + 6).map(o => `org:${o}`).join(' ');
    const q = encodeURIComponent(`${orgs} created:>=${sinceISO}`);
    try {
      const j = await getJSON(`https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=50`, h);
      for (const r of j.items || []) {
        const text = `${r.name} ${r.description || ''} ${(r.topics || []).join(' ')}`;
        if (AI.test(text) && STD.test(text))
          out.push({ source: `GitHub ${r.owner.login}`, title: r.full_name, summary: r.description || '', url: r.html_url, date: r.created_at.slice(0, 10) });
      }
    } catch (e) { console.error('github:', e.message); }
  }
  // Repos anywhere that describe themselves as an agent protocol or standard.
  const q = encodeURIComponent(`"agent protocol" OR "open standard for agents" OR "agentic protocol" created:>=${sinceISO} stars:>=50`);
  try {
    const j = await getJSON(`https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=30`, h);
    for (const r of j.items || [])
      out.push({ source: 'GitHub search', title: r.full_name, summary: r.description || '', url: r.html_url, date: r.created_at.slice(0, 10) });
  } catch (e) { console.error('github search:', e.message); }
  return out;
}

async function ietf() {
  const out = [];
  for (const term of ['agent', 'ai-', 'llm', 'mcp']) {
    try {
      const j = await getJSON(`https://datatracker.ietf.org/api/v1/doc/document/?format=json&type=draft&name__contains=${term}&time__gte=${sinceISO}&limit=50`);
      for (const d of j.objects || [])
        if (AI.test(`${d.name} ${d.title}`) && d.rev === '00')
          out.push({ source: 'IETF', title: `${d.name}: ${d.title}`, summary: (d.abstract || '').slice(0, 300), url: `https://datatracker.ietf.org/doc/${d.name}/`, date: d.time.slice(0, 10) });
    } catch (e) { console.error('ietf:', e.message); }
  }
  return out;
}

const tag = (xml, t) => (xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')) || [])[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() || '';

async function feeds() {
  const out = [];
  await Promise.all(Object.entries(FEEDS).map(async ([name, url]) => {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`${r.status}`);
      const xml = await r.text();
      for (const it of xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || []) {
        const title = tag(it, 'title');
        const link = tag(it, 'link') || (it.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
        const date = new Date(tag(it, 'pubDate') || tag(it, 'published') || tag(it, 'updated') || 0);
        const summary = (tag(it, 'description') || tag(it, 'summary')).slice(0, 300);
        if (date >= since && AI.test(`${title} ${summary}`) && STD.test(`${title} ${summary}`))
          out.push({ source: name, title, summary, url: link, date: date.toISOString().slice(0, 10) });
      }
    } catch (e) { console.error(`feed ${name}:`, e.message); }
  }));
  return out;
}

const seenPath = path('state/seen.json');
const seen = new Set(JSON.parse(await readFile(seenPath, 'utf8').catch(() => '[]')));
const all = (await Promise.all([github(), ietf(), feeds()])).flat();
const fresh = all.filter(c => c.url && !seen.has(c.url));
// Carry forward candidates omp has not judged yet (it empties the list after judging).
const pending = JSON.parse(await readFile(path('state/candidates.json'), 'utf8').catch(() => '{}')).candidates || [];
const unique = [...new Map([...pending, ...fresh].map(c => [c.url, c])).values()];

await mkdir(path('state'), { recursive: true });
await writeFile(path('state/candidates.json'), JSON.stringify({ scanned: new Date().toISOString(), since: sinceISO, candidates: unique }, null, 2));
for (const c of unique) seen.add(c.url);
await writeFile(seenPath, JSON.stringify([...seen].slice(-5000), null, 0));
console.log(`scan: ${all.length} matches, ${unique.length} new candidates since ${sinceISO}`);
