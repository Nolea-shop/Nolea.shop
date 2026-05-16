# Working App.tsx Patterns - NOLEA_BRAIN Session

## Key Learnings from Implementation

### 1. Fixing "X is not defined" Runtime Errors
Always verify all state variables referenced in `useMemo` dependencies are initialized:
```typescript
// WRONG - will cause "projectFilter is not defined"
const filteredNodes = useMemo(() => {
  // uses projectFilter
}, [allNodes, projectFilter, ...]); // but projectFilter never initialized!

// CORRECT
const [projectFilter, setProjectFilter] = useState<string | null>(null);
```

### 2. Graph View Must Actually Render Nodes
Don't just show text "Graph View" - render actual node components:
```tsx
// WRONG - shows nothing useful
<div>
  <p>Graph View</p>
  <p>Nodes: {visibleGraphNodes.length}</p>
</div>

// CORRECT - renders draggable node cards
{visibleGraphNodes.map((node) => {
  const pos = nodePositions[node.id] || { x: 50, y: 50 };
  return (
    <div
      key={node.id}
      className="graph-node absolute flex h-24 w-24 ..."
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
      onClick={() => handleNodeClick(node.id)}
    >
      <span>{node.title}</span>
    </div>
  );
})}
```

### 3. Show ALL Nodes in Graph View
```typescript
// WRONG - limits to static array length
const visibleGraphNodes = filteredNodes.slice(0, graphPositions.length);

// CORRECT - show all nodes with dynamic positions
const visibleGraphNodes = allNodes; // All nodes
```

### 4. File Corruption Recovery
When multiple patches corrupt a file, rewrite entirely:
```bash
# Don't keep patching a corrupted file
# Instead, write complete working content
write_file(path="/path/to/file.tsx", content="...complete file...")
```

### 5. Node Position Persistence Flow
1. Load positions from DB into state on startup
2. Update state during drag (immediate visual feedback)
3. Save to DB on mouseUp (persist)

```typescript
// Load
const loadNodes = async () => {
  const data = await fetch(`${API_URL}/api/nodes`).then(r => r.json());
  setAllNodes(data.nodes);
  
  const positions = {};
  data.nodes.forEach((node: any) => {
    if (node.id && node.x !== undefined) {
      positions[node.id] = { x: node.x, y: node.y };
    }
  });
  setNodePositions(positions);
};

// Save on mouseUp
const handleMouseUp = async () => {
  const { nodeId } = dragState;
  const pos = nodePositions[nodeId];
  await fetch(`${API_URL}/api/nodes/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x: pos?.x, y: pos?.y })
  });
  setDragState(null);
};
```

### 6. Backend Already Supports This
The NOLEA_BRAIN backend (FastAPI + SQLite) already has:
- `nodes` table with `x` and `y` REAL columns
- `edges` table with `source_id`, `target_id`
- `PUT /api/nodes/{id}` accepts x, y in body
- `POST /api/edges` creates connections
- `GET /api/edges` lists all connections

No backend changes needed - just use the existing API correctly.
