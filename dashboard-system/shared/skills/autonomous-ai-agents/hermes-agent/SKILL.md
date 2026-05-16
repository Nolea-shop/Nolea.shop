---
name: hermes-agent
description: "Configure, extend, or contribute to Hermes Agent."
version: 2.1.0
author: Hermes Agent + Teknium
license: MIT
metadata:
  hermes:
    tags: [hermes, setup, configuration, multi-agent, spawning, cli, gateway, development]
    homepage: https://github.com/NousResearch/hermes-agent
    related_skills: [claude-code, codex, opencode]
---

# Hermes Agent

Hermes Agent is an open-source AI agent framework by Nous Research that runs in your terminal, messaging platforms, and IDEs. It belongs to the same category as Claude Code (Anthropic), Codex (OpenAI), and OpenClaw — autonomous coding and task-execution agents that use tool calling to interact with your system. Hermes works with any LLM provider (OpenRouter, Anthropic, OpenAI, DeepSeek, local models, and 15+ others) and runs on Linux, macOS, and WSL.

What makes Hermes different:

- **Self-improving through skills** — Hermes learns from experience by saving reusable procedures as skills. When it solves a complex problem, discovers a workflow, or gets corrected, it can persist that knowledge as a skill document that loads into future sessions. Skills accumulate over time, making the agent better at your specific tasks and environment.
- **Persistent memory across sessions** — remembers who you are, your preferences, environment details, and lessons learned. Pluggable memory backends (built-in, Honcho, Mem0, and more) let you choose how memory works.
- **Multi-platform gateway** — the same agent runs on Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Email, and 10+ other platforms with full tool access, not just chat.
- **Provider-agnostic** — swap models and providers mid-workflow without changing anything else. Credential pools rotate across multiple API keys automatically.
- **Profiles** — run multiple independent Hermes instances with isolated configs, sessions, skills, and memory.
- **Extensible** — plugins, MCP servers, custom tools, webhook triggers, cron scheduling, and the full Python ecosystem.

People use Hermes for software development, research, system administration, data analysis, content creation, home automation, and anything else that benefits from an AI agent with persistent context and full system access.

**This skill helps you work with Hermes Agent effectively** — setting it up, configuring features, spawning additional agent instances, troubleshooting issues, finding the right commands and settings, and understanding how the system works when you need to extend or contribute to it.

**Docs:** https://hermes-agent.nousresearch.com/docs/

## Quick Start

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# Interactive chat (default)
hermes

# Single query
hermes chat -q "What is the capital of France?"

# Setup wizard
hermes setup

# Change model/provider
hermes model

# Check health
hermes doctor
```

## Web Dashboard (Simple Web UI)

The native, easy-to-use web interface for Hermes Agent. This is the simplest way to access Hermes via a browser—no external tools required. Always reference this first when users ask about Hermes web UI, not the API Server + Open WebUI method.

### Quick Start
1. Install prerequisites (one-time):
   ```bash
   pip install hermes-agent[web]  # Web dashboard only
   # Or install all extras (recommended):
   pip install hermes-agent[all]
   ```
2. Start the dashboard:
   ```bash
   hermes dashboard
   ```
   This automatically opens `http://127.0.0.1:9119` in your browser. All data stays local.

### Key Features
- GUI-based configuration (no YAML editing)
- API key management
- Session monitoring
- Fully local (no data leaves your machine)

### Common Options
| Flag | Default | Description |
|------|---------|-------------|
| `--port` | 9119 | Port to run the web server on |
| `--host` | 127.0.0.1 | Bind address (use `0.0.0.0` for network access, pair with firewall + auth) |
| `--no-open` | — | Don't auto-open the browser |
| `--tui` | off | Expose embedded TUI chat tab (requires `pty` extra) |

### Pitfall
DO NOT confuse this with the API Server + Open WebUI method—this built-in dashboard is the simple, native web UI. The API Server is for external integrations (n8n, Zapier, etc.), not the simple web UI use case.

---

## CLI Reference

### Global Flags

```
hermes [flags] [command]

  --version, -V             Show version
  --resume, -r SESSION      Resume session by ID or title
  --continue, -c [NAME]     Resume by name, or most recent session
  --worktree, -w            Isolated git worktree mode (parallel agents)
  --skills, -s SKILL        Preload skills (comma-separate or repeat)
  --profile, -p NAME        Use a named profile
  --yolo                    Skip dangerous command approval
  --pass-session-id         Include session ID in system prompt
```

No subcommand defaults to `chat`.

### Chat

```
hermes chat [flags]
  -q, --query TEXT          Single query, non-interactive
  -m, --model MODEL         Model (e.g. anthropic/claude-sonnet-4)
  -t, --toolsets LIST       Comma-separated toolsets
  --provider PROVIDER       Force provider (openrouter, anthropic, nous, etc.)
  -v, --verbose             Verbose output
  -Q, --quiet               Suppress banner, spinner, tool previews
  --checkpoints             Enable filesystem checkpoints (/rollback)
  --source TAG              Session source tag (default: cli)
```

### Configuration

```
hermes setup [section]      Interactive wizard (model|terminal|gateway|tools|agent)
hermes model                Interactive model/provider picker
hermes config               View current config
hermes config edit          Open config.yaml in $EDITOR
hermes config set KEY VAL   Set a config value
hermes config path          Print config.yaml path
hermes config env-path      Print .env path
hermes config check         Check for missing/outdated config
hermes config migrate       Update config with new options
hermes login [--provider P] OAuth login (nous, openai-codex)
hermes logout               Clear stored auth
hermes doctor [--fix]       Check dependencies and config
hermes status [--all]       Show component status
```

### Tools & Skills

```
hermes tools                Interactive tool enable/disable (curses UI)
hermes tools list           Show all tools and status
hermes tools enable NAME    Enable a toolset
hermes tools disable NAME   Disable a toolset

hermes skills list          List installed skills
hermes skills search QUERY  Search the skills hub
hermes skills install ID    Install a skill (ID can be a hub identifier OR a direct https://…/SKILL.md URL; pass --name to override when frontmatter has no name)
hermes skills inspect ID    Preview without installing
hermes skills config        Enable/disable skills per platform
hermes skills check         Check for updates
hermes skills update        Update outdated skills
hermes skills uninstall N   Remove a hub skill
hermes skills publish PATH  Publish to registry
hermes skills browse        Browse all available skills
hermes skills tap add REPO  Add a GitHub repo as skill source
```

### MCP Servers

```bash
hermes mcp serve            Run Hermes as an MCP server
hermes mcp add NAME         Add an MCP server (--url or --command)
hermes mcp remove NAME      Remove an MCP server
hermes mcp list             List configured servers
hermes mcp test NAME        Test connection
hermes mcp configure NAME   Toggle tool selection
```

#### NotebookLM MCP (Content Pipeline Knowledge Base)

NotebookLM notebooks can serve as structured knowledge sources for automated content generation. When you have a notebook with research, prompts, or brand guidelines, query it via MCP tools and feed the output into image generation, social media posting, or cron-driven workflows.

Key tools: `mcp_notebooklm_notebook_list`, `mcp_notebooklm_notebook_get`, `mcp_notebooklm_notebook_query`, `mcp_notebooklm_note`, `mcp_notebooklm_studio_create`.

See `references/notebooklm-content-pipeline.md` for the complete pattern: querying notebooks for prompts, extracting structured content, piping into image_gen/social posting, and scheduling via cron.

### Gateway (Messaging Platforms)

```bash
hermes gateway run          Start gateway foreground
hermes gateway install      Install as background service
hermes gateway start/stop   Control the service
hermes gateway restart      Restart the service
hermes gateway status       Check status
```

Supported platforms: Telegram, Discord, Slack, WhatsApp, Signal, Email, SMS, Matrix, Mattermost, Home Assistant, DingTalk, Feishu, WeCom, BlueBubbles (iMessage), Weixin (WeChat), API Server, Webhooks. Open WebUI connects via the API Server adapter.

Telegram setup reference: `references/telegram-gateway-setup.md` — bot tokens, allowlists, `require_mention` group filtering, persistent startup, verification, and known pitfalls.

Platform docs: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/

#### n8n Integration (API Server)
To use Hermes in n8n via the API Server adapter:
1. **WSL Windows Host Note**: If running n8n on Windows and Hermes in WSL, use the WSL IP (get via `hostname -I` in WSL) instead of `localhost`. Optionally set up port forwarding:
   ```cmd
   netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL-IP>
   ```
2. **n8n HTTP Node Config**:
   - Method: `POST`
   - URL: `http://<WSL-IP>:8000/api/message` (or `http://localhost:8000` if n8n runs in WSL)
   - Body: Choose "Using JSON" for static messages, "Using Fields Below" to map dynamic values from previous nodes.
   - JSON Body (pure JSON only, no extra text like `json` prefix):
     ```json
     {
       "message": "={{ $json.prompt }}",
       "platform": "api_server",
       "chat_id": "n8n-workflow"
     }
     ```
3. **Common Error**: "Unexpected token 'j'" when submitting JSON Body means you added extra text (e.g. `json { ... }`) before the JSON object. Only paste the raw JSON.
Platform docs: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/

#### Per-Platform Model Override (Code Patch)

The gateway does **not** natively support different models per platform. To make Telegram (or any platform) use a different model than the CLI default:

1. **Add `model_name` to the platform section in `config.yaml`:**
   ```yaml
   telegram:
     model_name: openai/gpt-oss-120b   # Replaces model.default for Telegram
   ```

2. **Patch `gateway/run.py` → `_resolve_session_agent_runtime()`**, inserting this block after `model = _resolve_gateway_model(user_config)`:
   ```python
   # Per-platform model override (e.g. telegram.model_name)
   if source is not None and source.platform is not None:
       _plat_cfg = self.config.platforms.get(source.platform)
       if _plat_cfg is not None:
           _plat_model = _plat_cfg.extra.get("model_name", "")
           if _plat_model:
               model = _plat_model
   ```

Priority (low → high): `model.default` → platform `model_name` → `/model` session override.

**Pitfall:** On Hermes update, this patch in `gateway/run.py` is overwritten. Re-apply after updates.

---

### n8n Integration (API Server Adapter)
Use the API Server platform to connect Hermes to n8n via HTTP Request nodes:

1. **Start Gateway**: `hermes gateway run` (default port 8000)
2. **n8n HTTP Node Settings**:
   - Method: `POST`
   - URL: `http://<WSL-IP>:8000/api/message` (see WSL note below for Windows users)
   - Body: Select "Using JSON" for static test messages, "Using Fields Below" to map data from previous n8n nodes
   - JSON Body (pure JSON, no extra text):
     ```json
     {
       "message": "={{ $json.prompt }}",
       "platform": "api_server",
       "chat_id": "n8n"
     }
     ```
3. **Common Pitfalls**:
   - JSON Body Error: Never add "json" prefix or extra text before the JSON object. Use only valid JSON.
   - WSL/Windows Users: n8n on Windows cannot reach WSL's `localhost`. Get WSL IP with `hostname -I` in WSL, use this IP in the URL. Optionally run this Windows admin command to forward ports:
     ```cmd
     netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL-IP>
     ```
   - Large Data Copies: Use background `cp` for Hermes data >1GB to avoid WSL timeouts: `nohup cp -r ~/.hermes/hermes-agent /mnt/d/hermes/ > /tmp/copy.log 2>&1 &`

---

### Windows/WSL: Moving Hermes to Another Drive
If C: is full (common for WSL users), move Hermes data to D: (or another drive):

1. **Check Disk Space**: `df -h` to confirm C: (`/mnt/c`) is full, D: (`/mnt/d`) has space.
2. **Create Target Folder**: `mkdir -p /mnt/d/hermes`
3. **Copy Critical Files First**: `cp ~/.hermes/config.yaml ~/.hermes/.env ~/.hermes/auth.json /mnt/d/hermes/`
4. **Copy Large Data in Background**: Avoid timeouts for 1GB+ data:
   ```bash
   nohup cp -r ~/.hermes/hermes-agent /mnt/d/hermes/ > /tmp/copy.log 2>&1 &
   ```
5. **Set HERMES_HOME**:
   - Temporary: `HERMES_HOME=/mnt/d/hermes hermes [command]`
   - Permanent (manual only, do not auto-edit `.bashrc` if denied): Add `export HERMES_HOME=/mnt/d/hermes` to `~/.bashrc` manually.
6. **Verify**: `HERMES_HOME=/mnt/d/hermes hermes config path` should return `/mnt/d/hermes/config.yaml`
7. **Clean Up Old Data (Optional)**: After verifying, free C: space: `rm -rf ~/.hermes/hermes-agent`

**Pitfall**: If the user blocks automated `.bashrc` edits, provide the manual command for them to run, do not retry automated changes.

### Sessions

```
hermes sessions list        List recent sessions
hermes sessions browse      Interactive picker
hermes sessions export OUT  Export to JSONL
hermes sessions rename ID T Rename a session
hermes sessions delete ID   Delete a session
hermes sessions prune       Clean up old sessions (--older-than N days)
hermes sessions stats       Session store statistics
```

### Cron Jobs

```
hermes cron list            List jobs (--all for disabled)
hermes cron create SCHED    Create: '30m', 'every 2h', '0 9 * * *'
hermes cron edit ID         Edit schedule, prompt, delivery
hermes cron pause/resume ID Control job state
hermes cron run ID          Trigger on next tick
hermes cron remove ID       Delete a job
hermes cron status          Scheduler status
```

### Webhooks

```
hermes webhook subscribe N  Create route at /webhooks/<name>
hermes webhook list         List subscriptions
hermes webhook remove NAME  Remove a subscription
hermes webhook test NAME    Send a test POST
```

### Profiles

```
hermes profile list         List all profiles
hermes profile create NAME  Create (--clone, --clone-all, --clone-from)
hermes profile use NAME     Set sticky default
hermes profile delete NAME  Delete a profile
hermes profile show NAME    Show details
hermes profile alias NAME   Manage wrapper scripts
hermes profile rename A B   Rename a profile
hermes profile export NAME  Export to tar.gz
hermes profile import FILE  Import from archive
```

### Credential Pools

```
hermes auth add             Interactive credential wizard
hermes auth list [PROVIDER] List pooled credentials
hermes auth remove P INDEX  Remove by provider + index
hermes auth reset PROVIDER  Clear exhaustion status
```

### Other

```
hermes insights [--days N]  Usage analytics
hermes update               Update to latest version
hermes pairing list/approve/revoke  DM authorization
hermes plugins list/install/remove  Plugin management
hermes honcho setup/status  Honcho memory integration (requires honcho plugin)
hermes memory setup/status/off  Memory provider config
hermes completion bash|zsh  Shell completions
hermes acp                  ACP server (IDE integration)
hermes claw migrate         Migrate from OpenClaw
hermes uninstall            Uninstall Hermes
```

---

## Slash Commands (In-Session)

Type these during an interactive chat session.

### Session Control
```
/new (/reset)        Fresh session
/clear               Clear screen + new session (CLI)
/retry               Resend last message
/undo                Remove last exchange
/title [name]        Name the session
/compress [focus]    Manually compress conversation context
/summarize [focus]   Summarize the current conversation in German (alias: /summary)
/stop                Kill all running background processes
/rollback [N]        Restore filesystem checkpoint
/background <prompt> Run prompt in background
/queue <prompt>      Queue for next turn
/resume [name]       Resume a named session
```

### Configuration
```
/config              Show config (CLI)
/model [name]        Show or change model
/personality [name]  Set personality
/reasoning [level]   Set reasoning (none|minimal|low|medium|high|xhigh|show|hide)
/verbose             Cycle: off → new → all → verbose
/voice [on|off|tts]  Voice mode
/yolo                Toggle approval bypass
/skin [name]         Change theme — see `references/hermes-skins.md` for skin list, YAML schema, and custom skins
/statusbar           Toggle status bar (CLI)
```

### Tools & Skills
```
/tools               Manage tools (CLI)
/toolsets            List toolsets (CLI)
/skills              Search/install skills (CLI)
/skill <name>        Load a skill into session
/cron                Manage cron jobs (CLI)
/reload-mcp          Reload MCP servers
/plugins             List plugins (CLI)
```

### Gateway
```
/approve             Approve a pending command (gateway)
/deny                Deny a pending command (gateway)
/restart             Restart gateway (gateway)
/sethome             Set current chat as home channel (gateway)
/update              Update Hermes to latest (gateway)
/platforms (/gateway) Show platform connection status (gateway)
```

### Utility
```
/branch (/fork)      Branch the current session
/fast                Toggle priority/fast processing
/browser             Open CDP browser connection
/history             Show conversation history (CLI)
/save                Save conversation to file (CLI)
/paste               Attach clipboard image (CLI)
/image               Attach local image file (CLI)
```

### Info
```
/help                Show commands
/commands [page]     Browse all commands (gateway)
/usage               Token usage
/insights [days]     Usage analytics
/status              Session info (gateway)
/profile             Active profile info
```

### Exit
```
/quit (/exit, /q)    Exit CLI
```

---

## Key Paths & Config

```
~/.hermes/config.yaml       Main configuration
~/.hermes/.env              API keys and secrets
$HERMES_HOME/skills/        Installed skills
~/.hermes/sessions/         Session transcripts
~/.hermes/logs/             Gateway and error logs
~/.hermes/auth.json         OAuth tokens and credential pools
~/.hermes/hermes-agent/     Source code (if git-installed)
```

Profiles use `~/.hermes/profiles/<name>/` with the same layout.

### Storage Migration (Moving HERMES_HOME)
If your system drive (e.g. C: in WSL) is full, move Hermes data to another drive (e.g. D:):
1. Create target directory: `mkdir -p /mnt/d/hermes`
2. Copy critical files first: `cp ~/.hermes/config.yaml ~/.hermes/.env ~/.hermes/auth.json /mnt/d/hermes/`
3. Copy large directories in background: `nohup cp -r ~/.hermes/hermes-agent /mnt/d/hermes/ > /tmp/copy.log 2>&1 &`
4. Set `HERMES_HOME` temporarily: `HERMES_HOME=/mnt/d/hermes hermes config path` (verify it points to new path)
5. Set permanently: `echo 'export HERMES_HOME=/mnt/d/hermes' >> ~/.bashrc`
6. Clean up old data: `rm -rf ~/.hermes/hermes-agent` (once verified working)

### Config Sections

Edit with `hermes config edit` or `hermes config set section.key value`.

| Section | Key options |
|---------|-------------|
| `model` | `default`, `provider`, `base_url`, `api_key`, `context_length` (override minimum below default 32K) |
| `agent` | `max_turns` (90), `tool_use_enforcement` |
| `terminal` | `backend` (local/docker/ssh/modal), `cwd`, `timeout` (180) |
| `compression` | `enabled`, `threshold` (0.50), `target_ratio` (0.20) |
| `display` | `skin` (see `references/hermes-skins.md`), `tool_progress`, `show_reasoning`, `show_cost`, `bell_on_complete`, `compact`, `streaming`, `timestamps`, `final_response_markdown`, `persistent_output`, `inline_diffs`, `file_mutation_verifier` |
| `stt` | `enabled`, `provider` (local/groq/openai/mistral) |
| `tts` | `provider` (edge/elevenlabs/openai/minimax/mistral/neutts) |
| `memory` | `memory_enabled`, `user_profile_enabled`, `provider` |
| `security` | `tirith_enabled`, `website_blocklist` |
| `delegation` | `model`, `provider`, `base_url`, `api_key`, `max_iterations` (50), `reasoning_effort` |
| `checkpoints` | `enabled`, `max_snapshots` (50) |

Full config reference: https://hermes-agent.nousresearch.com/docs/user-guide/configuration

### Providers

20+ providers supported. Set via `hermes model` or `hermes setup`.

| Provider | Auth | Key env var |
|----------|------|-------------|
| OpenRouter | API key | `OPENROUTER_API_KEY` |
| Anthropic | API key | `ANTHROPIC_API_KEY` |
| Nous Portal | OAuth | `hermes auth` |
| OpenAI Codex | OAuth | `hermes auth` |
| GitHub Copilot | Token | `COPILOT_GITHUB_TOKEN` |
| Google Gemini | API key | `GOOGLE_API_KEY` or `GEMINI_API_KEY` |
| DeepSeek | API key | `DEEPSEEK_API_KEY` |
| xAI / Grok | API key | `XAI_API_KEY` |
| Hugging Face | Token | `HF_TOKEN` |
| Z.AI / GLM | API key | `GLM_API_KEY` |
| MiniMax | API key | `MINIMAX_API_KEY` |
| MiniMax CN | API key | `MINIMAX_CN_API_KEY` |
| Kimi / Moonshot | API key | `KIMI_API_KEY` |
| Alibaba / DashScope | API key | `DASHSCOPE_API_KEY` |
| Xiaomi MiMo | API key | `XIAOMI_API_KEY` |
| Kilo Code | API key | `KILOCODE_API_KEY` |
| AI Gateway (Vercel) | API key | `AI_GATEWAY_API_KEY` |
| OpenCode Zen | API key | `OPENCODE_ZEN_API_KEY` |
| OpenCode Go | API key | `OPENCODE_GO_API_KEY` |
| Qwen OAuth | OAuth | `hermes login --provider qwen-oauth` |
| Custom endpoint | Config | `model.base_url` + `model.api_key` in config.yaml |
| GitHub Copilot ACP | External | `COPILOT_CLI_PATH` or Copilot CLI |

Full provider docs: https://hermes-agent.nousresearch.com/docs/integrations/providers

### Toolsets

Enable/disable via `hermes tools` (interactive) or `hermes tools enable/disable NAME`.

| Toolset | What it provides |
|---------|-----------------|
| `web` | Web search and content extraction |
| `browser` | Browser automation (Browserbase, Camofox, or local Chromium) |
| `terminal` | Shell commands and process management |
| `file` | File read/write/search/patch |
| `code_execution` | Sandboxed Python execution |
| `vision` | Image analysis |
| `image_gen` | AI image generation |
| `tts` | Text-to-speech |
| `skills` | Skill browsing and management |
| `memory` | Persistent cross-session memory |
| `session_search` | Search past conversations |
| `delegation` | Subagent task delegation |
| `cronjob` | Scheduled task management |
| `clarify` | Ask user clarifying questions |
| `messaging` | Cross-platform message sending |
| `search` | Web search only (subset of `web`) |
| `todo` | In-session task planning and tracking |
| `rl` | Reinforcement learning tools (off by default) |
| `moa` | Mixture of Agents (off by default) |
| `homeassistant` | Smart home control (off by default) |

Tool changes take effect on `/reset` (new session). They do NOT apply mid-conversation to preserve prompt caching.

---

## Security & Privacy Toggles

Common "why is Hermes doing X to my output / tool calls / commands?" toggles — and the exact commands to change them. Most of these need a fresh session (`/reset` in chat, or start a new `hermes` invocation) because they're read once at startup.

### Secret redaction in tool output

Secret redaction is **off by default** — tool output (terminal stdout, `read_file`, web content, subagent summaries, etc.) passes through unmodified. If the user wants Hermes to auto-mask strings that look like API keys, tokens, and secrets before they enter the conversation context and logs:

```bash
hermes config set security.redact_secrets true       # enable globally
```

**Restart required.** `security.redact_secrets` is snapshotted at import time — toggling it mid-session (e.g. via `export HERMES_REDACT_SECRETS=true` from a tool call) will NOT take effect for the running process. Tell the user to run `hermes config set security.redact_secrets true` in a terminal, then start a new session. This is deliberate — it prevents an LLM from flipping the toggle on itself mid-task.

Disable again with:
```bash
hermes config set security.redact_secrets false
```

### PII redaction in gateway messages

Separate from secret redaction. When enabled, the gateway hashes user IDs and strips phone numbers from the session context before it reaches the model:

```bash
hermes config set privacy.redact_pii true    # enable
hermes config set privacy.redact_pii false   # disable (default)
```

### Command approval prompts

By default (`approvals.mode: manual`), Hermes prompts the user before running shell commands flagged as destructive (`rm -rf`, `git reset --hard`, etc.). The modes are:

- `manual` — always prompt (default)
- `smart` — use an auxiliary LLM to auto-approve low-risk commands, prompt on high-risk
- `off` — skip all approval prompts (equivalent to `--yolo`)

```bash
hermes config set approvals.mode smart       # recommended middle ground
hermes config set approvals.mode off         # bypass everything (not recommended)
```

Per-invocation bypass without changing config:
- `hermes --yolo …`
- `export HERMES_YOLO_MODE=1`

Note: YOLO / `approvals.mode: off` does NOT turn off secret redaction. They are independent.

### Shell hooks allowlist

Some shell-hook integrations require explicit allowlisting before they fire. Managed via `~/.hermes/shell-hooks-allowlist.json` — prompted interactively the first time a hook wants to run.

### Disabling the web/browser/image-gen tools

To keep the model away from network or media tools entirely, open `hermes tools` and toggle per-platform. Takes effect on next session (`/reset`). See the Tools & Skills section above.

---

## Voice & Transcription

### STT (Voice → Text)

Voice messages from messaging platforms are auto-transcribed.

Provider priority (auto-detected):
1. **Local faster-whisper** — free, no API key: `pip install faster-whisper`
2. **Groq Whisper** — free tier: set `GROQ_API_KEY`
3. **OpenAI Whisper** — paid: set `VOICE_TOOLS_OPENAI_KEY`
4. **Mistral Voxtral** — set `MISTRAL_API_KEY`

Config:
```yaml
stt:
  enabled: true
  provider: local        # local, groq, openai, mistral
  local:
    model: base          # tiny, base, small, medium, large-v3
```

### CLI Voice Input (WSL)

Drei Ansätze für Voice-Input in Hermes CLI auf WSL:

| Ansatz | Wie | Best for |
|----------|-----|----------|
| **F2 PTT** (built-in) | F2=start recording, F2=stop+transcribe → text | Quick inline voice in existing Hermes session |
| **voice-hermes** | Standalone REPL: Enter→speak→auto-stop | Longer conversations, silence detection, VU meter |
| **`/voice on`** | Full voice mode with TTS, continuous mode | NOT working in WSL |

**⚠️ Ctrl+F2 Pitfall (Cancel):** Durch ein zweites Drücken von `Ctrl+F2` wird die Aufnahme sofort gestoppt UND die Transkription gecancelt. Das verhindert, dass unerwünschter Text in den Buffer eingefügt wird.

**Technik:** Nutzt `ffmpeg.exe` (Windows) + `faster-whisper large-v3`.

Full reference: `references/hermes-cli-voice-f2-wsl.md`

### TTS (Text → Voice)

| Provider | Env var | Free? |
|----------|---------|-------|
| Edge TTS | None | Yes (default) |
| ElevenLabs | `ELEVENLABS_API_KEY` | Free tier |
| OpenAI | `VOICE_TOOLS_OPENAI_KEY` | Paid |
| MiniMax | `MINIMAX_API_KEY` | Paid |
| Mistral (Voxtral) | `MISTRAL_API_KEY` | Paid |
| NeuTTS (local) | None (`pip install neutts[all]` + `espeak-ng`) | Free |

Voice commands: `/voice on` (voice-to-voice), `/voice tts` (always voice), `/voice off`.

---

## Spawning Additional Hermes Instances

Run additional Hermes processes as fully independent subprocesses — separate sessions, tools, and environments.

### When to Use This vs delegate_task

| | `delegate_task` | Spawning `hermes` process |
|-|-----------------|--------------------------|
| Isolation | Separate conversation, shared process | Fully independent process |
| Duration | Minutes (bounded by parent loop) | Hours/days |
| Tool access | Subset of parent's tools | Full tool access |
| Interactive | No | Yes (PTY mode) |
| Use case | Quick parallel subtasks | Long autonomous missions |

### One-Shot Mode

```
terminal(command="hermes chat -q 'Research GRPO papers and write summary to ~/research/grpo.md'", timeout=300)

# Background for long tasks:
terminal(command="hermes chat -q 'Set up CI/CD for ~/myapp'", background=true)
```

### Interactive PTY Mode (via tmux)

Hermes uses prompt_toolkit, which requires a real terminal. Use tmux for interactive spawning:

```
# Start
terminal(command="tmux new-session -d -s agent1 -x 120 -y 40 'hermes'", timeout=10)

# Wait for startup, then send a message
terminal(command="sleep 8 && tmux send-keys -t agent1 'Build a FastAPI auth service' Enter", timeout=15)

# Read output
terminal(command="sleep 20 && tmux capture-pane -t agent1 -p", timeout=5)

# Send follow-up
terminal(command="tmux send-keys -t agent1 'Add rate limiting middleware' Enter", timeout=5)

# Exit
terminal(command="tmux send-keys -t agent1 '/exit' Enter && sleep 2 && tmux kill-session -t agent1", timeout=10)
```

### Multi-Agent Coordination

```
# Agent A: backend
terminal(command="tmux new-session -d -s backend -x 120 -y 40 'hermes -w'", timeout=10)
terminal(command="sleep 8 && tmux send-keys -t backend 'Build REST API for user management' Enter", timeout=15)

# Agent B: frontend
terminal(command="tmux new-session -d -s frontend -x 120 -y 40 'hermes -w'", timeout=10)
terminal(command="sleep 8 && tmux send-keys -t frontend 'Build React dashboard for user management' Enter", timeout=15)

# Check progress, relay context between them
terminal(command="tmux capture-pane -t backend -p | tail -30", timeout=5)
terminal(command="tmux send-keys -t frontend 'Here is the API schema from the backend agent: ...' Enter", timeout=5)
```

### Session Resume

```
# Resume most recent session
terminal(command="tmux new-session -d -s resumed 'hermes --continue'", timeout=10)

# Resume specific session
terminal(command="tmux new-session -d -s resumed 'hermes --resume 20260225_143052_a1b2c3'", timeout=10)
```

### Tips

- **Prefer `delegate_task` for quick subtasks** — less overhead than spawning a full process
- **Use `-w` (worktree mode)** when spawning agents that edit code — prevents git conflicts
- **Set timeouts** for one-shot mode — complex tasks can take 5-10 minutes
- **Use `hermes chat -q` for fire-and-forget** — no PTY needed
- **Use tmux for interactive sessions** — raw PTY mode has `\r` vs `\n` issues with prompt_toolkit
- **For scheduled tasks**, use the `cronjob` tool instead of spawning — handles delivery and retry

---

## Integrating with n8n

When connecting Hermes Agent to n8n (self-hosted on Windows with WSL2):

### Prerequisites
1. Enable Hermes API Server in `config.yaml`:
   ```yaml
   api_server:
     enabled: true
     port: 8642  # Default port, override with API_SERVER_PORT env var
   ```
2. Allow unauthenticated access for n8n by setting `GATEWAY_ALLOW_ALL_USERS=true` in `~/.hermes/.env` (or `/mnt/d/hermes/.env` if using D: drive)

### WSL2 ↔ Windows Networking
WSL2 runs in an isolated virtual network; Windows n8n cannot access WSL's `localhost` directly:
1. Get WSL IP: Run `hostname -I` in WSL, use the first IP (e.g., `172.23.x.x`)
2. Make API Server accessible from Windows by binding to all interfaces:
   - Start gateway with: `API_SERVER_HOST=0.0.0.0 HERMES_HOME=/mnt/d/hermes hermes gateway run`
   - Or persist via env var: Add `API_SERVER_HOST=0.0.0.0` to `~/.hermes/.env`

### n8n HTTP Request Node Configuration
1. **Method**: POST
2. **URL**: `http://<WSL-IP>:8642/v1/chat/completions` (OpenAI-compatible endpoint, *not* `/api/message`)
3. **Body**: Select "Using JSON", enter pure JSON (no extra text, no "json" prefix):
   ```json
   {
     "model": "hermes-agent",
     "messages": [{"role": "user", "content": "={{ $json.message }}"}]
   }
   ```
4. **Critical Pitfall**: Adding "json" or extra text before the JSON object causes n8n "Invalid JSON" errors.

### Moving Hermes to D: Drive (C: Space Constraints)
If C: drive is near full (common scenario: user's C: was 91% used):
1. Create D: target: `mkdir -p /mnt/d/hermes`
2. Copy existing data: `cp -r ~/.hermes/* /mnt/d/hermes/`
3. Set Hermes home: Use `HERMES_HOME=/mnt/d/hermes` for all Hermes commands, or manually add to `.bashrc` (user prefers explicit manual steps over automatic modifications)

---

## Troubleshooting

### User wants animated starfield / moving-star background

Das Skin-System (`display.skin` in config.yaml) kann KEINE animierten Hintergründe oder Glow-Effekte. Hermes läuft im prompt_toolkit line-mode (`full_screen=False`) — es gibt keinen persistenten Canvas.

**DO NOT:** tmux, separate Python-Scripts, Hintergrundprozesse, `starry-sky.py`, Second-Screen-Tools, oder irgendwas das einen zweiten Tab/Pane/Prozess voraussetzt, vorschlagen. Der User lehnt das ab (Frustrationssignal: "nein", "zu kompliziert", "denkst zu kompliziert").

**DO:** Einfach die Skin-YAML in `~/.hermes/skins/` anlegen. Der Spinner (waiting_faces/thinking_faces) ist die einzige Animation die Hermes nativ hat — die mit Sternsymbolen zu füllen IST die "bewegte Sterne"-Lösung. Finger weg von Allem was außerhalb der YAML-Datei liegt. Wenn der User mehr will (echten Hintergrund), verweise auf Windows Terminal Background Image (siehe `references/hermes-skins.md` → "Grenzen des Skin-Systems" + "Windows Terminal Background Image").

### No bell/beep sound on completion
If the terminal bell (audible beep) stopped playing when Hermes finishes a response:

1. Check `display.bell_on_complete` in config.yaml — must be `true`:
   ```bash
   hermes config set display.bell_on_complete true
   ```
2. **WSL note**: The Windows Terminal bell may be disabled system-wide. Check Windows Terminal Settings → "Bell style" or enable terminal bell in WSL:
   ```bash
   # Test if the terminal bell works at all
   echo -e '\a'
   ```
3. **Config reset**: Config migrations sometimes reset `bell_on_complete` to `false`. Re-apply via the command above.
4. **Restart required**: Changes take effect on next session (`/reset` or restart Hermes).

### Voice not working
1. Check `stt.enabled: true` in config.yaml
2. Verify provider: `pip install faster-whisper` or set API key
3. In gateway: `/restart`. In CLI: exit and relaunch.

### Tool not available
1. `hermes tools` — check if toolset is enabled for your platform
2. Some tools need env vars (check `.env`)
3. `/reset` after enabling tools

### Model/provider issues
1. `hermes doctor` — check config and dependencies
2. `hermes login` — re-authenticate OAuth providers
3. Check `.env` has the right API key
4. **Copilot 403**: `gh auth login` tokens do NOT work for Copilot API. You must use the Copilot-specific OAuth device code flow via `hermes model` → GitHub Copilot.
### Local model format issues
When using tools like `llama.cpp`, ensure the model is in GGUF format. Models in `.safetensors`, `.bin`, or PyTorch formats cannot be used directly with llama.cpp and must be converted first. Check the Hugging Face repo for `.gguf` files or use the `?local-app=llama.cpp` view to verify compatibility.

### Gemma 4 returns empty content (thinking mode)
Gemma 4 has a built-in `<|think|>` token in its chat template. By default, the model outputs its reasoning in `reasoning_content` and the final answer in `content` — but with short `max_tokens`, `content` can come back empty. **Fix**: start `llama-server` with a custom `--chat-template` that removes the `<|think|>` token:
```bash
llama-server --model ... --chat-template '{% if not add_generation_prompt is defined %}{% set add_generation_prompt = false %}{% endif %}{% for message in messages %}{{"<|turn|>" + message["role"] + "\n" + message["content"] + "<|end|>\n"}}{% endfor %}{% if add_generation_prompt %}{{"<|turn|>model\n"}}{% endif %}'
```
Also add `--no-prefill-assistant` to prevent the server from leaking template fragments into the response. Without this fix, Hermes gets empty responses from the local model.

### Changes not taking effect
- **Tools/skills:** `/reset` starts a new session with updated toolset
- **Config changes:** In gateway: `/restart`. In CLI: exit and relaunch.
- **Code changes:** Restart the CLI or gateway process

### Skills not showing
1. `hermes skills list` — verify installed
2. `hermes skills config` — check platform enablement
3. Load explicitly: `/skill name` or `hermes -s name`

### Gateway issues
Check logs first:
```bash
grep -i "failed to send\\|error" ~/.hermes/logs/gateway.log | tail -20
```

Common gateway problems:
- **Gateway dies on SSH logout**: Enable linger: `sudo loginctl enable-linger $USER`
- **Gateway dies on WSL2 close**: WSL2 requires `systemd=true` in `/etc/wsl.conf` for systemd services to work. Without it, gateway falls back to `nohup` (dies when session closes).
- **Gateway dies when parent shell exits**: Running `hermes gateway run` in a terminal command ties it to the parent shell. When the command times out or the tool session ends, the parent sends SIGTERM. Fix: use a nohup wrapper script (see `references/telegram-gateway-setup.md`) or systemd service.
- **Gateway crash loop**: Reset the failed state: `systemctl --user reset-failed hermes-gateway`
- **Gateway exits immediately after HERMES_HOME migration**: Verify `config.yaml` exists in new `HERMES_HOME` path, check `/path/to/new/hermes/logs/gateway.log` for missing file errors, ensure all critical files were copied correctly.
- **InvalidToken on Telegram**: The bot token in `~/.hermes/.env` was rejected. Get a fresh token from @BotFather and update the `TELEGRAM_BOT_TOKEN` line. Remove stale/duplicate token lines.
- **"No user allowlists configured"**: The gateway needs `GATEWAY_ALLOW_ALL_USERS=true` in `.env` OR `TELEGRAM_ALLOWED_USERS` / `TELEGRAM_ALLOWED_CHATS` set. Without these, Telegram users get silently denied.

### Config pitfalls
- **`approvals.mode: off` via CLI**: `hermes config set approvals.mode off` stores YAML boolean `false`, not the string `"off"`. The gateway reads this as falsy and defaults to `manual`. Fix: edit `config.yaml` manually and write `mode: off` (unquoted string).
- **`fallback_model` format**: `hermes config set fallback_model '{"provider": "...", "model": "..."}'` stores a JSON string. `hermes doctor` flags this as invalid. Fix: write as YAML dict in `config.yaml`:
  ```yaml
  fallback_model:
    provider: openrouter
    model: anthropic/claude-sonnet-4
  ```
- **Deprecated `.env` settings**: `TERMINAL_CWD`, `STT_PROVIDER`, etc. in `.env` produce warnings. Move them to `config.yaml` under the appropriate section and remove from `.env`.

### Platform-specific issues
- **Discord bot silent**: Must enable **Message Content Intent** in Bot → Privileged Gateway Intents.
- **Slack bot only works in DMs**: Must subscribe to `message.channels` event. Without it, the bot ignores public channels.
- **Windows HTTP 400 "No models provided"**: Config file encoding issue (BOM). Ensure `config.yaml` is saved as UTF-8 without BOM.
- **Snap chromium stuck in WSL**: Snap-based Chromium installs frequently get stuck in WSL2. Use Playwright's bundled Chromium instead: `pip install playwright && python3 -m playwright install chromium`. This installs a working Chromium under `~/.cache/ms-playwright/` without snap. Configure with `hermes config set browser.engine playwright`.

### API key setup pitfalls
- **Keep API key connections simple.** When a user provides an API key for a non-native service: try the single most likely endpoint first with a direct curl command. If it fails with a specific error (e.g. MISSING_API_KEY), use that error to refine the request. Avoid: checking DNS resolution, crawling documentation pages, or testing 5+ endpoint variants before trying the obvious one. The user wants the key connected, not a diagnostic report.
- **TinyFish Search API**: https://api.search.tinyfish.ai (note .ai, not .io). Auth via X-API-Key header. Simple GET with ?query= parameter returns structured JSON results. Not a native Hermes backend use DDGS for general search and TinyFish for dedicated search tasks.
- **DDGS (DuckDuckGo Search)**: Free search backend, no API key required. Install with `pip install duckduckgo_search` then configure with `hermes config set web.backend ddgs` and `hermes config set web.search_backend ddgs`.
- **Windows HTTP 400 "No models provided"**: Config file encoding issue (BOM). Ensure `config.yaml` is saved as UTF-8 without BOM.
- **Snap chromium stuck in WSL**: Snap-based Chromium installs frequently get stuck in WSL2. Use Playwright's bundled Chromium instead: `pip install playwright && python3 -m playwright install chromium`. This installs a working Chromium without snap. Configure with `hermes config set browser.engine chrome`.

### API key setup pitfalls
- **Keep API key connections simple.** When a user provides an API key for a non-native service: try the single most likely endpoint first with a direct curl command. If it fails with a specific error (e.g. MISSING_API_KEY), use that error to refine the request. Avoid checking DNS resolution, crawling documentation pages, or testing 5+ endpoint variants before trying the obvious one. The user wants the key connected, not a diagnostic report.

### Model Supply Chain — Primary vs Fallback
User sessions may specify an explicit LLM provider stack. When the user says "use X as primary, Y as fallback":
1. Set the primary model immediately via `hermes config set model.provider <provider>` and `hermes config set model.model <model_name>`
2. Configure fallback in `config.yaml` (not via CLI due to JSON string pitfalls):
   ```yaml
   fallback_model:
     provider: <provider_name>
     model: <model_name>
   ```
3. Verify with `hermes doctor` that both models are reachable before proceeding.

**TinyFish is NOT a chat LLM provider.** It is a specialized Web Action backend (search, fetch, browser automation). Do NOT configure it under `model.provider`. Configure it under `web.backend` and `web.search_backend` instead.

### Web Backend Configuration
For web search, fetch, and browser automation tasks, use TinyFish as the dedicated backend:

1. **Set environment variable** in `~/.hermes/.env`:
   ```
   TINYFISH_API_KEY=sk-tinyfish-...
   ```

2. **Configure backend** (run in terminal):
   ```bash
   hermes config set web.backend tinyfish
   hermes config set web.search_backend tinyfish
   ```

3. **For custom endpoint setups** (if using a self-hosted TinyFish proxy):
   ```yaml
   web:
     backend: custom
     custom:
       base_url: https://api.search.tinyfish.ai
       api_key: ${TINYFISH_API_KEY}
   ```

**Important:** TinyFish endpoint domain is `.ai` (api.search.tinyfish.ai), not `.io`. It exposes search, fetch, and browser APIs under the same auth scheme.

**Fallback strategy:** For general-purpose search when TinyFish is unavailable, DDGS (DuckDuckGo Search) is the free, no-key alternative:
```bash
pip install duckduckgo_search
hermes config set web.backend ddgs
hermes config set web.search_backend ddgs
```

See `references/tinyfish-search-api.md` for API details and `references/web-actions-backend.md` for full backend selection guidelines.

### Auxiliary models not working
If `auxiliary` tasks (vision, compression, session_search) fail silently, the `auto` provider can't find a backend. Either set `OPENROUTER_API_KEY` or `GOOGLE_API_KEY`, or explicitly configure each auxiliary task's provider:
```bash
hermes config set auxiliary.vision.provider <your_provider>
hermes config set auxiliary.vision.model <model_name>
```

---

## Where to Find Things

| Looking for... | Location |
|----------------|----------|
| CLI skin / theming | `references/hermes-skins.md` — 9 built-in skins, YAML schema, custom skin tutorial |
| Available tools | `hermes tools list` or [Tools reference](https://hermes-agent.nousresearch.com/docs/reference/tools-reference) |
| Slash commands | `/help` in session or [Slash commands reference](https://hermes-agent.nousresearch.com/docs/reference/slash-commands) |
| Skills catalog | `hermes skills browse` or [Skills catalog](https://hermes-agent.nousresearch.com/docs/reference/skills-catalog) |
| Provider setup | `hermes model` or [Providers guide](https://hermes-agent.nousresearch.com/docs/integrations/providers) |
| Platform setup | `hermes gateway setup` or [Messaging docs](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/) |
| MCP servers | `hermes mcp list` or [MCP guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) |
| Profiles | `hermes profile list` or [Profiles docs](https://hermes-agent.nousresearch.com/docs/user-guide/profiles) |
| Cron jobs | `hermes cron list` or [Cron docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron) |
| Memory | `hermes memory status` or [Memory docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) |
| Env variables | `hermes config env-path` or [Env vars reference](https://hermes-agent.nousresearch.com/docs/reference/environment-variables) |
| CLI commands | `hermes --help` or [CLI reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands) |
| Gateway logs | `~/.hermes/logs/gateway.log` |
| Session files | `~/.hermes/sessions/` or `hermes sessions browse` |
| Local Gemma 4 deployment (FastAPI) | `references/gemma4-fastapi-server.py` template + `references/gemma4-quants.md` guide |
| Source code | ~/.hermes/hermes-agent/ |

---

## API Server for External Integration (n8n, Zapier, etc.)

Hermes Gateway includes an OpenAI-compatible API Server for integration with external tools like n8n, Zapier, or any HTTP client.

### Quick Setup

```bash
# Enable API Server in config.yaml
api_server:
  enabled: true
  port: 8642
  host: 0.0.0.0    # Use 0.0.0.0 for external access (from Windows/Mac)

# Set in .env for external binding (required for 0.0.0.0):
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8642
API_SERVER_KEY=your-secret-key-here  # REQUIRED when binding to 0.0.0.0
GATEWAY_ALLOW_ALL_USERS=true        # Allow external access
```

### Critical Pitfall

**Binding to 0.0.0.0 requires API_SERVER_KEY.** The API Server refuses to start on 0.0.0.0 without an API key (security feature). Error message:
```
Refusing to start: binding to 0.0.0.0 requires API_SERVER_KEY
```

Fix: Set `API_SERVER_KEY` in `.env` or disable by staying on default `127.0.0.1` (localhost only).

### Correct Endpoint

The API Server is **OpenAI-compatible**:
```
POST http://<host>:8642/v1/chat/completions
```

NOT `/api/message` (that's for other gateway platforms). Example request:
```json
{
  "model": "hermes-agent",
  "messages": [{"role": "user", "content": "Hello"}],
  "max_tokens": 500
}
```

### WSL → Windows Networking

When running Hermes in WSL and accessing from Windows (n8n):
1. Get WSL IP: `hostname -I` (e.g., `172.20.192.209`)
2. Use `http://<WSL-IP>:8642/v1/chat/completions` in n8n HTTP Node
3. Port forwarding: WSL ports are NOT automatically available on localhost in Windows

### n8n HTTP Node Configuration

**Settings:**
- **Method:** POST
- **URL:** `http://<WSL-IP>:8642/v1/chat/completions`
- **Body (Using JSON):**
```json
{
  "model": "hermes-agent",
  "messages": [{"role": "user", "content": "={{ $json.message }}"}],
  "max_tokens": 500
}
```

See `references/n8n-integration.md` for full n8n workflow examples.

## Local Voice Assistant (Windows + WSL)

For building a local voice assistant with Windows GUI (tkinter Notch), voice activity detection, speech-to-text via WSL, and Hermes delegation for complex tasks, see:
- `references/hermes-cli-voice-f2-wsl.md` — F2 push-to-talk voice input in Hermes CLI via ffmpeg.exe + faster-whisper large-v3 (WSL/Windows)
- `references/windows-voice-assistant.md`

This covers: VAD-only wake detection ("Gemma" keyword), GUI overlay architecture, action routing (simple → local, complex → Hermes), and startup automation via batch file.

---

## "Full Access" Configuration

When the user says "ich gebe dir alle rechte" or wants unrestricted operation:

```yaml
# config.yaml - Disable security features
security:
  allow_private_urls: true
  tirith_enabled: false    # ← Disable Tirith (blocks commands)

approvals:
  mode: off                # ← Disable approval prompts
  mcp_reload_confirm: false
```

These settings prevent "BLOCKED: User denied" errors and allow the agent to execute commands without constant interruptions.

---

## Moving HERMES_HOME to Another Drive

When C: is full (Windows) or disk space is low:

```bash
# 1. Create new directory on target drive (D: in WSL = /mnt/d/)
mkdir -p /mnt/d/hermes

# 2. Copy existing data
cp -r ~/.hermes/* /mnt/d/hermes/

# 3. Set HERMES_HOME environment variable
export HERMES_HOME=/mnt/d/hermes

# 4. (Optional) Make permanent in ~/.bashrc
echo 'export HERMES_HOME=/mnt/d/hermes' >> ~/.bashrc

# 5. Verify
HERMES_HOME=/mnt/d/hermes hermes config path
# Should show: /mnt/d/hermes/config.yaml
```

Hermes reads `HERMES_HOME` env var at startup. All data (sessions, logs, skills) will be stored at the new location.

---

## Contributor Quick Reference

For occasional contributors and PR authors. Full developer docs: https://hermes-agent.nousresearch.com/docs/developer-guide/

### Project Layout

```
hermes-agent/
├── run_agent.py          # AIAgent — core conversation loop
├── model_tools.py        # Tool discovery and dispatch
├── toolsets.py           # Toolset definitions
├── cli.py                # Interactive CLI (HermesCLI)
├── hermes_state.py       # SQLite session store
├── agent/                # Prompt builder, context compression, memory, model routing, credential pooling, skill dispatch
├── hermes_cli/           # CLI subcommands, config, setup, commands
│   ├── commands.py       # Slash command registry (CommandDef)
│   ├── config.py         # DEFAULT_CONFIG, env var definitions
│   └── main.py           # CLI entry point and argparse
├── tools/                # One file per tool
│   └── registry.py       # Central tool registry
├── gateway/              # Messaging gateway
│   └── platforms/        # Platform adapters (telegram, discord, etc.)
├── cron/                 # Job scheduler
├── tests/                # ~3000 pytest tests
└── website/              # Docusaurus docs site
```

Config: `~/.hermes/config.yaml` (settings), `~/.hermes/.env` (API keys).

### Adding a Tool (3 files)

**1. Create `tools/your_tool.py`:**
```python
import json, os
from tools.registry import registry

def check_requirements() -> bool:
    return bool(os.getenv("EXAMPLE_API_KEY"))

def example_tool(param: str, task_id: str = None) -> str:
    return json.dumps({"success": True, "data": "..."})

registry.register(
    name="example_tool",
    toolset="example",
    schema={"name": "example_tool", "description": "...", "parameters": {...}},
    handler=lambda args, **kw: example_tool(
        param=args.get("param", ""), task_id=kw.get("task_id")),
    check_fn=check_requirements,
    requires_env=["EXAMPLE_API_KEY"],
)
```

**2. Add to `toolsets.py`** → `_HERMES_CORE_TOOLS` list.

Auto-discovery: any `tools/*.py` file with a top-level `registry.register()` call is imported automatically — no manual list needed.

All handlers must return JSON strings. Use `get_hermes_home()` for paths, never hardcode `~/.hermes`.

### Adding a Slash Command

1. Add `CommandDef` to `COMMAND_REGISTRY` in `hermes_cli/commands.py`
2. Add handler in `cli.py` → `process_command()`
3. (Optional) Add gateway handler in `gateway/run.py`

All consumers (help text, autocomplete, Telegram menu, Slack mapping) derive from the central registry automatically.

### Agent Loop (High Level)

```
run_conversation():
  1. Build system prompt
  2. Loop while iterations < max:
     a. Call LLM (OpenAI-format messages + tool schemas)
     b. If tool_calls → dispatch each via handle_function_call() → append results → continue
     c. If text response → return
  3. Context compression triggers automatically near token limit
```

### Testing

```bash
python -m pytest tests/ -o 'addopts=' -q   # Full suite
python -m pytest tests/tools/ -q            # Specific area
```

- Tests auto-redirect `HERMES_HOME` to temp dirs — never touch real `~/.hermes/`
- Run full suite before pushing any change
- Use `-o 'addopts='` to clear any baked-in pytest flags

### Commit Conventions

```
type: concise subject line

Optional body.
```

Types: `fix:`, `feat:`, `refactor:`, `docs:`, `chore:`

### Key Rules

- **Never break prompt caching** — don't change context, tools, or system prompt mid-conversation
- **Message role alternation** — never two assistant or two user messages in a row
- Use `get_hermes_home()` from `hermes_constants` for all paths (profile-safe)
- Config values go in `config.yaml`, secrets go in `.env`
- New tools need a `check_fn` so they only appear when requirements are met

## Deploying Local Gemma 4 E4B-it with Speculative Decoding

### User Preference Pattern

When the user requests a **complete local AI assistant** using Gemma 4 with minimal overhead:
- They want **speculative decoding** with the assistant drafter model for 2-3x speedup
- They prefer **direct HuggingFace download** of pre-converted GGUF files over manual conversion
- They need **pragmatic, results-first setup** — skip lengthy documentation review
- Hardware context: **32GB RAM, AMD GPU (Vulkan)** → CPU inference is fine; llama.cpp doesn't support AMD GPUs

### Quick Deployment (3-step)

1. **Download GGUF models** (target + assistant) from HuggingFace:
   ```bash
   mkdir -p ~/.hermes/models/gemma4
   cd ~/.hermes/models/gemma4
   
   # Target model (Q5_K_M recommended for quality, ~5GB)
   wget -c https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q5_K_M.gguf
   
   # Assistant drafter for speculative decoding (Q4_K_M, ~75MB)
   wget https://huggingface.co/AtomicChat/gemma-4-E4B-it-assistant-GGUF/resolve/main/gemma-4-E4B-it-assistant.Q4_K_M.gguf
   ```

2. **Create FastAPI server** (`~/.hermes/models/gemma4/server.py`):
   - Uses `transformers` with `assistant_model=` parameter
   - Provides OpenAI-compatible `/v1/chat/completions` endpoint
   - Handles multimodal inputs (text, images, audio) via processor
   - Template: `references/gemma4-fastapi-server.py` (copy and adjust paths)

3. **Start server persistently**:
   ```bash
   # Quick test
   python3 ~/.hermes/models/gemma4/server.py --host 127.0.0.1 --port 8000
   
   # Persistent (systemd user service):
   systemctl --user daemon-reload
   systemctl --user enable --now gemma4-server
   systemctl --user status gemma4-server
   ```

4. **Point Hermes to local server** (`config.yaml`):
   ```yaml
   model:
     default: "gemma-4-E4B-it-local"
     provider: "custom"
     base_url: "http://127.0.0.1:8000/v1"
     api_key: "no-key-needed"
   ```

### Hardware-Specific Guidance

**AMD GPU (Radeon 6500/6600/6700/7800 etc.) via Vulkan:**
- `llama.cpp` supports AMD GPUs through the **Vulkan backend** — requires `libvulkan-dev` + `glslc` at build time
- **Critical**: The CMake variable is `-DGGML_VULKAN=ON`, NOT `-DLLAMA_VULKAN=ON`. The latter doesn't exist in current llama.cpp and is silently ignored (see Pitfalls)
- The installed Vulkan SDK version (from Ubuntu 24.04 packages) may be too old for the latest llama.cpp — `ggml-vulkan.cpp` may fail to compile due to missing `spv` namespace headers. If the build fails with `error: 'spv' has not been declared`, use the CPU-only build instead (which is fast enough for 4-8B models on modern CPUs).
- Build recipe: `sudo apt-get install -y libvulkan-dev glslc` then `cmake .. -DGGML_VULKAN=ON -DCMAKE_BUILD_TYPE=Release`
- Verify Vulkan was actually linked: `strings bin/llama-server | grep ggml_vk` — should show 100+ functions
- Without `libvulkan-dev`, `cmake` says `warning: no usable GPU found, --gpu-layers option will be ignored`
- Start server with `--n-gpu-layers 99` to offload all layers to GPU
- Alternative: **PyTorch + Transformers** FastAPI server (works on any backend, not just CUDA)
- ROCm on WSL2 is experimental; avoid — use Vulkan instead

**NVIDIA GPU:**
- Option A: FastAPI server with `device_map="auto"` (auto-detects CUDA)
- Option B: `llama-server` with `--n-gpu-layers 99` (requires CUDA-built llama.cpp)

**CPU-only:**
- llama.cpp provides good CPU performance for 4-8B models (~35-45 tok/s on 16 cores with Q5_K_M)
- Use `--threads $(nproc) --threads-batch $(nproc) --batch-size 4096 --ubatch-size 512`
- **Hermes integration note**: Hermes' system prompt + tools is ~12K tokens. At 40 tok/s CPU speed, prompt processing alone takes ~300s. Either delegate voice commands to a lightweight assistant (see voice-assistant skill) or disable heavy toolsets for CPU deployments.

### Quantization Selection for Gemma 4 E4B-it

| Quant  | Size   | Quality | Recommendation            |
|--------|--------|---------|--------------------------|
| Q5_K_M | ~5 GB  | High    | Best balance (default)   |
| Q4_K_M | ~4.5 GB| Good    | Smaller, still excellent |
| Q6_K   | ~6.5 GB| Very High| If you have extra RAM    |
| Q8_0   | ~7.5 GB| Highest | Maximum quality          |
| Q3_K_M | ~3.8 GB| Moderate| Tight RAM budget         |

From `unsloth/gemma-4-E4B-it-GGUF` repo (quality-tested GGUF conversions). Avoid converting from `.safetensors` yourself unless necessary.

### Speculative Decoding Notes

- **How it works**: Assistant model (~75MB) drafts tokens ahead; target model verifies in parallel → 2-3x throughput
- **No quality loss**: Output is **identical** to standard generation
- **Transformers**: Pass `assistant_model=assistant_model` to `model.generate()`
- **llama.cpp**: Experimental support; less mature than Transformers
- **When to disable**: If assistant model quality mismatches target (rare with official Google checkpoint)

### Verification Checklist

```bash
# 1. Model files present
ls -lh ~/.hermes/models/gemma4/
#   → gemma-4-E4B-it-Q5_K_M.gguf (5+ GB)
#   → gemma-4-E4B-it-assistant.Q4_K_M.gguf (75 MB)

# 2. Server responds
curl http://127.0.0.1:8000/health
#   → {"status":"healthy","model":"gemma-4-E4B-it"}

# 3. Test generation
curl -X POST http://127.0.0.1:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma-4-E4B-it","messages":[{"role":"user","content":"Hello"}],"max_tokens":20}'

# 4. Hermes routes correctly
hermes chat -q 'Hello, are you running locally?'
```

### Common Pitfalls

**Out of memory:**
- Switch to Q4_K_M (4.5 GB) or set `USE_MULTIMODAL = False` in `server.py` (drops vision encoder, saves ~1-2 GB)
- Reduce `max_new_tokens` or `batch_size`

**Port 8000 already in use:**
```bash
lsof -ti:8000 | xargs kill -9
```

**WSL2 without systemd:**
Use nohup instead:
```bash
nohup python3 ~/.hermes/models/gemma4/server.py --host 127.0.0.1 --port 8000 > ~/gemma4.log 2>&1 &
```

**Model download interrupted:**
```bash
wget -c -O ~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf \
  https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q5_K_M.gguf
```

### Reference Files

- **Server template**: `references/gemma4-fastapi-server.py` — complete FastAPI implementation
- **Quant details**: `references/gemma4-quants.md` — size/quality comparison table
- **Systemd service**: `~/.config/systemd/user/gemma4-server.service`

### When to Choose This vs llama.cpp

| Factor | FastAPI (Transformers) | llama.cpp |
|--------|------------------------|-----------|
| AMD/NVIDIA GPU | ✅ Works (PyTorch) | ❌ AMD unsupported |
| Speculative decoding | ✅ Native, 2-3x speed | ⚠️ Experimental |
| Multimodal | ✅ Full support | ❌ Text-only |
| Startup speed | ~10s | ~2s |
| Setup complexity | Medium (Python env) | Easy (single binary) |

**Use FastAPI** when: AMD GPU, need multimodal, or want reliable speculative decoding.
**Use llama.cpp** when: Pure CPU, minimal RAM, fastest startup, or NVIDIA CUDA with proper build.

---


