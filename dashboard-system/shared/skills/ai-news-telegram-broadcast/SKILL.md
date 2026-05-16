---
name: ai-news-telegram-broadcast
category: social-media
description: "Automatisiert zeitgesteuerte Content‑Auslieferung per Telegram – wahlweise aus Web‑Search (AI‑News) oder NotebookLM‑Notebooks (Prompts, Brand‑Guides, Research)."
triggers:
  - "ai news"
  - "telegram broadcast"
  - "daily summary"
  - "ai‑content"
---

# AI‑News‑Telegram‑Broadcast

## Überblick
Dieses Skill liefert eine wiederverwendbare Vorgehensweise, um kuratierte Inhalte zeitgesteuert zu beschaffen und als formatierte Nachricht an einen Telegram‑Chat zu senden.

**Zwei Content-Quellen werden unterstützt:**
- **Web‑Variante:** AI‑News (Model‑Releases, Papers, Trends) per DuckDuckGo‑Suche/RSS recherchieren, in 3‑5 Bullet‑Points fassen.
- **NotebookLM‑Variante:** Kuratierte Inhalte aus einem NotebookLM‑Notebook per MCP‑Query abrufen (z. B. Prompt‑Sammlungen, Brand‑Guides, Research‑Docs) und roh oder aufbereitet ausliefern.

Das Cron‑+‑Telegram‑Muster ist für beide gleich – nur die Content‑Beschaffung unterscheidet sich.

## Arbeitsablauf
1. **News‑Quellen ermitteln** – Verwende DuckDuckGo‑Suche (z. B. `r.jina.ai/http://llm‑stats.com/ai-news`) oder ein RSS‑Feed, um die neuesten Modell‑Ankündigungen zu erhalten.
2. **Ergebnis extrahieren** – Parsen Sie die HTML‑/Markdown‑Antwort, filtern Sie nach Modell‑Namen, Release‑Datum und Stichwörtern (`Release`, `Paper`, `Trend`).
3. **Zusammenfassung erstellen** – Formatiere maximal fünf Bullet‑Points in deutscher Sprache, halte jede Zeile kurz (max. 2 Sätze).
4. **Telegram‑Nachricht senden** – Nutze `curl` mit dem Bot‑Token und `parse_mode=MarkdownV2` (oder `HTML`), um Sonderzeichen zu escapen.
5. **Erfolg prüfen** – Prüfe die JSON‑Antwort `{"ok":true}`; bei Fehlern (z. B. ungültiger Token) im Log ausgeben.

## Beispiel‑Shell‑Snippet
```bash
#!/usr/bin/env bash
# 1. fetch AI‑News (DDG via jina.ai proxy)
NEWS=$(curl -s "https://r.jina.ai/http://llm-stats.com/ai-news" | grep -E "Grok|GPT|Claude|DeepSeek|Anthropic" | head -n 5)

# 2. build markdown message (escape "-" etc.)
MESSAGE="*AI‑News des Tages ($(date +%d.%m.%Y))*\n\n$(echo "$NEWS" | sed 's/^/- /')"

# 3. send via Telegram API
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id=${CHAT_ID} \
  -d parse_mode=MarkdownV2 \
  -d text="${MESSAGE}"
```

## Pitfalls & Tipps
- **Escaping**: In `MarkdownV2` müssen Zeichen wie `_ * [ ] ( ) ~ \\` mit einem vorangestellten Backslash escaped werden.
- **Token‑Sicherheit**: Bewahre `BOT_TOKEN` in `~/.hermes/.env` (Variable `TELEGRAM_BOT_TOKEN`).
- **Rate‑Limits**: Telegram erlaubt bis zu 30 Nachrichten pro Sekunde – batche ggf. mehrere Nachrichten.
- **Quelle ändern**: Wenn DuckDuckGo nicht erreichbar ist, ersetze Schritt 1 durch einen anderen Feed. Für NotebookLM als Quelle: nutze `mcp_notebooklm_notebook_query` mit der Notebook-ID.
- **Cron‑Job mit NotebookLM**: Der Cron‑Agent hat Zugriff auf MCP-Tools, muss aber die Notebook-ID kennen. Gib sie explizit im Prompt an (nicht nur die ID, sondern auch einen Themen‑Kontext).

## NotebookLM-Variante (Cron-Beispiel)
```yaml
# Cron‑Job für tägliche Prompt‑Lieferung via NotebookLM:
# cronjob(action='create', name='Täglicher Prompt',
#         schedule='0 9 * * *',
#         prompt='Hole einen GPT Image 2 Prompt aus NotebookLM (ID: NOTEBOOK_ID) per mcp_notebooklm_notebook_query und sende ihn per Telegram an Chat-ID CHAT_ID. Rotiere zwischen verschiedenen Prompt-Typen.',
#         enabled_toolsets=['web', 'messaging'])
```

## References
- `references/ddg-api.md` – Details zur Nutzung von DuckDuckGo über den `r.jina.ai`‑Proxy.
- `references/telegram-api.md` – Telegram‑Bot‑API‑Parameter, Escaping‑Regeln und Rate‑Limits.
- `references/pinterest-api-setup.md` – Pinterest API v5 App‑Setup, Sandbox/Production‑Pitfalls und benötigte Scopes.

---

*Dieses Skill ist für wiederholte tägliche AI‑News‑Broadcasts gedacht und kann in Cron‑Jobs (`cronjob`‑Tool) eingebunden werden.*
