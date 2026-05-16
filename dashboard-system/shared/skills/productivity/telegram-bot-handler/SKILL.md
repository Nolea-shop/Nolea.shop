---
name: telegram-bot-handler
category: productivity
description: "DEPRECATED — replaced by Hermes Gateway. Legacy Python polling script for Telegram. New setups should use the built-in Hermes Gateway (see hermes-agent skill)."
triggers:
  - "telegram communication"
  - "bot handler"
  - "bidirectional telegram"
  - "telegram polling"
  - "receive messages from phone"
  - "connect to telegram"
  - "check telegram settings"
  - "telegram bot group membership"
---

# Telegram Bot Handler (DEPRECATED)

> **⚠️ This approach is deprecated.** The old `telegram_handler.py` polling script has been replaced by the **Hermes Gateway** built-in Telegram integration.
>
> **Use instead:** Load the `hermes-agent` skill and follow the Gateway section. The gateway provides proper session management, tool access, cron scheduling, and multi-platform support.
>
> See `references/telegram-gateway-setup.md` in the `hermes-agent` skill for the current setup guide.

## Legacy Documentation (kept for reference)

The content below documents the old Python polling script approach. It is no longer the recommended way to connect Hermes to Telegram.

Ein Telegram-Polling-Handler, der bidirektionale Kommunikation zwischen Telegram (Handy) und Hermes ermöglicht.

## Verwendung

```python
python telegram_handler.py
```

Läuft als Hintergrundprozess und pollt Telegram-API auf neue Nachrichten.

## Konfiguration

Erfordert:
- Bot Token von @BotFather
- Chat-ID des Empfängers

## Befehle

- `/start`, `/help` - Zeigt verfügbare Befehle
- `/status` - System-Status
- `/arena` - Löst Arena-Bild-Generierung aus (optional erweiterbar)

## Deployment

Für produktiven Einsatz:
1. Als systemd-Service einrichten
2. Oder in screen/tmux laufen lassen
3. Für Webhook-Stattdessen: ngrok + FastAPI

## Recovery

**Signale ignorieren aber prüfen:**
- SIGHUP (1) und SIGTERM (15) können durch Terminal-Sessions kommen
- Prozess läuft weiter, aber API-Verbindung kann blockiert sein

**Wiederherstellung:**
```bash
# Prüfen ob Prozess läuft
ps aux | grep telegram_handler

# Bei blockierter API Verbindung: neu starten
pkill -f telegram_handler.py
# Note: nohup may be blocked in Hermes CLI environments
# Use terminal(background=true, command="python3 /home/damia/telegram_handler.py") instead
cd /home/damia && nohup python3 telegram_handler.py > /tmp/telegram.log 2>&1 &

# In WSL/Hermes Umgebung:
python3 telegram_handler.py  # im Hintergrund starten
```

**Erste-Hilfe Test:**
```python
import requests
resp = requests.get(f"https://api.telegram.org/bot{TOKEN}/getMe")
# 200 = OK, sonst Neustart nötig
```

**Siehe auch:** `scripts/check-telegram-health.py` für automatische Gesundheitsprüfung.

## Token Management
The active Bot Token is stored in `/home/damia/telegram_handler.py` (line 12). Memory entries or old skill references may contain outdated tokens — always verify the token in the script first.

## Active Groups
- **Ai Ngs**: Chat-ID `-1003903593634` (supergroup) - Smart GIF responses enabled

## Smart Responses & GIF Integration
The handler supports intelligent conversation flow:

**LLM-Powered Responses (default):**
- Questions (`?`) automatically trigger LLM response
- General messages get smart AI replies without requiring `/ask` command
- Name detection: "jiff" in text triggers personalized responses

**Smart GIF Selection:**
- Multiple GIF URLs per category prevent repetition
- `LAST_USED_GIFS` tracking ensures variety within chats
- Context detection for: greeting, goodbye, thanks, success, food, sleep, work, celebration, fun
- 15% random GIF chance on matching keywords for natural feel

**Bot Personality - Jiff der 55-Jährige Boomer:**
- Kurz und bündig (2-3 Sätze max)
- Mit trockenem, leicht ironischem Boomer-Humor
- Gelegentliche alte Redewendungen ("Die Decke von den Ohren haben")
- Freundlich aber nicht aufdringlich
- Antwortet wie menschliche Unterhaltung, keine Commands

Sendet automatisch passende Giphy-MP4-GIFs basierend auf Schlüsselwort-Erkennung.

## LLM Integration (Optional)

Für KI-Antworten in Telegram:

```python
# In telegram_handler.py, add /ask command support
import os
import requests

def llm_respond(message, system_prompt=""):
    headers = {"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}"}
    payload = {"model": "stepfun/step-3.5-flash", "messages": [...]}
    return requests.post("https://openrouter.ai/api/v1/chat/completions", ...).json()
```

**Model Notes:**
- `stepfun/step-3.5-flash` returns `reasoning` field instead of `content` for truncated responses
- Always check both `content` AND `reasoning` fields
- Set `OPENROUTER_API_KEY` in `.env` file

## Checking Bot Settings & Group Membership
To check bot status, settings, or group memberships:
1. Verify bot identity with `getMe` endpoint
2. Check webhook status via `getWebhookInfo`
3. List recent chats (including groups) via `getUpdates`
Note: Direct curl commands to Telegram API may be blocked; use the token from the handler script for any API calls.

## Pitfalls
- Outdated tokens in memory or skill docs may not match the active token in `telegram_handler.py`
- The bot only receives group messages if Privacy Mode is disabled (via @BotFather) unless messages are explicitly directed to the bot
- `nohup` commands may be blocked in Hermes CLI; use `terminal(background=true)` for process startup instead
- **Privacy Mode gotcha**: By default, Telegram bots only see messages where they're mentioned (@botname). Disable via @BotFather `/setprivacy` → select bot → "Turn off"
- Giphy URLs often return 404. Always test with HEAD request before adding to handler (see `references/giphy-url-validation.md`)

## Referenzen
## Referenzen
- Siehe `references/setup-notes.md` für Telegram-Bot-Einrichtung
- Siehe `references/giphy-url-validation.md` für getestete Giphy-URLs
- Siehe `references/implementation-patterns.md` für Smart Response Flow und Boomer-Persona-Pattern
- Siehe `references/llm-integration-notes.md` für StepFun API Quirks und .env Loading