---
name: mcp-server-integration
description: Integration externer MCP-Server in Hermes Agent — Installation, Konfiguration, Authentifizierung und Troubleshooting
triggers:
  - "install mcp server"
  - "configure mcp"
  - "mcp server setup"
  - "hermes mcp"
  - "add mcp server"
  - "mcp integration"
  - "notebooklm mcp"
  - "mcp authentication"
  - "mcp cookies"
  - "mcp http transport"
---

# MCP-Server-Integration in Hermes Agent

Dieser Skill beschreibt, wie externe MCP-Server (Model Context Protocol) in Hermes Agent integriert werden, mit Fokus auf NotebookLM als Beispiel.

## Übersicht

Hermes Agent kann externe MCP-Server laden, um zusätzliche Tools bereitzustellen. Die Integration erfolgt über die zentrale Konfigurationsdatei `~/.hermes/config.yaml`.

## Installations-Workflow

### Schritt 1: MCP-Server installieren

```bash
# Beispiel: NotebookLM MCP-Server
git clone <repository-url>
cd <repository>
uv tool install .
```

**Hinweis:** Das Kommando `uv tool install .` installiert das Paket systemweit unter `~/.local/bin/`.

### Schritt 2: MCP-Server in Hermes-Konfiguration eintragen

Öffne `~/.hermes/config.yaml` und füge einen `mcp_servers`-Abschnitt hinzu:

```yaml
mcp_servers:
  <server-name>:
    command: "/full/path/to/executable"
    args: ["--optional", "arg"]
```

**Position in der Datei:** Der Abschnitt kann nach `providers:` oder an einer anderen Stelle eingefügt werden. YAML-Attribute sind positionsunabhängig.

**Pfad-Auflösung:** Verwende den absoluten Pfad zum Binary (z.B. `/home/damia/.local/bin/notebooklm-mcp`). Falls Hermes den Befehl nicht findet, prüfe mit `which <executable>` den genauen Pfad.

### Schritt 3: Transport-Protokoll wählen

MCP-Server unterstützen verschiedene Transport-Protokolle:

| Transport | Verwendung | Standard |
|-----------|------------|----------|
| `stdio` (Standard) | Lokale Prozesse, direkt | ✓ |
| `http` | HTTP/SSE Server auf localhost | – |
| `sse` | Server-Sent Events | – |

**HTTP-Transport starten:**
```bash
notebooklm-mcp --transport http --port 8000
```

In `config.yaml`:
```yaml
mcp_servers:
  notebooklm:
    command: "/home/damia/.local/bin/notebooklm-mcp"
    args: ["--transport", "http", "--port", "8000"]
```

### Schritt 4: Hermes neu starten

Nach Konfigurationsänderungen muss Hermes neu gestartet werden, damit die MCP-Server geladen werden.

**Verification:**
- Startmeldung zeigt geladene MCP-Server an
- Tools sind in der Werkzeugliste verfügbar
- `hermes tools` listet integrierte Tools auf

## Authentifizierung bei Google-Diensten (NotebookLM)

### Problem

NotebookLM erfordert Google-Authentifizierung. Die Cookies müssen dem MCP-Server zur Verfügung gestellt werden.

### Lösung A: Umgebungsvariable (einfachster Weg)

```bash
export NOTEBOOKLM_COOKIES="COOKIE_STRING_HIER"
```

**Cookie-Extraktion aus Chrome:**

1. Öffne `https://notebooklm.google.com/` (eingeloggt)
2. Drücke **F12** → Tab **"Network"**
3. Drücke **F5** (Seite neu laden)
4. Suche nach einem Eintrag mit **`batchexecute`** im Namen
5. Klicke darauf → Tab **"Headers"**
6. Scrolle zu **"Cookie:"** (unter "Request Headers")
7. **Rechtsklick** auf den Cookie-Wert → **Copy → Copy value**
8. Füge den String in den `export`-Befehl ein

**Wichtig:** Der Cookie-String ist lang. Verwende den **"Copy value"**-Kontextmenü-Eintrag, nicht einfaches Kopieren, um Abschneiden zu vermeiden.

### Lösung B: Interaktiver Login (zeitintensiv)

```bash
nlm login --profile default
```

Dies öffnet einen Chromium-Browser. Logge dich ein und schließe das Fenster, sobald du eingeloggt bist.

**Timeout-Vermeidung:** Setze das Terminal-Kommando mit `--timeout 300` (5 Minuten), falls die langsame Seite lädt.

### Lösung C: Chrome DevTools Protocol (HTTP-Modus)

Wenn der MCP-Server als HTTP-Server läuft, kann er sich via CDP mit einer aktiven Chrome-Instanz verbinden:

```bash
# Server starten
notebooklm-mcp --transport http --port 8000

# In einem anderen Tab mit aktiver Chrome-Instanz auf notebooklm.google.com
# Der Server extrahiert automatisch Cookies via CDP
```

**Voraussetzung:** Chrome/Chromium muss laufen und auf `notebooklm.google.com` geöffnet sein.

## Authentifizierungs-Fehlerdiagnose

| Fehlerbild | Ursache | Lösung |
|------------|---------|--------|
| `Profile 'default' not found` | Keine Auth-Datei | `nlm login` ausführen oder Cookies setzen |
| `401 Unauthorized` | Cookies abgelaufen | Frische Cookies extrahieren |
| `net::ERR_BLOCKED_BY_CLIENT` im Browser-Konsole | AdBlock/Privacy-Extension | Temporär deaktivieren für `notebooklm.google.com` |
| Server startet, aber keine Tools erscheinen | Hermes nicht neu gestartet | Hermes vollständig neustarten |

## Häufige Fallstricke

### Fallstrick 1: `notebooklm-mcp-auth` existiert nicht

**Symptom:** Der Befehl `notebooklm-mcp-auth` wird nicht gefunden.

**Ursache:** Der `notebooklm-mcp`-Server hat keinen separaten Auth-Befehl mehr (ab Version 0.6.9).

**Lösung:** authentication erfolgt entweder über Umgebungsvariablen (`NOTEBOOKLM_COOKIES`) oder `nlm login`.

### Fallstrick 2: Cookie-String wird abgeschnitten

**Symptom:** `nlm notebook list` gibt `Profile 'default' not found` zurück, obwohl `export NOTEBOOKLM_COOKIES="..."` gesetzt wurde.

**Ursache:** Der Cookie-String wurde beim Kopieren abgeschnitten (zu lang für einfaches Kopieren).

**Lösung:** Im Chrome Network-Tab **rechtsklick → Copy value** verwenden, nicht einfaches Markieren+Kopieren.

### Fallstrick 3: Hermes findet Binary nicht

**Symptom:** Hermes wirft "command not found" für den MCP-Server.

**Ursache:** Pfad in `config.yaml` ist relativ oder falsch.

**Lösung:** Absoluten Pfad angeben. Pfad herausfinden mit:
```bash
which notebooklm-mcp
# oder
ls ~/.local/bin/notebooklm-mcp
```

### Fallstrick 4: MCP-Server wird nicht geladen

**Symptom:** Nach Konfigurationsänderung erscheinen keine neuen Tools.

**Ursache:** Hermes lädt `config.yaml` nur beim Start.

**Lösung:** Hermes vollständig beenden und neu starten (nicht nur `Ctrl+C` im selben Terminal, sondern neuen Prozess starten).

## MCP-Tools-Übersicht (NotebookLM)

Der NotebookLM MCP-Server stellt 43 Tools bereit, darunter:

- `notebook_list` — Alle Notebooks auflisten
- `notebook_create` — Neues Notebook erstellen
- `notebook_query` — Fragen an ein Notebook stellen
- `source_add` — Quellen hinzufügen (URL, Text, Drive, Datei)
- `studio_create` — Artefakte generieren (Audio, Video, Slides, etc.)
- `research_start` — Web-/Drive-Recherche starten

**Vollständige Liste:** Siehe `nlm --help` oder Server-Start-Logs.

## Troubleshooting

### Server-Logs prüfen

```bash
# Für HTTP-Server
tail -f /tmp/notebooklm-mcp.log

# Mit Debug-Flags
notebooklm-mcp --debug
```

### Auth-Datei manuell löschen (Refresh)

```bash
rm -rf ~/.notebooklm-mcp-cli/profiles/default/
nlm login
```

### Config validation

```bash
# YAML-Syntax prüfen
python -c "import yaml; yaml.safe_load(open('/home/damia/.hermes/config.yaml'))"
```

## Verweise

- NotebookLM MCP Repository: https://github.com/jacob-bd/notebooklm-mcp
- Hermes Agent MCP-Dokumentation: https://hermes-agent.nousresearch.com/docs
- MCP-Spezifikation: https://spec.modelcontextprotocol.io
