# AI Standards Tracker

A self-updating map of the AI-native standards tech companies implement. It covers agent protocols, agent UI, commerce and payments, identity, web and content, observability, model formats and governance.

Live site: https://timothyvang.github.io

## How it updates

1. Windows Task Scheduler runs `scripts/run-daily.ps1` every day at 07:00.
2. `scripts/scan.mjs` collects new candidates from GitHub orgs, IETF drafts and company blogs. Its output goes to `state/candidates.json`.
3. omp (`omp -p @omp/update-standards.md`) judges the candidates, researches them, edits `data/standards.json`, validates it, and commits and pushes.
4. GitHub Pages serves the new data from `main`.

Logs: `state/logs/YYYY-MM-DD.log` (local only).

## Run it by hand

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-daily.ps1
```

To watch more companies, add their GitHub org to `GITHUB_ORGS` or their blog feed to `FEEDS` in `scripts/scan.mjs`.
