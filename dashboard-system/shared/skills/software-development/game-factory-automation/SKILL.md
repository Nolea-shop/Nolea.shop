---
name: game-factory-automation
description: >
  Build automated browser game production pipelines with Phaser 3 + TypeScript + Vite,
  Node.js orchestration scripts, hard validation gates, anti-hallucination protocols,
  and n8n workflow integration. Covers the full build/check/repair/package/archive cycle
  for portal-ready HTML5 games (CrazyGames, itch.io, etc.).
triggers:
  - "game factory"
  - "crazygames pipeline"
  - "phaser 3 automation"
  - "browser game production"
  - "automated game build"
  - "n8n game workflow"
  - "html5 game factory"
  - "game scaffold orchestration"
---

# Game Factory Automation

Build automated browser game production pipelines. Each game is created in its own folder, every run is archived permanently, and hard validation gates prevent broken or non-compliant builds from reaching the package stage.

## Architecture Pattern

```
factory-root/
  agents/              — AI agent behavior definitions
  prompts/             — Build/repair/bootstrap prompt templates
  knowledge/           — Platform requirements, studio rules, genre playbooks
  schemas/             — JSON schemas for spec/checks/summary validation
  templates/phaser-core/ — Base Phaser 3 + TypeScript + Vite game template
  scripts/             — Node.js orchestration scripts (preflight, init, validate, scaffold, checks, package, archive, finalize)
  tools/               — Hermes/LLM runner adapter
  automation/          — n8n workflow generator
  games/               — Produced games (persistent archives with full audit trail)
  reports/             — Factory-level reports
  tmp/                 — Temp/log storage
```

## Mandatory Stack

- **Phaser 3** (npm: phaser@^3.70.0) — game framework
- **TypeScript** — game source language
- **Vite** — build tool
- **Node.js 18+** — orchestration scripts
- **n8n** (optional) — workflow orchestration

## Pipeline Steps (in order)

1. **preflight** — Verify local tooling (Node, npm) and project structure
2. **init-run** — Create persistent game folder with subdirs (src/, public/, reports/, artifacts/, logs/, package/) and run-context.json
3. **select-idea** — Choose/generate a game spec from a deterministic idea pool
4. **validate-spec** — Validate spec JSON against schema (fail hard on invalid)
5. **scaffold-game** — Copy Phaser template into game folder (safe for re-scaffolding)
6. **Hermes plan** — Generate build plan (via LLM agent)
7. **Hermes build** — Build game from spec (via LLM agent)
8. **npm install** — Install dependencies
9. **run-checks** — Typecheck, build, external-resource scan, placeholder scan, required files
10. **repair loop** (up to 2x) — Targeted repair of specific issues, then re-check
11. **capture-preview** — Screenshot/preview metadata
12. **package-submission** — Build final package with metadata, controls summary, checks snapshot
13. **archive-game** — Mark run as archived (passed/failed/blocked)
14. **git-save** — Optional git commit (non-fatal if git absent)
15. **finalize-run** — Write summary.json + summary.md

## Anti-Hallucination Protocol

This is critical for LLM-driven game generation. Enforce these rules:

1. **No platform guessing** — Unknown SDK behavior = BLOCKED. Never invent API endpoints, SDK methods, or review criteria.
2. **Spec-driven development** — Games are built only from validated specs. No ad-hoc features.
3. **Hard validation gates** — Checks must pass before packaging. No silent skipping.
4. **Repair-only mode** — Repair passes fix specific issues, not redesign.
5. **Local source of truth** — All policy-like notes stored in knowledge/ files, not invented at runtime.
6. **Audit trail** — Every run archived with full logs, reports, and summary.
7. **No fake monetization** — No placeholder SDK calls, no fake ad units, no invented platform behavior.

## Game Folder Persistence Rule

Every produced game must be saved permanently at `games/<gameId>/` with:

```
games/<gameId>/
  spec.json              — Approved game specification
  run-context.json       — Environment snapshot
  src/                   — TypeScript source code
  public/                — Static assets
  reports/               — checks.json, QA reports
  artifacts/             — Screenshots, preview metadata
  logs/                  — Build and tool logs
  package/               — Submission package (metadata, CONTROLS, dist)
  summary.json           — Machine-readable run summary
  summary.md             — Human-readable run summary
  ARCHIVED               — Status marker file
```

Global index at `games/index.json` tracks all produced games.

## Phaser 3 Template Essentials

The base template must include:

- **package.json** — phaser@^3.70.0, typescript@^5.4.0, vite@^5.4.0
- **tsconfig.json** — target ES2020, module ESNext, strict mode, noEmit
- **vite.config.ts** — base './', single-file build (inlineDynamicImports), minify esbuild
- **index.html** — Full-viewport canvas container, no-scroll, dark background
- **src/main.ts** — Phaser.Game bootstrap
- **src/game/config.ts** — 1280x720, Phaser.Scale.FIT + CENTER_BOTH, Arcade physics
- **src/game/storage.ts** — Defensive localStorage wrapper (never crashes on failure)
- **src/game/scenes/BootScene.ts** — Loading bar, transitions to MenuScene
- **src/game/scenes/MenuScene.ts** — Title, Play button, high score, controls hint
- **src/game/scenes/GameScene.ts** — Core gameplay loop, score tracking, game over
- **src/game/scenes/ResultScene.ts** — Score display, high score, restart/menu buttons

## Writing Node.js Orchestration Scripts (.mjs)

**CRITICAL PITFALL:** Node.js ESM (.mjs) files do NOT support TypeScript syntax. All type annotations cause SyntaxError at runtime.

### DO NOT use:
```javascript
// ❌ These will crash:
interface CheckItem { name: string; passed: boolean; }
function addError(name: string, details: string): void { ... }
let spec: Record<string, unknown> = {};
const err = e as { stdout?: string };
```

### DO use:
```javascript
// ✅ Pure JavaScript:
var checks = [];
function addError(name, details) { ... }
var spec = {};
// Use JSDoc for documentation instead of type annotations
```

### Script patterns:
- Use `#!/usr/bin/env node` shebang
- Use `import.meta.dirname` for project root resolution
- Use `var` instead of `let`/`const` with type annotations
- Use `process.exit(0)` for success, `process.exit(1)` for failure
- Output machine-readable JSON to stdout
- Use `execSync` from `node:child_process` for tool invocations
- Always wrap `JSON.parse` in try/catch for file reads

## n8n Workflow Pattern

The n8n workflow should:

1. Start with Manual Trigger + Schedule Trigger (daily)
2. Use Execute Command nodes to call local scripts
3. Use IF nodes for branching (spec valid?, checks passed?, repair succeeded?)
4. Support up to 2 repair passes before archiving as failed
5. Archive every run in the relevant game folder
6. Use Code nodes for game ID generation and data transformation

Key n8n node types:
- `n8n-nodes-base.manualTrigger` — manual start
- `n8n-nodes-base.scheduleTrigger` — scheduled start
- `n8n-nodes-base.exec` — run local scripts
- `n8n-nodes-base.if` — branching logic
- `n8n-nodes-base.code` — custom JavaScript
- `n8n-nodes-base.stopAndError` — block on failure
- `n8n-nodes-base.set` — set workflow variables

## Factory Location

The concrete CrazyGames factory created during the 2026-05-13 session lives at:

- **Windows path:** `D:\hermes\crazygames-factory\`
- **WSL path:** `/mnt/d/hermes/crazygames-factory/`
- **609 GB free** on D: drive — plenty of room for game archives

### CLI Commands (run from factory root)

```bash
# Full manual pipeline (each step outputs JSON to stdout):
node scripts/preflight.mjs
node scripts/init-run.mjs <gameId> --genre arcade --title "My Game"
node scripts/select-idea.mjs <gameId> --genre arcade
node scripts/validate-spec.mjs <gameId>
node scripts/scaffold-game.mjs <gameId>
cd games/<gameId> && npm install && cd ../..
node scripts/run-checks.mjs <gameId>
node scripts/capture-preview.mjs <gameId>
node scripts/package-submission.mjs <gameId>
node scripts/archive-game.mjs <gameId> --status passed
node scripts/finalize-run.mjs <gameId> --status passed
node tools/hermes-runner.mjs bootstrap --workspace .
node tools/hermes-runner.mjs plan --game-id <gameId>
node tools/hermes-runner.mjs build --game-id <gameId>
node tools/hermes-runner.mjs repair --game-id <gameId> --issues '["issue1","issue2"]'
```

### Pipeline Verification Status

The full pipeline was tested end-to-end on 2026-05-13 with `test-game-001`:
- Preflight: 27/27 checks passed
- Run-checks: 25/25 checks passed
- Build: TypeScript + Vite compiled cleanly
- Package: dist/ with bundled JS, metadata.json, CONTROLS.txt
- Archive: Full audit trail with ARCHIVED marker
- n8n workflow: 30-node JSON generated and validated

### Hermes Runner Adapter

`tools/hermes-runner.mjs` has a TODO block (`ADAPTER_NOT_WIRED`) — the actual Hermes CLI/Docker invocation must be wired locally. Commands bootstrap, plan, build, and repair are all present as safe-failing stubs that log intent and exit OK.

## Quality Bar

- Clean first impression within 2 seconds
- Controls discoverable immediately
- Instant restart (<1s)
- Desktop + mobile support
- 60fps target on moderate hardware
- No placeholder text, no external network calls
- No fake ads or placeholder SDK integrations
- Canvas: 1280x720 (16:9), responsive scaling