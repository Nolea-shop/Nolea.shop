# Execute Spec from File

## Trigger

User says something like:
- `führe den prompt aus von der datei:"<path>"`
- `execute this spec from file`
- `build from this markdown`
- Just provides a `.md` path and expects implementation

## Pattern

1. **Locate the file** — Windows paths need conversion to WSL (`/mnt/d/...`)
2. **Read the spec** — The MD file contains:
   - Architecture diagrams (text or code blocks)
   - Full code implementations in fenced blocks
   - Step-by-step instructions
   - Project structure
3. **Create project structure** — `mkdir -p` for all dirs
4. **Write files** — Extract code from fenced blocks, write to appropriate paths
5. **Verify syntax** — `python3 -m py_compile` for Python, etc.
6. **Report** — Summarize what was created

## Example: NOLEA_BRAIN Desktop App

The file `D:\hermes\NOLEA_BRAIN_DESKTOP_APP.md` contained:
- Full Python FastAPI engine (`engine/main.py`)
- Electron main process (`desktop-app/main.js`)
- Complete HTML/CSS/JS UI (`desktop-app/src/index.html`)
- Build scripts (`build-exe.bat`)
- README

**Executed as:**
```bash
mkdir -p NOLEA_BRAIN_APP/{desktop-app/{src,assets},engine/{api,core,data},build}
write_file("NOLEA_BRAIN_APP/engine/main.py", <extracted code>)
write_file("NOLEA_BRAIN_APP/desktop-app/main.js", <extracted code>)
write_file("NOLEA_BRAIN_APP/desktop-app/src/index.html", <extracted code>)
# ... etc
```

## Key Lessons from NOLEA_BRAIN Build

- **Icon generation** — Python script to generate PNG icons with `struct + zlib`
- **Electron tray** — Need fallback when icon file missing: `nativeImage.createFromBuffer(createSimpleIcon())`
- **CORS middleware** — FastAPI needs `CORSMiddleware` for Electron app:// protocol
- **Python Engine spawn** — Electron `spawn('python', [script])` starts backend
- **wait for engine** — `setTimeout(resolve, 2000)` after spawning Python

## This Is NOT a Spike

If the spec file is complete and user wants the full implementation, build it properly — it's not throwaway. Spikes are for "can I even do X?" questions. A complete spec file with working code is a real project.