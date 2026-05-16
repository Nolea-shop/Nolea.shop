# NotebookLM MCP Installation Session Notes

## Session: Initial Setup on WSL2 (2026-05-14)

### What Worked
- `git clone https://github.com/jacob-bd/notebooklm-mcp.git` — cloned successfully
- `uv tool install .` — installed both `notebooklm-mcp` and `nlm` binaries to `~/.local/bin/`
- Hermes config edit at `~/.hermes/config.yaml` — adding `mcp_servers.notebooklm` loaded 43 tools on restart
- Binary location: `/home/damia/.local/bin/notebooklm-mcp` (absolute path required in config)

### Critical Pitfalls Encountered

#### 1. `notebooklm-mcp-auth` command does NOT exist
The user-provided guide mentioned `notebooklm-mcp-auth` as a separate auth command.
**Reality:** That command is not part of this package version (0.6.9). The correct commands are:
- `nlm login` — interactive browser OAuth (often fails on WSL)
- Set `NOTEBOOKLM_COOKIES` environment variable — most reliable
- The MCP server auto-extracts tokens on first run IF cookies are provided

#### 2. Interactive login timeout
```
nlm login
```
Launches Chromium and waits 300s for sign-in. **Timeout after 60s** in our test.
**Root cause:** WSL headless environment without X server/chrome profile.
**Fix:** Switch to manual cookie extraction (Method 1 in skill).

#### 3. `nlm notebook list --json` fails without auth
```
Error: Profile 'default' not found. Run 'nlm login' first.
```
Even though the MCP server loaded 43 tools, the underlying `nlm` CLI needs a profile.
**Fix:** Authenticate first (cookies or interactive). Only then will CLI and MCP tools work.

#### 4. YAML config insertion gotcha
Using `yaml.dump(..., sort_keys=False)` preserved order but placed `mcp_servers` at file end.
**Better:** Manually insert the section at the logical position (after `providers:`) to match Hermes conventions.

### Authentication — The Two Reliable Paths

**Path A: Environment Variable (fast, reliable)**
1. Chrome → DevTools → Network → reload → filter `batchexecute`
2. Copy Cookie header
3. `export NOTEBOOKLM_COOKIES="..."` (add to `~/.bashrc`)

**Path B: MCP Server CDP Mode (advanced)**
Run `notebooklm-mcp --transport http` and use its Chrome DevTools Protocol integration to auto-extract cookies. Requires Chrome on Windows host accessible from WSL.

### What the 43 MCP Tools Cover

From `CLAUDE.md` in the repo:
- Notebook CRUD + describe
- Source management (add, list, get content, rename, delete, Drive sync)
- Research (start web/Drive search, poll status, import)
- Studio artifacts (audio overview, video, slides, infographic, report, quiz, flashcards, data table, mind map)
- Sharing (public link, invites, status)
- Chat configuration and query
- Note CRUD
- Auth token management

### Next Steps for the User

1. **Extract cookies** from Chrome (Method 1 above)
2. **Restart Hermes** so MCP tools pick up credentials
3. Test: `notebook_list` via Hermes or `nlm notebook list --json` in terminal

### File Locations Reference

| Path | Purpose |
|------|---------|
| `/home/damia/.local/bin/notebooklm-mcp` | MCP server binary |
| `/home/damia/.local/bin/nlm` | CLI client |
| `/home/damia/.hermes/config.yaml` | Hermes MCP server config |
| `~/.notebooklm-mcp-cli/profiles/` | Auth profiles (created after auth) |
| `~/.notebooklm-mcp-cli/config.toml` | CLI config |
