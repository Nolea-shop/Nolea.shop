# Voice-Input Terminal Tool

Ein CLI-Tool (`voice-input`) für Sprache-zu-Text direkt im Hermes-Terminal.
Nimmt das Windows-Mikrofon auf (via `ffmpeg.exe`) und transkribiert mit Whisper Turbo (Port 8000).

## Architektur

```
┌─ WSL ──────────────────────────────────────────────────┐
│  voice-input (Python)                                   │
│    → ffmpeg.exe (Windows) → Mikrofon → 16kHz PCM WAV   │
│    → WebSocket ws://localhost:8000/stream → Whisper Turbo│
│    → Text → Clipboard (clip.exe) + stdout               │
└─────────────────────────────────────────────────────────┘
```

## Standort

- **Script:** `/home/damia/.local/bin/voice-input`
- **Shebang:** `#!/home/damia/.hermes/hermes-agent/venv/bin/python3`
- **Abhängigkeiten:** `sounddevice` (Windows), `websockets`, `faster-whisper` (Fallback)

## Verwendung

```bash
voice-input                        # 15s aufnehmen, transkribieren, Clipboard + stdout
voice-input --timeout 30           # Länger aufnehmen
voice-input --mic "AirPods"        # Anderes Mikrofon
voice-input --list-mics            # Verfügbare Mikrofone anzeigen
voice-input --clip-only            # Nur in Zwischenablage
voice-input --no-clip              # Nur stdout (für Piping)
```

## Workflow

**voice-hermes** (empfohlen): All-in-one, kein zweites Terminal nötig.
```bash
voice-hermes
# Enter → Sprechen → Transkription → Hermes Antwort
```

**voice-input** (Standalone): Text → Zwischenablage → einfügen.
```bash
voice-input
# Sprechen → Text in Zwischenablage + stdout
```

## Verfügbare Mikrofone (getestet 2026-05-16)

- **Mikrofon (fifine Microphone)** — Standard (USB)
- **Kopfhörer (AirPods Pro)** — Bluetooth

## Whisper Turbo (STT Server)

- **Port:** 8000 (WebSocket)
- **Endpoint:** `ws://localhost:8000/stream`
- **Modell:** Whisper Turbo (CPU, int8)
- **Quelle:** `/home/damia/.hermes/models/gemma4/stt_server.py`
- **Leyna V2:** Wird als systemd-Dienst betrieben
- **Protokoll:** PCM int16 16kHz → `b"END_OF_SPEECH"` → erwartet `{"type": "final", "text": "..."}`

## Fallback (wenn Whisper Turbo nicht erreichbar)

`faster-whisper` mit Modell "base" ist im Hermes-Venv installiert:
```python
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, _ = model.transcribe(wav_path, language="de")
```

## Windows-Script (Alternative)

Unter `D:\hermes\GemmaAssistant\voice_input_win.py` gibt es eine reine Windows-Version:
- Nutzt Windows `sounddevice` (kein ffmpeg nötig)
- Kopiert in Windows-Zwischenablage via `win32clipboard`
- Kann Text automatisch eintippen (`--type` Flag)

## Hermes `/voice` Befehl — Warum es in WSL nicht funktioniert

Hermes hat einen eingebauten `/voice` Mode:
```yaml
stt:
  enabled: true
  provider: local
```

**Blockiert in WSL** weil `tools/voice_mode.py:detect_audio_environment()` prüft:
1. `/proc/version` auf `microsoft` → WSL erkannt
2. `PULSE_SERVER` env var gesetzt? → Nein → `warnings.append(...)` blockiert `/voice on`

Der Built-in `AudioRecorder` nutzt `sounddevice.InputStream` (PortAudio), das in WSL
ohne PulseAudio-Bridge keine Mikrofone findet. Fix-Möglichkeiten:
- **PulseAudio brücken**: `PULSE_SERVER=unix:/mnt/wslg/PulseServer` setzen
- **WSLRecorder Klasse**: Einen ffmpeg.exe-basierten Recorder in `tools/voice_mode.py`
  einbauen (analog zum existierenden `TermuxAudioRecorder`)

Bis dahin: `voice-hermes` oder `voice-input` als Workaround nutzen.

### CLI Hooks für Voice

| Hook | Location | Zweck |
|------|----------|-------|
| `_register_extra_tui_keybindings()` | `cli.py:11477` | Custom Keybindings (F2, etc.) |
| `_voice_record_key_label()` | `cli.py:3273` | PTT-Key Label (default "Ctrl+B") |
| `_get_voice_status_fragments()` | `cli.py:3308` | Voice Status Bar UI (REC/STT/idle) |
| `voice_status_bar` | `cli.py:11534` | Widget im TUI Layout |
