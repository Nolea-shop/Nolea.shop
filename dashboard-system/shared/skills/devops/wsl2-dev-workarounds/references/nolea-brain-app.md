# NOLEA_BRAIN Desktop App Architecture

## Stack
- **Backend**: FastAPI (Python 3.12) on Windows, served via `uvicorn`
- **Frontend**: Vite (port 5173) + React/TypeScript
- **Desktop**: Electron (CommonJS, not ES modules)
- **Database**: SQLite (brain.db in engine/data/)
- **State**: NOLEA_BRAIN ENGINE API at http://localhost:8001

## Startup Sequence

### Backend (Windows Python from WSL)
```bash
# Kill old processes first
cmd.exe /c "netstat -ano | findstr :8001"
powershell.exe -Command "Stop-Process -Id <PID> -Force"

# Start with Windows Python
/mnt/c/Users/Damia/AppData/Local/Programs/Python/Python312/python.exe \
  "D:\hermes\NOLEA_BRAIN_APP\engine\main.py" > /mnt/d/hermes/server.log 2>&1 &

# Verify
sleep 3 && curl.exe -s http://localhost:8001/
```

### Frontend (Vite)
```bash
cd /mnt/d/hermes/NOLEA_BRAIN_APP/desktop-app
npm run dev  # http://localhost:5173
```

### Desktop (Electron)
```bash
cd /mnt/d/hermes/NOLEA_BRAIN_APP/desktop-app
npm run electron:dev
```

## FastAPI Best Practices (from session 2026-05-05)

### Lifespan Events (replaces @app.on_event)
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app):
    # Startup
    logger.info("Starting...")
    init_database()
    start_background_tasks()
    yield
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(title="...", version="...", lifespan=lifespan)
```

**Critical:** `lifespan` function MUST be defined before `app = FastAPI(...)`.

### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite
        "http://localhost:3000",  # Alt dev
        "http://localhost:8001",  # Same-origin
        "null"  # Electron file:// protocol
    ],
    allow_credentials=False,  # False when multiple origins specified
    allow_methods=["*"],
    allow_headers=["*"]
)
```

**Never:** `allow_origins=["*"]` with `allow_credentials=True` - browsers block this.

### Safe JSON Parsing from DB
```python
def get_nodes():
    # ...
    for row in rows:
        node = dict(row)
        try:
            if node['tags']:
                tags_data = json.loads(node['tags'])
                node['tags'] = tags_data if isinstance(tags_data, list) else []
            else:
                node['tags'] = []
        except (json.JSONDecodeError, TypeError):
            node['tags'] = []
        nodes.append(node)
```

## API Endpoints
- `GET /` - Health check
- `GET /api/nodes` - List all nodes
- `POST /api/nodes` - Create node
- `GET /api/nodes/{id}` - Get single node
- `PUT /api/nodes/{id}` - Update node
- `DELETE /api/nodes/{id}` - Delete node
- `GET /api/hermes/stats` - Dashboard statistics
- `GET /api/hermes/digest` - Daily digest

## Database Schema
Tables: `nodes`, `edges`, `learnings`, `agent_status`

### Nodes table:
```sql
CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags TEXT,  -- JSON array
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    project TEXT
)
```

## UI Preferences (Damian)
- Dense layouts (max-w 960px, 14-16px padding, 10px gaps)
- No emoji icons - SVG only
- Warm orange #e85d04 accent color
- Two-column layouts where appropriate
- CSS-only hovers with 0.18s cubic-bezier
- "Improve UI" = reduce whitespace + polish, not add decoration

## Common Errors & Fixes

### Error: WinError 10048 (Port already in use)
```bash
# Find and kill process
cmd.exe /c "netstat -ano | findstr :8001"
powershell.exe -Command "Stop-Process -Id <PID> -Force"
```

### Error: DeprecationWarning for @app.on_event
Migrate to `lifespan` context manager (see above).

### Error: 500 Internal Server Error on /api/nodes
Usually JSON parsing error in tags field. Apply safe JSON parsing (see above).

### Error: CORS policy blocks frontend
Check CORS middleware configuration. Use specific origins, not `["*"]` with credentials.

## n8n Integration
- n8n runs in Docker at http://localhost:5678
- Arena Image Generator workflow uses Windows Bridge Server at http://localhost:18765
- Task timeout increased to 600s: `N8N_RUNNERS_TASK_TIMEOUT=600000` in docker-compose.yml
