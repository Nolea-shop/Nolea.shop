# Code Node Mode Fixes - 2026-05-02 Session

## Problem
Code nodes using `$input.all()` or `$input.all()[0]` throw error:
```
Can't use .all() here [line 1, for item 0]
This is only available in 'Run Once for All Items' mode
```

## Root Cause
The default mode for Code nodes is `runOnceForEachItem`, but `$input.all()` requires 
`runOnceForAllItems` mode to access all input items at once.

## Fix
In the workflow JSON, set `"mode": "runOnceForAllItems"` for any Code node that uses 
`$input.all()`:

```json
{
  "parameters": {
    "mode": "runOnceForAllItems",
    "jsCode": "const items = $input.all().map(i => i.json); ..."
  }
}
```

## Nodes That Commonly Need This Fix
- Normalize HN Stories (uses `$input.all()`)
- Data Aggregator (uses `$input.all()`)
- L1 Deduplication (uses `$input.all()`)
- L2 Engagement Score (uses `$input.all()[0]`)
- Generate Product (uses `$input.all()`)

## IF Node Type Coercion Problem
IF node conditions require the `rightValue` to match the expected type:

```json
// WRONG - causes "Wrong type: '5' is a string but was expecting a number"
"rightValue": "5"

// CORRECT - bare number
"rightValue": 5
```

## Direct Database Fix
When n8n API is blocked, fix directly in SQLite:

```python
import sqlite3, json

conn = sqlite3.connect('/home/damia/.n8n/database.sqlite')
cursor = conn.cursor()

# Read workflow
cursor.execute("SELECT nodes FROM workflow_entity WHERE name = 'Herzstuek - Master Pipeline'")
nodes = json.loads(cursor.fetchone()[0])

# Fix mode for all Code nodes
for node in nodes:
    if node['type'] == 'n8n-nodes-base.code':
        node['parameters']['mode'] = 'runOnceForAllItems'

# Write back
cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE name = 'Herzstuek - Master Pipeline'",
               (json.dumps(nodes),))
conn.commit()
conn.close()
```