# arena.ai — API Reference

## Platform Overview

arena.ai (formerly LM-SYS Chatbot Arena) is a web platform for benchmarking and directly chatting with LLMs. Uses **Supabase** for authentication and **Next.js API routes** for backend.

## Auth System

| Item | Value |
|------|-------|
| Auth provider | Google OAuth via Supabase |
| Supabase project ref | `hugzb6oeqxcrZdvktvbdp` |
| Auth cookie name | `sb-hugzb6oeqxcrZdvktvbdp-auth-token` (HTTP-only) |
| Arena custom cookies | `arena-auth-prod-v1.0`, `arena-auth-prod-v1.1` |
| localStorage key | `sb-hugzb6oeqxcrZdvktvbdp-auth-token` |
| API path prefix | `/nextjs-api/` |

### Cookie Setup for Playwright

```python
# Set cookies BEFORE navigation
context.add_cookies([
    {"name": "arena-auth-prod-v1.0", "value": "...", "domain": "arena.ai", "path": "/"},
    {"name": "arena-auth-prod-v1.1", "value": "...", "domain": "arena.ai", "path": "/"},
])
```

Also inject localStorage before hitting `/api/*` endpoints:
```python
page.evaluate(f'localStorage.setItem("sb-hugzb6oeqxcrZdvktvbdp-auth-token", JSON.stringify({auth_data}))')
```

## API Endpoints

### User/Session

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/me` | GET | Check auth status — returns user object or `{"message":"User not found"}` |
| `/api/me/verify-login-recaptcha-v2` | POST | Verify reCAPTCHA v2 on login |

### Evaluation/Chat

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/nextjs-api/stream/create-evaluation` | POST | Create a chat/evaluation session |
| `/nextjs-api/stream/post-to-evaluation/{sessionId}` | POST | Send message to session (streaming) |
| `/nextjs-api/stream/stop/{sessionId}` | POST | Stop generation |
| `/nextjs-api/stream/rerun/{sessionId}` | POST | Rerun last message |
| `/nextjs-api/stream/resample/{sessionId}` | POST | Resample |
| `/nextjs-api/stream/resume-video-workflow/{sessionId}` | POST | Resume video workflow |
| `/nextjs-api/stream/skip-direct-battle/{sessionId}` | POST | Skip direct battle |
| `/nextjs-api/stream/retry-evaluation-session-message/{sessionId}` | POST | Retry message |
| `/nextjs-api/auto-modality` | GET | Auto-detect modality |
| `/nextjs-api/factuality/verify` | POST | Verify factuality |

### Proxy

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/nextjs-api/proxy/media?url=` | GET | Proxy media/images |

### Create Evaluation Payload

```json
{
  "modality": "image",
  "mode": "direct",
  "modelIds": ["gpt-image-2-medium"]
}
```

Modes: `direct`, `battle`, `side_by_side`, `direct_battle`
Modalities: `image`, `text`, `video`, `code`

### Post Message Payload

```json
{
  "message": "a sunset over mountains, digital art",
  "modelIds": ["gpt-image-2-medium"],
  "mode": "direct",
  "modality": "image"
}
```

## Models Available (Image)

| Model ID | Display Name |
|----------|-------------|
| `gpt-image-2-medium` | GPT Image 2 (medium) |
| `gpt-image-1-high-fidelity` | GPT Image 1 High Fidelity |
| `gpt-image-1.5-high-fidelity` | GPT Image 1.5 High Fidelity |
| `gpt-image-1-mini` | GPT Image 1 Mini |
| `gpt-image-1` | GPT Image 1 |
| `gpt-image-latest-high-fidelity (20251216)` | GPT Image Latest High Fidelity |

## Streaming Response

The chat endpoint returns a SSE (Server-Sent Events) stream with chunks:

- `onSourceChunk`: source citations
- `onImageChunk`: image generation results — `{url: string, mimeType: string}`

Images are proxied through `/nextjs-api/proxy/media?url=<signed-url>`.

## Known Issues

- **reCAPTCHA v2** triggers on every new headless browser session. Requires `cf_clearance` cookie from a real browser session to bypass.
- **"User not found"** on `/api/me` means the auth session isn't valid — check that both arena-auth cookies are set AND the Supabase localStorage is populated.
- **CSP blocks** external connections to `help.arena.ai`, `clerk.arena.ai` — the policy is `report-only` so they log violations but don't fail.
- **Auth tokens expire** after 3600 seconds (1 hour). Use the `refresh_token` to get a new `access_token` via Supabase.
