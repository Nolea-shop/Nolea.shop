---
name: electron-react-desktop-dev
description: Build, migrate, and maintain Electron desktop apps with React + TypeScript + Vite + Tailwind CSS. Covers project setup, zip-based UI migration, build processes, and common Windows/WSL2 error handling.
triggers:
  - Electron app with React or Vite or Tailwind
  - migrate to React in Electron project
  - apply design from zip to desktop app
  - build exe with electron-builder
  - EACCES or EBUSY errors during npm install
---

# Electron + React + Vite + Tailwind Desktop Development

## Architecture Pattern

```
project/
├── desktop-app/
│   ├── package.json          # Electron + Vite deps
│   ├── vite.config.ts        # Vite config (base: './')
│   ├── tsconfig.json         # TypeScript config
│   ├── tailwind.config.js    # TailwindCSS config
│   ├── postcss.config.js     # PostCSS for Tailwind
│   ├── main.js              # Electron main process
│   ├── preload.js           # ContextBridge
│   ├── index.html           # Vite entry (MUST use /src/main.tsx)
│   ├── src/
│   │   ├── main.tsx        # React entry
│   │   ├── App.tsx         # Main component
│   │   └── index.css       # Tailwind + custom CSS
│   └── assets/             # Icons (icon.png, tray-icon.png)
├── engine/                  # Python FastAPI backend (optional)
└── build/                  # Output for electron-builder
```

---

## Initial Setup

### package.json (Critical Fields)

```json
{
  "name": "your-app",
  "version": "1.0.0",
  "main": "main.js",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "start": "electron .",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build:exe": "npm run build && electron-builder --win"
  },
  "build": {
    "appId": "com.your.app",
    "files": ["dist/**/*", "main.js", "preload.js", "assets/**/*"],
    "win": { "target": "nsis", "icon": "assets/icon.ico" }
  }
}
```

### Vite Config (Electron-Specific)

```typescript
export default defineConfig({
  plugins: [react()],
  base: './',              // CRITICAL: relative paths for Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
```

### index.html (Vite Entry)

```html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/assets/icon.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Migrating from Plain HTML to React + Vite + Tailwind

### Step 1: Extract External Design (Zip File)

**On Windows (PowerShell) - NEVER use /mnt/ for npm operations:**

```powershell
Expand-Archive -Path 'D:\path\to\design.zip' -DestinationPath 'D:\path\to\extracted' -Force
Get-ChildItem -Path 'D:\path\to\extracted' -Recurse | Select-Object FullName
```

### Step 2: Copy Key Files

## Pitfalls
- **CORS Config**: When connecting FastAPI backend to Electron/Vite dev server, avoid wildcard `allow_origins: ["*"]` if using credentials. Use specific origins like `["http://localhost:5173", "http://localhost:3000"]`.
- **CommonJS Migration**: If removing `"type": "module"` from package.json, rename `main.js` to `main.cjs` and ensure all main process files use CommonJS syntax.
- **FastAPI Lifespan**: Replace deprecated `@app.on_event("startup")` with `lifespan` async contextmanager to avoid deprecation warnings.
- **UI Consistency**: Always preserve existing app style (dense layout, #e85d04 accent, no emojis, SVG only, 0.18s cubic-bezier hovers) when modifying React frontend. Migrate removed header/nav functionality to sidebar instead of deleting features.

## References
- Custom window controls setup: references/custom-window-controls.md

| Source (extracted) | Destination (desktop-app/) |
|-------------------|----------------------------|
| `src/App.tsx` | `src/App.tsx` |
| `src/index.css` | `src/index.css` |
| `tailwind.config.js` | `tailwind.config.js` |
| `postcss.config.js` | `postcss.config.js` |
| `index.html` | `index.html` (adapt for Vite) |

### Step 3: Install Dependencies (Windows Only)

**Pitfall: EACCES on /mnt/ drives**

WSL2 NTFS permission issues with npm install on /mnt/ paths. Always run npm on Windows native drives (C:, D:):

```powershell
cd D:\your-project\desktop-app
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

**Pitfall: EBUSY (File Locked)**

Electron binary locks `icudtl.dat`. Kill processes first:

```powershell
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2
Remove-Item -Recurse -Force node_modules
npm install
```

### Step 4: Build and Test

```powershell
# Build React with Vite
npx vite build

# Start Electron (production)
$env:NODE_ENV='production'
npm run start
```

---

## Common Errors and Fixes

### Error: EACCES: permission denied on /mnt/

**Cause:** npm install on WSL2 /mnt/ (NTFS) drives.

**Fix:** Run ALL npm operations on Windows native paths via `powershell.exe -Command`.

### Error: EBUSY: resource busy or locked (icudtl.dat)

**Cause:** Previous Electron process still holding files.

**Fix:**
```powershell
Get-Process electron | Stop-Process -Force
# Wait 2 seconds, then retry npm install
```

### Error: White screen in Electron

**Cause:** Wrong `base` in vite.config.ts or wrong paths in index.html.

**Fix:** 
- Set `base: './'` in vite.config.ts
- Use absolute paths in index.html: `src="/src/main.tsx"`
- Ensure `dist/` contains built files

---

## Electron Main Process (main.js) with Vite

```javascript
const { app, BrowserWindow } = require('electron');
const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  const win = new BrowserWindow({ /* config */ });
  
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}
```

---

## Build for Production

```powershell
cd D:\your-project\desktop-app

# 1. Build React
npx vite build

# 2. Verify dist/ exists
Get-ChildItem dist

# 3. Build .exe
npm run build:exe
```

Output: `build/` directory with .exe installer.

---

## Key Conventions for This User

- **German UI text** in React components
- **Purple/Violet glow theme** (#020204 background, violet-200/300 accents)
- **Tailwind CSS** with custom animations (star-drift, glow-breathe)
- **Electron + Python FastAPI** architecture (engine on localhost:8000)
- **Avoid /mnt/ drives** for Node.js operations (use Windows paths)
