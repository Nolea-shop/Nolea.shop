# SQLite Workflow Update Pattern

When workflows in n8n's database contain stale or incorrect data (e.g., Reddit URLs persisting after workflow file was updated), direct SQLite manipulation provides a reliable fix when API authentication is problematic.

## When to Use

- Workflow JSON file shows correct data but n8n UI/database still has old data
- API endpoints return 401/Unauthorized
- Workflow contains unwanted references (Reddit URLs in a HN workflow)
- Need to "force sync" database with corrected workflow JSON

## Pattern

```python
import sqlite3
import json

# Connect to n8n database
conn = sqlite3.connect('/home/damia/.n8n/database.sqlite')
cursor = conn.cursor()

# Read corrected workflow from file
with open('/path/to/corrected-workflow.json') as f:
    corrected = json.load(f)

# Update the workflow directly in database
cursor.execute("""
    UPDATE workflow_entity 
    SET nodes = ?, connections = ? 
    WHERE name = ?
""", (
    json.dumps(corrected['nodes']),
    json.dumps(corrected['connections']),
    'Workflow Name Exactly As Appears'
))

conn.commit()
conn.close()
```

## Verification

After update, verify the change:

```python
cursor.execute("SELECT nodes FROM workflow_entity WHERE name = ?", (wf_name,))
nodes = json.loads(cursor.fetchone()[0])
for node in nodes:
    url = node.get('parameters', {}).get('url', '')
    if url:
        print(f"{node['name']}: {url[:50]}...")
```

## Session Example (2026-05-02)

**Problem**: Workflow "Herzstuek - Master Pipeline" showed Reddit URL in database despite having correct Hacker News JSON in file.

**Fix**: 
1. Read nodes/connections from corrected JSON file
2. UPDATE workflow_entity SET nodes=?, connections=? WHERE name=?
3. Verified no "reddit" in node parameters

**Result**: Workflow correctly uses HN API.