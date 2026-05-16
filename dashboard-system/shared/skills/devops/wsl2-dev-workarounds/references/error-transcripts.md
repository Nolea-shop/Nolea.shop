# WSL2 Error Transcripts & Edge Cases

## Case 1: npm install EPERM on /mnt/d/ (NTFS)

**Context:** New Next.js project created at `/mnt/d/rezept-app/` (Windows D: drive).

**Error 1 — create-next-app:**
```
Error: EPERM: operation not permitted, copyfile
  '/home/damia/.npm/_npx/.../create-next-app/dist/templates/app-tw/ts/README-template.md'
  -> '/mnt/d/rezept-app/README.md'
```

**Error 2 — npm install:**
```
npm error   errno: -1,
npm error   code: 'EPERM',
npm error   syscall: 'chmod',
npm error   path: '/mnt/d/rezept-app/node_modules/acorn/bin/acorn'
```

**Error 3 — pnpm:**
```
EPERM EPERM: operation not permitted, futime
```

**Fix:** Remove everything from `/mnt/d/`, recreate under `/home/damia/`. No flags needed there.

---

## Case 2: Terminal CWD corruption after project deletion

**Context:** Built project at `/mnt/d/rezept-app/`, deleted it while terminal CWD was `cd /mnt/d/rezept-app`. After `rm -rf rezept-app`:

**Every subsequent terminal() call failed**, even trivial ones:
```
$ pwd
FileNotFoundError: [Errno 2] No such file or directory: '/mnt/d/rezept-app'

$ cd /
FileNotFoundError: [Errno 2] No such file or directory: '/mnt/d/rezept-app'

$ echo hello
FileNotFoundError: [Errno 2] No such file or directory: '/mnt/d/rezept-app'
```

The `execute_code` tool still works because it spawns its own Python process with CWD `/home/damia`.

**Recovery:** Use `execute_code` with Python `subprocess` for all shell operations. Do NOT ask the user to restart — the gateway itself is fine, only the terminal session's CWD is poisoned.

---

## Case 3: better-sqlite3 native addon missing after --ignore-scripts

**Context:** `npm install --ignore-scripts` succeeded, but build failed:
```
Error: Could not locate the bindings file. Tried:
  → .../better-sqlite3/build/better_sqlite3.node
  → .../better-sqlite3/build/Release/better_sqlite3.node
  (12 paths tried, all missing)
```

**Fix:** `npm rebuild better-sqlite3` — this runs `node-gyp rebuild` for the current platform (Linux x64 on WSL2).

**Verification:**
```bash
find node_modules/better-sqlite3 -name "*.node"
# Should produce: .../build/Release/better_sqlite3.node

node -e "const db = require('better-sqlite3')(':memory:'); console.log('sqlite3 OK');"
```

---

## Case 4: write_file tool inherits broken CWD

**Context:** After CWD corruption, the built-in `write_file` tool also fails:
```
[Errno 2] No such file or directory: '/mnt/d/rezept-app'
```

This happens even when specifying an absolute path like `/home/damia/rezept-app/file.tsx`.

**Workaround:** Use `execute_code` to write files directly:
```python
with open('/home/damia/file.tsx', 'w') as f:
    f.write(content)
```

Or use `write_file` via `execute_code`:
```python
from hermes_tools import write_file
write_file('/home/damia/file.tsx', content)
```

Both approaches work because `execute_code` runs in its own clean process.
