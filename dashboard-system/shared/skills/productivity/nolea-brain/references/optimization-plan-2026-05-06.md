# NOLEA_BRAIN Optimization Plan

## Completed: Step 0 — Datensicherheit & Vorbereitung

### Backup
- /mnt/d/hermes/NOLEA_BRAIN_APP/engine/data/backup/brain.db.backup_20260506_174835

### WAL-Mode Implementation
- core/database.py: PRAGMA journal_mode=WAL, synchronous=NORMAL, busy_timeout=5000
- core/business.py get_db(): WAL on every connection
- All write operations have conn.commit()

## Completed: Step 1 — Re-Strukturierung

### New Structure
engine/
├── main.py
├── core/
│   ├── database.py
│   └── business.py
└── api/
    ├── __init__.py
    └── endpoints.py

## Completed: Step 2 — react-flow Graph-Visualisierung
- reactflow installiert: npm install reactflow
- desktop-app/src/GraphView.tsx erstellt mit:
  - CustomNode Komponente mit Typ-Farben
  - Background, Controls, MiniMap
  - Auto-Layout, Edge-Verbindung (API + lokal)
  - brainNodesToFlowNodes, brainEdgesToFlowEdges Konvertierung
- App.tsx integriert GraphView

## Next: Step 3 — Bug-Fixing
- uvicorn installieren (Windows: pip install uvicorn fastapi)
- Backend testen: curl http://localhost:8001/
- ReactFlow CSS import prüfen
