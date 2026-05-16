# If Node Dual Output Error - 2026-05-02 Session

## The Problem

Workflow: Herzstück Master Pipeline (Hacker News to Shop)

Error: `A 'json' property isn't an object [item 0]`

## Root Cause Analysis

The `If` Node had TWO outputs connected:
```
If (true)  →  Extract  →  Generate  →  Send
   ↓
If (false)  →  Generate  →  Send
```

When the `If` condition evaluated to `false`:
1. `Generate` node ran via the false branch
2. `Generate` had NO INPUT data (no items from upstream)
3. Code node tried to return `[{json: {...}}]` but had no data
4. n8n threw "A 'json' property isn't an object [item 0]"

## The Fix

Remove the false branch connection:

```
If (true)  →  Extract  →  Generate  →  Send
   ↓
( no connection - workflow ends gracefully )
```

## Prevention Pattern

Before connecting multiple outputs from `If` node, ask:
1. Does the node need data from the previous step?
2. Will the false branch have valid input data?
3. If not, should the workflow just end instead of continuing?

## Code Node Mode Reminder

Nodes using `$input.all()` or expecting upstream data MUST have:
```json
{
  "mode": "runOnceForEachItem"  // default
}
```

When no upstream data exists (empty input), this throws the json error.