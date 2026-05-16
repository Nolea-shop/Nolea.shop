# Arena.ai API Integration (Working Approach)

*Addendum to n8n-workflow-automation skill - confirmed working May 2026*

## The Good News

Arena.ai's direct API DOES work. The endpoint `POST /nextjs-api/stream/create-evaluation` accepts a JWT token and returns images in ~10-15 seconds (vs ~90s for browser automation).

## Architecture: API Bridge Pattern

```
n8n (Docker) 
   └─ POST http://host.docker.internal:18765/generate
       └─ arena_bridge_api.py (Windows/Flask)
           └─ arena.ai API (JWT auth)
               └─ GPT-Image-2 → PNG Binary
                   └─ Telegram sendPhoto
```

## API Bridge Server

Key insight: Return PNG binary directly, not base64. This simplifies n8n workflow dramatically.

```python
@app.route("/generate", methods=["POST"])
def generate():
    result = generate_image(prompt)
    if result.get("status") != "ok":
        return jsonify(result), 500
    
    import base64
    img_binary = base64.b64decode(result["image_base64"])
    return Response(img_binary, mimetype="image/png")
```

## HTTP Request Node Config

```json
{
  "method": "POST",
  "url": "http://host.docker.internal:18765/generate",
  "sendBody": true,
  "bodyParameters": {"parameters": [{"name": "prompt", "value": "={{ $json.prompt }}"}]},
  "response": {"responseFormat": "file", "outputFileName": "arena_image.png"}
}
```

## Token Management

Token (JWT) expires every ~1 hour. Refresh workflow:

1. `python get_fresh_cookie.py` (extracts from browser profile)
2. `python decode_v10_cookie.py` (paste cookie, saves to `fresh_token.json`)
3. Bridge server auto-reads this file

## Why API Over Browser

| Metric      | Browser Automation | API Bridge |
|-------------|-------------------|------------|
| Speed       | ~90s/image        | ~15s/image |
| Reliability | Headless detection issues | Consistent |
| Complexity  | Playwright + profile | HTTP calls |

## Debugging 401 Errors

- Token expired → re-run token extraction
- Wrong JWT format → use `access_token` field from decoded cookie
- Base64 decode fails → cookie padding issue with 3173-char strings

## Files Created

- `arena_bridge_api.py` - Flask bridge returning PNG binary
- `arena_api.py` - Standalone client  
- `get_fresh_cookie.py` - Cookie extraction via Playwright
- `decode_v10_cookie.py` - JWT extraction utility
- `arena_api_auto.py` - Auto-refresh wrapper