# CrazyGames Factory — Reference Architecture

This reference documents the specific CrazyGames game factory built during the 2026-05-13 session.
It serves as a concrete example of the `game-factory-automation` pattern.

**Factory location (actual, verified):**
- Windows: `D:\hermes\crazygames-factory\`
- WSL: `/mnt/d/hermes/crazygames-factory/`
- D: drive has 609 GB free
- The original WSL copy at `/home/damia/crazygames-factory/` can be deleted

## Project Structure

```
crazygames-factory/
  agents/
    crazygames-specialist.md    — Platform-safe build agent behavior
    qa-reviewer.md              — Strict QA review checklist
  prompts/
    hermes-crazygames-runtime.txt   — Build prompt for a single game
    hermes-crazygames-repair.txt    — Repair-only prompt (forbids redesign)
    hermes-crazygames-bootstrap.txt — Factory architecture overview
  knowledge/
    crazygames-requirements.md      — Platform rules (labelled PLATFORM RULE vs STUDIO RULE)
    studio-rules.md                 — Internal coding/project conventions
    implementation-principles.md    — Quality and UX principles
    genre-playbooks/
      arcade.md, racer.md, physics-puzzle.md, idle-light.md
  schemas/
    game-spec.schema.json   — 14 required fields including coreLoop, controls, mustHave, mustNotHave
    run-summary.schema.json — Final run summary schema
    checks.schema.json      — Structured check results schema
  templates/phaser-core/    — 11-file Phaser 3 + TypeScript + Vite template
  scripts/                  — 11 Node.js orchestration scripts
  tools/hermes-runner.mjs   — Hermes adapter (TODO: wire real invocation)
  automation/
    generate_n8n_crazygames_workflow.js — Generates 30-node n8n workflow
    crazygames-factory-workflow.json    — Generated output
  games/                    — Persistent game archives
    index.json              — Global game index
```

## Anti-Hallucination Protocol (Detailed)

### Source-of-Truth Hierarchy
1. **knowledge/crazygames-requirements.md** — Platform rules (official) vs studio rules (internal)
2. **knowledge/studio-rules.md** — Enforceable project conventions
3. **knowledge/implementation-principles.md** — Quality principles
4. **knowledge/genre-playbooks/*.md** — Genre-specific guidance
5. **schemas/*.json** — Formal validation schemas
6. **spec.json** — Approved game specification (per-game)

### BLOCKED Conditions
The pipeline must return BLOCKED (not guess) when:
- CrazyGames SDK method is unknown
- Platform behavior is unclear
- Required source-of-truth file is missing
- Spec fields are missing or invalid
- Template cannot be scaffolded
- Hermes wrapper cannot be wired without inventing commands

### Pipeline Verification Results (2026-05-13)

A full end-to-end run was completed with `test-game-001` to confirm every script works in isolation and sequence:

### All Steps Executed
```yaml
1.  preflight:        27/27 checks passed
2.  init-run:         game folder, run-context.json, index.json update
3.  select-idea:      "cosmic-avoider" selected from deterministic pool
4.  validate-spec:    14 fields validated, 1280x720 canvas check OK
5.  scaffold-game:    11 template files copied
6.  npm install:      Done (npm 10.9.7)
7.  hermes-runner plan:  OK (adapter stub)
8.  hermes-runner build: OK (adapter stub)
9.  hermes-runner repair: OK (adapter stub)
10. run-checks:       25/25 checks passed (typecheck, build, no externals, no placeholders)
11. capture-preview:  preview.json + PREVIEW_CAPTURE_TODO.txt
12. package-submission: dist/ in package/, CONTROLS.txt, metadata.json, checks-snapshot.txt
13. archive-game:     ARCHIVED marker written, index.json updated
14. git-save:         Skipped (no .git — non-fatal)
15. finalize-run:     summary.json + summary.md written
```

### Game Archive Contents (games/test-game-001/)
```
spec.json, run-context.json, summary.json, summary.md, ARCHIVED
src/               — 5 TypeScript files (main.ts, config.ts, storage.ts, scenes/*)
public/            — empty
reports/           — checks.json
artifacts/         — preview.json, PREVIEW_CAPTURE_TODO.txt
logs/              — hermes-build-report.json, hermes-repair-report.json
package/           — metadata.json, CONTROLS.txt, checks-snapshot.txt, index.html, assets/*
```

### Build Output
- Vite produces `dist/index.html` and `dist/assets/*.js` (single-file bundled with `inlineDynamicImports`)
- Phaser 3.80.1 + game code bundles to ~2MB (expected for full Phaser framework)
- No external URLs, no CDN references, no placeholder text found

## Validation Gates (in order)
1. `validate-spec.mjs` — Schema validation (fails hard on invalid)
2. `run-checks.mjs` — 25 checks including:
   - TypeScript typecheck
   - Vite build
   - External resource scan (CDN URLs, fetch(), XMLHttpRequest)
   - Placeholder text scan (lorem ipsum, TODO, WIP)
   - Required file existence
   - Build output verification
3. Repair loop (up to 2 passes) — Only fixes specific issues, no redesign

## Deterministic Idea Pool

The `select-idea.mjs` script uses a hardcoded pool of 4 game concepts:
- **cosmic-avoider** (arcade/space) — Dodge asteroids, collect gems
- **brick-breaker-remix** (arcade/retro) — Classic breakout with paddle
- **lane-racer-lite** (racer/highway) — Auto-accelerating lane-switcher
- **pixel-jumper** (arcade/platform) — One-button auto-scrolling jumper

Selection is deterministic: `hash(gameId) % pool.length`, filtered by genre/theme if specified.

## Pitfalls Discovered

### 1. TypeScript Annotations in .mjs Files
Every .mjs file initially written with TypeScript type annotations (`: string`, `: number`, `interface X`, `as Type`) caused SyntaxError at runtime. All 10+ scripts had to be rewritten to pure JavaScript.

**Fix:** Strip all type annotations. Use `var` instead of typed `let`/`const`. Use JSDoc for documentation. Avoid `interface`, `as`, and generic type parameters.

### 2. n8n Workflow Generator TypeScript Syntax
The `generate_n8n_crazygames_workflow.js` file initially used TypeScript parameter type annotations in helper functions (`function node(id: number, name: string, ...)`). This caused SyntaxError when run as ESM.

**Fix:** Rewrite all helper functions with plain JavaScript parameters. Use `var` and string concatenation instead of template literals with complex expressions.

### 3. Phaser 3 Build Size
The default Phaser 3 + Vite build produces a single JS file >500KB (Phaser itself is ~1.5MB minified). This triggered Vite's chunk size warning but is acceptable for CrazyGames Basic Launch.

### 4. npm install on Fresh Scaffold
After scaffolding, `npm install` must be run in the game folder before any TypeScript or build commands work. The `run-checks.mjs` script handles this gracefully by skipping typecheck/build checks when node_modules is absent.

### 5. npm install on NTFS (D: drive via WSL)
The factory lives on `D:\` (mounted as `/mnt/d/` in WSL). Lightweight npm installs (Phaser + Vite + TypeScript) work fine on NTFS because their native binaries (`@esbuild/linux-x64`, `@rollup/rollup-linux-x64-gnu`) are Linux ELFs that don't need Windows permission changes. Heavy native-Node projects (Electron, node-canvas, node-gyp) WILL fail on NTFS with EPERM on chmod/futime. Keep game templates minimal — Phaser-only is safe.

## n8n Workflow Structure

The generated workflow has 30 nodes in this sequence:

```
Manual Trigger ─┐
Schedule Trigger─┤
                 └→ Select Game Type → Generate Game ID
                    → 1. Preflight → 2. Init Run → 3. Bootstrap Factory
                    → 4. Select Idea → 5. Validate Spec
                    → [Spec Valid?] → YES: 6. Scaffold Game
                    → [Spec Valid?] → NO: BLOCKED: Invalid Spec
                    → 7. Hermes Plan → 8. Hermes Build
                    → 9. Install Dependencies → 10. Run Checks
                    → [Checks Passed?] → YES: 13. Capture Preview
                    → [Checks Passed?] → NO: 11a. Repair Pass 1
                    → 11b. Re-Check → [Repair 1 Succeeded?]
                    → NO: 12a. Repair Pass 2 → 12b. Re-Check
                    → [Repair 2 Succeeded?] → NO: Archive (Failed)
                    → 13. Capture Preview → 14. Package Submission
                    → 15. Archive (Success) → 16. Git Save
                    → 17. Finalize Run
```

## Hermes Runner Adapter

`tools/hermes-runner.mjs` provides a stable CLI contract for n8n:

```
node tools/hermes-runner.mjs <command> [flags]

Commands: bootstrap, plan, build, repair
Flags: --workspace, --game-id, --game-dir, --spec, --prompt-file, --log-file, --issues
```

**TODO:** The `cmdBuild()` and `cmdRepair()` functions contain placeholder sections that log intent and exit OK. Replace with actual Hermes launch command for the target machine.