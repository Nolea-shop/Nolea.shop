# OpenRouter & Nous Research Usage APIs

## OpenRouter

### Usage Endpoint

**`GET https://openrouter.ai/api/v1/auth/key`**

Headers:
```
Authorization: Bearer sk-or-v1-...
```

Response (relevant fields):
```json
{
  "data": {
    "usage": 13.262166866,
    "usage_daily": 2.014384811,
    "usage_weekly": 4.369726959,
    "usage_monthly": 11.829070201,
    "limit": 2,
    "limit_remaining": 0,
    "limit_reset": "daily",
    "label": "sk-or-v1-da6...6ea"
  }
}
```

All values are in **USD**. `limit_remaining: 0` means the daily $2 budget is exhausted.

### Accessing from the dashboard server

The server reads API keys from `~/.hermes/auth.json`:

```python
AUTH_FILE = Path.home() / ".hermes" / "auth.json"
auth = json.loads(AUTH_FILE.read_text())
keys = auth.get("credential_pool", {}).get("openrouter", [])
api_key = keys[0]["access_token"]
```

The credential pool stores all keys including the current active one. For OpenRouter, keys are stored with `"auth_type": "api_key"` and `"base_url": "https://openrouter.ai/api/v1"`.

### Key vs usage

The same API key that shows "exhausted" from OpenRouter (403, daily limit reached) still returns usage data from `/auth/key` — the usage reporting endpoint is not rate-limited the same way as inference.

---

## Nous Research

### Portal API

**`GET https://portal.nousresearch.com/api/agent-keys/<agent_key_id>`**

Headers:
```
Authorization: Bearer <oauth_access_token>
```

The OAuth access token is stored as `credential_pool.nous[].access_token` in `auth.json`.
The agent key ID is stored as `credential_pool.nous[].agent_key_id`.

### Fallback data from auth.json

If the Portal API returns 404 (Next.js SSR, no public API route), the dashboard falls back to static metadata from `auth.json`:
- `subscription_tier`: from the token claims (`"subscription_tier": 5`)
- `rate_limit_tpm`: from the token claims (`"rate_limit_tpm": 500000`)
- `agent_key_expires_at`: from the agent key info

### Agent Key (for inference)

```
sk-nous-JpP4jnRzNrCXxH7zMGOqxUyiHbDOLOHv
Inference base URL: https://inference-api.nousresearch.com/v1
```

## Data in the dashboard

The dashboard shows:
- **OpenRouter**: Total/Daily/Weekly/Monthly usage in USD, daily limit, remaining budget
- **Nous**: Subscription tier, rate limit, key expiry date

**DO NOT** show fake/placeholder token counts (prompt/completion). The user explicitly rejected this: "die token usage infos sind nicht korrekt — ich will alle infos von nous research und openrouter eingebaut haben"