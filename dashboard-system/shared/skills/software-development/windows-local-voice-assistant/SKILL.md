---
name: windows-local-voice-assistant
description: "Build a local, always-on voice assistant for Windows that uses a locally-running LLM (via WSL) for speech processing, with GUI overlay, wake-word, STT, TTS, and Hermes delegation."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [voice-assistant, windows, wsl, stt, tts, gemma, gui-overlay]
---

# Windows Local Voice Assistant

Build a local, always-on voice assistant for Windows that delegates simple commands to a local LLM (Gemma 4 via WSL + llama.cpp) and complex tasks to Hermes Agent. Includes GUI overlay (tkinter notch), VAD-based wake detection, STT (faster-whisper in WSL), and TTS (edge-tts).

## Architecture

```
Windows (always-on Python script)
├── GUI Overlay (tkinter) — schwarze Notch oben auf dem Bildschirm
│   ├── Status-Dot: Grau=warten, Grün=hört zu, Gelb=denkt, Blau=spricht
│   └── Live-Text: zeigt Transkription + Aktionen
├── Audio: sounddevice + webrtcvad (VAD, 3s Stille = Stop)
├── STT: faster-whisper → läuft IN WSL (subprocess)
├── TTS: edge-tts (Microsoft Neural, natürlich) + playsound
├── Aktionen: Spotify, Tab öffnen, Timer, Apps starten (Windows CMD)
└── Hermes Delegierung: komplexe Aufgaben → hermès chat -q

WSL (Gemma 4 Server)
├── llama.cpp Server auf :8080 (Q5_K_M GGUF)
├── Hermes Agent (online, für komplexe Tasks)
└── faster-whisper (STT)
```

## Key Architecture Decisions

- **VAD-only statt echtes Wake-Word**: Kein API-Key nötig. Sprachbeginn startet Aufnahme, dann wird im transkribierten Text nach "Gemma" gesucht.
- **Single-Stream VAD → Recording**: VAD-Check und Aufnahme teilen sich EINEN `sounddevice.InputStream`. Wird der Stream zwischen VAD und Aufnahme geschlossen/neu geöffnet, geht das erste Wort verloren.
- **WSL für STT + LLM**: faster-whisper und Gemma 4 laufen in WSL, das Python-Hauptskript läuft auf Windows. Kommunikation über HTTP (`localhost:8080`) und `subprocess.run(["wsl", "-e", ...])`.
- **TTS**: edge-tts (Microsoft Neural Voices) für natürliche Sprachausgabe + playsound für Audio-Wiedergabe (pygame ist nicht kompatibel mit Python 3.14+).

## Required Dependencies (Windows)

```cmd
pip install sounddevice webrtcvad requests edge-tts playsound
```

## Required Dependencies (WSL)

```bash
pip install faster-whisper
```

## File Structure

```
D:\hermes\GemmaAssistant\
├── start_assistent.bat           # BAT-Datei für Autostart
├── voice_assistant_windows.py    # Hauptskript (Windows)
└── gui_overlay.py                # GUI Overlay (tkinter Notch)
```

## Code Walkthrough

### 1. Fon (GUI Overlay — gui_overlay.py)

Die Notch ist ein tkinter-Fenster ohne Rahmen (`overrideredirect(True)`) mit:
- `-topmost`: immer im Vordergrund
- `-transparentcolor '#000001'`: unsichtbarer Hintergrund
- Canvas-Polygon mit `smooth=True` für abgerundete Ecken
- 60fps Animations-Loop via `root.after(16, ...)`
- Queue-basierte Thread-Kommunikation (`queue.Queue` + `_poll_queue`)

**API:**
```python
gui = start_overlay()
gui.set_idle()          # Grau
gui.set_listening()     # Grün, pulsierend
gui.set_thinking()      # Gelb, pulsierend
gui.set_speaking()      # Blau, pulsierend
gui.set_hermes()        # Orange, pulsierend
gui.set_error("msg")    # Rot
gui.set_success("msg")  # Grün, dann auto-idle nach 2s
gui.show_text("text", is_user=True)  # Live-Transkription
```

### 2. Main Loop (voice_assistant_windows.py)

```python
while True:
    # Phase 1: VAD → Auf Sprachbeginn warten (sammelt bereits Audio)
    with sd.InputStream(...) as s:
        while not detected:
            frame = s.read(FRAME)[0]
            audio_buf.extend(frame)
            if vad_check.is_speech(frame, SR):
                detected = True
    
    # Phase 2: Nahtlose Aufnahme (gleicher Stream!)
    vad = VAD(); vad.buf = audio_buf  # !KRITISCH: bereits gesammelte Daten übernehmen
    while True:
        if vad.feed(s.read(FRAME)[0].tobytes()) == "STOP": break
    
    # STT → Gemma-Check → LLM → Aktion
    text = stt(wav_path)              # faster-whisper in WSL
    if 'gemma' not in text.lower():   # ignoriert wenn kein "Gemma"
        continue
    response = ask_gemma(command)     # POST to localhost:8080
    do_action(response)               # [ACTION:...] oder [HERMES:...]
```

## Critical Pitfalls

### VAD + Recording: Erstes Wort geht verloren
**NICHT**:
```python
# FALSCH: Stream wird geschlossen, erstes Wort "Gemma" verloren
detect_speech_via_vad()  # eigener InputStream
record_audio()           # NEUER InputStream → Lücke!
```

**RICHTIG**: Ein einziger Stream, VAD-Buffer als Recording-Buffer übernehmen:
```python
with sd.InputStream(...) as s:
    # Phase 1: VAD (sammelt in audio_buf)
    # Phase 2: vad.buf = audio_buf → nahtlose Aufnahme
```

### tkinter Farben: Kein RGBA
tkinter akzeptiert NUR 6-stellige Hex-Farben (`#RRGGBB`). `#00000000` (8-stellig mit Alpha) gibt `TclError: invalid color name`.
- Transparenz wird über `attributes('-transparentcolor', farbe)` gesteuert, nicht über Alpha-Kanal.
- Für unsichtbaren Text: `fill='#000001'` (die transparente Farbe des Fensters).

### Sounddevice: Mikrofon-Auswahl
Standardmäßig nimmt `sounddevice` das Windows-Standard-Mikrofon. Für ein bestimmtes Gerät:
```python
devices = sd.query_devices()
for i, dev in enumerate(devices):
    if 'fifine' in dev['name'].lower():
        sd.default.device = i
        break
```

### Edge-TTS + playsound (nicht pygame)
`pygame` hat keine vorkompilierten Wheels für Python 3.14+ → Build von Source scheitert. Verwende `playsound` (reines Python):
```cmd
pip install edge-tts playsound
```
```python
import edge_tts
from playsound import playsound
asyncio.run(edge_tts.Communicate(text, voice).save(mp3))
playsound(mp3)
```

### WSL STT: Pfad-Konvertierung
Windows-Pfade müssen für WSL konvertiert werden (`C:\` → `/mnt/c/`):
```python
wsl_path = windows_path.replace('\\', '/').replace('C:', '/mnt/c')
```

### webrtcvad: Aggressiveness Level
- `Vad(0)` = zu lasch (nimmt Hintergrund auf)
- `Vad(1)` = gut für die meisten Umgebungen
- `Vad(2)` = aggressiv (braucht laute, klare Sprache)
- `Vad(3)` = sehr aggressiv (nur bei sehr nah am Mikrofon)

### openWakeWord: deque Slicing
`openWakeWord` nutzt `deque` für Prediction-Buffer. `deque` unterstützt KEIN Slicing mit `[-20:]`:
```python
# FALSCH: TypeError: sequence index must be integer, not 'slice'
sc = max(oww.prediction_buffer[w][-20:])

# RICHTIG:
buf = list(oww.prediction_buffer[w])
sc = max(buf[-20:]) if buf else 0
```

## References

- `references/architecture-overview.md` — Full architecture diagram and component interaction
- `references/troubleshooting.md` — Common errors and their fixes
- `references/edge-tts-voices.md` — Available German voices and TTS configuration
