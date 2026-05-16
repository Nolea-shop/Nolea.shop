# Debugging Serverless Function Crashes (FUNCTION_INVOCATION_FAILED)

When a Vercel serverless function crashes during initialization (FUNCTION_INVOCATION_FAILED), the standard debugging pipeline (error messages → reproduction) is blocked because the function never runs.

## Technique: Binary Search with Minimal Test Functions

Use progressively more complex test functions to isolate the failing import/initialization:

### Phase 1: Verify basic Vercel function works

Create `api/ping.ts`:
```typescript
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, env: process.env.NODE_ENV });
}
```

### Phase 2: Test individual imports

```typescript
// Just import, don't instantiate
import { Hono } from 'hono';
export default (req: any, res: any) => res.json({ ok: true, hasHono: !!Hono });
```

### Phase 3: Test instantiation

```typescript
import { Hono } from 'hono';
const app = new Hono();
app.get('*', (c) => c.text(c.req.path));
export default async (req: any, res: any) => { ... };
```

### Phase 4: Test middleware

Add middleware one at a time (cors, logger, etc.) to find which one causes the crash.

## Common Serverless Crash Causes

| Import Pattern | Result | Fix |
|---|---|---|
| `import { Hono } from 'hono'` (RegExpRouter) | CRASH on Vercel | Use `'hono/quick'` or Express |
| `import { cors } from 'hono/cors'` + `hono/quick` | CRASH | Use Express instead |
| `import { verify } from 'jsonwebtoken'` | CRASH (CJS named import) | `import jwt from 'jsonwebtoken'` |
| `import { hash } from 'bcryptjs'` | CRASH (CJS named import) | `import bcrypt from 'bcryptjs'` |
| `new PrismaClient()` with wrong DATABASE_URL | Timeout/crash | Check env var |

## Network Diagnostics Deploy

When serverless function can't reach a database, deploy a network test function:

```typescript
import * as net from 'net';
import * as dns from 'dns/promises';

export default async function handler(req: any, res: any) {
  const results: any = {};
  for (const host of ['your-db-host.com', 'google.com']) {
    try { results[`dns_${host}`] = await dns.resolve4(host); }
    catch (e: any) { results[`dns_${host}`] = e.message; }
  }
  for (const port of [5432, 6543, 443]) {
    try {
      const ms = Date.now();
      await new Promise((resolve, reject) => {
        const s = net.createConnection(port, 'your-db-host.com', () => { s.end(); resolve(null); });
        s.on('error', reject);
        s.setTimeout(8000, () => { s.destroy(); reject(new Error('timeout')); });
      });
      results[`tcp_${port}`] = `connected in ${Date.now() - ms}ms`;
    } catch (e: any) { results[`tcp_${port}`] = e.message; }
  }
  res.json(results);
}
```
