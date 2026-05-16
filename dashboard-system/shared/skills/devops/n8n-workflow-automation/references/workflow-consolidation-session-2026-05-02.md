# Workflow Consolidation & Shop API Testing — Session Notes (2026-05-02)

## Scenario
13 Herzstück workflows needed consolidation into a single master pipeline.

## Key Learnings

### 1. API Authentication for Shop Integration
When n8n workflows need to POST to a Next.js API endpoint:

```bash
# Test locally first
curl -X POST http://localhost:3000/api/n8n-product \
  -H "Content-Type: application/json" \
  -H "x-n8n-secret: Herzstueck2024!" \
  -d '{"slug":"test","title":"Test","price":9.99}'
```

**Critical gotcha:** The `.env.local` file contains the actual secret, not the fallback value.
- Default in code: `changeme`
- Actual value: `Herzstueck2024!` (from `.env.local`)

**n8n configuration:**
- Use `host.docker.internal:3000` as the URL (Docker-to-host)
- Required headers: `x-n8n-secret: <actual-secret>`

### 2. Workflow Consolidation Pattern
When combining multiple workflows:

**Step 1:** Identify duplicate node names (common pain point)
- "Execute Workflow", "Merge", "Code" appear in multiple workflows
- Prefix with context: `[Phase 1] Dedup`, `[Phase 2] Engage Score`

**Step 2:** Flatten nodes while preserving connections
```python
# Unwrap pattern: response["data"]["nodes"], NOT response["nodes"]
all_nodes = []
for wf in workflows:
    for node in wf["data"]["nodes"]:
        node_copy = node.copy()
        node_copy["name"] = f"[{wf['name'][:12]}] {node['name']}"
        all_nodes.append(node_copy)
```

**Step 3:** Build clean connections object using renamed node names

### 3. Pitfalls Encountered

| Issue | Fix |
|-------|-----|
| Duplicate node names in combined workflow | Prefix all node names with workflow context |
| Schedule Trigger versionId mismatch | Always GET fresh workflow data before activation |
| API returns Unauthorized | Check .env.local for actual secret, not fallback |
| Master pipeline has 2x Execute nodes with same ID | Regenerate IDs when combining JSONs |

### 4. Testing Workflow Endpoints
To test a workflow manually in n8n 2.18.5:
1. UI → Open workflow
2. Click "Execute Workflow" button (manual trigger workflows don't work via API)
3. For scheduled workflows: temporarily change schedule to 1 min, then test

### 5. File Structure for Project Archive
```
D:\hermes\Herzstuek\
├── herzstuek-master-pipeline.json    # Combined workflow (14 nodes)
├── memory.md                        # Project knowledge
├── README.md                        # Quick start guide
└── workflows\                        # Individual workflow backups
    ├── Herzstuck_-_Phase_1_Deep_Scrape.json
    ├── Herzstuck_-_Phase_2_Analysis_Engine.json
    └── ... (7 total)
```

## Commands Used
```bash
# Test shop API
curl -X POST http://localhost:3000/api/n8n-product \
  -H "Content-Type: application/json" \
  -H "x-n8n-secret: $(grep N8N_SECRET .env.local | cut -d'=' -f2)" \
  -d '{"slug":"test","title":"Test","price":9.99}'

# Import workflow via API
curl -X POST -b cookie.txt -H "Content-Type: application/json" \
  -d @workflow.json http://localhost:5678/rest/workflows
```