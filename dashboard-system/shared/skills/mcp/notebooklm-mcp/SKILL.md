---
name: notebooklm-mcp
description: Google NotebookLM integration via MCP — install, configure, authenticate, and use 43 tools for AI-powered document analysis, research, and content generation.
triggers:
  - when: User asks about NotebookLM notebooks, sources, research, or artifacts
    keywords: ["notebooklm", "notebook-lm", "notebook lm", "google notebook", "notebooklm.google.com"]
  - when: Setting up or troubleshooting NotebookLM access in Hermes
    keywords: ["notebooklm auth", "notebooklm login", "notebooklm cookies", "nlm cli"]
  - when: Working with NotebookLM sources, research, or studio artifacts
    keywords: ["notebooklm source", "notebooklm research", "notebooklm studio", "audio overview"]
  - when: Integrating external MCP servers into Hermes Agent
    keywords: ["mcp server notebooklm", "notebooklm-mcp"]
verbose: true
steps:
  - Install the MCP server via UV (one-time setup)
  - Configure Hermes Agent to load the server (mcp_servers in config.yaml)
  - Authenticate with Google using Chrome DevTools cookie extraction
  - Use CLI or MCP tools to interact with notebooks
pitfalls:
  - Command not found: notebooklm-mcp-auth — That command doesn't exist; use nlm login or set cookies directly
  - Profile 'default' not found — Authentication missing; run nlm login or set NOTEBOOKLM_COOKIES
  - Timeout during interactive login — Headless/WSL Chrome often fails; prefer manual cookie extraction
  - EPERM/chmod errors on /mnt/ drives — Never store Node.js projects on NTFS; use /home/damia/
  - MCP server not loading — Ensure command path is absolute in config.yaml
  - Auth errors after cookies work — NotebookLM cookies rotate; re-extract fresh cookies from Chrome DevTools
scripts:
  install: git clone https://github.com/jacob-bd/notebooklm-mcp.git && cd notebooklm-mcp && uv tool install .
  auth-browser: nlm login
  list-notebooks: nlm notebook list --json
---

## Google NotebookLM MCP Integration

Complete workflow for installing, configuring, authenticating, and using NotebookLM as an MCP server in Hermes Agent.

### Installation

```bash
git clone https://github.com/jacob-bd/notebooklm-mcp.git
cd notebooklm-mcp
uv tool install .
```

Binary locations after install:
- `~/.local/bin/notebooklm-mcp` — MCP server (for Hermes config)
- `~/.local/bin/nlm` — CLI client (for manual operations)

**Verification:**
```bash
which notebooklm-mcp  # Should print /home/damia/.local/bin/notebooklm-mcp
which nlm             # Should print /home/damia/.local/bin/nlm
```

### Hermes Agent Configuration

Edit `~/.hermes/config.yaml` and add:

```yaml
mcp_servers:
  notebooklm:
    command: "/home/damia/.local/bin/notebooklm-mcp"
    args: []
```

Restart Hermes Agent. On startup you should see:
```
[IMPORTANT: MCP servers have been reloaded. Added servers: notebooklm. 43 MCP tool(s) now available.]
```

### Authentication (Critical Path)

NotebookLM requires Google authentication. Three methods available:

#### Method 1: Environment Variables (Most Reliable)

Extract cookies from Chrome DevTools and set:

1. Open Chrome → `https://notebooklm.google.com/`
2. DevTools (F12) → Network tab
3. Reload page (F5); filter for `batchexecute`
4. Click any `batchexecute` request → Headers → Cookie
5. Copy the full cookie string
6. Export:

```bash
export NOTEBOOKLM_COOKIES="your-full-cookie-string-here"
```

To make permanent, add to `~/.bashrc` or profile script.

#### Method 2: Interactive Browser Login (May Fail on WSL)

```bash
nlm login
```

This launches Chromium and waits for sign-in. Often **times out in WSL** due to lack of display/chrome profile.

#### Method 3: Chrome DevTools Protocol (Advanced)

Run the MCP server with HTTP transport and use its built-in CDP cookie extraction (see project README for details).

**Recommended:** Use Method 1 (env var) for reliability in WSL/headless environments.

### CLI Usage

```bash
# List notebooks
nlm notebook list --json

# Get notebook details
nlm notebook get --id <notebook-id>

# Describe notebook (AI summary)
nlm notebook describe --id <notebook-id>

# Add a source (URL)
nlm source add url --url "https://example.com/article" --notebook-id <id>

# Start research (web search for sources)
nlm research start --query "AI safety research" --notebook-id <id>

# Check research status
nlm research status --task-id <task-id> --notebook-id <id>

# Import research results
nlm research import --task-id <task-id> --notebook-id <id>

# Generate artifacts (audio, video, slides, etc.)
nlm studio create audio --notebook-id <id>
nlm studio create report --notebook-id <id>
nlm studio create slide_deck --notebook-id <id>

# Download artifact
nlm download artifact --artifact-id <id> --output /tmp/podcast.mp3

# Share notebook
nlm notebook share invite --email user@example.com --notebook-id <id>
```

Use `nlm --help` and `nlm <command> --help` for full options.

### MCP Tools Available (43 total)

Once configured, Hermes can invoke these tools directly:

- **Notebook management:** `notebook_list`, `notebook_get`, `notebook_create`, `notebook_rename`, `notebook_delete`, `notebook_describe`
- **Source management:** `source_add`, `source_list`, `source_get_content`, `source_rename`, `source_delete`, `source_list_drive`, `source_sync_drive`, `source_describe`
- **Research:** `research_start`, `research_status`, `research_import`
- **Studio (Artifacts):** `studio_create`, `studio_status`, `studio_delete`, `studio_revise`, `download_artifact`, `export_artifact`
- **Chat:** `chat_configure`, `notebook_query`
- **Sharing:** `notebook_share_status`, `notebook_share_public`, `notebook_share_invite`
- **Auth:** `save_auth_tokens`, `refresh_auth`
- **Notes:** `note_create`, `note_list`, `note_update`, `note_delete`

### Common Workflows

**Workflow: Create notebook from web research**
```
1. notebook_create --title "My Research"
2. research_start --query "topic" --notebook-id <id>
3. research_status --task-id <id> (poll until complete)
4. research_import --task-id <id> --notebook-id <id>
```

**Workflow: Generate Audio Overview (podcast)**
```
1. studio_create audio --notebook-id <id>
2. studio_status --notebook-id <id> (wait for completion)
3. download_artifact --artifact-id <id> --output podcast.mp3
```

**Workflow: Manual data export**
```
1. studio_create report --format "Briefing Doc" --notebook-id <id>
2. studio_status → get artifact URL
3. Export to Google Docs via export_artifact if needed
```

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Profile 'default' not found` | No auth tokens | Run `nlm login` OR set `NOTEBOOKLM_COOKIES` |
| login command times out | WSL/headless Chromium | Use manual cookie extraction (Method 1) |
| `command not found: notebooklm-mcp` | Binary not in PATH | Use absolute path in Hermes config |
| MCP server doesn't appear | Hermes config syntax error | Validate YAML; restart Hermes |
| 401/403 API errors | Cookies expired/invalid | Re-extract cookies from Chrome |
| `stateless` crash error | MCP SDK issue | Default is `--stateless true`; don't override |

**Check current auth status:**
```bash
nlm auth status  # (if available) or inspect ~/.notebooklm-mcp-cli/profiles/
```

### WSL2 Notes

- Install location: `~/.local/bin/` (Linux FS, not `/mnt/`)
- Chrome DevTools Protocol works only if Chrome is running on Windows host; easiest is manual cookie copy
- Avoid `nlm login` in pure WSL without X server; use cookie method instead

### Storage Layout

Auth profiles stored in: `~/.notebooklm-mcp-cli/profiles/<name>/auth.json`
Config: `~/.notebooklm-mcp-cli/config.toml`
