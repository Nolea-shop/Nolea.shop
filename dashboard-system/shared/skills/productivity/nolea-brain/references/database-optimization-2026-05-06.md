# NOLEA_BRAIN Database Optimization (2026-05-06)

## Step 4: Database Optimization ✅ COMPLETED

### Index Creation
Added performance indexes to `engine/core/database.py`:
```sql
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project);
CREATE INDEX IF NOT EXISTS idx_nodes_created ON nodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_learnings_agent ON learnings(agent_name);
```

### FTS5 Full-Text Search
**CRITICAL PITFALL**: `rowid` in FTS5 requires integer values. UUIDs (text) cause `datatype mismatch` errors.

**Correct FTS5 Setup**:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
    node_id, 
    title, 
    content
)
```

**Sync Logic** (in `engine/core/business.py`):
- On node create: `INSERT INTO nodes_fts (node_id, title, content) VALUES (?, ?, ?)`
- On node update: `DELETE FROM nodes_fts WHERE node_id = ?` then re-insert
- On node delete: `DELETE FROM nodes_fts WHERE node_id = ?`

**Search Function** (`search_nodes`):
```python
cursor.execute('''
    SELECT nodes.* FROM nodes 
    JOIN nodes_fts ON nodes.id = nodes_fts.node_id
    WHERE nodes_fts MATCH ?
    ORDER BY rank
''', (query,))
```

### WSL2 Node.js Constraint
**NEVER** store Node.js projects on `/mnt/` (NTFS) drives — `npm install` fails with `EPERM` (permission errors on chmod/futime).

**Solution**: Copy project to `/home/damia/` (WSL Linux filesystem):
```bash
cp -r /mnt/d/hermes/NOLEA_BRAIN_APP /home/damia/nolea-brain-app
cd /home/damia/nolea-brain-app/desktop-app
npm install  # Now works without EPERM
```

### Database WAL Mode (Already Implemented)
- `PRAGMA journal_mode=WAL`
- `PRAGMA synchronous=NORMAL`
- `PRAGMA busy_timeout=5000`

### Verification
- API endpoint test: `curl http://localhost:8001/api/search?q=test`
- FTS5 count check: `SELECT count(*) FROM nodes_fts;` (should match node count)
