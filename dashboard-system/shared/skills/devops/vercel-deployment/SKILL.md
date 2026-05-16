---
name: vercel-deployment
title: Vercel Full-Stack Deployment
description: Deploy Node.js APIs (Express or Hono) with a Vite/React frontend on Vercel. Covers project structure, catch-all routing, environment variables, Prisma + Supabase integration, CJS/ESM compatibility, and Express body parsing.
tags: [vercel, deployment, serverless, express, hono, prisma, supabase, hosting]
version: 1.0
---

# Vercel Full-Stack Deployment

Deploy a Node.js API (Express or Hono) + Vite/React frontend to Vercel. Covers the project structure, serverless function routing, framework selection (Express vs Hono), Prisma + Supabase integration, and CJS/ESM edge cases that bite in Vercel's esbuild bundler.

**⚠️ CRITICAL: Hono has esbuild bundling issues on Vercel.** `import { Hono } from 'hono'` (RegExpRouter) causes FUNCTION_INVOCATION_FAILED. `hono/quick` works for simple apps but crashes when middleware (`cors`, `logger`) is added. **Express is the recommended framework for Vercel Node.js runtime.** See the "Framework Selection" section below.

## Core Project Structure

```
project-root/
  api/
    [[route]].ts          # Catch-all Vercel serverless function entry point
  api-lib/
    routes/               # Route modules (NOT in api/ — avoids accidental endpoint exposure)
    lib/
      db.ts               # Prisma client singleton
      validation.ts       # Zod schemas
    middleware/
      auth.ts             # JWT auth middleware
  prisma/
    schema.prisma
    seed.ts
  src/                    # Frontend source (Vite + React)
  dist/                   # Frontend build output
  vercel.json
  package.json
```

### Key Rules

1. **`api/[[...slug]].ts` for catch-all routing** — Single entry point that handles `/api/*` for ALL HTTP methods (GET, POST, PATCH, DELETE, OPTIONS). `api/index.ts` only handles `/api` (exact match). The `[[...slug]]` slug catches all sub-paths. Using just `[[route]]` (single level) won't match deeper paths.

2. **Route modules go in a separate directory, NOT `api/routes/`** — Any `.ts` file under `api/` gets auto-detected as a separate Vercel serverless function. Keep all imported modules outside the `api/` directory. Use `api-lib/` or `src-api/` instead.

3. **Framework choice matters:**

### Express (RECOMMENDED — most reliable)

```typescript
// api/[[...slug]].ts
import express from 'express';

const app = express();

// ❌ express.json() does NOT work on Vercel — parse bodies manually
app.use((req: any, _res: any, next: any) => {
  if (['POST','PUT','PATCH'].includes(req.method)) {
    if (req.body) { return next(); }
    let body = '';
    req.on('data', (c: any) => body += c);
    req.on('end', () => {
      try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
      next();
    });
  } else { next(); }
});

// CORS
app.use((_req: any, res: any, next: any) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Routes and middleware...
export default app;   // Vercel auto-detects Express
```

### Hono (⚠️ esbuild bundling issues — use only for simple apps)

```typescript
import { Hono } from 'hono/quick';   // Use 'quick' NOT default (RegExpRouter crashes)
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';

const app = new Hono();
// Adding middleware (cors, logger) may cause FUNCTION_INVOCATION_FAILED
app.get('/api/health', (c) => c.json({ status: 'ok' }));
export default handle(app);
```

### `vercel.json`

Minimal config — just the build command and output directory:

```json
{
  "buildCommand": "npx prisma generate && vite build",
  "outputDirectory": "dist"
}
```

Do NOT add `functions`, `rewrites`, or `routes` unless you specifically need to override defaults. Over-configuring can interfere with auto-detection of `api/` serverless functions.

## Prisma + Supabase on Vercel

### Database URL Management

1. Create Supabase project via management API or dashboard
2. Set `DATABASE_URL` and `JWT_SECRET` as **sensitive** env vars on Vercel (production target)
3. To reset the Supabase database password (if lost):

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{project_ref}/database/password" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password":"new-password-here"}'
```

4. Update the Vercel env var with the new connection string via API or dashboard

### Build Pipeline

The build command runs `npx prisma generate && vite build`. At build time, `.env` is loaded for Prisma client generation. At function runtime, only Vercel env vars are available.

Important: Prisma generates the client at build time, but the client binary is bundled by esbuild into the serverless function. If the function crashes with `FUNCTION_INVOCATION_FAILED`, check:
- DATABASE_URL env var is up-to-date (reset password → redeploy)
- Prisma engine binary is compatible with Vercel's Lambda runtime

## CJS/ESM Compatibility

Vercel's esbuild bundler expects ESM imports. CJS-only packages (`bcryptjs`, `jsonwebtoken`) export their API as a `default` object in ESM context. Named destructured imports will fail at runtime.

### ❌ Broken Pattern (CJS named import in ESM)

```typescript
import { hash, compare } from 'bcryptjs';      // RuntimeError in ESM
import { verify } from 'jsonwebtoken';           // RuntimeError in ESM
```

### ✅ Working Pattern

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Then use:
const hash = await bcrypt.hash(password, 10);
const valid = await bcrypt.compare(password, hash);
const token = jwt.sign(payload, secret, { expiresIn: '30d' });
const decoded = jwt.verify(token, secret);
```

Check what a package exports in ESM context:
```bash
node -e "import('bcryptjs').then(m => console.log(Object.keys(m)))"
# ['default']
```

Hono (`import { Hono } from 'hono'`) and Prisma (`import { PrismaClient } from '@prisma/client'`) work fine with named exports.

## Hono TypeScript Typing Issue

`c.get('user')` after `c.set('user', payload)` in Hono 4.x produces `TS2769: No overload matches this call` errors in strict mode. This is **runtime-safe** — the middleware sets the value correctly. The TypeScript errors stem from Hono's strict Context typing, not from actual runtime behavior.

Vercel's build pipeline reports these as warnings but continues the build. They do not affect the deployed function.

**To fix properly**, type the variables via Hono's generic:
```typescript
type Env = { Variables: { user: JwtPayload } };
const app = new Hono<Env>();
```

## Vercel Env Var Management

Env vars set as `sensitive` type:
- Cannot be read back via the API (decrypted: false)
- `vercel env pull` only downloads non-sensitive vars
- To update: use API with `PATCH /v9/projects/{id}/env/{env_id}` or set via dashboard
- To check they exist: use `GET /v9/projects/{id}/env` (returns metadata, not values)

## Testing

After deployment, wait a few seconds for the function to warm up, then test:

```bash
curl -s "https://your-app.vercel.app/api/health"
curl -s -X POST "https://your-app.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'
```

If you get `FUNCTION_INVOCATION_FAILED`:
1. Check Vercel runtime logs (`dashboard → deployments → function logs`)
2. Verify all env vars are set correctly on the production target
3. Redeploy after env var updates (a new deployment picks up the latest values)

## Related Reference Files

- `references/supabase-postgres-setup.md` — Supabase project creation via API, database password reset, and Vercel env var update workflow

## Pitfalls

### `api/index.ts` vs `api/[[route]].ts`
`api/index.ts` only handles `GET /api` (exact match). For Hono to handle sub-routes like `/api/auth/login`, use `api/[[route]].ts` (catch-all optional). This tells Vercel to route ALL paths under `/api/` to the function.

### Route files inside `api/` become endpoints
Every `.ts` file directly under `api/` (or in subdirectories) is auto-detected as a serverless function endpoint. Keep imported modules in a directory like `api-lib/` outside of `api/`.

### BuildCommand runs twice
Vercel runs `buildCommand` (from vercel.json) AND `vercel-build` (from package.json scripts). Ensure neither duplicates expensive operations unnecessarily.

### Prisma engine on Lambda\nThe Prisma engine binary (libquery_engine) needs to be bundled with the function. `prisma generate` at build time handles this. If using edge functions, switch to `@prisma/client/edge` or use a data proxy.

### Prisma @default(cuid()) Does Not Work Through Supabase REST API\n\nWhen switching from Prisma (direct PostgreSQL connection) to Supabase REST API (`@supabase/supabase-js`), Prisma's `@default(cuid())` on `id` fields **does not apply**. The cuid is generated by Prisma's client library, not by a PostgreSQL-level default. The Supabase REST API inserts directly to PostgreSQL, bypassing Prisma, so no `id` value is provided and the insert fails with:\n\n```\nnull value in column \"id\" of relation \"tasks\" violates not-null constraint\n```\n\n**Fix:** Generate IDs explicitly in application code before every insert:\n\n```typescript\nimport { randomUUID } from 'crypto';\nconst genId = () => randomUUID();\n\n// Before every insert:\nsupabase.from('tasks').insert({ id: genId(), title: '...', ... });\n```\n\nEvery `.insert()` call across all route files must include `id: genId()`. This includes junction tables (e.g., `meal_tag_links`, `meal_ingredients`, `task_completions`, `points_ledger`).\n\nTo find remaining inserts missing `id`:\n```bash\ngrep -n \"\\.insert(\" api/index.ts | grep -v \"genId\"\n```\n\n### Supabase Management API Masks API Keys\n\nThe Supabase Management API (`v1/projects/{ref}/api-keys`) returns **truncated** API keys:\n```json\n{\n  \"name\": \"service_role\",\n  \"api_key\": \"eyJhbG...PoXo\",   // <-- only first ~30 chars shown!\n  \"hash\": \"XCf5pFnahNb7BVzHqvTmHPVD5yfEDsChwsdYM46IIhc\"\n}\n```\n\nThe `...` in the response is **not literal** — the terminal displays a truncated version of a much longer string. The actual full key is 219 characters (service_role) or 208 characters (anon).\n\n**To get the full key:**\n- Capture it during project creation (shown only once)\n- View it in the Supabase Dashboard (Settings → API)\n- Use the Supabase CLI to run a query that requires the key (the CLI has access to the project secrets)\n\n**If you accidentally set the truncated key on Vercel:**\n1. Get the full key via the dashboard or from project creation output\n2. Delete the old Vercel env var\n3. Create a new one with the full 219-char key\n4. Redeploy with `--force`\n\nCheck which key Vercel has:\n```bash\n# Add a debug endpoint that shows the key length\napp.get('/api/debug-env', (_: any, res: any) => {\n  const key = process.env.SUPABASE_SERVICE_KEY || '';\n  res.json({ key_len: key.length, valid: key.length > 100 });\n});\n```\nA valid key should be 219 chars. If it's ~30, you have the truncated version.\n\n## Debugging FUNCTION_INVOCATION_FAILED on Vercel\n\nThis error means the function code throws during module initialization.\n\n### Diagnostic Steps\n\n1. **Create a minimal test endpoint** that does nothing except return JSON:\n\n```typescript\n// api/test.ts — simple standalone function\nimport { Hono } from 'hono/quick';\nconst app = new Hono();\napp.get('*', (c) => c.text('hello'));\n\nexport default async function handler(req: any, res: any) {\n  const response = await app.fetch(new Request('http://localhost/'));\n  res.end(await response.text());\n}\n```\nIf this works, the issue is with imports/middleware, not Hono itself.\n\n2. **Isolate the import that fails:**\n   - Test with just `import { Hono } from 'hono'` (works for basic import)\n   - Then test with `new Hono()` (fails for default `hono` — RegExpRouter issue)\n   - Then test with `import { Hono } from 'hono/quick'` + `new Hono()` (works for simple apps)\n   - Then add `app.use('*', cors(...))` (fails — middleware triggers the crash)\n   \n3. **Sequence of findings for this project:**\n   - Basic import: ✅ Works\n   - `new Hono()` from `'hono'`: ❌ FUNCTION_INVOCATION_FAILED\n   - `new Hono()` from `'hono/quick'` (minimal app): ✅ Works\n   - Adding `cors`/`logger` middleware: ❌ FUNCTION_INVOCATION_FAILED\n   - Express (full app with all middleware): ✅ Works\n   - Express + `export default app`: ✅ Works (Vercel auto-detects Express)",

### express.json() does NOT work on Vercel
Vercel's serverless runtime passes the request body as a pre-buffered stream. `body-parser` or `express.json()` middleware may hang waiting for data events that never fire. Always parse bodies manually by concatenating `data` chunks in a custom middleware.

### Supabase DNS Resolution Failure
The hostname `db.<ref>.supabase.co` uses internal DNS that does not resolve from Vercel's compute regions. DNS returns `ENODATA` (no A records). TCP connections fail with `ENOTFOUND`. This affects both port 5432 (direct) and 6543 (pooled). The DNS failure is not a configuration issue — it's by design. See `references/supabase-postgres-setup.md` for workarounds.

### Vercel env vars marked "sensitive" cannot be read back
Env vars set with `type: "sensitive"` return `"value": ""` in API responses with `decrypted: false`. To update, you must delete and recreate the var with a new value. Use `type: "plain"` during debugging to verify the value is correct, then switch to `"sensitive"` for production.

### [[...slug]].ts vs [[route]].ts
The three-dot spread `[[...slug]]` is required for deeper path matching (e.g., `/api/auth/login`). Single-level `[[route]]` only catches one additional segment. Always use `[[...slug]]` for full catch-all.
