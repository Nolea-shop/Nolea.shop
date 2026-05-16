---
name: web-platform-reverse-engineering
description: "Reverse-engineer web-only platforms (no public API) for agent automation — JS bundle analysis, auth cookie extraction, internal API discovery, Playwright-based session persistence."
version: 1.0.0
author: Hermes Agent
---

# Web Platform Reverse Engineering for Agent Automation

Use this when a platform has **no public API** but you need to interact with it programmatically. Covers: discovering internal API endpoints, breaking through auth walls with user session cookies, and Playwright-based automation.

## Workflow

### Phase 1: Reconnaissance

1. **Check if the platform has an API at all**
   - Look for JS bundles containing `fetch("/api/...")` or `fetch("/nextjs-api/...")` etc.
   - Extract all API routes from JS: `grep -oP '"/api/[^"]*"' bundle.js | sort -u`
   - Look for WebSocket, SSE, and streaming endpoints

2. **Identify auth mechanism**
   - Check for OAuth (Google, GitHub), Supabase, Clerk, Auth0
   - Supabase: look for `sb-<project-ref>-auth-token` in localStorage
   - Clerk: look for `__clerk_*` cookies
   - Check cookies via Playwright: `context.cookies()`

3. **Test API accessibility**
   - Direct curl to endpoints — look for 403, 401, or "User not found"
   - Check if Cloudflare blocks (reCAPTCHA challenge)
   - Try with provisional/guest cookies first

### Phase 2: Session Acquisition

When the platform requires authenticated sessions:

1. **Ask the user for session cookies** (they can copy from browser console: `copy(document.cookie)`)
2. **Set cookies in Playwright before navigation:**
   ```python
   context.add_cookies([{"name": name, "value": value, "domain": "example.com", "path": "/"}])
   ```
3. **Also try localStorage injection** (some auth systems use localStorage):
   ```python
   page.evaluate(f'localStorage.setItem("{key}", JSON.stringify({data}))')
   ```

### Phase 3: API Interaction

1. **Test with `/api/me`** (or equivalent user endpoint)
   ```python
   result = page.evaluate('async () => { const r = await fetch("/api/me"); return r.text(); }')
   ```

2. **Find the actual model/chat endpoints from JS bundles**
   ```bash
   curl -s "https://example.com/page" | grep -oP '_next/static/chunks/[^"]*\.js' | while read c; do
     curl -s "https://example.com/$c" | grep -oP '"/nextjs-api/[^"]*"' | sort -u
   done
   ```

3. **Craft the correct request payload** by analyzing the frontend code

### Phase 4: Browser Automation Fallback

If the API is too locked down (reCAPTCHA, custom auth, CSRF tokens):

1. Use Playwright with the user's session cookies
2. Interact with the UI directly (fill forms, click buttons, read responses)
3. Monitor network requests with Playwright's `page.on("response", ...)`
4. Extract generated content from the DOM or from intercepted API responses

## References

- `references/arena-ai-api.md` — arena.ai specific: endpoints, auth, model IDs, cookie names
- `references/german-classifieds.md` — scraping kleinanzeigen.de: ad block structure, price format, PLZ distance approximation

## Appendix B — Scraping JS-Heavy Classified Sites (No API)

When a site renders listings via heavy JavaScript but still includes the full HTML payload with structured `data-*` attributes, you can extract data without complex headless automation.

### Typical Pattern

1. Fetch page with `requests` + Real Browser User-Agent and `Accept-Language: de-DE` for German sites.
2. Look for `<article>` blocks with `data-adid="..."` — these are the listing containers.
3. Inside each block, extract:
   - **Title**: `class="*ellipsis*" > TITLE`
   - **Price**: look for `<p class="aditem-main--middle--price">` then strip HTML → unescape → extract `X,XX €` or `X € VB`
   - **Location/PLZ**: `(\d{5})\s+([A-Za-zÄÖÜäöüß\s]+)` captures German postcode + city
   - **Distance**: if present, `(\d+[,.]?\d*)\s*km`; if absent, approximate via PLZ region.

### Parsing Price+Rails in a Single Pass

The listings are in order within the HTML — match the arrays by their occurrence index:

```python
titles = re.findall(r'class="[^"]*ellipsis[^"]*"[^>]*>([^<]+)', html)
prices = re.findall(r'class="aditem-main--middle--price[^"]*"[^>]*>([^<]+)', html, re.DOTALL)
blocks = re.findall(r'<article[^>]+data-adid="(\d+)"[^>]*>([\s\S]*?)</article>', html)

listings = []
for i, ((ad_id, block), title_raw, price_block) in enumerate(zip(blocks, titles, prices)):
    price = re.search(r'[\d\.]+,\d+', price_block).group()  # "1.299,90"
    title = unescape(title_raw.strip())
    loc = re.search(r'(\d{5})\s+([A-Za-zÄÖÜäöüß\s]+)', block)
    city, plz = (loc.group(2).strip(), loc.group(1)) if loc else ('', '')
    listings.append({'id': ad_id, 'title': title, 'price': price, 'city': city, 'plz': plz})
```

### German Format Tips

- Prices use comma as decimal separator: `1.299,00 €` → normalize: `price.replace('.', '').replace(',', '.')`
- `VB` = *Verhandlungsbasis* – price is negotiable (still use the number for comparison).
- PLZ is always 5 digits. Many regional prefixes are contiguous and can be mapped to approximate distance from a reference city.

### Distance Approximation from PLZ

If actual km aren't embedded, build a simple prefix→distance lookup for your region (city/bounds you care about). Example for Pulheim (50259) region:

```python
def plz_distance(plz):
    p = int(plz[:3])
    if p in range(501, 506+1):   return 5    # Cologne/Pulheim
    if p in range(410, 416+1):   return 20   # Düsseldorf Umland
    if p in range(418, 420+1):   return 45   # Mönchengladbach
    if p in range(474, 479+1):   return 55   # Moers/Duisburg
    if p in range(455, 459+1):   return 35   # Sprockhövel/Ruhr
    ...
    return 999
```

This avoids geocoding calls and works well for filtering “within N km of city X”.

### Filtering for AI Hardware Use-Case

When searching for AI inference hardware:
- **Prefer unified-memory / Apple M-series**: M1/M2/M3/M4 for ML acceleration.
- **Minimum RAM**: 16GB unified memory; 8GB only okay for 7B Q4.
- **Better value**: Used M1 16GB (≈500€) is often cheaper than M2 8GB for inference-bound workloads because the memory bottleneck is more impactful than CPU speed.
- **Avoid older Intel** unless the goal is a purely experimental/minimal box – Intel Macs lack the Apple Neural Engine and have slower CPU/GPU, both limiting local model performance.

### User Response Style

This skill's typical user asked: *"such mir jetzt das beste aktuelle angebot raus"* — they want the shortlist immediately, not a long prelude. Lead with the results (table of candidates), then add a short 2–3 line recommendation paragraph. Prepend a clear 1-line best pick before any list.

## Pitfalls

- **Cloudflare + reCAPTCHA**: Headless browsers get challenged. User session cookies can bypass this if they already have `cf_clearance`.
- **HTTP-only cookies**: Can't be set via JavaScript `document.cookie`. Must be set via Playwright's `add_cookies()` before any navigation.
- **Supabase cookies**: Named `sb-<project-ref>-auth-token`. Value is the **JSON-stringified** auth data object, not just the access_token.
- **Clerk auth**: Uses `__clerk_*` cookies, often JWT-based. Need the full cookie object including `__session`.
- **Token expiry**: Most auth tokens expire in 1 hour. You'll need the refresh_token to get new ones.
- **Content Security Policy (CSP)**: Some sites block fetch to external domains. Run requests from the page context, not from curl.
