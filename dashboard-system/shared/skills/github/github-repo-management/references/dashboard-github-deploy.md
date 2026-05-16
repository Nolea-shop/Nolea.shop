# Dashboard → GitHub Deployment (Post-Push Snap State Proof)

## Purpose

Prove synchronisation completeness immediately after a `git push` by comparing
local working tree against the remote HEAD SHA.

## Canonical Verification Commands

```bash
cd ~/multi-agent-dashboard/

# 1. Local HEAD
git rev-parse HEAD

# 2. Remote HEAD (must match)
git rev-parse origin/main

# 3. Full status (must be clean)
git status

# 4. Compare working tree against HEAD (must show no diff)
git diff HEAD

# 5. Source-vs-repo comparison (when source dir is separate)
diff -rq /path/to/source/ . -x '.git' -x '__pycache__'
# exit 0 + no output = identical
# exit 1 with diff lines = files differ or missing
```

## Interpreting Results

| Output | Meaning |
|--------|---------|
| `HEAD = 458a6ba...', `origin/main = 458a6ba...` | Local matches remote ✓ |
| `nothing to commit, working tree clean` | No uncommitted changes ✓ |
| No output from `diff -rq` | Working tree ≡ HEAD ✓ |
| Exit 1 + listed differences | Files not yet staged/pushed ✗ |

## GitHub Push Protection Bypass

When initial push is blocked by secret-scanning (GH013), the **fastest path**
is the GitHub-provided bypass link:

```bash
# Example from session:
remote: https://github.com/sernoxxx/multi-agent-dashboard/security/secret-scanning/unblock-secret/XXXXX
```

1. User visits link in browser, confirms "I understand the risk"
2. GitHub accepts the push despite stale secrets in commit history
3. Push completes

## Commit Message Template

Human-readable subject line + bullet list of changed areas:

```
Dashboard Update: agents page, editorial JS/CSS, calendar redesign, token tracker, scripts, config sync

- Neue agents.html Seite + editorial.js + magazine.css Design-System
- Calendar komplett überarbeitet (Month Grid, Event-Dots, Timeline, Day-Modal)
- Alle Dashboard-Seiten aktualisiert (index, health, diary, tasks, pipeline, activity, tokens)
- Neue Scripts: dashboard-server.py, multi-agent-dashboard.py, token-tracker.py
- agents.yaml Config synchronisiert
- README + start-dashboard.bat hinzugefügt
```

## Key Gotchas

- `git remote -v` masks embedded tokens as `***` — not a credential leak, just credential-helper behaviour.
- GitHub Push Protection scans **all commits in the push**, not just the tip.
- A valid `gh` token is cached in `~/.hermes/auth.json` under `credential_pool.github`.
- Always verify both HEAD and origin/main match before declaring "pushed".
