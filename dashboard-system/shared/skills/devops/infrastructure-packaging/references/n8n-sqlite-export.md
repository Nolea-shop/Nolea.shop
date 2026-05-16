# n8n SQLite Workflow Export Script

Reusable script to export all n8n workflows from the local SQLite database.
Useful when n8n uses cookie-based auth (no API key) and the REST API is unavailable.

## Usage

```bash
python3 n8n-export.py
# Exports all workflows to n8n-exports/ directory as JSON files
```

## Script

```python
#!/usr/bin/env python3
"""Export all n8n workflows from SQLite to JSON files."""
import json, sqlite3, sys, os
from pathlib import Path

N8N_DB = Path.home() / ".n8n" / "database.sqlite"
OUTPUT_DIR = Path("n8n-exports")

def main():
    if not N8N_DB.exists():
        print(f"❌ n8n database not found at {N8N_DB}")
        sys.exit(1)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    db = sqlite3.connect(str(N8N_DB))
    db.row_factory = sqlite3.Row
    
    rows = db.execute(
        "SELECT id, name, active, nodes, connections, settings, staticData, "
        "createdAt, updatedAt FROM workflow_entity"
    ).fetchall()
    
    if not rows:
        print("⚠️  No workflows found in database.")
        return
    
    for row in rows:
        wf = dict(row)
        for field in ["nodes", "connections", "settings", "staticData"]:
            val = wf.get(field)
            if val and isinstance(val, str):
                try:
                    wf[field] = json.loads(val)
                except json.JSONDecodeError:
                    pass
        
        safe_name = wf["name"].replace(" ", "-").replace("/", "-").lower()
        filepath = OUTPUT_DIR / f"{safe_name}.json"
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(wf, f, indent=2, ensure_ascii=False)
        
        status = "✅ active" if wf["active"] else "⬜ inactive"
        print(f"  {status} {wf['name']} (ID: {wf['id']}) → {filepath}")
    
    print(f"\n📦 {len(rows)} workflow(s) exported to {OUTPUT_DIR}/")
    db.close()

if __name__ == "__main__":
    main()
```

## Import on remote server

```bash
# Via n8n CLI
n8n import:workflow --input=./n8n-exports/

# Or copy JSON files to n8n's storage directory
cp n8n-exports/*.json ~/.n8n/storage/
```
