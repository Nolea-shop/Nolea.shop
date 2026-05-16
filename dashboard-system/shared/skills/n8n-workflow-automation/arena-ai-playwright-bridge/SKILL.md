---
name: arena-ai-playwright-bridge
description: Playwright-basierter Bridge-Server für arena.ai — hält eine dauerhafte Browser-Session und generiert Bilder per UI-Automation. Umgeht sämtliche API-Auth-Probleme (anonyme Accounts, Token-Expiry).
triggers:
  - "arena.ai generate"
  - "arena bridge"
  - "arena playwright"
  - "arena macro"
  - "arena bild generieren"
  - "gpt-image-2 automation"
---

# Arena.ai Playwright Bridge Server

**Status: Recommended approach (2026-05-15+)**. Arena.ai's API auth ist unzuverlässig (anonyme Accounts, Supabase DNS tot). Die Playwright-Bridge ist der einzig verlässliche Weg.

## Konzept

Ein Flask-Server auf **Windows** (nicht WSL) hält eine dauerhafte Playwright-Browser-Session. Der Browser öffnet sich einmal sichtbar, der User loggt sich via Google SSO ein, danach generiert der Server Bilder per UI-Automation.

```
n8n (WSL/Docker) → HTTP Request → Bridge (Windows, Port 18765)
    → Playwright (sichtbar, eingeloggt) → arena.ai → Bild-PNG zurück
```

## Deployment

**Script:** `C:\Users\Damia\.openclaw\scripts\arena_playwright_bridge.py`

**Start (Windows CMD oder PowerShell):**
```bash
python C:\Users\Damia\.openclaw\scripts\arena_playwright_bridge.py
```

**Erster Start — Login:**
1. Chromium-Fenster öffnet sich sichtbar auf dem Desktop
2. Arena.ai lädt, der Server checkt alle 3s ob eingeloggt
3. **Manuell:** "Log In" → "Continue with Google" → Google-Konto wählen
4. Server erkennt den Login automatisch

**API-Endpoints:**

| Endpoint | Methode | Beschreibung |
|---|---|---|
| `/health` | GET | `{"status":"ok","logged_in":true/false}` |
| `/generate` | POST | JSON `{"prompt":"..."}` → PNG binary zurück |
| `/login` | POST | Triggiert Login-Check (falls nötig) |

**n8n HTTP Request Node Config:**
```json
{
  "method": "POST",
  "url": "http://host.docker.internal:18765/generate",
  "sendBody": true,
  "bodyParameters": {"parameters": [{"name": "prompt", "value": "={{ $json.prompt }}"}]},
  "options": {"response": {"responseFormat": "file", "outputFileName": "arena_image.png"}}
}
```

**Telegram Node:**
```json
{
  "operation": "sendPhoto",
  "chatId": "8560792980",
  "binaryPropertyName": "data"
}
```

## Technisches Design

Die Bridge verwendet **zwei Threads:**
1. **Playwright-Thread**: Event-Loop mit Browser + Login-Waiter (dauerhaft)
2. **Flask-Thread**: HTTP-Server, ruft bei `/generate` die async `_generate()` auf

```python
# Playwright in background thread
t = threading.Thread(target=start_bg_loop, daemon=True)

# Flask in main thread
app.run(host='0.0.0.0', port=18765)
```

### UI-Automation Flow

```python
async def _generate(prompt):
    await pg.goto('https://arena.ai/image/direct')
    await pg.wait_for_timeout(2000)
    
    # Prompt eintippen
    ta = pg.locator('textarea')
    await ta.fill(prompt)
    
    # Absenden (Enter)
    await pg.keyboard.press('Enter')
    
    # Auf Bild warten (bis 3 Min)
    for i in range(180):
        await asyncio.sleep(1)
        # img src mit Bild-URL finden
        src = await pg.locator('img').nth(idx).get_attribute('src')
        if src and src.startswith('http') and 'blob:' not in src:
            image_url = src
            break
    
    # Bild runterladen + zurückgeben
    async with aiohttp.ClientSession() as sess:
        async with sess.get(image_url) as resp:
            img = await resp.read()
            # C:\Users\Damia\.openclaw\media\arena_*.png
```

## Pitfalls

### ❌ Chrome nicht killen zwischen Requests
`taskkill /F /IM chrome.exe` löscht die Session-Cookies im persistenten Profil. Der User muss sich dann neu einloggen.

**Besser:** Den Bridge-Prozess laufen lassen. Nur den Flask-Server neustarten falls nötig.

### ❌ Headless wird blockiert
Arena.ai erkennt Headless-Browser und blockiert die Generierung. **Immer `headless=False`** verwenden.

### ❌ Python 3.14 Base64
Python 3.14 akzeptiert keinen Base64-Input mit Länge 1 mod 4 (selbst mit Padding). Verwende `atob()` im Browser für Cookie-Dekodierung, nicht Python's `base64.b64decode()`.

### ❌ Kein API-Token-Refresh
Der Supabase-Refresh-Endpoint (`huogzoeqzcrdvkwtvodi.supabase.co/auth/...`) ist DNS-unreachable von WSL und Windows. Nur Playwright-Neulogin funktioniert.

## Verwandte Dateien

- `C:\Users\Damia\.openclaw\scripts\arena_playwright_bridge.py` — Der Bridge-Server
- `C:\Users\Damia\.openclaw\scripts\fresh_token.json` — Extrahierter JWT (für Bridge gelesen, für API-Fallback)
- `C:\Users\Damia\.openclaw\scripts\arena_v7_fix.py` — Token-Extraktion via atob()
- `C:\Users\Damia\.openclaw\browser_profile\` — Persistenter Chromium-Ordner (Cookies!)
- Siehe `n8n-workflow-automation` Skill → `/references/arena-ai-api.md` für API-Details
- Siehe `n8n-workflow-automation` Skill → `/references/arena-ai-browser.md` für Browser-Automation
