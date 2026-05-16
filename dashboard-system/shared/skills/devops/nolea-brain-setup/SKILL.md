---
name: nolea-brain-setup
description: NOLEA_BRAIN Setup & Optimization - Full stack knowledge graph app with FastAPI + React Flow + Electron. Includes FTS5 search, dagre layout, clustering, and production build.
---

# NOLEA_BRAIN Setup & Optimization Guide

## Project Structure
```
NOLEA_BRAIN_APP/
├── engine/ (Python FastAPI)
│   ├── main.py (Entry point)
│   ├── core/
│   │   ├── database.py (SQLite WAL + FTS5)
│   │   └── business.py (Logic: Nodes, Edges, Search)
│   └── api/
│       ├── __init__.py (FastAPI app)
│       └── endpoints.py (API routes)
├── desktop-app/ (React + Vite + Electron)
│   ├── src/
│   │   ├── App.tsx (Main app with state management)
│   │   ├── GraphView.tsx (React Flow with dagre + clustering)
│   │   ├── SearchPanel.tsx (FTS5 search UI)
│   │   └── AgentStatus.tsx (Agent dashboard)
│   └── package.json (deps: reactflow, dagre, electron)
└── data/brain.db (SQLite database)
```

## Critical Setup Rules

### 1. WSL/Linux Filesystem ONLY
**NEVER** store Node.js projects on `/mnt/` (NTFS) - causes EPERM errors.
```bash
# WRONG: /mnt/d/hermes/NOLEA_BRAIN_APP
# RIGHT: /home/damia/nolea-brain-app
cp -r /mnt/d/hermes/NOLEA_BRAIN_APP /home/damia/nolea-brain-app
```

### 2. Python Environment
Install dependencies in Hermes venv:
```bash
python3 -m pip install uvicorn fastapi
# If pip missing: python3 -m ensurepip && python3 -m pip install uvicorn fastapi
```

### 3. Database Optimization (FTS5 + WAL)
```python
# In database.py
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

# FTS5 table with UUID support
cursor.execute('''
    CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        node_id, title, content, content='nodes', content_rowid='id'
    )
''')
# Create indexes
cursor.execute("CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project)")
```

### 4. React Flow + dagre Layout
```bash
cd desktop-app && npm install reactflow dagre @types/dagre
```

Key GraphView.tsx implementation:
- Use `dagre` for hierarchical layout
- Implement `clusterByProject` state for grouping
- Node types: NOTE, PROJECT, AGENT, CONCEPT, WORKFLOW, etc.
- Export `BrainNode` type from App.tsx

### 5. Search Implementation (FTS5)
```python
# In business.py - search_nodes function
cursor.execute('''
    SELECT nodes.* FROM nodes 
    JOIN nodes_fts ON nodes.id = nodes_fts.node_id
    WHERE nodes_fts MATCH ?
''', (query,))
```

Frontend SearchPanel.tsx:
- Debounced search (300ms)
- Filter by title/content/all
- Display results with type colors

### 6. Build Process

**Development:**
```bash
# Terminal 1: Backend
cd /home/damia/nolea-brain-app/engine && python3 main.py

# Terminal 2: Frontend  
cd /home/damia/nolea-brain-app/desktop-app && npm run dev
```

**Production Build:**
```bash
cd /home/damia/nolea-brain-app/desktop-app
npm run build  # Output: dist/

# Linux AppImage
npx electron-builder --linux AppImage

# Windows .exe (REQUIRES Windows or Wine)
# On Windows PowerShell: .\build-exe.bat
# Or: npm run build:exe
```

## Common Issues & Fixes

### TypeScript Errors
- **Unused variables**: Prefix with `_` (e.g., `_statsNodeCount`)
- **localeCompare**: Use `String().localeCompare()` for safety
- **Module not found**: Export types from App.tsx with `export type BrainNode`

### Import Errors
```python
# In api/endpoints.py - fix imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import business
```

### Build Errors
- **FTS5 rowid**: Use `node_id` column, not `rowid`
- **Edge type errors**: Add `id` field to Edge objects
- **dagre types**: Install `@types/dagre`

## Features Implemented

1. ✅ **FTS5 Full-Text Search** with SearchPanel UI
2. ✅ **dagre Hierarchical Layout** (Top-to-Bottom)
3. ✅ **Project Clustering** (group nodes by project)
4. ✅ **Agent Status Dashboard** (real-time monitoring)
5. ✅ **Node Type Filters** (NOTE, PROJECT, AGENT, etc.)
6. ✅ **Connect Mode** (visual edge creation)
7. ✅ **Electron Packaging** (Linux AppImage: 102MB)

## API Endpoints

- `GET /` - Health check
- `GET /api/hermes/stats` - System statistics  
- `GET /api/nodes` - List all nodes
- `GET /api/search?q=...` - FTS5 search
- `POST /api/edges` - Create edge
- `GET /api/agents` - List agents
- `POST /api/agents/:name/status` - Update agent status

## Performance Notes

- **FTS5** is 10x faster than `LIKE` queries
- **WAL mode** allows concurrent reads/writes
- **dagre** layout handles 100+ nodes efficiently
- **React.memo** recommended for CustomNodeComponent

## Next Steps

1. Scale testing with >1000 nodes
2. Add user authentication system
3. Implement node clustering visualization
4. Add export/import functionality
5. Create Windows .exe build (on Windows with Wine)
