# Telegram Gateway Setup (WSL)

## Bot Token
- Bot Token in `~/.hermes/.env` unter `TELEGRAM_BOT_TOKEN`
- Bei InvalidToken-Fehler: Token ist falsch/revoked — neuen von @BotFather holen
- `.env` kann mehrere Token-Zeilen haben — letzte gewinnt; alte Tokens bereinigen

## Allowlists
```
TELEGRAM_ALLOWED_USERS=<user-id>           # Einzelner User
TELEGRAM_ALLOWED_CHATS=<chat-id1>,<chat-id2>  # Komma-getrennt
GATEWAY_ALLOW_ALL_USERS=true               # Fallback für offenen Zugriff
```

## Per-Platform Model Override

Du kannst Telegram ein **eigenes Model** zuweisen, unabhängig vom CLI-Default:

```yaml
telegram:
  model_name: openai/gpt-oss-120b    # Überschreibt model.default für Telegram
  # provider/api_key/base_url können ebenfalls per Chat-/Session-/Model gesetzt werden
```

Das wird im Gateway von `_resolve_session_agent_runtime()` in `gateway/run.py` ausgelesen:

```python
_plat_cfg = self.config.platforms.get(source.platform)
if _plat_cfg is not None:
    _plat_model = _plat_cfg.extra.get("model_name", "")
    if _plat_model:
        model = _plat_model  # Überschreibt das global aufgelöste Model
```

**Priorität** (niedrig → hoch):
1. `model.default` in config.yaml (global)
2. `telegram.model_name` (per-platform, dieser Patch)
3. `/model` im Chat-Session (höchste Priorität, überschreibt alles)

**Hinweis:** Dies ist ein Code-Patch, kein natives Feature. Wenn du Hermes Agent updatest, musst du den Patch in `gateway/run.py` erneut anwenden.

## Group Message Filtering (require_mention)

Standardmäßig verarbeitet der Bot **alle** Nachrichten in erlaubten Gruppen. Das kann Token-verschwenderisch sein. Steuerung über die `telegram`-Sektion in `config.yaml`:

```yaml
telegram:
  require_mention: true          # Bot reagiert nur bei @Mention, Reply oder Command
  model_name: openai/gpt-oss-120b  # Per-Platform Model-Override (Default siehe model.default)
  reactions: false
  allowed_chats: -1001234567890,123456789
  free_response_chats: ""        # Chats die IMMER antworten (auch ohne Mention)
  guest_mode: false              # Erlaubt @Mentions aus nicht-allowgelisteten Chats
  ignored_threads: []            # Forums-Threads die ignoriert werden
  channel_prompts: {}            # Per-Chat System-Prompts
```

### Logik: `_should_process_message` (Entscheidungsbaum)

| Schritt | Bedingung | Ergebnis |
|---------|-----------|----------|
| 1 | Ist DM (Kein Gruppen-Chat)? | ✅ Immer verarbeiten |
| 2 | Ist Chat in `allowed_chats`? Wenn nein → nur verarbeiten wenn `guest_mode=true` UND @Mention | ⛔ Sonst ignorieren |
| 3 | Ist in `free_response_chats`? | ✅ Immer verarbeiten |
| 4 | Ist `require_mention` **false** (Standard)? | ✅ **Alle Nachrichten verarbeiten** |
| 5 | Reply auf Bot-Nachricht? | ✅ Verarbeiten |
| 6 | Bot @erwähnt? (`@bot_name`) | ✅ Verarbeiten |
| 7 | Regex Wake-Word Pattern gematcht? | ✅ Verarbeiten |
| — | Sonst | ⛔ Ignorieren |

### Konfig-Optionen im Detail

**`require_mention`** (Default: `false`)
- `true`: Bot reagiert in Gruppen NUR bei @Mention, Reply, oder Command
- `false` (default): Bot verarbeitet JEDE Nachricht in erlaubten Gruppen
- Auch als Env-Var: `TELEGRAM_REQUIRE_MENTION=true`
- **Empfehlung**: `true` für Gruppen mit vielen Mitgliedern/Bots (Token-Ersparnis)

**`guest_mode`** (Default: `false`)
- `true`: Erlaubt @Mentions auch von Chats, die NICHT in `allowed_chats` sind
- Nützlich für öffentliche Bot-Testphasen
- Greift NUR bei explizitem @Mention — Replies und Wake-Words ignorieren `allowed_chats` nicht

**`free_response_chats`** (Default: leer)
- Komma-separierte Chat-IDs die IMMER antworten, auch wenn `require_mention=true`
- Überschreibt `require_mention` für diese Chats
- Nützlich für: private Testgruppen, Debug-Channel
- Auch als Env-Var: `TELEGRAM_FREE_RESPONSE_CHATS=-100111,222333`

**`allowed_chats`**
- Hard-Gate: Nur Chats in dieser Liste werden verarbeitet
- DMs sind von dieser Prüfung ausgenommen (immer erlaubt wenn User in `allowed_users`)
- Auch als Env-Var: `TELEGRAM_ALLOWED_CHATS=-100111,-100222`

### BotFather: Privacy Mode vs require_mention

Zwei unabhängige Ebenen:

1. **BotFather Privacy Mode** (Telegram-Ebene)
   - `/setprivacy` → Enabled (default): Bot sieht NUR Nachrichten mit `/`, @Mention, oder Reply
   - `/setprivacy` → Disabled: Bot sieht ALLE Nachrichten in der Gruppe
   - **Hinweis**: Privacy Mode auf Disabled ist nur nötig wenn `require_mention: false` UND der Bot jede Nachricht sehen soll. Bei `require_mention: true` kann Privacy Mode auf Enabled bleiben.

2. **`require_mention`** (Gateway-Ebene)
   - Entscheidet ob der Gateway die Nachricht an den Agenten weiterleitet
   - Auch wenn Telegram die Nachricht liefert, kann der Gateway sie trotzdem ignorieren

**Faustregel:**
- Privacy Mode = **Enabled** + `require_mention: true` → Bot sieht nur @Mentions (und verarbeitet sie)
- Privacy Mode = **Disabled** + `require_mention: true` → Bot sieht alles, verarbeitet aber nur @Mentions
- Privacy Mode = **Disabled** + `require_mention: false` → Bot sieht und verarbeitet alles (maximal offen)

### Nach Gateway-Config-Änderung

Config-Änderungen an der `telegram`-Sektion brauchen einen Gateway-Neustart:
```bash
hermes gateway restart          # wenn systemd service läuft
# Oder manuell:
pkill -f "hermes gateway"
hermes gateway run --replace    # im Terminal
```

## Persistent Start (nohup)
```bash
#!/bin/bash
export HERMES_HOME=/home/damia/.hermes
pkill -f "hermes gateway run" 2>/dev/null
sleep 2
nohup hermes gateway run --replace > ~/.hermes/logs/gateway.log 2>&1 &
GATEWAY_PID=$!
echo $GATEWAY_PID > ~/.hermes/gateway.pid
sleep 8
grep -q "✓ telegram connected" ~/.hermes/logs/gateway.log && echo "OK" || echo "FAIL"
```

## Verify
```bash
ps aux | grep "hermes gateway" | grep -v grep
tail -f ~/.hermes/logs/gateway.log
```

## Known Pitfalls
- `hermes config set approvals.mode off` speichert boolean `False` statt string `"off"` → YAML-Datei manuell korrigieren
- `hermes config set fallback_model '{"provider":...}'` speichert JSON-String → wird von `hermes doctor` als Fehler gemeldet. Lösung: YAML-Dict in config.yaml eintragen
- Gateway stirbt wenn parent shell (bash/hermes) terminiert → immer nohup oder systemd service verwenden
- `hermes gateway run` ohne `--replace` schlägt fehl wenn bereits ein Gateway läuft
- `require_mention: true` ohne `allowed_chats` setzen → Bot ignoriert ALLE Gruppen-Nachrichten (weil kein Chat in allowlist, und require_mention blockt alle nicht-erwähnten)
- Config-Änderungen brauchen Gateway-Neustart — `/reset` im Chat reicht nicht
- `hermes gateway restart` schlägt fehl wenn linger nicht enabled ist: `sudo loginctl enable-linger $USER`
- **Per-Platform model_name Patch**: Nach einem Hermes-Update muss der Patch in `gateway/run.py` erneut angewandt werden (in `_resolve_session_agent_runtime()`)
