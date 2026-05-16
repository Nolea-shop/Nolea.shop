---
name: wsl2-dev-workarounds
description: "WSL2 development environment gotchas: filesystem permissions, CWD corruption, native modules, and cross-OS workflows. Loaded when the user works in WSL2 (Windows Subsystem for Linux) and encounters environment issues during development."
---

# WSL2 Dev Workarounds

## When to use this skill

Load this skill when:
- User is on Windows with WSL2 (check `/mnt/c/` mounts)
- npm/yarn install fails with `EPERM`, `chmod`, `futime` errors
- Terminal commands fail with `FileNotFoundError` for CWD
- Native Node modules (better-sqlite3, sharp, etc.) fail to load after install
- User references `/mnt/c/`, `/mnt/d/`, or Windows paths from WSL

## ⚠️ Tailscale: `~` Tilde wird NICHT expandiert

In WSL expandieren Tailscale-Flags wie `--state=~/.local/share/tailscale/...` das `~` NICHT.
Es entsteht ein **buchstäblicher** Ordner `/home/user/~/.local/share/`.

**Immer absolute Pfade verwenden:**
```bash
# RICHTIG
--state=/home/damia/.local/share/tailscale/tailscaled.state

# FALSCH (erzeugt ~-Ordner)
--state=~/.local/share/tailscale/tailscaled.state
```

**Recovery bei versehentlicher `~`-Nutzung:**
```bash
cp "/home/damia/~/.local/share/tailscale/tailscaled.state" \
   /home/damia/.local/share/tailscale/tailscaled.state
rm -rf "/home/damia/~"
```

Siehe `multi-agent-system-architecture` → `references/tailscale-wsl-userspace.md` für vollständige Anleitung.

## Running Windows Scripts from WSL

To execute Windows-hosted Python/PowerShell scripts from WSL:
1. Use `powershell.exe -Command "..."` for PowerShell commands (preferred for complex commands, module-rich environments like Windows Python)
2. Use `cmd.exe /c "command"` syntax (e.g., `cmd.exe /c "python C:\\Users\\Damia\\.openclaw\\scripts\\arena_generate.py --headless 'prompt'"`)
3. For running background Windows processes from WSL (Electron, long-running servers), use `Start-Process` via PowerShell:
   ```powershell
   # Start Python engine in background
   powershell.exe -Command "Start-Process -FilePath 'python' -ArgumentList 'D:\\path\\to\\main.py' -WorkingDirectory 'D:\\path\\to' -WindowStyle Hidden"
   # Then verify it started
   powershell.exe -Command "(Invoke-WebRequest -Uri 'http://localhost:8000/' -UseBasicParsing).Content"
   ```
4. **Electron/Node.js on Windows**: `npm install` must run in the project directory first — global electron CLI is often not in PATH. Always `cd` to project dir then run npm commands.
2. For repeated calls, set up a lightweight WSL bridge server (Flask/FastAPI) to forward requests to Windows scripts
3. Avoid running GUI/headless browser scripts directly from WSL without a bridge — no display is available by default
4. **Pitfall: UTF-8 decoding errors** — When using `subprocess.run` with `text=True`, Windows command output may contain non-UTF-8 bytes (e.g., 0x81 byte), causing `UnicodeDecodeError: 'utf-8' codec can't decode byte 0x81 in position 149`. Fix: Use `text=False` then decode with `errors='replace'`:
   ```python
   # Concrete fix from arena.ai bridge server session
   result = subprocess.run(
       cmd, shell=True,
       capture_output=True, text=False, timeout=300
   )
   # Decode with error handling for Windows encoding issues
   output = result.stdout.decode('utf-8', errors='replace').strip() if result.stdout else ""
   stderr_output = result.stderr.decode('utf-8', errors='replace').strip() if result.stderr else ""
   ```
   This is critical for bridge servers calling Windows scripts from WSL (e.g., n8n WSL → Windows Playwright via cmd.exe /c).
5. **UNC path warning** — `cmd.exe /c` from WSL prints UNC path errors but still runs commands. Ignore or prefix with `cd /d C:\` to suppress.

## Core rule: Keep Node.js projects off Windows mounts

⚠️ **CRITICAL WSL2 LIMITATION** — This is not optional. Node.js projects MUST reside under the native WSL2 filesystem (`/home/<user>/`), never on `/mnt/` drives (NTFS). The NTFS filesystem does not support Linux permission semantics, causing guaranteed failures during any npm/yarn/pnpm operation.

- `EPERM: operation not permitted, chmod` during `npm install`
- `EPERM: operation not permitted, futime` with pnpm/yarn
- Native addon build failures

**Fix:** Keep projects under the native WSL2 filesystem:
```
/home/<username>/projects/    # GOOD — native ext4
/mnt/d/my-project/            # BAD — NTFS, permission issues
```

**Concrete Example:** The NOLEA_BRAIN project was originally located at `/mnt/d/hermes/NOLEA_BRAIN_APP` and suffered from `EPERM` errors during `npm install`. Moving it to `/home/damia/nolea-brain-app` (native ext4) resolved all permission issues and enabled successful builds.

If the user specifically wants the project on a Windows drive (e.g., for disk space), warn them about these issues first. If they insist, add `--ignore-scripts` to npm install and manually rebuild native modules (see below).

**Note:** `npx create-next-app` and other scaffolding tools also fail on `/mnt/` drives — not just `npm install`. The entire project lifecycle is affected.

## Moving WSL Virtual Disk to Another Drive

When C: drive runs low on space, move the entire WSL distribution to D: using PowerShell as Administrator:

```powershell
# 1. Export current distribution
wsl --export Ubuntu D:\WSL-Backup\ubuntu-backup.tar

# 2. Unregister old one
wsl --unregister Ubuntu

# 3. Import to new location
mkdir D:\WSL
wsl --import Ubuntu D:\WSL\Ubuntu D:\WSL-Backup\ubuntu-backup.tar --version 2
```

See [`references/wsl-migration.md`](references/wsl-migration.md) for detailed steps, prerequisites, and error recovery.

## Terminal CWD corruption

### Symptom
After `rm -rf` a directory that was the terminal's CWD, **every** `terminal()` call fails:
```
FileNotFoundError: [Errno 2] No such file or directory: '/mnt/d/deleted-dir'
```
Even `cd /` or `echo hello` fails — the shell session itself is broken.

The `write_file` tool also inherits this broken CWD and will fail the same way.

### Recovery
The `terminal()` tool session is permanently broken. Work around it:

1. **Use `execute_code` with Python `subprocess`** — this spawns a fresh process:
   ```python
   import subprocess
   result = subprocess.run(
       ['bash', '-c', 'cd /correct/path && your-command 2>&1'],
       capture_output=True, text=True, timeout=120
   )
   print(result.stdout)
   ```

2. **Write files via `execute_code` with Python `open()`** — bypasses the broken CWD:
   ```python
   with open('/correct/path/file.txt', 'w') as f:
       f.write('content')
   ```
   Or use `execute_code`'s `hermes_tools.write_file` which may also work since it runs in a separate context.

3. **Only as last resort:** Ask the user to restart the terminal/gateway session.

### Prevention
Never `rm -rf` the current working directory. Before deleting a project directory:
```bash
cd /tmp && rm -rf /path/to/project
```

## Native modules: install + rebuild

When installing npm packages with native compiled addons (better-sqlite3, sharp, bcrypt, etc.) on WSL2:

```bash
# Step 1: Install without running scripts (avoids EPERM on postinstall)
npm install --ignore-scripts

# Step 2: Rebuild native modules natively on WSL2
npm rebuild better-sqlite3

# Step 3: Verify
node -e "require('better-sqlite3')('::memory::'); console.log('OK')"
```

If still failing after rebuild:
```bash
# Check if the .node binary was actually produced
find node_modules/better-sqlite3 -name "*.node"

# If missing, try building from source with node-gyp
cd node_modules/better-sqlite3
npx node-gyp rebuild
```

## Cross-OS job queue pattern (WSL2 → Windows)

When n8n runs in WSL2 but needs Windows-side browser automation (Playwright, arena.ai, etc.), use an HTTP bridge server on Windows:

**Architecture:**
```
n8n (WSL2)  →  HTTP POST  →  Bridge Server (Windows, Flask, 0.0.0.0:18765)  →  Playwright (Windows)
```

**CRITICAL: `cmd.exe /c` from WSL2 CANNOT launch GUI programs.** WSL2 has no display server (no X11, no Wayland). Playwright with `headless=False` will fail with `TargetClosedError: Target page, context or browser has been closed`. Even `headless=True` may fail when launched via `cmd.exe /c` from WSL due to session isolation.

**The bridge server MUST run directly on Windows**, not on WSL. Two options:

1. **Start via Scheduled Task** (persistent, survives reboots):
   - Create a Windows Scheduled Task that runs `python C:\Users\<user>\.openclaw\scripts\arena_bridge_server_win.py` at logon
   - The script binds to `0.0.0.0:18765` so it's reachable from WSL

  2. **Start via Scheduled Task** (persistent, survives reboots):

     Create a Windows Scheduled Task that runs `python C:\Users\<user>\.openclaw\scripts\arena_bridge_server_win.py` at logon. The script binds to `0.0.0.0:18765` so it's reachable from WSL.

**Both locations work.** The bridge server itself can run on WSL (Flask) or Windows (Flask). What matters is that the subprocess it spawns (Playwright) runs in an environment with display access:
- **Bridge on WSL → `cmd.exe /c` → Windows Playwright**: Works for headless mode after initial login. GUI mode (headless=False) fails via cmd.exe from WSL.
- **Bridge on Windows**: Full GUI access, no limitations. RECOMMENDED for first-time Playwright login.

**From WSL2, reach the bridge via the Windows host IP** (from `/etc/resolv.conf` nameserver line, e.g. `172.20.192.1`):
```bash
curl -s http://172.20.192.1:18765/health
```
OR if the bridge runs on WSL itself:
```bash
curl -s http://127.0.0.1:18765/health
```

**Path conversion in the bridge response:** The bridge must convert Windows paths (`C:\Users\...`) to WSL paths (`/mnt/c/Users/...`) so n8n's `readBinaryFile` node (running on WSL) can read the generated images:
```python
def win_to_wsl(path):
    p = path.replace("\\", "/")
    if len(p) >= 2 and p[1] == ":":
        return f"/mnt/{p[0].lower()}/{p[3:]}"
    return p
```

**Confirmed working:** Python 3.14.0 + Playwright 1.59.0 on Windows. Persistent browser context (`user_data_dir`) retains login sessions across runs. The bridge pattern (n8n → HTTP → Flask on Windows → subprocess Playwright) works when the bridge runs natively on Windows.

## n8n workflow import via REST API

When the n8n browser UI is too slow for node manipulation, import workflows directly:

```bash
# Login
curl -s -c /tmp/n8n_cookies.txt -b /tmp/n8n_cookies.txt \
  http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@local.dev","password":"Admin1234!"}'

# Import workflow
curl -s -X POST http://localhost:5678/rest/workflows \
  -H "Content-Type: application/json" \
  -c /tmp/n8n_cookies.txt -b /tmp/n8n_cookies.txt \
  -d @workflow.json
```

Workflow JSON format: `nodes[]` (with `id`, `name`, `type`, `typeVersion`, `position`, `parameters`) + `connections` (node-name → main[] → array of `{node, type, index}`).

## Running Windows Python from WSL2

When a Python server or script requires Windows-native paths, packages, or behaviors (e.g., FastAPI with Windows filesystem access), use the Windows Python executable directly from WSL:

```bash
# Find Windows Python path
ls /mnt/c/Users/<user>/AppData/Local/Programs/Python/*/python.exe

# Run server using Windows Python from WSL
/mnt/c/Users/<user>/AppData/Local/Programs/Python/Python312/python.exe "D:\path\to\main.py" > /mnt/d/logs/server.log 2>&1 &

# Verify it's running
curl.exe -s http://localhost:<port>/  # Use curl.exe (Windows) not curl (WSL)
```

**Why:** WSL Python may lack packages installed in Windows Python (e.g., `uvicorn`, `fastapi`). Installing via `pip` in WSL can fail if `ensurepip` is missing. Windows Python avoids cross-OS packaging issues.

**Pitfall:** WSL `curl` cannot reach Windows localhost servers reliably. Use `curl.exe` (Windows binary) or the Windows host IP from `/etc/resolv.conf`.

## Port conflict debugging (WinError 10048)

When a server fails with `OSError: [WinError 10048] Only one usage of each socket address is normally permitted`:

1. **Find process holding the port** (from WSL):
   ```bash
   cmd.exe /c "netstat -ano | findstr :8001"
   # Output: TCP 0.0.0.0:8001 0.0.0.0:0 LISTENING 27368
   ```

2. **Kill the process** (from WSL):
   ```bash
   powershell.exe -Command "Stop-Process -Id 27368 -Force"
   ```

3. **Restart your server** with the Windows Python path (see above).

**Pitfall:** Old processes may survive `Ctrl+C` if started with `background=true`. Always check `netstat` before assuming the port is free.

## FastAPI Best Practices for NOLEA_BRAIN Stack

### Migrate from `@app.on_event` to `lifespan` (FastAPI >= 0.95)

The deprecated `@app.on_event("startup")` pattern causes DeprecationWarning. Use modern `lifespan` context manager:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app):
    # Startup logic
    init_database()
    start_background_tasks()
    yield
    # Shutdown logic
    cleanup()

app = FastAPI(title="...", lifespan=lifespan)
```

**Pitfall:** `lifespan` function MUST be defined BEFORE `app = FastAPI(...)`. If placed after, you'll get `NameError: name 'lifespan' is not defined`.

### CORS Configuration

Never use `allow_origins=["*"]` with `allow_credentials=True` — browsers block this as insecure:

```python
# WRONG (browser will block)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True  # CONFLICT!
)

# CORRECT
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite
        "http://localhost:3000",  # Alt dev
        "null"  # Electron
    ],
    allow_credentials=False,  # False when specifying multiple origins
    allow_methods=["*"],
    allow_headers=["*"]
)
```

### Safe JSON parsing from database

When loading JSON from SQLite fields that may be empty or malformed:

```python
try:
    if row['tags']:
        tags_data = json.loads(row['tags'])
        node['tags'] = tags_data if isinstance(tags_data, list) else []
    else:
        node['tags'] = []
except (json.JSONDecodeError, TypeError):
    node['tags'] = []
```

## Calling Windows Node.js CLIs from WSL2 via cmd.exe

### Symptom
`cmd.exe /c "toolname.cmd --flag1 value1 --flag2 value2"` fails with errors like:
```
error: too many arguments for 'subcommand'. Expected 0 arguments but got 4.
```

### Cause
`cmd.exe` does not correctly pass multiple `--flag value` pairs through to Node.js CLI tools (especially those using `commander` or `yargs`). The arguments get re-ordered or concatenated.

### Workarounds (try in order)

1. **Use `cmd.exe /c` with only ONE flag at a time** — if the tool supports positional or env-var input:
   ```bash
   cmd.exe /c "set MESSAGE=hello && openclaw.cmd agent --message %MESSAGE%"
   ```

2. **Write a .bat wrapper on Windows** that accepts `%1` and passes it through:
   ```bat
   @echo off
   node C:\path\to\tool\dist\index.js agent --message "%~1" --json
   ```
   Then call from WSL:
   ```bash
   cmd.exe /c "C:\Users\<user>\path\to\wrapper.bat \"your prompt here\""
   ```

3. **Manage the Windows process entirely from the Windows side** — create a Scheduled Task or background service on Windows that reads from a shared file/folder:
   - WSL writes a job file to `/mnt/c/Users/<user>/jobs/inbox/`
   - Windows-side script polls that folder, processes jobs, writes results to `outbox/`
   - This avoids all cmd.exe argument-parsing issues

4. **Start the tool's own gateway/server first**, then communicate via HTTP:
   ```bash
   cmd.exe /c "openclaw.cmd gateway start"
   # Then use HTTP to reach ws://127.0.0.1:<port>
   ```
   Note: from WSL2, Windows localhost is accessible via `127.0.0.1` directly (Windows 11, WSL2 with mirrored networking) — otherwise use the Windows host IP from `/etc/resolv.conf`.

### Confirmed: OpenClaw specific

- `openclaw.cmd agent --message "text" --json` → **fails** via `cmd.exe /c` (too many args)
- `openclaw.cmd gateway start` → **works** (no subcommand flags)
- `openclaw.cmd gateway status` → **works** (read-only, simple output)
- `openclaw.cmd health` → **works** (may timeout if gateway not running)
- The gateway runs as a Scheduled Task on Windows: `OPENCLAW_GATEWAY_PORT=18789`
- Working directory UNC paths (`\\wsl.localhost\...`) are **not** supported by `cmd.exe` as CWD — always use a Windows-native path in any bat/cmd wrapper

## Project setup checklist (WSL2)

When scaffolding a new Node.js project in WSL2:

1. Create under `/home/<user>/` — NOT `/mnt/`
2. **Verify Node.js version first** — n8n requires Node.js 18 or 20:
   ```bash
   node --version
   # If shows v22.x.x: n8n will fail with "version not supported" error
   
   # Install nvm if needed (no sudo required)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   source ~/.bashrc
   nvm install 20
   nvm use 20
   nvm alias default 20
   ```
3. Run `npm install` (add `--ignore-scripts` only if EPERM occurs)
4. If native modules present → `npm rebuild <module>`
5. Run build, verify `.node` binaries exist
6. Test start (`npm run build && npm start`)

## Next.js 15 specific patterns on WSL2

When building Next.js 15 App Router projects on WSL2, additional issues arise beyond the base filesystem problems. See [`references/nextjs15-errors.md`](references/nextjs15-errors.md) for detailed error transcripts. Key takeaways:

1. **`params` is always a Promise in Next.js 15.** Use `interface Props { params: Promise<{ id: string }>; }` and `const { id } = await params;`.

2. **Server Components + native modules.** Pages importing DB functions (→ `better-sqlite3`) MUST be Server Components (no `"use client"`). Client Components transitively pull native Node modules into webpack browser bundles → `Module not found: Can't resolve 'fs'`.

3. **No `<style dangerouslySetInnerHTML>` in page bodies.** Causes hydration errors with empty-message exceptions. Use `globals.css` with standard CSS classes or inline `style={{}}` props.

4. **Long-running servers need `terminal(background=true)`.** `execute_code` + `subprocess.Popen` dies when the Python context ends. Use the terminal tool's background mode for production servers, dev servers, and any process that must outlive the current turn.

5. **Use `subprocess.run` via `execute_code` for builds.** Set `timeout=240+` for native module compilation. The `execute_code` context stays alive for the duration.

## Playing audio through Windows speakers from WSL2

WSL2 has no native audio device — `ffplay` / `aplay` / `paplay` may exit silently without producing sound. To play MP3 through physical Windows speakers from WSL, **use the simplest method first**.

### Preferred method: `mpg123` (simplest, most reliable)

If `mpg123` is installed, use it directly — it routes audio through Windows speakers via the WSL ALSA bridge:

```bash
mpg123 "/mnt/d/path/to/file.mp3" 2>/dev/null
```

`mpg123` comes pre-installed on Ubuntu. If missing: `sudo apt install mpg123`.

Key details:
- Path MUST be the **WSL `/mnt/` path** (NOT `D:\` Windows path)
- `2>/dev/null` suppresses mpg123's progress output
- Blocks until playback finishes (good for task-completion sounds)
- For partial playback: `timeout 5 mpg123 "/path/file.mp3"` (5 seconds)

### Fallback: PowerShell WMPlayer.OCX.7 (if mpg123 unavailable)

If `mpg123` is not installed and can't be installed:

```bash
powershell.exe -Command "
try {
    \$wmp = New-Object -ComObject 'WMPlayer.OCX.7';
    \$wmp.settings.volume = 100;
    \$media = \$wmp.newMedia('D:\\\\path\\\\to\\\\file.mp3');
    \$wmp.currentPlaylist.appendItem(\$media);
    \$wmp.controls.play();
    Start-Sleep -Seconds 3;
    \$wmp.close();
} catch { }
" 2>/dev/null
```

**IMPORTANT:** This COM approach is LESS reliable than mpg123 and was confirmed to be silent in some WSL configurations. Always prefer mpg123.
- File path must be a **Windows path** (`D:\\...`, NOT `/mnt/d/...`)
- Does NOT work: `System.Media.SoundPlayer` (MP3 not supported — only WAV), `MediaPlayer.MediaPlayer` (buggy COM object)

### Task-completion sound convention (keep it SIMPLE)

When the user wants a sound played at the end of every completed task:

1. **Put the file on the D: drive** (`/mnt/d/hermes/filename.mp3`) — accessible from both WSL and Windows
2. **Create a 1-line play script** at `~/.hermes/play-XXX.sh`:
   ```bash
   #!/bin/bash
   mpg123 "/mnt/d/hermes/filename.mp3" 2>/dev/null
   ```
3. Save a **short memory entry** (not a skill) instructing the agent to always run the script after task completion with a hard-requirement flag
4. **Do NOT over-engineer:** no pitch shifting, no format conversion, no COM objects for WSL-native playback. If mpg123 works, use it. Keep it to 1-2 lines.

### Pitfalls

- **WMPlayer.OCX.7 can be silent** despite exit code 0 — don't trust it as primary method
- **Do NOT convert MP3 to WAV** for Windows SoundPlayer — unnecessary workaround, mpg123 handles MP3 natively
- **Do NOT pitch-shift** unless the user explicitly asks for it — the original file is always preferred
- **Memory must be short** (< 200 chars) — hard-requirement flag is critical to prevent the agent from skipping the playback

## See also

- `multi-agent-system-architecture` → `references/tailscale-wsl-userspace.md` — Tailscale VPN in userspace mode on WSL2 (no root needed, socket pitfalls, systemd user service)
- `multi-agent-system-architecture` — multi-agent system architecture (Jeff/NAME/Claudi, sub-agents, token tracking, sync)
- `references/error-transcripts.md` — filesystem permission errors, CWD corruption, native module rebuilds
- `references/nolea-brain-app.md` — NOLEA_BRAIN Electron + FastAPI + SQLite desktop app stack
- `references/arena-ai-automation.md` — Playwright-based browser automation on Windows from WSL2
- `references/wsl-migration.md` — Moving WSL .vhdx from C: to D: drive
- `multi-agent-system-architecture` → `references/tailscale-wsl-userspace.md` — Tailscale VPN in userspace mode on WSL2 (no root needed)