---
name: local-voice-assistant
description: Build a 2-stage local voice assistant — simple commands via local LLM, complex tasks delegated to Hermes Agent.
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [voice-assistant, local-llm, stt, tts, smart-home, spotify, action-handler]
tags: [voice-assistant, local-llm, stt, tts, smart-home, spotify, action-handler, gui, wake-word, openWakeWord]
---
# Local Voice Assistant

Build a completely local voice-controlled assistant with a **2-stage architecture** and a **GUI overlay** that shows live status on your desktop:

```
Sprache → STT (faster-whisper) → Text
  ├→ Einfach (Spotify, Tab, Timer, Info) → Lokales LLM (<5s) → Aktion
  └→ Komplex (Programmierung, Recherche) → Hermes Agent (Tools)
  
GUI Overlay: Schwarze Notch oben
  ● Grau = Warte   ● Grün = Höre zu   ● Gelb = Denke   ● Blau = Spreche   ● Orange = Hermes
```

```
Sprache → STT (faster-whisper) → Text
  ├→ Einfach (Spotify, Tab, Timer, Info) → Lokales LLM (<5s) → Aktion
  └→ Komplex (Programmierung, Recherche) → Hermes Agent (Tools, Cloud)
```

This pattern keeps simple commands fast and local, while delegating complex multi-step tasks to Hermes Agent with full tool access.

## When to use this skill

- The user wants a local voice assistant (no cloud dependency for basic commands)
- They have a local LLM running (llama.cpp or transformers) and want to use it for fast, simple interactions
- They want a single interface that routes between a fast local model and the full Hermes Agent
- Use cases: Smart home control, Spotify, browser tabs, timers, system info

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                Voice Assistant (Python)               │
│                                                        │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   STT     │───▶│  Local LLM   │───▶│  TTS (optional)│ │
│  │ (whisper) │    │ (Gemma 4 etc)│    │  (neutts)    │ │
│  └──────────┘    └──────┬───────┘    └──────────────┘ │
│                          │                              │
│            ┌─────────────┤                              │
│            ▼             ▼                              │
│  ┌────────────────┐  ┌──────────────┐                  │
│  │  Action Handler │  │ Hermes Agent│                   │
│  │ (lokal schnell) │  │  (komplex)  │                   │
│  └────────────────┘  └──────────────┘                  │
└──────────────────────────────────────────────────────┘
```

## Setup Steps

### 1. Local LLM Server (llama.cpp)

```bash
# Build/install llama.cpp, then:
llama-server \
  --model ~/.hermes/models/gguf/gemma-4-E4B-it-Q5_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --ctx-size 65536 \
  --threads 16 \
  --batch-size 4096
```

See the `llama-cpp` skill for full build and configuration details, including:
- CPU vs GPU setup
- Gemma 4 thinking mode fix (custom chat template)
- Systemd service for autostart

### 2. Install Dependencies

```bash
# Core
pip install faster-whisper         # STT (local)
pip install neutts[all]            # TTS (local, needs espeak-ng)

# Audio (for microphone input)
pip install sounddevice pyaudio    # optional
```

### 3. Create the Assistant Script

Copy `templates/voice-assistant.py` (~/.hermes/skills/smart-home/local-voice-assistant/templates/) and adjust:

- `LLAMA_SERVER_URL` — point to your local llama-server endpoint
- `SYSTEM_PROMPT` — customize action keywords and routing rules
- Add/remove action types in `ActionHandler` class

### 4. Enable Autostart (systemd)

```bash
# Server service (llama.cpp or transformers)
systemctl --user enable --now gemma4-server

# Optionally re-run the assistant process at login
```

## System Prompt Design

The prompt must be **compact** (50-100 words) for fast CPU inference. Include:

```
AKTIONEN (nur bei passendem Schlüsselwort):
[ACTION:spotify] antwort  — bei spotify, musik, song, playlist
[ACTION:tab] antwort      — bei öffnen, browser, google, youtube
[ACTION:timer] antwort    — bei timer, wecker, minute, stunde
[ACTION:info] antwort     — bei uhrzeit, datum, speicher
[ACTION:app] antwort      — bei app, programm, terminal

KOMPLEX (NUR bei Programmierung, Recherche, 3+ Schritte):
Antworte: [HERMES: Aufgabe in 1 Satz]
```

## Action Handler (Python)

The `ActionHandler` class implements local actions. Current supported types:

| Action | Keywords | Behavior |
|--------|----------|----------|
| `spotify` | spotify, musik, song, playlist | Calls `spotify` CLI or xurl for control |
| `tab` | öffne, browser, google, youtube | Opens URLs via `xdg-open` |
| `timer` | timer, wecker, minute | System timer with threading.Timer |
| `info` | uhrzeit, datum, speicher | System info (time, date, RAM) |
| `app` | app, programm, terminal, code | Launches desktop applications |

Extend `ActionHandler.handle()` to add new action types (e.g., smart home devices, lights, volume control).

## Hermes Delegation

Complex tasks are sent to Hermes Agent:
```python
def delegate_to_hermes(task):
    result = subprocess.run(["hermes", "chat", "-q", task],
        capture_output=True, text=True, timeout=300)
    return result.stdout[:200]
```

Hermes should be configured with a **fast online model** for quick responses (not the local CPU model, which is too slow for Hermes' large system prompt).

## Voice Pipeline (STT)

```python
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")

def transcribe(audio_path):
    segments, info = model.transcribe(audio_path, language="de")
    return " ".join(seg.text for seg in segments)
```

## Voice Pipeline (TTS)

```python
from neutts import TTSEngine
engine = TTSEngine()

def speak(text, output_path="/tmp/tts_output.wav"):
    engine.synthesize(text, output_path)
    return output_path  # Feed MEDIA:<path> to Telegram
```

## Interactive Mode

```python
assistant = VoiceAssistant()
while True:
    text = input("Du: ")
    if text in ("exit", "quit"): break
    response = assistant.process_text(text)
    # response contains [ACTION:xxx], [HERMES:xxx], or plain text
```

## Lightweight Terminal Voice Input (voice-hermes)

For users who want **in-terminal voice input** without a separate GUI, voice-hermes provides:
- One-shot: record → transcribe → send to Hermes via `--continue`
- Uses **existing Whisper Turbo server** (port 8000) if available; falls back to local faster-whisper
- Records via **Windows ffmpeg.exe** (`dshow` → fifine Microphone)
- No second terminal needed: runs in the same window

### Script
`scripts/voice-hermes.py` — deployed to `~/.local/bin/voice-hermes` for direct CLI access.

### Dependencies
- ffmpeg.exe (Windows, for mic capture via dshow)
- faster-whisper (WSL Hermes venv, for transcription fallback)
- websockets (WSL Hermes venv, for Whisper Turbo connection)

### When to use this vs. the full local voice assistant
| Use case | Which |
|----------|-------|
| Quick voice query in Hermes | voice-hermes (this) |
| Always-on wake-word assistant | Full local-voice-assistant with Porcupine |
| Smart home / Spotify control | Full assistant |
| Debugging / complex task dictation | voice-hermes (fast, no setup) |

## Pitfalls

### Hermes Context Too Large for Local CPU Model
Hermes sends a 4K-12K token system prompt. At ~42 tok/s (CPU), prompt processing takes 90-300s, causing timeouts. **Use a cloud/online model for Hermes** and keep the local model for short prompts only.

### openWakeWord Training Library Versions
- `AddColoredNoise` → `AddColorNoise`, params `min_snr_in_db` → `min_snr_db` (audiomentations v1+)
- `AudioFeatures(device=..., inference_framework=...)` → `AudioFeatures(ncpu=...)` (openWakeWord v1.3+)
- PyTorch 2.12+ ONNX export needs `pip install onnxscript`
- Edge-TTS sequential calls are slow (~3s each). Always use `asyncio.as_completed` + `Semaphore(5)` for batches.
If `content` is empty but `reasoning_content` is populated, the model's `<|think|>` token is interfering. Fix: use a custom chat template without `<|think|>`. See the `llama-cpp` skill for details.

### Systemd + Custom Chat Templates
Single-line Jinja templates in systemd `ExecStart` get mangled. Use `--no-jinja` as fallback for systemd services.

### Parallel Build Conflicts
Multiple concurrent `make -j` on llama.cpp can cause `.d` dependency file conflicts. Use `make -j$(nproc) llama-server` (single target) or clean build.

### Draft Model Architecture Mismatch
Not all assistant/draft models are supported by llama.cpp (e.g., `gemma4_assistant`). Use `--model-draft` and check the error message. Fall back to no draft or use Transformers.

## References

- `references/gui-overlay.md` — Complete tkinter notch overlay implementation (status dot, live text, drag, thread-safe updates)
- `references/telegram-voice-bot.md` — Telegram voice bot integration (separate bot or alternating mode)
- `references/gemma4-hermes-cpu-setup.md` — Full CPU deployment guide for Gemma 4 with systemd
- `references/vulkan-hermes-setup.md` — GPU-backed setup if Vulkan works
- `references/telegram-voice-bot.md` — Telegram voice bot integration (separate bot or alternating mode)
- `references/voice-input-terminal.md` — Voice-input CLI tool for Hermes terminal (ffmpeg.exe + Whisper Turbo)

## Templates

- `templates/voice-assistant.py` — Core Assistant (Linux/WSL CLI interactive mode)
- `templates/voice_assistant_windows.py` — Windows always-on assistant with openWakeWord, GUI overlay (tkinter notch), VAD, TTS, and Hermes delegation
- `templates/start_assistent.bat` — Windows batch file for PC startup autolaunch (uses openWakeWord, no API key)

## Custom Wake-Word Training (openWakeWord)

Train your own wake-word models (e.g. "Leyna", "Jeff") for fully local, low-latency keyword spotting instead of relying on Porcupine's pre-built keywords.

### Workflow

Generate synthetic training data via Edge-TTS → augment audio → compute openWakeWord features → train PyTorch DNN → export ONNX. The models drop directly into `openwakeword.Model`:

```python
from openwakeword import Model
oww = Model(wakeword_models=["leyna_wakeword.onnx", "jeff_wakeword.onnx"],
            inference_framework="onnx")
result = oww.predict(audio_frame)  # returns dict of scores
```

### Reference

`references/openwakeword-training.md` — full training pipeline with:
- Edge-TTS concurrent generation (asyncio + Semaphore, ~10min vs ~50min sequential)
- Standard openWakeWord augmentation set (EQ, Distortion, Pitch, Noise, Gain)
- Feature extraction with correct API for newer library versions
- Model architecture (identical to `openwakeword/train.py`)
- Three-sequence training with weighted loss and checkpoint merging
- ONNX export with PyTorch 2.12+ compatibility
- Library version pitfalls documented (audiomentations renames, AudioFeatures API changes, onnxscript dependency)

### When to Custom-Train vs Use Porcupine

| Factor | Porcupine (built-in) | Custom openWakeWord |
|--------|-------------------|-------------------|
| Setup | Zero (pre-built keywords) | 10-30 min training |
| Keywords | "Computer", "Hey Google", "Alexa", etc. | Any word/phrase |
| Language | English keywords | Any language |
| Latency | ~50ms | ~30ms (smaller model) |
| Quality | Production-grade | Depends on training data |

## Windows Always-On Mode

A fully autonomous voice assistant for Windows that:
1. **Listens continuously** for a wake-word ("Computer" via Porcupine OR custom model)
2. **Records voice** with VAD (3 seconds of silence = stop)
3. **Transcribes** via faster-whisper in WSL
4. **Processes** via Gemma 4 (simple) or Hermes (complex)
5. **Responds** via Windows TTS (pyttsx3/SAPI5)

### Architecture (Windows + WSL)

```
┌─ Windows ─────────────────────┐    ┌─ WSL ───────────────────┐
│ voice_assistant_windows.py    │    │ Gemma 4 Server          │
│                               │    │ (llama-server :8080)    │
│  Mikrofon → Wake-Word (PC)    │◄──►│                          │
│  Porcupine → Audio → VAD     │    │ faster-whisper (STT)    │
│  → WSL transcribe → LLM      │    │                          │
│  → TTS (pyttsx3) ←───────────┤    │ Hermes Agent (komplex)  │
│                               │    │                          │
│ Windows Autostart (BAT) ──────┤    │ systemd: gemma4-server  │
└───────────────────────────────┘    └─────────────────────────┘
```

### Setup on Windows

**1. Install Python dependencies** (Windows Python, not WSL):
```cmd
pip install pvporcupine sounddevice webrtcvad requests pyttsx3
```

**2. Get Picovoice Access Key** (free, required for Porcupine):
- Register at https://console.picovoice.ai/
- Set as environment variable: `setx PICOVOICE_ACCESS_KEY "your_key"`

**3. Ensure WSL Gemma server is running** (in WSL):
```bash
systemctl --user enable --now gemma4-server
```

**4. Deploy files** to `C:\Users\<username>\Desktop\GemmaAssistant\`:
- `voice_assistant_windows.py` — main script
- `start_assistent.bat` — batch launcher

**5. Windows Autostart**: Create shortcut of `start_assistent.bat` in shell:startup folder.

### Windows Bot Features

| Component | Implementation |
|-----------|---------------|
| Wake-Word | Porcupine ("computer" — standard, free) |
| Audio Capture | sounddevice (`sd.InputStream`, 16kHz, int16) |
| VAD | webrtcvad (aggressiveness=2, 3s silence threshold) |
| STT | faster-whisper via `wsl -e bash -c "..."` |
| LLM | Gemma 4 via HTTP to WSL llama-server (:8080) |
| TTS | pyttsx3 (Windows SAPI5, preferred German voice) |
| Simple actions | Windows subprocess (start url, calc, notepad) |
| Complex delegation | Hermes via `wsl -e hermes chat -q ...` |

### Telegram Voice Bot (Alternative to Mic)

A Python Telegram bot that processes voice messages:
- Runs alongside (or alternates with) the Hermes Gateway
- Voice → STT → Assistant → TTS → Voice reply
- Text → Hermes delegation
- Uses the same action handler pattern

**Important**: Telegram only allows one connection per bot token (Webhook XOR Polling). The voice bot runs in polling mode, so the Hermes Gateway must be stopped:
```bash
# From the controller script:
systemctl --user stop hermes-gateway
python3 telegram-voice-bot.py
```

Or create a second Telegram bot for voice-only and keep Gateway for text.

### Troubleshooting Windows Assistant

- **"No module named 'pvporcupine'"** → Run `pip install pvporcupine` on Windows Python
- **"Porcupine requires access_key"** → Set `PICOVOICE_ACCESS_KEY` environment variable
- **"Gemma Server not reachable"** → Ensure WSL is running: `wsl -e echo OK`
- **No TTS audio** → Check Windows speech settings; pyttsx3 uses default SAPI5 voice
- **Wake-word not detected** → Speak clearly with slight pause before "computer"
