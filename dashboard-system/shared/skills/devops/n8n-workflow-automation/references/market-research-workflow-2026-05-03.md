# Market-Research-to-Product Workflow (2026-05-03)

## Workflow ID
`uzKjEgkIaOTmTIJw` — n8n local at `http://localhost:5678`

## Current Architecture (CORRECTED — no comments nodes)

| Phase | Node(s) | Type | Purpose | Status |
|-------|---------|------|---------|--------|
| **1** | 1 | Schedule Trigger | Daily 08:00 Europe/Berlin, cron `0 8 * * *` | DONE |
| **1** | 2 | HTTP Request (RSS) | Reddit `/search.rss?q=<keyword>&sort=new&limit=10&type=link` — Atom XML | DONE |
| **1** | 3 | Code (JS) | Parse Atom XML → **aggregate ALL posts into ONE `aggregated_posts` string** | DONE |
| **2** | 4 | HTTP Request (AI) | Minimax `minimax-m2.7` analyzes `aggregated_posts` — single API call | CONFIGURING |
| **2** | 5 | Code (JS) | Extract product concept from AI JSON response | PENDING |
| **3** | 6-9 | Canvas API PDF | Generate PDF Infoprodukt (Canvas API only) | PENDING |
| **4** | 10-11 | HTTP Request | Vercel Blob upload + metadata JSON | PENDING |
| **5** | 12 | AI Node (minimax) | Generate marketing captions | PENDING |
| **5** | 13-15 | HTTP Request x3 | Pollinations.ai: `GET https://image.pollinations.ai/prompt/{url_encoded_prompt}` | PENDING |
| **5** | 16 | Code (JS) | Collect 3 image URLs into array | PENDING |
| **6** | 17 | HTTP Request | Reddit post with product link | PENDING |
| **7** | 18 | Telegram | Summary notification (chat 8560792980, bot Nsksowiwjwkwm_bot) | PENDING |

## Key Corrections from Live Session

### Node 3 MUST Return Exactly 1 Item (Critical)
Node 3 aggregates all Reddit posts into a single `aggregated_posts` string and returns:
```javascript
return [{ json: { post_count: 10, aggregated_posts: postsText } }];
```
- **NOT** 10 separate items (that would cause a 10x loop in Node 4)
- **NOT** individual post objects with separate fields
- The entire aggregated text goes into `$json.aggregated_posts` for Node 4

### Node 4 Single-Call Pattern (No Loop)
Node 4 receives exactly 1 item with the full aggregated text. Request body:
```json
{
  "model": "minimax-m2.7",
  "messages": [
    {"role": "system", "content": "Analysiere diese Reddit-Posts. Finde das dringendste ungelöste Problem zum Thema 'glutenfrei'. Erstelle daraus ein kurzes Konzept für ein Info-Produkt (PDF), das exakt dieses Problem löst."},
    {"role": "user", "content": "Hier sind die Reddit-Posts:\n" + $json.aggregated_posts}
  ],
  "max_tokens": 800,
  "temperature": 0.7
}
```
- Uses `$json.aggregated_posts` (single field), NOT `$input.all().map()`
- Model: `minimax-m2.7` (NOT `minimax-t2a-turbo-2m` which is TTS)
- Auth: `Bearer MINIMAX_API_KEY` in Authorization header

### Comments Nodes Removed (2026-05-03)
Nodes 4 and 5 (Reddit Comments API via `/comments/{id}.json`) were removed due to:
- Reddit blocks Docker/cloud provider IPs → comments return empty
- Rate-limit risk from fetching hundreds of comments via RSS
- AI analysis now works directly on post titles + selftext from RSS

### Reddit RSS `type=link` Required
URL must include `type=link` parameter to get posts (`t3_` IDs) instead of subreddit intros (`t5_` IDs):
```
https://www.reddit.com/search.rss?q=glutenfrei&sort=new&limit=10&type=link
```
The RSS returns **Atom XML** (not RSS 2.0) — entries use `<entry>` tags.

## PDF: Canvas API Only
User explicitly requires Canvas API — no pdfshift.io, htmltopdf, pdfmake, or other external services. Implementation details TBD in Phase 3.

## Verified Working Node Configurations

### Node 3 Code (JavaScript) — RSS Atom Parser + Aggregator
```javascript
const xml = $input.first().json.data;
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

const posts = [];
for (const match of entries) {
  const entry = match[1];
  const get = (tag) => {
    const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
    return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
  };
  const rawId = get('id');
  if (!rawId.startsWith('t3_')) continue;
  const title = get('title');
  const content = get('content') || get('summary') || '';
  posts.push({ title, content, id: rawId });
}

const postsText = posts.map(p => `Title: ${p.title}\nContent: ${p.content}`).join('\n\n');
return [{ json: { post_count: posts.length, aggregated_posts: postsText } }];
```
Output: **exactly 1 item** with `post_count: 10` and `aggregated_posts: "Title: ...\n\nTitle: ...\n\n..."`
- Replace dynamically via workflow variables in production
