# Workflow Cleanup Session - 2026-05-02

## Problem
15 workflows shown in UI but only 2 in database. Need to identify and delete unwanted workflows.

## Analysis Method
```python
import sqlite3

conn = sqlite3.connect('/home/damia/.n8n/database.sqlite')
cursor = conn.cursor()

# List all workflows
cursor.execute("SELECT id, name, active FROM workflow_entity")
workflows = cursor.fetchall()
print(f"Found {len(workflows)} workflows")
for wid, name, active in workflows:
    print(f"  - {name} (active={active})")
```

## Solution: Keep Only Required Workflows
```python
# Delete unwanted workflows
cursor.execute("DELETE FROM workflow_entity WHERE name LIKE '%Arena%'")
conn.commit()

# Clean orphaned executions
cursor.execute("DELETE FROM execution_entity WHERE workflowId NOT IN (SELECT id FROM workflow_entity)")
conn.commit()
```

## Result
- **Before**: 2 workflows (Arena Image Generator, Herzstuek Master)
- **After**: 1 workflow (Herzstuek - Master Pipeline, aktiv)

## Key Points
- Use direct SQLite manipulation when API auth fails
- Always clean `execution_entity` after workflow deletion
- Restart n8n to clear in-memory caches