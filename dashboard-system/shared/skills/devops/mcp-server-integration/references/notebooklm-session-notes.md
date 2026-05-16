# Session-Notizen: NotebookLM MCP-Integration

## Problematik: Cookie-Extraktion für Google-Authentifizierung

### Fehler 1: `export` in Chrome Console

**Symptom:**
```
VM90:2 Uncaught SyntaxError: Unexpected token 'export'
```

**Ursache:** Der Benutzer hat den Shell-Befehl `export NOTEBOOKLM_COOKIES="..."` in die Chrome DevTools Console eingegeben. Die Console führt JavaScript aus, keine Shell-Befehle.

**Korrektur:** `export` muss im **WSL-Terminal** ausgeführt werden, nicht in Chrome. Den Cookie-String zuerst aus Chrome kopieren, dann im Terminal einfügen.

### Fehler 2: `notebooklm-mcp-auth` Kommando nicht gefunden

**Symptom:**
```
/home/damia/.local/bin/notebooklm-mcp-auth: command not found
```

**Ursache:** Der `notebooklm-mcp-auth`-Befehl existiert nicht im aktuellen Paket (v0.6.9). Die Dokumentation war veraltet oder bezog sich auf eine ältere Version.

**Lösung:** Stattdessen verwenden:
```bash
nlm login                    # interaktiver Browser-Login
# oder
export NOTEBOOKLM_COOKIES="..."  # manuelle Cookie-Zuweisung
```

### Fehler 3: `Profile 'default' not found`

**Symptom:**
```
Error: Profile 'default' not found. Run 'nlm login' first.
```

**Ursachen:**
- Keine Auth-Datei in `~/.notebooklm-mcp-cli/profiles/default/auth.json`
- Umgebungsvariable `NOTEBOOKLM_COOKIES` nicht gesetzt
- Cookies abgelaufen oder unvollständig

**Diagnose:**
```bash
ls ~/.notebooklm-mcp-cli/profiles/default/auth.json
echo $NOTEBOOKLM_COOKIES
```

### Fehler 4: `net::ERR_BLOCKED_BY_CLIENT` in Network-Tab

**Symptom:** Chrome DevTools zeigt `net::ERR_BLOCKED_BY_CLIENT` für `https://play.google.com/log?...`

**Ursache:** AdBlock-/Privacy-Erweiterung blockiert Google-Logs (normales Verhalten, kein Problem für NotebookLM-Funktionalität).

**Relevanz:** Dieser Fehler ist **harmlos** und beeinträchtigt die Cookie-Extraktion nicht. Einfach ignorieren.

## Cookie-Extraktions-Prozedur (bewährte Methode)

**Schritt 1 — Network-Tab öffnen:**
1. `https://notebooklm.google.com/` öffnen (bereits eingeloggt)
2. F12 → Tab **"Network"**
3. F5 zum Reload

**Schritt 2 — batchexecute-Anfrage finden:**
- Suche nach Eintrag mit `batchexecute` im Namen
- Erster oder zweiter Eintrag in der Liste

**Schritt 3 — Cookie kopieren:**
- Klicke den `batchexecute`-Eintrag an
- Rechts → **"Headers"** Tab
- Scrolle zu **"Cookie:"** (Request Headers Sektion)
- **Rechtsklick** auf den Cookie-Wert → **Copy → Copy value**

**Schritt 4 — In WSL-Terminal setzen:**
```bash
export NOTEBOOKLM_COOKIES="COOKIE_STRING_HIER_EINFUEGEN"
# Testen:
nlm notebook list --json
```

**Wichtig:** Der Cookie-String kann über 1000 Zeichen lang sein. Verwende **immer** den Kontextmenü-Eintrag "Copy value", nie einfaches Markieren + Strg+C (schneidet oft ab).

## WSL-spezifische Hinweise

- Binary-Pfad: `/home/damia/.local/bin/notebooklm-mcp` (nicht unter `/mnt/...` wegen Linux-Permissions)
- Config-Datei: `~/.hermes/config.yaml`
- Auth-Profile: `~/.notebooklm-mcp-cli/profiles/`

## Hermes MCP-Server-Konfiguration (final)

```yaml
mcp_servers:
  notebooklm:
    command: "/home/damia/.local/bin/notebooklm-mcp"
    args: []
```

Nach Änderung: **Hermes vollständig neustarten**.

## Verifikation

```bash
# 1. Prüfen, ob Binary existsiert und ausführbar ist
ls -l ~/.local/bin/notebooklm-mcp

# 2. Cookie gesetzt?
echo ${NOTEBOOKLM_COOKIES:0:50}...  # ersten 50 Zeichen anzeigen

# 3. nlm CLI direkt testen (ohne MCP/HTTP)
nlm notebook list --json

# 4. Wenn Schritt 3 funktioniert, MCP-Server starten und Hermes neustarten
```

## Nächste Schritte nach erfolgreicher Auth

Sobald `nlm notebook list --json` Notebooks auflistet:

1. MCP-Server als HTTP im Hintergrund starten:
```bash
nohup notebooklm-mcp --transport http --port 8000 > /tmp/nlm.log 2>&1 &
```

2. Hermes neustarten

3. In Hermes-Chat:
```
"Liste meine NotebookLM-Notebooks auf."
```

Die 43 MCP-Tools sollten dann automatisch verfügbar sein.
