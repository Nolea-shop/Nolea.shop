---
name: ai-content-tiktok
description: "AI_CONTENT TikTok Account Management — AI-Themen Content, Automatisierung, Trend-Scraping"
version: 1.1.0
author: Damia
metadata:
  hermes:
    tags: [tiktok, ai-content, social-media, automation, content-creation]
---

# AI_CONTENT — TikTok Automatisierung

## Überblick
AI_CONTENT ist ein TikTok Account für AI-Themen. Automatisierte Content-Erstellung und Posting.

## Workflows

### 1. Content-Recherche
- Aktuelle AI-Trends scannen via DuckDuckGo Search
- Papers, News, Releases identifizieren
- Viral-Potential bewerten

#### 1a. Such-Tooling (Technik)
```
pip install ddgs --break-system-packages
python3 -c "
from ddgs import DDGS
ddgs = DDGS()
results = ddgs.text('query', max_results=10)
"
```
Nutzt das `ddgs` Python-Paket für DuckDuckGo-Suchen. Das ist zuverlässiger als die Browser-Tools für Textrecherche.

#### 1b. Query-Strategie (Mehrstufig)

**Stufe 1 — Breiter Überblick:**
`'AI news today [date] new models releases papers'`
Erste 10–15 Ergebnisse scannen, um die Lage zu verstehen.

**Stufe 2 — Kategorie-spezifisch (parallel):**
- `model_releases`: `'new AI model release [date] GPT Claude Gemini'`
- `ai_papers`: `'AI papers today [date] arxiv trending'`
- `ai_trends`: `'AI breakthrough [month] [year] agents open source'`

**Stufe 3 — Tiefenbohrung auf spezifische Quellen:**
- `site:aitoolsrecap.com` — Tägliches AI-News-Digest
- `site:llm-stats.com/llm-updates` — Echtzeit-Model-Releases
- `site:whatllm.org` — Monatliche Deep-Dive-Analysen
- `site:theverge.com OR site:techcrunch.com OR site:reuters.com` — Breaking News
- Per curl die verlinkten Detailseiten fetchen und parsen

**Stufe 4 — Zeitkontext einholen:**
- `'AI news [month] [year]: In-Depth and Concise'` — Monatsrückblick
- `'New AI Models [month] [year]'` — Monatsübersicht der Releases

#### 1c. Quellen-Rangfolge (Vertrauenswürdigkeit)
1. `aitoolsrecap.com` — Tägliches vollständiges Digest (hat Tag-für-Tag Mai 2026)
2. `llm-stats.com/llm-updates` — Stündlich aktualisierte Release-Timeline + API-Änderungen
3. `whatllm.org` — Detaillierte monatliche Analysen mit Kontext (Autor: Dylan Bristot)
4. `theverge.com / techcrunch.com / reuters.com` — Breaking Enterprise News
5. `arxiv.org/list/cs.AI/current` — Aktuelle Papers
6. `huggingface.co/papers/trending` — Community-Trends

#### 1d. Output-Struktur für TikTok-News
- 3–5 Bullet Points auf Deutsch
- Fokus: neue Modelle, Releases, Papers, Trends
- Pro Bullet: Emoji + Titel + Kernaussage (1–3 Sätze)
- Abschluss-Fazit (1 Satz, was die Woche definiert)

### 2. Content-Erstellung
- Script schreiben (deutsch, kurz, prägnant)
- Voice-Over generieren (TTS)
- Video-Assets erstellen / zusammenschneiden
- Untertitel einbrennen

### 3. Posting & Monitoring
- TikTok Upload (via Browser oder API)
- Hashtag-Optimierung
- Engagement tracken
- Best-Performer analysieren

## Content-Formate
- **News**: "ChatGPT hat gerade X veröffentlicht..."
- **Tutorial**: "So nutzt du Y in 30 Sekunden"
- **Vergleich**: "X vs Y — Was ist besser?"
- **Meinung**: "Warum Z der nächste große Trend ist"

## Pitfalls
- TikTok bevorzugt native Uploads (keine Wasserzeichen)
- 9:16 Format, max 3 Minuten
- Erste 3 Sekunden entscheiden über Retention
- Deutsche Untertitel sind Pflicht
- Trends ändern sich wöchentlich — regelmäßig neu recherchieren