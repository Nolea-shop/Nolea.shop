# Architecture Overview — Windows Local Voice Assistant

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ WINDOWS (Python Skript)                                             │
│                                                                     │
│  ┌─────────────────────────────────────────┐                       │
│  │ GUI Overlay (gui_overlay.py)            │                       │
│  │ tkinter Canvas, 60fps Animation Loop     │                       │
│  │ Queue-basierte Thread-Kommunikation      │                       │
│  │ Status: Grau/Grün/Gelb/Blau/Orange       │                       │
│  │ Live-Text + Feedback-Toasts              │                       │
│  └──────────────┬──────────────────────────┘                       │
│                 │ set_listening() / show_text() / set_thinking()   │
│                 ▼                                                   │
│  ┌─────────────────────────────────────────┐                       │
│  │ Main Loop (voice_assistant_windows.py)  │                       │
│  │                                         │                       │
│  │ 1. VAD: Warte auf Sprachbeginn          │                       │
│  │    (single Stream, buffer overnehmen!)   │                       │
│  │ 2. Recording: bis 3s Stille             │                       │
│  │ 3. WAV speichern → per WSL an           │                       │
│  │    faster-whisper senden                │──┐                    │
│  │ 4. "gemma"-Check im transkribierten Text│  │                    │
│  │ 5. POST an Gemma 4 Server auf :8080     │──┼────────────────┐   │
│  │ 6. Aktion ausführen oder Hermes rufen   │  │                │   │
│  └─────────────────────────────────────────┘  │                │   │
│                                               │                │   │
│  ┌─────────────────────────────────────────┐  │                │   │
│  │ Aktionen (lokal)                        │  │                │   │
│  │ Spotify: os.system("start spotify:cmd") │  │                │   │
│  │ Tab: os.system("start url")             │  │                │   │
│  │ Timer: threading.Timer(sec, callback)   │  │                │   │
│  │ App: subprocess.Popen("cmd")            │  │                │   │
│  └─────────────────────────────────────────┘  │                │   │
│                                               │                │   │
│  ┌─────────────────────────────────────────┐  │                │   │
│  │ TTS: edge-tts + playsound               │  │                │   │
│  │ Stimme: de-DE-SeraphinaMultilingual...  │  │                │   │
│  └─────────────────────────────────────────┘  │                │   │
└───────────────────────────────────────────────┼────────────────┼───┘
                                                │                │
                subprocess.run(["wsl", "-e",    │                │
                    "python3", "-c", "..."])   │                │
                                                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ WSL (Ubuntu)                                                        │
│                                                                     │
│  ┌─────────────────────────────┐   ┌──────────────────────────────┐ │
│  │ faster-whisper (STT)        │   │ llama.cpp Server (:8080)      │ │
│  │ Modell: base, int8, CPU     │   │ Gemma 4 E4B-it (Q5_K_M)      │ │
│  │ Sprache: de                 │   │ CPU, 16 Threads, 64K Kontext  │ │
│  └─────────────────────────────┘   └──────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Hermes Agent (nur für komplexe Tasks)                        │   │
│  │ subprocess("hermes chat -q ...")                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Mikrofon → sounddevice.InputStream → 16kHz int16 PCM
  → webrtcvad VAD (Sprachbeginn-Erkennung, sammelt Buffer)
  → Nahtlose Aufnahme (VAD-Objekt übernimmt Buffer)
  → 3s Stille → STOP
  → WAV-Datei (tempfile)
  → WSL subprocess: python3 -c "WhisperModel(...).transcribe(wav)"
  → Text zurück an Windows
  → 'gemma' im Text suchen → wenn nicht gefunden: ignorieren
  → 'gemma' entfernen → Rest an Gemma 4 (POST :8080)
  → Antwort parsen: [ACTION:...] → lokal ausführen
                    [HERMES:...] → hermes chat -q
                    sonst → TTS ausgeben
  → GUI aktualisieren
  → Zurück zu Schritt 1
```

## File Layout on D:\

```
D:\hermes\GemmaAssistant\
├── start_assistent.bat
│   - Prüft Python
│   - Startet WSL Gemma Server im Hintergrund
│   - Führt voice_assistant_windows.py aus
│   - Enthält ERRORLEVEL-Prüfung + Pause am Ende
│
├── voice_assistant_windows.py
│   - Hauptlogik (VAD, STT, LLM, Actions, TTS)
│   - importiert gui_overlay für GUI
│   - Auto-Detect: Fifine Mikrofon
│   - Auto-Detect: edge-tts > pyttsx3
│
└── gui_overlay.py
    - tkinter Notch (übernommen + verbessert)
    - 60fps Animationen
    - Bounce, Glow, Pulse-Effekte
    - show_feedback() Toasts
```

## Hardware Requirements

- **RAM**: 16 GB+ (Gemma 4 Q5_K_M ~5 GB + OS + Whisper)
- **CPU**: 8+ Kerne empfohlen (llama.cpp nutzt alle)
- **Mikrofon**: Beliebiges Windows-Eingabegerät
- **WSL2**: Ubuntu 22.04+ mit systemd

## Startup Sequence

1. WSL starten (`wsl ~`)
2. Gemma Server starten: `systemctl --user start gemma4-server`
3. BAT auf Windows doppelklicken
4. Notch erscheint: "Bereit" (grau)
5. Sag "Gemma, ..." → Notch wird grün
6. Nach 3s Stille → Notch gelb (transkribiert)
7. Antwort erscheint in Notch + TTS
