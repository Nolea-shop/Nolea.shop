# Hermes CLI Skins — Vollständige Referenz

Das Skin-System (`hermes_cli/skin_engine.py`, ~920 Zeilen) erlaubt datengetriebene CLI-Theming ohne Python-Code. Jeder Skin ist ein YAML-Dict mit Farben, Spinner-Animationen, Branding-Texten und optionalen ASCII-Bannern.

## Built-in Skins (9 Stück)

| Skin | Beschreibung | Aktivieren |
|------|-------------|------------|
| **default** | Klassisch Gold/Kawaii (Original-Look) | `/skin default` |
| **ares** | Kriegs-Gott — Karmesinrot/Bronze | `/skin ares` |
| **mono** | Monochrom — Clean Graustufen | `/skin mono` |
| **slate** | Kühles Blau — Developer-fokussiert | `/skin slate` |
| **daylight** | Hell-Modus mit blauen Akzenten | `/skin daylight` |
| **warm-lightmode** | Warmes Hell-Modus (Braun/Gold) | `/skin warm-lightmode` |
| **poseidon** | Meeres-Gott — Tiefblau/Seegrün mit Wellen-Spinner | `/skin poseidon` |
| **sisyphus** | Minimal Graustufen mit "Boulder"-Banner | `/skin sisyphus` |
| **charizard** | Vulkan — Verbrannntes Orange/Glut, Flammen-ASCII | `/skin charizard` |

## Skin wechseln

**Temporär (Session):**
```
/skin ares
```

**Dauerhaft:**
```bash
hermes config set display.skin poseidon
# Dann neu starten oder /reset
```

## Eigene Skins erstellen (`~/.hermes/skins/<name>.yaml`)

YAML-Datei in `~/.hermes/skins/` ablegen. Alle Felder optional — fehlende Werte erben vom `default`-Skin.

### Vollständiges Schema

```yaml
name: mein-skin              # Eindeutiger Name (lowercase, hyphens)
description: Eigener Theme   # Wird in /skin-Liste gezeigt

colors:
  # === Banner (Startbildschirm) ===
  banner_border: "#CD7F32"     # Panel-Rahmen
  banner_title: "#FFD700"      # Titel-Text
  banner_accent: "#FFBF00"     # Sektion-Header (Available Tools etc.)
  banner_dim: "#B8860B"        # Gedämpfter Text (Separatoren, Labels)
  banner_text: "#FFF8DC"       # Body-Text (Tool-Namen, Skill-Namen)

  # === UI ===
  ui_accent: "#FFBF00"         # Allgemeiner UI-Akzent
  ui_label: "#DAA520"          # UI-Labels
  ui_ok: "#4caf50"             # Erfolg
  ui_error: "#ef5350"          # Fehler
  ui_warn: "#ffa726"           # Warnung

  # === Input ===
  prompt: "#FFF8DC"            # Prompt-Symbol-Farbe
  input_rule: "#CD7F32"        # Horizontale Linie im Input-Bereich

  # === Response Box ===
  response_border: "#FFD700"   # Response-Box-Rahmen (ANSI)

  # === Status Bar (prompt_toolkit) ===
  status_bar_bg: "#1a1a2e"
  status_bar_text: "#C0C0C0"
  status_bar_strong: "#FFD700"
  status_bar_dim: "#8B8682"
  status_bar_good: "#8FBC8F"   # Geringe Context-Nutzung
  status_bar_warn: "#FFD700"   # Mittlere Context-Nutzung
  status_bar_bad: "#FF8C00"    # Hohe Context-Nutzung
  status_bar_critical: "#FF6B6B"  # Kritische Context-Nutzung

  # === Session Info ===
  session_label: "#DAA520"
  session_border: "#8B8682"

  # === TUI / Completion Menu ===
  voice_status_bg: "#1a1a2e"
  selection_bg: "#333355"
  completion_menu_bg: "#1a1a2e"
  completion_menu_current_bg: "#333355"
  completion_menu_meta_bg: "#1a1a2e"
  completion_menu_meta_current_bg: "#333355"

spinner:
  waiting_faces:            # Während API-Wartezeit
    - "(⚔)"
    - "(⛨)"
  thinking_faces:           # Während Reasoning
    - "(⌁)"
    - "(<>)"
  thinking_verbs:           # Spinner-Nachrichten
    - "forging"
    - "plotting"
  wings:                    # Optionale [links, rechts] Dekorationen
    - ["⟪⚔", "⚔⟫"]
    - ["⟪▲", "▲⟫"]

branding:
  agent_name: "Hermes Agent"       # Banner-Titel, Statusanzeige
  welcome: "Welcome!"              # Startmeldung
  goodbye: "Goodbye! ⚕"           # Exit-Text
  response_label: " ⚕ Hermes "    # Response-Box-Header
  prompt_symbol: "❯"              # Prompt-Symbol (ohne Leerzeichen)
  help_header: "(^_^)? Commands"   # /help-Header

tool_prefix: "┊"                   # Zeichen für Tool-Output-Zeilen

tool_emojis:                       # Per-Tool-Emoji-Override
  terminal: "⚔"                    # Nur abweichende angeben
  web_search: "🔮"
  # Standard: automatisch aus tool registry
```

### Wichtige Regeln

- `prompt_symbol` wird **ohne** trailing space gespeichert — die Engine hängt ihn automatisch an
- `colors.prompt` färbt NUR das Prompt-Symbol, NICHT den getippten Text (der erbt Terminal-FG für Lesbarkeit in Hell/Dunkel)
- Fehlende Farben erben vom **default**-Skin, nicht von irgendeinem anderen
- Skin-Dateien unter `~/.hermes/skins/` können Built-ins NICHT überschreiben — gleicher Name wird ignoriert

### Beispiel: Minimaler Custom Skin

```yaml
name: neon
description: Cyberpunk-Grün
colors:
  banner_border: "#00FF88"
  banner_title: "#FFFFFF"
  banner_accent: "#00FFAA"
  banner_dim: "#005544"
  banner_text: "#E0FFE0"
  prompt: "#00FF88"
  response_border: "#00FFAA"
  status_bar_bg: "#001A1A"
branding:
  agent_name: "⚡ NEON ⚡"
  prompt_symbol: "⚡"
  response_label: " ⚡ NEON ⚡ "
```

## Nerd Font Icons im Skin

Standard-Unicode-Zeichen (✧ ✦ ⋆) sind begrenzt. Mit **Nerd Fonts** (gepatchene Programmier-Schriftarten mit tausenden Icons) sehen Skins professioneller aus.

### Installation (WSL/Linux)

```bash
# JetBrainsMono Nerd Font (empfohlen — gute Glyphen-Abdeckung)
cd /tmp
wget -q "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip"
sudo apt-get install -y unzip  # falls nicht vorhanden
mkdir -p ~/.local/share/fonts
unzip -o -q JetBrainsMono.zip -d ~/.local/share/fonts/
rm JetBrainsMono.zip
fc-cache -f
```

### Windows Terminal umstellen

Nach der Installation: Windows Terminal → Settings → Profil (Ubuntu) → **Font face** → `JetBrainsMono Nerd Font` eingeben.

Alternative Nerd Fonts: `FiraCode Nerd Font`, `CascadiaCode Nerd Font`, `Hack Nerd Font`.

### Nützliche Nerd Font Icons für Skins

| Icon | Code | Verwendung |
|------|------|------------|
| `` | nf-fa-star | Gefüllter Stern (Spinner, Label) |
| `` | nf-fa-star_o | Umriss-Stern (Spinner) |
| `` | nf-md-star | Material-Stern (Spinner) |
| `` | nf-fa-star_half_o | Halber Stern (Spinner) |
| `` | nf-fa-laptop | Terminal-Tool |
| `` | nf-fa-globe | Web-Suche-Tool |
| `` | nf-fa-dot_circle_o | Tool-Prefix |
| `` | nf-fa-angle_right | Prompt-Symbol |

### Beispiel Skin mit Nerd Fonts

```yaml
name: starsky
colors:
  banner_border: "#8B7CFF"
  banner_title: "#FFFFFF"
  banner_accent: "#D0C4FF"
  banner_dim: "#2E2366"
  banner_text: "#F0ECFF"
  # ... (restliche Farben normal)

spinner:
  waiting_faces:
    - ""      # Star-Symbole wechseln animiert
    - ""
    - ""
    - ""
    - ""
  wings:
    - ["⟪", "⟫"]
    - ["⟪", "⟫"]

branding:
  prompt_symbol: ""   # Doppelte Winkel als Prompt
  response_label: "  Chef  "

tool_prefix: ""
tool_emojis:
  terminal: ""
  web_search: ""
```

**Hinweis:** Ohne Nerd Font als Terminal-Schriftart werden die Icons als Rechtecke dargestellt. Die Font-Installation + Windows Terminal Umstellung ist zwingend erforderlich.

## Grenzen des Skin-Systems (wichtig!)

Das Skin-System hat fundamentale Grenzen, die durch die Terminal-Architektur bedingt sind:

| Was du willst | Geht? | Warum (nicht)? |
|---------------|-------|----------------|
| **Animated starfield BG** | ❌ | Hermes läuft im **line-mode** (prompt_toolkit `full_screen=False`). Es gibt keinen persistenten Canvas für Hintergrund-Animationen — die Konversation scrollt einfach hoch |
| **Glow/Light-Effekte** | ⚠️ Teilweise | Terminal hat keine Glow-Shader. Heller Text auf dunklem Grund erzeugt einen "Glow"-Eindruck (via Bold + hoher Helligkeitskontrast) |
| **Bewegte Sterne/Hintergrund** | ❌ | Echtzeit-Animation erfordert einen separaten Prozess oder tmux — nicht innerhalb des Skin-Systems |
| **Transparenz/Opacity** | ❌ | Wird vom Terminal-Emulator gesteuert, nicht von Hermes |
| **Banner-Hintergrundbilder** | ❌ | Der Banner ist Rich-Text, kein Bild-Checker |

**PITFALL — Skin-Vorschläge nicht überengineeren:**
Wenn ein User sagt "ich will einen coolen Skin", dann: YAML-Datei in `~/.hermes/skins/` anlegen, `/skin name` aktivieren, fertig. Kein Vorschlagen von:
- tmux mit Split-Panes
- Separaten Python-Scripts/Screensavern
- Background-Prozessen
- Video-Backgrounds
- irgendwas das einen zweiten Tab/Pane/Prozess braucht

Der User lehnt das ab und will nur die YAML. Ausnahme: wenn der User EXPLIZIT nach diesen Dingen fragt.

### Die echte Lösung für WSL-Nutzer: Windows Terminal Background Image

Windows Terminal hat **natives Background Image Support** pro Profil. Das ist die richtige Lösung für Sternenhimmel-Hintergründe — kein tmux, keine Scripts, alles in einem Tab.

**Einrichtung:**

1. Bild suchen (z.B. Deep Space, Nebula, Night Sky) — Speicherort z.B. `C:\Users\deinname\Pictures\starry-sky.png`

2. **Windows Terminal Settings** öffnen (`Strg + ,`)

3. Zum WSL/Ubuntu Profil → "Appearance" → Background Image:

   | Setting | Wert | 
   |---------|------|
   | Background image path | `C:\Users\deinname\Pictures\starry-sky.png` |
   | Background image opacity | `15-25%` (nur ganz leicht sichtbar) |
   | Background image stretch mode | `fill` |
   | Acrylic opacity | `80%` |

4. **ODER direkt in `settings.json:**
   ```json
   "profiles": {
     "list": [
       {
         "name": "Ubuntu",
         "backgroundImage": "C:\\Users\\deinname\\Pictures\\starry-sky.png",
         "backgroundImageOpacity": 0.2,
         "backgroundImageStretchMode": "fill",
         "useAcrylic": true,
         "acrylicOpacity": 0.85
       }
     ]
   }
   ```

**Vorteile gegenüber tmux/separatem Script:**
- Kein tmux nötig
- Hermes läuft ganz normal in einem Tab
- Bild wird nativ vom Terminal gerendert (keine CPU-Last)
- Funktioniert mit jedem CLI-Tool, nicht nur Hermes
- Transparenz/Opacity ist flüssig animiert (Windows Terminal Acrylic)

### Skin-Architektur (für Fortgeschrittene)

```
Skin YAML  →  skin_engine.py  →  SkinConfig (@dataclass)
                                    ├── colors (dict[str, str])
                                    ├── spinner (faces, verbs, wings)
                                    ├── branding (agent_name, welcome, ...)
                                    ├── tool_prefix, tool_emojis
                                    ├── banner_logo (Rich ASCII)
                                    └── banner_hero (Rich ASCII)
```

Der Skin wird beim CLI-Start einmal geladen (`init_skin_from_config()`). Die Werte werden von:
- **banner.py** → Willkommens-Banner (nur beim Start)
- **cli.py** → Response-Box-Label, Status-Bar-Styles (via `get_prompt_toolkit_style_overrides()`)
- **agent/display.py** → Spinner-Animationen während API-Calls

**prompt_toolkit Integration:** Der Skin beeinflusst das prompt_toolkit-Styling über `get_prompt_toolkit_style_overrides()` (Zeile 841 in skin_engine.py). Diese werden über `PTStyle.from_dict()` auf das bestehende Style-Dict gelegt. Das betrifft: status-bar, prompt, input-rule, completion-menu, clarify/approval/sudo panels, voice-status.

**Kein persistentes Rendering:** Anders als eine GUI gibt es kein "Frame"-Modell. Nach dem Banner wird nur noch gezeichnet, wenn sich der Bildschirminhalt ändert (neue Nachricht, Tool-Output, Response). Ein Hintergrund müsste bei jedem dieser Events **komplett neu gezeichnet** werden — das würde Flackern verursachen und ist nicht im prompt_toolkit-Layout-Modell vorgesehen.

## Zusätzliche Display-Features (unabhängig vom Skin)

| Feature | Befehl | Beschreibung |
|---------|--------|-------------|
| Statusleiste | `/statusbar` (toggle) | Zeigt Modell, Token-Verbrauch |
| Kosten | `hermes config set display.show_cost true` | Kosten pro API-Call |
| Timestamps | `hermes config set display.timestamps true` | Zeitstempel bei Responses |
| Streaming | `hermes config set display.streaming true` | Zeichenweises Ausgeben |
| Inline Diffs | `hermes config set display.inline_diffs true` | Datei-Änderungen farbig |
| Bell | `hermes config set display.bell_on_complete true` | Piepton bei Fertig |
| Verbose | `/verbose` (cycle) | Detailgrad: off → new → all |
| Compact | `hermes config set display.compact true` | Kompaktere Darstellung |

## Skin-Quellcode (nur zum Nachlesen, nicht zum Editieren)

`~/.hermes/hermes-agent/hermes_cli/skin_engine.py` — hier sind die 9 Built-ins als Python-Dicts ab Zeile 164. Bei Updates überschrieben. Eigene Skins immer als YAML unter `~/.hermes/skins/`.
