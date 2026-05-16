# Supabase PostgreSQL + Vercel

## Database Password Reset

If the Supabase database password is unknown:

```bash
DB_PASS="homecrew_$(openssl rand -base64 12 | tr '+/' '-_')"

curl -X PATCH "https://api.supabase.com/v1/projects/{project_ref}/database/password" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$DB_PASS\"}"
```

## ⚠️ CRITICAL: Supabase DNS Does Not Resolve From Vercel

The internal hostname `db.<ref>.supabase.co` uses DNS records that DO NOT exist from outside Supabase's network. This was verified via a network debug endpoint deployed on Vercel:

```json
{
  "dns_db.dsmanxxwocqnesxomxln.supabase.co": "queryA ENODATA",
  "tcp_5432": "getaddrinfo ENOTFOUND",
  "tcp_6543": "getaddrinfo ENOTFOUND",
  "dns_google.com": ["172.253.63.102", "..."],
  "tcp_google.com_443": "connected in 15ms"
}
```

- DNS resolution: ENODATA (no A records)
- TCP connection: ENOTFOUND (hostname can't be resolved)
- This affects BOTH port 5432 (direct) and 6543 (pooled)

### Solutions

**Option A: Supabase REST API (recommended, works on HTTPS port 443)**
```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://<ref>.supabase.co',     // NOTE: no 'db.' prefix!
  process.env.SUPABASE_SERVICE_KEY!
);
// Use supabase.from('table').select() etc.
```

**Option B: Vercel Postgres** (no cross-network DNS issues)
```bash
npm install @vercel/postgres
# DATABASE_URL points to Vercel's own Postgres
```

**Option C: Prisma Accelerate** (proxy through Prisma Data Platform)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // prisma://accelerate.prisma-data.net/...
}
```

### What DOES NOT Work

- Direct connection to `db.<ref>.supabase.co:5432` — DNS fails
- Pooled connection to `db.<ref>.supabase.co:6543` — DNS fails (same hostname)
- Any `?pgbouncer=true`, `?ssl=prefer`, `?sslmode=require` parameters — the DNS must resolve first

## Supabase REST API vs Prisma Direct Connection

When using the Supabase REST API (Option A above) as a replacement for Prisma's direct PostgreSQL connection, be aware of these differences:

### Prisma @default(cuid()) Does Not Apply

Prisma generates `id` values via `@default(cuid())` at the client level, not at the PostgreSQL level. The Supabase REST API bypasses Prisma, so inserts fail with:

```
null value in column "id" of relation "<table>" violates not-null constraint
```

**Fix:** Generate IDs explicitly in application code:

```typescript
import { randomUUID } from 'crypto';
const genId = () => randomUUID();

// Every insert must include id:
await supabase.from('tasks').insert({ id: genId(), title: '...', ... });
```

This applies to **all** tables that use Prisma's `@default(cuid())`, including junction tables.

### Table and Column Names

Prisma's `@@map("table_name")` and `@map("column_name")` directives rename tables/columns at the database level. These names are what Supabase REST API uses:

| Prisma Model | DB Table (via @@map) |
|---|---|
| `User` | `users` |
| `Task` | `tasks` |
| `Family` | `families` |
| `MealTagLink` | `meal_tag_links` |
| `PointsLedger` | `points_ledger` |
| `RewardRedemption` | `reward_redemptions` |

Column names follow the `@map()` directive (e.g., `passwordHash` → `password_hash`, `familyId` → `family_id`).

## Supabase API Key Management

### Keys Are Masked in API Responses

The Management API endpoint `GET /v1/projects/{ref}/api-keys` returns **truncated** API keys as a security measure:

```json
{
  "name": "service_role",
  "api_key": "eyJhbG...PoXo",
  ...
}
```

The `...` is the terminal/shell truncating the output, not a literal substring. The actual full key has these lengths:

| Key Type | Length (chars) |
|---|---|
| `service_role` (legacy) | 219 |
| `anon` (legacy) | 208 |
| `secret` / `publishable` (new) | ~41-46 |

### How to Get the Full Key

1. **Supabase Dashboard** → Settings → API → Project API keys (shows full keys)
2. **Project creation output** — full keys are shown once during creation
3. **Supabase CLI** — `supabase secrets list --project-ref <ref>` shows hashes, not values

### Recovering from a Truncated Key on Vercel

If you accidentally set a truncated key (e.g., only the first ~30 chars):

```typescript
// Add this temporary endpoint to check key length
app.get('/api/debug-env', (_: any, res: any) => {
  const key = process.env.SUPABASE_SERVICE_KEY || '';
  res.json({ key_len: key.length, valid: key.length > 100 });
});
```

A valid key should be 219 chars. If it's ~30-40, you have the truncated version.

**Fix:**
1. Get the full 219-char key from the Supabase Dashboard
2. Delete the old Vercel env var: `DELETE /v9/projects/{id}/env/{env_id}`
3. Create a new one: `POST /v10/projects/{id}/env` with the full key
4. Deploy with `--force` to trigger a fresh build

## Database Password Recovery Steps

When database password is lost AND env vars are already set on Vercel as "sensitive":

1. Reset password via Supabase API (PATCH endpoint)
2. Create new Vercel env var: `POST /v10/projects/{id}/env` with `type: "plain"`
   - Use `type: "plain"` for debugging, switch to `"sensitive"` later
   - Sensitive vars CANNOT be read back via API (`decrypted: false`)
3. Deploy with `--force` to trigger fresh build with new env values
