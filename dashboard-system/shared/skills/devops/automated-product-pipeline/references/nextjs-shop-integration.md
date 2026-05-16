# Next.js Shop Integration for n8n Product Pipeline

## Architecture

Products stored as **JSON files** in `content/products/*.json`. No database required — n8n writes files directly, Next.js reads them at request time.

### Why files over database?
- n8n can write JSON files directly via filesystem or HTTP POST
- No DB connection management
- Git-versioned content (optional)
- Static generation compatible (ISR possible)

## File Structure

```
content/
  products/
    low-kal-kuchen-30.json
    30-leichte-sommerkuchen-ohne-backen.json
  purchases/
    <uuid>.json          # Stripe webhook writes these
  downloads/
    <slug>.pdf
```

## Product JSON Schema

```json
{
  "slug": "low-kal-kuchen-30",
  "title": "30 Kuchen unter 200 Kalorien",
  "subtitle": "Genuss ohne Reue",
  "price": 7.99,
  "stripe_payment_link": "https://buy.stripe.com/test_...",
  "category": "backen",
  "tags": ["kuchen", "diet", "gesund"],
  "description": "...",
  "features": ["..."],
  "faq": [{"q": "...", "a": "..."}],
  "images": [],
  "status": "active",
  "content_summary": ""
}
```

## Async Product Loader

```typescript
// lib/products.ts
import { promises as fs } from "fs";
import path from "path";

export interface Product { slug: string; title: string; ... }

export async function listProducts(): Promise<Product[]> {
  const dir = path.join(process.cwd(), "content/products");
  const files = await fs.readdir(dir);
  const products = await Promise.all(
    files.filter((f) => f.endsWith(".json")).map(async (f) => {
      const raw = await fs.readFile(path.join(dir, f), "utf-8");
      return JSON.parse(raw) as Product;
    })
  );
  return products.sort((a, b) => b.price - a.price);
}
```

## n8n Intake Endpoint

```typescript
// app/api/n8n-product/route.ts
export async function POST(req: Request) {
  const auth = req.headers.get("x-n8n-secret");
  if (auth !== process.env.N8N_SECRET) return new Response("Unauthorized", {status: 401});

  const body = await req.json();
  const product = { /* validate + build */ };
  const filePath = path.join(process.cwd(), "content/products", `${body.slug}.json`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(product, null, 2));
  return Response.json({ success: true });
}
```

## Stripe Webhook + Download Token

```typescript
// app/api/stripe-webhook/route.ts
if (event.type === "checkout.session.completed") {
  const slug = session.metadata?.slug || "unknown";
  const token = crypto.randomUUID();
  await fs.writeFile(
    path.join("content/purchases", `${token}.json`),
    JSON.stringify({ token, slug, stripe_session: session.id, purchased_at: new Date().toISOString(), used: false })
  );
  // User gets redirected to /danke/<slug>?token=<token>
}
```

## Secure Download Endpoint

```typescript
// app/api/download/route.ts
const token = url.searchParams.get("token");
const record = JSON.parse(await fs.readFile(`content/purchases/${token}.json`, "utf-8"));
if (record.used || ageDays > 7) return new Response("Expired", {status: 410});
record.used = true;
await fs.writeFile(`content/purchases/${token}.json`, JSON.stringify(record));
const pdf = await fs.readFile(`content/downloads/${record.slug}.pdf`);
return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment" } });
```

## Build Config

```typescript
// next.config.ts
const nextConfig = {
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true }, // For dev speed, remove in prod
};
```

## Pitfalls
- `npm run dev` must be running for n8n HTTP Request to reach `/api/n8n-product` — n8n runs at `localhost:5678`, Next.js at `localhost:3000`
- When n8n is in WSL2 and Next.js is also in WSL2, use `http://localhost:3000` (not `host.docker.internal`)
- `.env.local` is read by Next.js dev server; `N8N_SECRET` must match the header sent by n8n
- Stripe webhook `apiVersion` must match installed `stripe` package — use `"2026-04-22.dahlia" as any` if TS complains
- Purchase records MUST be in `content/purchases/` (mkdir recursive)
- Download endpoint must mark `used: true` atomically to prevent double-download
