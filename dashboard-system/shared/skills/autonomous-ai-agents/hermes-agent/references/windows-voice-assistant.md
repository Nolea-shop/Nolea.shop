# Windows Voice Assistant (WSL2 + tkinter + Gemma 4)

Architecture for a fully-local always-on voice assistant running on Windows,
with the LLM backend (Gemma 4 via llama.cpp) in WSL2.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Windows Side (voice_assistant_windows.py)           │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Mikrofon │→ │ VAD      │→ │ STT (WSL whisper)  │ │
│  │ (Fifine) │  │ (3s VAD) │  │                    │ │
│  └──────────┘  └──────────┘  └────────┬───────────┘ │
│                                       │              │
│  ┌────────────────────────────────────┘              │
│  │                                                   │
│  ▼                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Gemma 4  │→ │ Action Router│→ │   Ausführen    │ │
│  │ (WSL     │  │              │  │ [ACTION:spotify]│ │
│  │  :8080)  │  │→ Hermes wenn │  │→ Windows-Befehl│ │
│  └──────────┘  │  komplex     │  │ [HERMES: task] │ │
│                └──────────────┘  │→ Hermes in WSL  │ │
│                                  └────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │  TTS: edge-tts (Microsoft Neural) → playsound   ││
│  └──────────────────────────────────────────────────┘│
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │  GUI: tkinter Overlay (schwarze Notch)           ││
│  │    ● Grau = Wartet  ● Grün = Hört zu            ││
│  │    ● Gelb = Denkt    ● Blau = Spricht            ││
│  │    ● Orange = Hermes                             ││
│  └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

## Components

### 1. GUI Overlay (`gui_overlay.py`)
- tkinter-based always-on-top notch (transparent background)
- Status dot with glow animation (60fps via `root.after`)
- Live transcription text display
- Drag to reposition, close button with hover effect
- Audio level bar during recording

### 2. Wake-Word Detection (VAD-only + keyword filter)
- No ML wake-word model needed (avoids API keys and ONNX model downloads)
- `webrtcvad.Vad(2)` listens for speech start in 30ms frames
- After 3 frames (~100ms) of speech → recording starts
- After 3 seconds of silence → recording stops
- Transcribed text is checked for "Gemma" keyword (case-insensitive, anywhere in text)
- If "Gemma" found → text before it is stripped, rest processed as command
- If not found → ignored (user was talking to someone else)

### 3. STT (Speech-to-Text)
- Runs in WSL via `subprocess.run(["wsl", "-e", "bash", "-c", "..."])`
- Uses `faster-whisper` with `base` model, `int8` compute, `device="cpu"`
- Saves Windows-side WAV file, path is forwarded to WSL

### 4. TTS (Text-to-Speech)
- **Primary**: `edge-tts` (Microsoft Neural Voices, cloud-based, very natural)
  - Voice: `de-DE-SeraphinaMultilingualNeural`
  - Playback: `playsound` (pure Python)
  - Requires: `pip install edge-tts playsound`
- **Fallback**: `pyttsx3` (Windows SAPI5, roboterhaft, no pip needed)
  - Activates automatically if edge-tts import fails

### 5. Action Router
- `[ACTION:spotify]` → Spotify next/previous/pause via `start spotify:cmd`
- `[ACTION:tab]` → Opens browser (Google, YouTube, GitHub) via `os.system("start url")`
- `[ACTION:timer]` → Python `threading.Timer` + `msg *` notification
- `[ACTION:app]` → Launches Windows apps (cmd, calc, notepad)
- `[HERMES: x]` → Delegates to Hermes via `wsl hermes chat -q "x"`
- Everything else → spoken back as TTS

### 6. Gemma 4 Backend (WSL)
- llama.cpp server with Gemma 4 E4B-it Q5_K_M
- Custom `--chat-template` to disable `<|think|>` mode (otherwise responses are empty)
- System prompt: concise German, 10 words max, instructs model to use `[ACTION:]` or `[HERMES:]` format

## File Layout (Windows, D:\hermes\GemmaAssistant\)

```
D:\hermes\GemmaAssistant\
├── start_assistent.bat           # Double-click launcher
├── voice_assistant_windows.py    # Main application
└── gui_overlay.py                # tkinter GUI notch
```

## Installation (Windows CMD as Admin)

```cmd
pip install edge-tts playsound sounddevice webrtcvad requests
```

## Autostart
1. `WIN+R` → `shell:startup`
2. Create shortcut to `D:\hermes\GemmaAssistant\start_assistent.bat`

## Pitfalls

### Audio stream must be continuous
Do NOT split VAD detection and recording into two separate `sd.InputStream` calls.
The first stream closes, audio frames are lost, and the wake word "Gemma" gets
truncated. **Fix**: use a single `InputStream`: Phase 1 detects speech (collecting
frames into a buffer), Phase 2 seamlessly continues recording (same stream, same buffer).

### tkinter does not support RGBA colors
Use `#000001` for transparent elements, not `#00000000` (8-char hex with alpha).
tkinter's Tcl engine only accepts 6-char RGB hex values.

### Edge-TTS needs async
`edge_tts.Communicate().save()` is async — must be wrapped in `asyncio.run()`.
```python
import asyncio, tempfile
mp3 = tempfile.mktemp(suffix=".mp3")
asyncio.run(edge_tts.Communicate(text, voice).save(mp3))
```

### Python 3.14 compatibility
`pygame` and `miniaudio` may not have pre-built wheels for Python 3.14 yet,
causing build-from-source failures. Use `playsound` instead (pure Python, no C ext).

### VAD aggression
`webrtcvad.Vad(2)` (mode 2, moderate aggression) works well. Mode 3 (most
aggressive) misses too much speech. Mode 1 (least aggressive) picks up background
noise. If the user's microphone is quiet, reduce the speech-frame threshold from
3 frames to 2 for faster detection.
