---
name: nolea-brain
description: NOLEA_BRAIN Knowledge-Graph System - Der Knowledge-Coordinator für Damian und Julian. Verwaltet Projects (SSSALTY, NOLEA, AI_CONTENT, AI_SMART_HOME), spezialisierte Agents, und das HERMES Initialisierungs-Protokoll.
trigger: "Wird geladen wenn: (1) Damian über NOLEA_BRAIN/HERMES spricht, (2) Projekt-Updates für sssalty/nolea bespricht, (3) Agent-Tasks zuweist, (4) das Initialisierungs-Protokoll ausführen will"
version: 1.1
owner: Damian & Julian
---

# NOLEA_BRAIN - Knowledge Graph System

## Desktop App

**Location:**
- Windows (Legacy): `D:\\hermes\\NOLEA_BRAIN_APP\\` (für Syncthing/Windows Native Tools)
- Linux (WSL2 Production): `/home/damia/nolea-brain-app/` (Node.js Projekte hier, vermeidet NTFS EPERM Fehler)

**Stack:**
- Electron 28 frontend (windowed app, System Tray)
- Python FastAPI backend → `engine/main.py`
- SQLite database → `engine/data/brain.db`
- Syncthing-ready for PC sync

## CRITICAL: Startup Order & Ports

**Backend runs on PORT 8001 (not 8000!)** — this is a common bug source.

**Correct startup sequence:**
```powershell
# 1. Backend (Terminal 1)
cd D:\hermes\NOLEA_BRAIN_APP\engine
python main.py

# 2. Electron (Terminal 2)
cd D:\hermes\NOLEA_BRAIN_APP\desktop-app
npx electron .     # NOT: npm start (looks for global electron, fails)
```

**OR use the all-in-one batch (recommended):**
```
D:\hermes\NOLEA_BRAIN_APP\start-all.bat
```

## start-all.bat (Complete Startup)

Located at `D:\hermes\NOLEA_BRAIN_APP\start-all.bat`

Handles all 5 steps automatically:
1. Syncthing check/start
2. Python dependency install (fastapi, uvicorn)
3. npm install for Electron
4. Backend start (port 8001)
5. Electron app start

**Batch file patterns used:**
- `set NOLEA_DIR=%~dp0` before any `cd` commands (fixes %~dp0 scope bug)
- `cmd /k` to keep windows open (not `cmd /c` which closes immediately)
- `pause` at end so errors are visible
- `npx electron .` not `npm start` (finds local electron in node_modules)

## Architektur (Konzepte)

```
NOLEA_BRAIN
├── PERSON Nodes
│   ├── Damian (Co-Founder)
│   └── Julian (Co-Founder)
├── PROJECT Nodes
│   ├── SSSALTY      (Shopify T-Shirts: memez, hustle, core)
│   ├── NOLEA        (Next.js + Vercel Digital Products)
│   ├── AI_CONTENT   (TikTok AI Content)
│   └── AI_SMART_HOME
├── AGENT Nodes
│   ├── MARKETING_AGENT    (Content, Social Media)
│   ├── DESIGN_AGENT       (UI/UX, Grafik)
│   ├── DATA_AGENT         (Analyse, Insights)
│   ├── AUTOMATION_AGENT   (n8n Workflows)
│   └── SMARTHOME_AGENT    (AI Smart Home)
├── CONCEPT Nodes (Knowledge Containers)
│   └── [werden noch definiert]
└── PATTERN Nodes (Erkannte Patterns)
```

## System-Status

- **Brain Health**: ✅ INSTALLED & RUNNING
- **Nodes**: 4 Projects + 2 Persons + 5 Agents + 8 Knowledge Containers = 19 Basis-Nodes
- **API**: ✅ Läuft auf localhost:8001
- **Datenbank**: ✅ SQLite (brain.db)
- **Sync**: ✅ Syncthing configured (see SYNCTHING_SETUP.md)

## WSL2 Backend Execution (AKTUALISIERT 2026-05-06)\n\n**Backend KANN von WSL2 ausgeführt werden**, wenn die Python-Environment korrekt ist:\n\n1. **Dependencies installieren** (im Hermes-venv):\n   ```bash\n   /home/damia/.hermes/hermes-agent/venv/bin/python3 -m pip install uvicorn fastapi\n   ```\n\n2. **Server starten** (aus `engine/`-Verzeichnis):\n   ```bash\n   cd /mnt/d/hermes/NOLEA_BRAIN_APP/engine\n   /home/damia/.hermes/hermes-agent/venv/bin/python3 main.py\n   ```\n\n3. **API testen**:\n   ```bash\n   curl http://localhost:8001/\n   ```\n\n**WSL2-Einschränkungen (verbleibend):**\n- SQLite WAL-Mode läuft, aber NTFS-Dateisperren können bei gleichzeitigem Windows-Zugriff problematisch sein\n- Für Produktion/Syncthing: Backend auf Windows-Native Python bevorzugen\n- Für Entwicklung/Tests: WSL2-Ausführung ist funktional

## Known Issues & Optimization Areas

### Re-Strukturierung (2026-05-06) ✅ ABGESCHLOSSEN
- `engine/api/` und `engine/core/` sind jetzt befüllt mit sauberer Architektur
- `core/database.py` — DB-Init, WAL-Mode, get_db(), parse_tags()
- `core/business.py` — Business-Logik (Nodes, Edges, Agents, Search)
- `api/__init__.py` — FastAPI App + CORS
- `api/endpoints.py` — Saubere API-Endpunkte
- `main.py` — Nur noch lifecycle + startup (1100 Zeilen von 508 → ~110)

### react-flow Integration (2026-05-06) ✅ ABGESCHLOSSEN
- reactflow installiert (`npm install reactflow`)
- `desktop-app/src/GraphView.tsx` — ReactFlow Graph-Komponente mit Background, Controls, MiniMap, Auto-Layout, Edge-Verbindung
- `App.tsx` — integriert GraphView mit CustomNode Komponente
- CustomNode-Colors nach Typ: NOTE, PROJECT, AGENT, CONCEPT, WORKFLOW, SYSTEM_CONFIG, PERSON, TASK, LEARNING

### Schritt 3: Bug-Fixing ✅ ABGESCHLOSSEN (2026-05-06)\n\n**Kritischer Import-Fix in `api/endpoints.py`:**\n- Fehler: `from . import business` funktionierte nicht, da `business.py` in `core/` liegt, nicht in `api/`\n- Lösung: sys.path erweitern und korrekt importieren:\n```python\nimport sys\nimport os\nsys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))\nfrom core import business\n```\n\n**WSL2 Backend-Start (funktioniert jetzt):**\n- Python-Dependencies installieren: `/home/damia/.hermes/hermes-agent/venv/bin/python3 -m pip install uvicorn fastapi`\n- Server starten: `cd /mnt/d/hermes/NOLEA_BRAIN_APP/engine && /home/damia/.hermes/hermes-agent/venv/bin/python3 main.py`\n- API Test: `curl http://localhost:8001/` → `{"status":"NOLEA_BRAIN ENGINE RUNNING",...}`\n\n**API-Endpunkte getestet:**\n- `GET /api/hermes/stats` → funktional (total_nodes, health_score, etc.)\n- `GET /api/nodes` → funktional (liefert Nodes aus brain.db)\n\n**Port-Konfiguration:**\n- Backend: Port 8001 (FastAPI/uvicorn)\n- Frontend: Port 5173 (Vite dev server) oder Electron

### SQLite WAL-Mode implementiert
- PRAGMA journal_mode=WAL auf allen Verbindungen
- PRAGMA synchronous=NORMAL für Performance
- PRAGMA busy_timeout=5000
- conn.commit() bei allen Schreib-Operationen

### Schritt 4: Datenbank-Optimierung (2026-05-06) ✅ ABGESCHLOSSEN
**Indizes hinzugefügt:**
```python
cursor.execute('CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id)')
```

**FTS5 Volltext-Suche mit UUIDs (Text-IDs):**
- Problem: UUIDs sind Text, `rowid` erwartet Integer → `datatype mismatch`
- Lösung: FTS5-Tabelle mit expliziter `node_id` Spalte:
```python
cursor.execute('''CREATE VIRTUAL TABLE nodes_fts USING fts5(
    node_id, title, content
)''')
# Insert:
cursor.execute("INSERT INTO nodes_fts (node_id, title, content) VALUES (?, ?, ?)", 
               (node_id, title, content))
# Search:
cursor.execute('''
    SELECT nodes.* FROM nodes 
    JOIN nodes_fts ON nodes.id = nodes_fts.node_id
    WHERE nodes_fts MATCH ?
''', (query,))
```

### Schritt 5: Erweiterte Graph-Features (2026-05-06) ✅ ABGESCHLOSSEN
**dagre-Layout Integration:**
```bash
cd /home/damia/nolea-brain-app/desktop-app
npm install dagre
npm i --save-dev @types/dagre
```
```tsx
import dagre from "dagre";
const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120 });
nodes.forEach((node) => g.setNode(node.id, { width: 180, height: 60 }));
edges.forEach((edge) => g.setEdge(edge.source, edge.target));
dagre.layout(g);
```

**Node-Typ Filter:** Buttons in GraphView Toolbar für NOTE, PROJECT, AGENT, etc.

**TypeScript Edge-Type Fix:**
```tsx
// React Flow addEdge erwartet Edge mit 'id' Feld
const newEdge: Edge = {
  id: `edge-${Date.now()}`,  // ⚠️ Pflicht!
  source: connectSource!,
  target: node.id,
  type: "smoothstep",
};
setFlowEdges((eds) => addEdge(newEdge, eds));
```

### Schritt 6: Production Build (2026-05-06) ✅ ABGESCHLOSSEN
**KRITISCH: WSL2 Node.js Pfad-Regel**
- ⚠️ **NIEMALS** Node.js Projekte auf `/mnt/d/` (NTFS) speichern!
- Problem: `npm install` schlägt fehl mit `EPERM` (chmod/futime nicht unterstützt auf NTFS)
- Lösung: Projekt nach `/home/damia/` kopieren:
```bash
cp -r /mnt/d/hermes/NOLEA_BRAIN_APP /home/damia/nolea-brain-app
cd /home/damia/nolea-brain-app/desktop-app
npm install  # Jetzt funktioniert es!
```

**Build-Ergebnisse:**
- Production Build: `npm run build` → `dist/` (HTML/CSS/JS)
- Electron AppImage: `npx electron-builder --linux AppImage`
  - Output: `/home/damia/nolea-brain-app/build/NOLEA BRAIN-2.0.0.AppImage` (102 MB)
- Windows .exe: `build-exe.bat` auf Windows ausführen (oder `npm run build:exe`)

**Aktuelle Pfade (Production):**
- Source: `/home/damia/nolea-brain-app/desktop-app/`
- Engine: `/mnt/d/hermes/NOLEA_BRAIN_APP/engine/` (oder kopiert nach Linux)
- Database: `/mnt/d/hermes/NOLEA_BRAIN_APP/engine/data/brain.db`
- Backup: `brain.db.backup_20260506_174835`

### Schritt 7: Erweiterte Features (2026-05-06) ✅ ABGESCHLOSSEN
1. **Erweiterte Such-UI (SearchPanel.tsx):**
   - FTS5 Volltext-Suche mit 300ms Debouncing
   - Filterung nach Typ (Titel, Inhalt, Alle)
   - Ergebnisse mit Typ-Farben und Projekt-Labels
   - Klick auf Ergebnis fokussiert Node im Graph

2. **Agent Status Dashboard (AgentStatus.tsx):**
   - Anzeige aller registrierten Agents mit Status-Indikator (grün/rot/gelb/grau)
   - Statistiken: Erfolge/Fehler/Letzte Aktivität
   - Auto-Refresh alle 10 Sekunden
   - "Register HERMES" Button für Schnell-Registrierung

3. **Graph Clustering (GraphView.tsx):**
   - "Cluster by Project" Button in Toolbar
   - Nodes nach Projekt gruppiert (horizontale Anordnung)
   - Jedes Projekt separat mit dagre gelayoutet
   - 400px Abstand zwischen Projekt-Gruppen

4. **Integration in App.tsx:**
   - Such-Panel (rechts oben, aufklappbar)
   - Agent-Status (rechts unten, aufklappbar)
   - Toggle-Buttons in Haupt-UI

**Build-Status (Step 7):**
- `npm run build` erfolgreich: 33 Module transformiert, keine Fehler
- Production Build: `dist/` (172.59 kB JS, 27.14 kB CSS)
- Neue Komponenten: `SearchPanel.tsx`, `AgentStatus.tsx`, erweitertes `GraphView.tsx`

### Background Sync Task
- `background_sync()` in main.py checks every 30s but does nothing — placeholder
- brain.db is locked during backend runtime; backend must be closed before safe sync

### Syncthing Sync (2026-05-05)

**Config files:**
- `D:\hermes\NOLEA_BRAIN_APP\start-all.bat` - Complete startup with Syncthing check
- `D:\hermes\NOLEA_BRAIN_APP\SYNCTHING_SETUP.md` - Setup Anleitung
- `D:\hermes\NOLEA_BRAIN_APP\setup-syncthing.ps1` - PowerShell Installer

**Sync-Ordner:** `NOLEA_BRAIN_DATA` → `D:\hermes\NOLEA_BRAIN_APP\engine\data`

**start-all.bat checks**: Syncthing läuft bereits → übersprungen, sonst gestartet.

## Marketing-Matrix (SSSALTY)

| Kollektion | TikTok | Instagram | Pinterest | Facebook |
|------------|--------|-----------|----------|----------|
| hustle     | ✅     | ✅        |          |          |
| core       | ✅     |           | ✅       |          |
| memez      | ✅     |           | ✅       | ✅       |

## Workflow: HERMES Initialisierungs-Protokoll

Siehe `references/hermes-master-prompt.md` für das vollständige Protokoll.

### Schnellstart (bereits durchlaufen)

```
PHASE 1: System-Check → FEHLER (kein Backend)
PHASE 2: Konfiguration → ABGESCHLOSSEN
  ✅ Partner: Damian, Julian (Du-Anrede)
  ✅ Projekte: SSSALTY, NOLEA, AI_CONTENT, AI_SMART_HOME
  ✅ Agents: 5 erstellt
  ✅ Knowledge Architecture: 8 CONCEPT Nodes erstellt (Code Patterns, Marketing Strategien, Kunden-Feedback, Fehler & Lösungen, Prozesse & Workflows, Ressourcen & Tools, Meeting Notizen, Ideen & Brainstorms)
  ✅ Workflow Definition: WORKFLOW + NOTIFICATION_SCHEDULE erstellt
  ✅ Initial Data Import: 4 Projects + 5 Agents + 2 Persons = 11 Nodes importiert
  ✅ Syncthing: Konfiguriert für brain.db Sync
```

### Status (2026-05-05)

- **App Startup**: ✅ start-all.bat funktioniert
- **Port Bug Gefixt**: Backend 8001, App.tsx war 8000 → zeigte nur Demo-Daten
- **Syncthing**: ✅ Konfiguriert, wartet auf Windows-Installation

### Nächste Schritte (falls Damian weitermachen will)

1. Knowledge Categories definieren (Schritt 2.4)
2. Workflow definieren (Schritt 2.5)
3. Bestehende Daten importieren (Schritt 2.6)
4. **ODER**: NOLEA_BRAIN Backend installieren

## Befehle

Wenn Damian "Hermes, [Befehl]" sagt:

```
"zeige Projekt [Name]"    → Alle Nodes zu diesem Projekt
"erstelle Task [Beschreibung]" → TASK Node erstellen
"Projekt Status"           → Alle Projekte im Überblick
"Agent Status"             → Alle Agents anzeigen
"suche [Begriff]"          → Alle Nodes durchsuchen
"Brain Health Check"       → System-Analyse
```

## Datei-Referenz

| Datei | Zweck |
|-------|-------|
| `start-all.bat` | Komplettes Setup aus einer Datei |
| `start-nolea.bat` | Legacy startup (erweitert mit Syncthing) |
| `SYNCTHING_SETUP.md` | Anleitung für Sync-Konfiguration |
| `setup-syncthing.ps1` | PowerShell-Setup-Skript |
| `WINDOWS_START.md` | Windows-Start-Anleitung |
| `engine/main.py` | FastAPI Backend (Port 8001) |
| `desktop-app/src/App.tsx` | React Frontend (API_URL = localhost:8001) |
| `desktop-app/src/SearchPanel.tsx` | FTS5 Suche mit Debouncing, Typ-Filtern |
| `desktop-app/src/AgentStatus.tsx` | Agent Dashboard mit Auto-Refresh, HERMES Button |
| `desktop-app/src/GraphView.tsx` | React Flow Graph mit Clustering, dagre Layout |
| `references/import-fix-endpoints.md` | Import-Fix für api/endpoints.py |

HERMES Master Prompt: `/mnt/d/hermes/# 🏛️ HERMES - DER VOLLSTÄNDIGE MAS.txt`

---

*Zuletzt aktualisiert: 2026-05-06 (Step 7 Features, Build erfolgreich, neue Komponenten)*
