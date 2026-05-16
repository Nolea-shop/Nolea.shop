# arena.ai Investigation (2025-05-15)

## Target
Use GPT Image 2 (medium) from arena.ai programmatically, for free.

## Findings

### API Endpoints (internal, Next.js)
Discovered by grepping JS chunks at `_next/static/chunks/13376-eabc1e97d4687e03.js`:

```
POST /nextjs-api/stream/create-evaluation     — create new chat session
POST /nextjs-api/stream/post-to-evaluation/{id} — send message to session
POST /nextjs-api/stream/stop/{id}             — stop generation
POST /nextjs-api/stream/rerun/{id}            — rerun
POST /nextjs-api/stream/resample/{id}         — resample
POST /nextjs-api/proxy/media?url=             — proxy media/images
```

### Authentication Required
- `GET /api/me` returns `{"message":"User not found"}` for guest/provisional users
- The API needs a real user session (registered account)
- Internal API calls require: session cookies + CSRF tokens + reCAPTCHA tokens

### Page Structure
URL: `https://arena.ai/image/direct`
- Route pattern: `/[modality]/[mode]` — e.g., `image/direct`, `text/battle`
- Next.js app (client-rendered)
- Model IDs found in page: `gpt-image-2-medium`, `gpt-image-1`, `gpt-image-1.5-high-fidelity`, etc.

### Roadblocks Encountered

| Layer | Status | Solution |
|---|---|---|
| Cloudflare | ✅ Playwright bypasses it | `cf_clearance` cookie obtained automatically |
| reCAPTCHA v2 | ❌ Cannot automate | Requires human to solve once, then save session |
| Login | ❌ Required for API access | User registers/logs in once, exports cookies |

### Working Automation Path
1. User manually registers + logs into arena.ai in their browser
2. Exports `document.cookie` from browser console
3. Cookies are saved into Playwright `storage_state` format
4. Playwright reuses the session for all subsequent API calls
5. Internal API calls work with valid session cookies

### Models Available (extracted from page)
```
gpt-image-1-high-fidelity
gpt-image-1-mini
gpt-image-1.5-high-fidelity
gpt-image-1
gpt-image-2 (medium)
gpt-image-2-medium
gpt-image-latest-high-fidelity (20251216)
gpt-image-latest-high-fidelity-20251216
```
