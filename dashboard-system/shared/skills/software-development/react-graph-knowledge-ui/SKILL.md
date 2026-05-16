---
name: react-graph-knowledge-ui
description: Build interactive graph-based knowledge management UIs in React. Covers drag-and-drop nodes, edge rendering, node details panels, and position persistence to backend.
---

# React Graph Knowledge UI

Build interactive graph views where nodes (concepts, notes, tasks) can be dragged, clicked, connected, and edited. Typical stack: React + SVG for edges + backend API for persistence.

## When to Use

- Building a graph/knowledge map UI in React
- Nodes need to be draggable with position persistence
- Need click interactions (select, connect, edit nodes)
- Rendering edges/connections between nodes

## Core Implementation Pattern

### 1. State Setup

```typescript
const [nodePositions, setNodePositions] = useState<Record<string, {x: number, y: number}>>({});
const [dragState, setDragState] = useState<{
  nodeId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
} | null>(null);
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
const [connectMode, setConnectMode] = useState(false);
const [connectSource, setConnectSource] = useState<string | null>(null);
const [edges, setEdges] = useState<Array<{source: string, target: string}>>([]);
```

### 2. Drag & Drop Handlers

```typescript
const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
  if (connectMode) return;
  e.stopPropagation();
  const currentPos = nodePositions[nodeId] || { x: 50, y: 50 };
  
  setDragState({
    nodeId,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: currentPos.x,
    offsetY: currentPos.y
  });
}, [connectMode, nodePositions]);

const handleMouseMove = useCallback((e: React.MouseEvent) => {
  if (!dragState) return;
  
  const deltaX = ((e.clientX - dragState.startX) / window.innerWidth) * 100;
  const deltaY = ((e.clientY - dragState.startY) / window.innerHeight) * 100;
  
  const newX = Math.max(5, Math.min(95, dragState.offsetX + deltaX));
  const newY = Math.max(5, Math.min(95, dragState.offsetY + deltaY));
  
  setNodePositions(prev => ({
    ...prev,
    [dragState.nodeId]: { x: newX, y: newY }
  }));
}, [dragState]);

const handleMouseUp = useCallback(async () => {
  if (!dragState) return;
  
  const { nodeId } = dragState;
  const pos = nodePositions[nodeId];
  
  // Persist to backend
  try {
    await fetch(`${API_URL}/api/nodes/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: pos?.x || 0, y: pos?.y || 0 })
    });
  } catch (e) {
    console.error('Error saving position:', e);
  }
  
  setDragState(null);
}, [dragState, nodePositions]);
```

### 3. Node Click Handler (Select vs Connect Mode)

```typescript
const handleNodeClick = useCallback((nodeId: string) => {
  if (connectMode) {
    if (!connectSource) {
      setConnectSource(nodeId);
    } else {
      if (connectSource !== nodeId) {
        // Create edge
        fetch(`${API_URL}/api/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            source_id: connectSource, 
            target_id: nodeId,
            type: 'related'
          })
        }).then(response => {
          if (response.ok) {
            setEdges(prev => [...prev, { source: connectSource, target: nodeId }]);
          }
        });
      }
      setConnectSource(null);
      setConnectMode(false);
    }
  } else {
    setSelectedNodeId(nodeId);
  }
}, [connectMode, connectSource]);
```

### 4. Rendering Nodes with Positions

```tsx
{visibleGraphNodes.map((node) => {
  const pos = nodePositions[node.id as string] || { x: 50, y: 50 };
  const isSelected = selectedNodeId === node.id;
  const isConnecting = connectMode && connectSource === node.id;
  
  return (
    <div
      key={node.id}
      className={`graph-node absolute flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 ...`}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      onMouseDown={(e) => handleNodeMouseDown(e, node.id as string)}
      onClick={() => handleNodeClick(node.id as string)}
    >
      <span className="mb-1 h-2 w-2 rounded-full bg-violet-200" />
      <span className="text-center text-[10px] font-medium">{node.title}</span>
      <span className="mt-1 text-[8px] uppercase">{node.type}</span>
    </div>
  );
})}
```

### 5. SVG Edge Rendering

```tsx
<svg className="absolute inset-0 h-full w-full pointer-events-none z-0">
  {edges.map((edge, i) => {
    const sourcePos = nodePositions[edge.source];
    const targetPos = nodePositions[edge.target];
    if (!sourcePos || !targetPos) return null;
    return (
      <line
        key={i}
        x1={`${sourcePos.x}%`}
        y1={`${sourcePos.y}%`}
        x2={`${targetPos.x}%`}
        y2={`${targetPos.y}%`}
        stroke="rgba(167, 139, 250, 0.4)"
        strokeWidth="1.5"
      />
    );
  })}
</svg>
```

## Node Details Panel

```tsx
{selectedNodeId && (
  <div className="fixed right-0 top-0 h-full w-[380px] border-l border-white/10 bg-black/90 p-6 overflow-y-auto">
    {(() => {
      const node = allNodes.find(n => n.id === selectedNodeId);
      if (!node) return <p>Node not found</p>;
      
      return (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Node Details</h2>
            <button onClick={() => setSelectedNodeId(null)}>×</button>
          </div>
          <div className="space-y-4">
            <div>
              <label>Titel</label>
              <p className="text-white/80">{node.title}</p>
            </div>
            <div>
              <label>Typ</label>
              <p className="text-white/80">{node.type}</p>
            </div>
            {node.content && (
              <div>
                <label>Inhalt</label>
                <p className="text-sm text-white/60 whitespace-pre-wrap">{node.content}</p>
              </div>
            )}
          </div>
        </div>
      );
    })()}
  </div>
)}
```

## Backend: SQLite Schema for Positions & Edges

```python
# Nodes table with x, y columns
cursor.execute('''
    CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        x REAL DEFAULT 0,
        y REAL DEFAULT 0,
        project TEXT
    )
''')

# Edges table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        source_id TEXT,
        target_id TEXT,
        type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
''')
```

## Pitfalls

1. **Missing state variables cause runtime errors** - Always check that state variables referenced in `useMemo` dependencies (like `projectFilter`) are actually defined in `useState`. The error `ReferenceError: projectFilter is not defined` means you forgot to initialize it.

2. **Don't slice nodes for graph view** - Use `const visibleGraphNodes = allNodes;` not `.slice(0, graphPositions.length)`. The latter limits nodes shown and requires static position arrays.

3. **File corruption from multiple patches** - When a file gets corrupted from too many patches, rewrite the entire file instead of continuing to patch. Use `write_file` with complete content.

4. **Node positions must be percentages** - Store x/y as percentages (0-100) not pixels, so they scale with window size. Convert in drag handler: `deltaX = ((e.clientX - startX) / window.innerWidth) * 100`

5. **Load positions from DB on startup** - In your `loadNodes()` function, extract x/y from each node and populate `nodePositions` state:
```typescript
const positions: Record<string, {x: number, y: number}> = {};
nodes.forEach((node: any) => {
  if (node.id && node.x !== undefined) {
    positions[node.id] = { x: node.x || 0, y: node.y || 0 };
  }
});
setNodePositions(positions);
```

6. **SVG edges need pointer-events-none** - Edges should not block mouse interaction with nodes. Add `pointer-events-none` and appropriate `z-index`.

## Common Patterns

- **Connect mode toggle**: Button in sidebar sets `connectMode` state. When active, node clicks create edges instead of opening details.
- **Visual feedback**: Change node border/background when `isSelected` or `isConnecting` is true.
- **Container event handlers**: Put `onMouseMove`, `onMouseUp`, `onMouseLeave` on the graph container div, not individual nodes.
