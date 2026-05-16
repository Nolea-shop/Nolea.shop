# nodeName Bug - n8n 2.18.5 and Earlier Versions

## Problem Description
`POST /rest/workflows/{id}/run` returns error:
```json
{
  "code": 0,
  "message": "Cannot read properties of undefined (reading 'nodeName')"
}
```

## Testing Across Versions

This bug was tested across multiple n8n versions with identical results:

| Version | Result |
|---------|--------|
| 2.13.0  | ❌ Bug present |
| 2.15.0  | ❌ Bug present |
| 2.17.0  | ❌ Bug present |
| 2.18.0  | ❌ Bug present |
| 2.18.5  | ❌ Bug present |

## Test Cases Used

### Minimal workflow (1 node):
```json
{
  "name": "Test Minimal",
  "nodes": [
    {
      "parameters": {
        "url": "https://httpbin.org/get"
      },
      "type": "n8n-nodes-base.httpRequest",
      "position": [250, 300],
      "name": "HTTP"
    }
  ],
  "connections": {}
}
```

### Manual trigger workflow (1 node):
```json
{
  "name": "Test Manual",
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.manualTrigger",
      "position": [250, 300],
      "name": "Start"
    }
  ],
  "connections": {}
}
```

All returned the same error.

## Workarounds

1. **Browser UI**: Use "Execute Workflow" button in n8n web interface
2. **Avoid REST run endpoint**: The bug is in `WorkflowExecutionService.executeManually` - scheduled/trigger-based execution may work
3. **SQLite direct execution**: For testing workflows, modify the database directly:
   - Set `active=1` in `workflow_entity` table
   - Insert row into `workflow_history` with version info
   - Restart n8n to load the activated workflow

## Root Cause

The error originates in `/node_modules/n8n/src/workflows/workflow-execution.service.ts` at line 182:
```
TypeError: Cannot read properties of undefined (reading 'nodeName')
    at WorkflowExecutionService.executeManually
```

This suggests an uninitialized internal state in n8n's workflow execution engine, affecting all 2.x versions tested.

## Related Issues

- Code node `.all()` mode errors may be related (same service file)
- Affects both fresh installs and existing databases
- Persists across npx cache clears and database rewrites