---
name: voice-assistant
description: >-
  Build always-on, wake-word-activated voice assistants with local LLMs
  (Gemma 4, Llama), STT/TTS, and Windows GUI overlays.
  Covers V1 blocking and V2 streaming architectures, WSL integration,
  and GPU deployment via Windows pre-built llama-server.exe.
version: 2.0.0
author: Hermes Agent
license: MIT
tags: [voice, assistant, stt, tts, wake-word, streaming, wsl, gpu, windows]
---

# Voice Assistant — Class-Level Skill

Contains BOTH architectures:
- **V1 (blocking):** Subprocess-based STT, simple VAD, CPU-only
- **V2 (streaming):** WebSocket STT server, hardware-split, GPU-accelerated

Design decisions are documented at the **class level**.
Project-specific file manifests go in `references/`.

## Architecture Comparison

```
V1 (Blocking — Legacy)                  V2 (Streaming — Current)
┌─────────────────────┐                 ┌──── Windows ────┐ ┌── WSL ──────────┐
│  wait_for_wake()    │                 │ openWakeWord    │ │ STT Server      │
│  ↓                  │                 │  ↓ (live)       │ │ FastAPI + WS    │
│  mic.read()*2.5s    │                 │ Ringbuffer 0.8s │ │ Whisper Turbo   │
│  ↓ (blocking)       │                 │  ↓ (stream)     │ │ (CPU, int8)     │
│  subprocess(WSL)    │     ⚡          │ WebSocket ─────►│ │ Port 8000       │
│  faster-whisper     │    V2           │  ↓ (0.6s pause) │ │  ↓ (final text) │
│  ↓                  │                 │ webrtcvad Vad(3)│◄───── JSON ──────│
│  HTTP → llama.cpp   │                 │  ↓               │                  │
│  (WSL CPU, ~10s)    │                 │ HTTP → llama-server (Windows GPU)  │
│  ↓                  │                 │ Port 8080 (Vulkan, RX 6700, ~1-2s) │
│  TTS (edge-tts)     │                 │ TTS (edge-tts)                     │
└─────────────────────┘                 └────────────────────────────────────┘
```

**V2 improvements:**
- Hardware-split: STT on CPU (WSL), LLM on GPU (Windows native)
- Wake-word: openWakeWord with custom model support (auto-detect `leyna.onnx`)
- VAD: webrtcvad aggressiveness 3 → 0.6s silence (instead of 2.5s)
- Pre-roll ringbuffer for one-take mode (no "Ja?" interruption)
- Streaming: audio flows during speech, not after
- Reconnect: auto-reconnect on connection loss

## Prerequisites

### WSL Setup (Phase 1)
```ini
# C:\Users\%USERNAME%\.wslconfig
[wsl2]
networkingMode=mirrored
dnsTunneling=true
firewall=true
```
→ `wsl --shutdown` after editing.

Mirrored mode gives Windows and WSL a **shared localhost** — crucial for
cross-platform communication. Without it, IP routing is needed.

### Python Dependencies

**Windows:**
```cmd
pip install openwakeword sounddevice webrtcvad requests websockets edge-tts numpy
```

**WSL (inside project env):**
```bash
pip install faster-whisper fastapi uvicorn websockets numpy
```

## Core Components

### 1. STT Server (FastAPI WebSocket, WSL)

Persistent server replacing subprocess-based calls. Loads Whisper Turbo once,
accepts audio chunks via WebSocket, returns text via JSON.

**File:** `stt_server.py`
```python
# Key endpoints:
#   GET  /health         → {"status":"ok","model":"whisper-turbo"}
#   WS   /stream         → receive int16 PCM chunks, send b"END_OF_SPEECH", receive JSON

app = FastAPI(title="STT Server")
model = WhisperModel("turbo", device="cpu", compute_type="int8")
# ⚡ Performance: default beam_size=5 is ~3x slower than needed.
# Drop beam_size entirely or set to 1 for voice commands.
# segments, _ = model.transcribe(audio_np, language="de")  # fast
```

**Start:**
```bash
~/gemma4-env/bin/python3 -m uvicorn stt_server:app --host 0.0.0.0 --port 8000
```

**Systemd service** (`~/.config/systemd/user/stt-server.service`):
```ini
[Unit]
Description=STT Server (Whisper Turbo, CPU)
After=network.target
[Service]
Type=simple
WorkingDirectory=/home/damia/.hermes/models/gemma4
ExecStart=/home/damia/gemma4-env/bin/python3 -m uvicorn stt_server:app --host 0.0.0.0 --port 8000 --log-level warning
Restart=on-failure
RestartSec=5
[Install]
WantedBy=default.target
```
```bash
systemctl --user daemon-reload
systemctl --user enable --now stt-server.service
```

### 2. Wake-Word Engine — Two Approaches

**Preferred: STT-based (VAD + Whisper) — no training needed**

Instead of training a custom wake-word model (which requires Google Colab), use
the existing Whisper STT server to detect "Leyna" in speech:

1. VAD (`webrtcvad`) detects the user has started speaking
2. Buffer ~1.5 seconds of audio  
3. Send the buffer to the STT server via WebSocket
4. Check if the transcript contains "leyna" or "laynuh"
5. If yes: strip the wake-word, proceed with the command
6. If no: discard and go back to idle

```python
# Wake-word via STT (replaces openWakeWord)
if has_speech:
    self._ww_buffer.append(audio_chunk)
    if total_samples >= SR * 1.5:
        await ws.send(clip_bytes)
        await ws.send(b"END_OF_SPEECH")
        resp = await ws.recv()
        transcript = json.loads(resp)["text"].lower().strip()
        if "leyna" in transcript or "laynuh" in transcript:
            if "leyna" in transcript: idx = transcript.find("leyna")
            else: idx = transcript.find("laynuh")
            cmd = transcript[idx + len("leyna"):].strip()
            # proceed with command
```

Latency: ~1.5s buffer + ~1s STT = ~2.5s total for wake-word (pre-command).
This is noticeably slower than a dedicated wake-word model (~300ms) but requires
zero training and works with any wake-word/phrase.

**Fallback: openWakeWord** — local, no API key. Built-in words: `alexa`, `hey google`,
`hey computer`, `hey jarvis`, `computer`. Custom training requires Google Colab:
```
https://colab.research.google.com/github/dscripka/openWakeWord/blob/main/notebooks/automatic_model_training.ipynb
```
Set `target_word = 'laynuh'` → download `leyna.onnx` → place in project dir.

**Custom model auto-detect (openWakeWord):**
```python
ww_path = os.environ.get("LEVNA_WAKE_WORD",
    os.path.join(Path(__file__).parent, "leyna.onnx"))
use_ww = "alexa"  # fallback
if os.path.exists(ww_path):
    use_ww = ww_path
model = openwakeword.Model(wakeword_models=[use_ww])
```

**Model-agnostic prediction (always find max score):**
```python
prediction = model.predict(audio_chunk)
ww_name = max(prediction, key=lambda k: prediction.get(k, 0))
ww_score = prediction.get(ww_name, 0)
```

**VAD-Gate:** Always wrap wake-word in a webrtcvad speech check to prevent
false positives from background noise:
```python
if is_speech_frame and ww_score > 0.5:  # real speech, not noise
```

### 3. VAD (Voice Activity Detection)

| VAD | Aggressiveness | Silence | PyTorch? | Notes |
|-----|---------------|---------|----------|-------|
| webrtcvad | 2 (moderate) | ~1.5s | No | Python 3.14 compatible, allows short pauses |
| silero-vad | neural | ~0.3s | Yes (2GB+) | Not on Python 3.14 |

webrtcvad is preferred: no PyTorch dependency, works on Python 3.14.
**Do NOT use aggressiveness 3** — it causes premature cutoff after the wake-word.
Use level 2 and add a minimum-listen-time guard (1.5s) after wake-word detection.

**0.6s implementation (with 1.5s minimum listen guard):**
```python
vad = webrtcvad.Vad(2)
silence_frames = 0
max_silence = int(0.6 / 0.08)  # 80ms chunks → ~7 frames
min_listen_frames = 0
# In loop:
if not vad.is_speech(chunk_bytes, 16000):
    silence_frames += 1
else:
    silence_frames = 0
min_listen_frames += 1
if min_listen_frames > 18 and silence_frames > max_silence:  # ~1.5s min listen
    # END_OF_SPEECH
```
Without the 1.5s minimum listen guard, the assistant stops listening immediately
after the wake-word because the user pauses briefly between "Alexa" and the command.

### 4. LLM Server — GPU on Windows

**DO NOT install Ollama for AMD GPU.** AMD GPU passthrough does not work
in WSL (`vulkaninfo` shows only `PHYSICAL_DEVICE_TYPE_CPU`).
Ollama DirectML on Windows is an option but the user prefers pre-built
llama-server.exe.

**Approach:** Pre-built `llama-server.exe` with `ggml-vulkan.dll` from
GitHub Releases. The AMD RX 6700 is visible to Windows Vulkan natively.

**Download:**
```bash
curl -L -o llama-win-vulkan.zip \
  "https://github.com/ggml-org/llama.cpp/releases/download/b9159/llama-b9159-bin-win-vulkan-x64.zip"
```
Extract `llama-server.exe` + `ggml-vulkan.dll` to `llama-server-win/`.

**Start (Windows cmd):**
```cmd
llama-server.exe ^
    --model D:\path\to\gemma-4-E4B-it-Q5_K_M.gguf ^
    --port 8080 --host 127.0.0.1 ^
    --ctx-size 8192 ^
    --n-gpu-layers 99 ^
    --threads 8
```

**Performance:**
| Setup | Latency |
|-------|---------|
| CPU (WSL llama.cpp, 16 threads) | ~10s |
| GPU (Windows Vulkan, RX 6700) | ~1-2s |

**Cross-platform communication (Mirrored Mode):**
- STT Server: `ws://127.0.0.1:8000` (WSL)
- LLM Server: `http://127.0.0.1:8080` (Windows GPU)
- Client: Windows, connects both via localhost

### 8. Personality & System Prompt

Leyna's system prompt gives her a distinctive character. This is the user's
preferred personality for a voice assistant:

```text
Du bist Leyna, eine charmante, witzige deutsche Sprachassistentin.
Du hast eine lockere, freundliche Art und antwortest mit Persönlichkeit.
Bist neugierig, hilfsbereit und hast einen trockenen Humor.

EINFACHE AKTIONEN:
[ACTION:spotify] Nächstes Lied
[ACTION:tab] URL oder Suchbegriff öffnen
[ACTION:timer] X Minuten

KOMPLEX (für alles andere - YouTube, Browser, Recherche, Programmieren):
[HERMES: Beschreibung]

Sei natürlich, kein Roboter-Deutsch.
```

**Action format rules:**
- `[ACTION:...]` for simple one-step actions (spotify, tab, timer)
- `[HERMES: ...]` for EVERYTHING complex — YouTube search, web browsing,
  research, Obsidian notes, weather, news, file management, reminders
- No explanatory text alongside the action — just the tag

**Hermes delegation** runs via WSL:
```python
subprocess.Popen(["wsl", "-e", "hermes", "chat", "-q", task],
                 creationflags=subprocess.CREATE_NO_WINDOW)
```
This fires Hermes asynchronously. The user receives answers via Telegram or
whatever channel Hermes is connected to.

### 9. User Communication Preferences (voice-assistant)**

- Brief, direct responses — no explanations, no "I will now help you with that"
- Fixes over analysis — fix first, explain never
- German language always
- Single project directory: `D:\hermes\GemmaAssistant\`
- Delete old BATs — keep only the newest working one
- Rejected Ollama — use pre-built `llama-server.exe` from GitHub Releases
- Rejected openWakeWord Colab training — prefers STT-based wake-word
- Wants Leyna to have personality — not a robotic assistant

### 10. TTS (Text-to-Speech)
Plays via `ctypes.windll.winmm.mciSendStringW` (no pygame/miniaudio needed
on Python 3.14).

**Code:**
```python
import edge_tts, ctypes, asyncio, tempfile, os
mp3 = tempfile.mktemp(suffix=".mp3")
asyncio.run(edge_tts.Communicate(text, "de-DE-SeraphinaMultilingualNeural").save(mp3))
ctypes.windll.winmm.mciSendStringW(f'open "{mp3}" alias tts', None, 0, None)
ctypes.windll.winmm.mciSendStringW('play tts wait', None, 0, None)
ctypes.windll.winmm.mciSendStringW('close tts', None, 0, None)
os.unlink(mp3)
```

## Windows Integration — BAT Files

### Pitfall: `wsl -e` blocks the BAT
```batch
:: ❌ WRONG — wsl waits for uvicorn to exit
wsl -e bash -c "uvicorn ..."
timeout /t 3 /nobreak >nul

:: ✅ RIGHT — start /B runs WSL in background
start /B wsl -e bash -c "uvicorn ..." >nul 2>&1
timeout /t 5 /nobreak >nul
curl -s http://127.0.0.1:8000/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (echo OK) else (echo FAIL)
```

### Minimal BAT template:
```batch
@echo off
title Voice Assistant
where python >nul 2>&1 || (echo Python not found & pause & exit /b 1)

:: STT Server (background)
start /B wsl -e bash -c "~/gemma4-env/bin/uvicorn stt_server:app --host 0.0.0.0 --port 8000" >nul 2>&1
timeout /t 5 /nobreak >nul

:: GPU Server (background window)
start "LLM GPU" "%~dp0llama-server-win\llama-server.exe" --model "D:\...\model.gguf" --port 8080 --host 127.0.0.1 --n-gpu-layers 99

:: Client
python "%~dp0voice_assistant.py"
pause >nul
```

### Keep only one BAT
Delete old/duplicate BAT files. Keep the newest working one.
User preference: only the latest functional BAT should remain.

## Pitfalls

- **`asyncio + sounddevice callback`**: The `sd.InputStream` callback runs in a
  **different thread**. `asyncio.get_running_loop()` raises `RuntimeError`.
  Fix: save the loop reference in `run()` and use `self._loop` in the callback.
  ```python
  class Assistant:
      def __init__(self):
          self._loop = None  # set in run()
      def audio_callback(self, indata, frames, time, status):
          if self._loop is not None and self._loop.is_running():
              self._loop.call_soon_threadsafe(self.queue.put_nowait, data)
      async def run(self):
          self._loop = asyncio.get_running_loop()
  ```
  Without this fix, the queue never receives audio and the program hangs silently.

- **webrtcvad frame size must be 160/320/480 samples** (10/20/30ms @ 16kHz).
  Using 1280 samples (80ms) raises `ValueError: sample rate / frame size not valid`.
  Fix: use only the first 480 samples of each chunk for VAD:
  ```python
  CHUNK_SIZE = 1280  # 80ms for openWakeWord
  VAD_SIZE = 480     # 30ms for webrtcvad
  is_speech = vad.is_speech(audio_np[:VAD_SIZE].tobytes(), SR)
  ```
  Without this fix, the program loops "❌ Error while processing frame".

- **VAD-Gate for wake-word (false positives)**: openWakeWord can trigger on
  background noise, music, or random sounds — not just the actual wake-word.
  Fix: require BOTH a webrtcvad speech frame AND an openWakeWord score > 0.5:
  ```python
  is_speech_frame = vad.is_speech(chunk[:480], 16000)
  if is_speech_frame and ww_score > 0.5:
      # actual wake-word confirmed
  ```
  Without VAD gate, the assistant triggers on silence/noise and transcribes
  whatever the VAD picks up (fridge hum, fan, etc.) as nonsense commands.

- **TTS variable name shadowing**: Using `t` for BOTH the cleaned text string
  AND the Thread variable crashes edge-tts with "text must be str" because the
  closure captures the Thread reference, not the string. Always use distinct names:
  ```python
  tts_text = cleaned_text  # string
  thr = threading.Thread(target=lambda: edge_tts.Communicate(tts_text, ...))
  thr.start()
  ```**: `asyncio.new_event_loop()` called from within
  an async function crashes: "Cannot run the event loop while another loop is running".
  Fix: run edge-tts in a separate thread with its own isolated event loop:
  ```python
  def _tts_job():
      loop = asyncio.new_event_loop()
      asyncio.set_event_loop(loop)
      loop.run_until_complete(edge_tts.Communicate(t, voice).save(mp3))
      loop.close()
  thread = threading.Thread(target=_tts_job, daemon=True)
  thread.start()
  thread.join()
  ```

- **GPU VRAM warning `alloc: invalid block`**: Gemma 4 Q5_K_M (5.2GB) + 8192
  context + 4 slots can exceed 10GB VRAM on the RX 6700. This appears as
  "alloc: invalid block: 0000..." in the llama-server window. The server
  usually keeps running but responses may be slow. Fix: reduce `--ctx-size` or
  `--n-gpu-layers` if it persists.

- **`start /B wsl -e` is mandatory** for non-blocking WSL calls from Batch.
  No AMD GPU passthrough. Run the LLM server on Windows natively.

- **Ollama**: User explicitly rejects this approach. Use pre-built
  `llama-server.exe` from GitHub Releases instead.

- **Python 3.14**: No PyTorch/Pygame wheels. Use webrtcvad (not silero-vad)
  and edge-tts + ctypes MCI (not playsound/pygame).

- **openWakeWord first import**: Downloads models from the internet.
  Can hang on first start — just wait.

- **openWakeWord prediction keys**: When using custom models, the dict key
  changes from `"alexa"` to the custom model name. Always use the
  max-score approach: `max(prediction, key=lambda k: prediction.get(k,0))`.

- **tkinter GUI**: `self.running` must be set BEFORE `self._poll_queue()`.
  All GUI updates from worker threads go through `queue.Queue()`.

## References

See `references/` for:
- `references/leyna-v2-implementation.md` — full file manifest, BAT scripts,
  Windows paths, and debugging log (5 bugs found & fixed)
- `references/voice-assistant-windows.md` — V1 legacy source code
- `references/custom-wake-word-training.md` — Colab training instructions
- `templates/notch-overlay.py` — tkinter overlay template
