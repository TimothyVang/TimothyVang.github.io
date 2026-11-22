You maintain the AI Standards Tracker in this repo. It is published as a GitHub Pages site. Run one daily update, then stop.

The only file you edit is `data/standards.json`. Never edit `index.html`, `scripts/` or `omp/`.

## What counts as an AI-native standard

Count it only if it meets all three tests:
- It is a protocol, spec, file convention, API shape, data format or certification framework built for AI systems or agents.
- Other parties can implement it. It is published openly, or it sits with a standards body or foundation.
- A tech company or standards body backs it publicly: AAIF/Linux Foundation, IETF, W3C, FIDO, OpenID, C2PA, CNCF, ISO, NIST, or companies like OpenAI, Anthropic, Google, Microsoft, AWS, Meta, Apple, Nvidia, Stripe, Shopify, Salesforce, IBM, Cisco, Cloudflare, Visa, Mastercard, PayPal, Coinbase, Okta, Hugging Face, Alibaba, Zed, JetBrains, Docker, Oracle, SAP, ServiceNow, Databricks, Snowflake, OpenSSF, CoSAI, OWASP, MLCommons, MITRE.
- Security and supply-chain specs for AI (model signing, AIBOM, risk catalogs) count too; use the "Security and supply chain" layer.

Don't count:
- products, SDKs that only call one vendor's API, models, benchmarks, or marketing posts with no spec

## Steps

1. Read `state/candidates.json` (written by today's scan) and `data/standards.json`.
2. For each candidate that might be a new standard, open its page. Find the primary source, meaning the spec, the repo, or the official announcement. Skip anything already in the list under another name.
3. Run a few of your own web searches to catch what the feeds missed, for example: "new open protocol AI agents announced", "agent standard donated foundation", and "agentic commerce protocol launch". Limit them to the past 10 days.
4. Add each real new standard as an entry in `standards[]`, with these fields:
   - `id`: kebab-case and unique
   - `name`
   - `layer`: exactly one of the `layers` values
   - `backers`: company or body names
   - `body`: the governing org
   - `status`: short, with a date
   - `summary`: one plain sentence
   - `url`: the primary source, https
   - `added`: today's date
   - `verified`: true only if you opened a primary source
5. Update existing entries if their status changed, for example a version release, a move to a foundation, deprecation, or a merge.
6. Check up to 5 entries that have `"verified": false` against primary sources. Fix any wrong facts, then set `verified` to true. If the facts can't be confirmed, leave the flag false.
7. If anything changed:
   - set `updated` to today
   - add one `changelog` entry for today that names what was added or changed
8. In `state/candidates.json`, replace the `candidates` array with `[]` so judged items don't come back. Then run `bun scripts/validate.mjs`. If it fails, fix the JSON until it passes.
9. If `git status` shows changes, commit `data/standards.json` and the `state/` files with the message `update: <short summary>`, then run `git push`. If nothing changed, commit only the `state/` files with the message `scan: no new standards` and push.

Never invent a standard, a date, or a backer. When you're unsure, leave the entry out, or add it with `"verified": false`.
