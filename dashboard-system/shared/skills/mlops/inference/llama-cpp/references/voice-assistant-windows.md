# Windows Voice Assistant with Local LLM

Local voice assistant architecture: always-on microphone → VAD → STT → local LLM → action → TTS.

## Architecture: Two-Tier Dispatch

```
🎙 Microphone → VAD → STT (faster-whisper) → Text
                                        │
                          ┌─────────────┴─────────────┐
                          ▼                           ▼
                   [ACTION:spotify|tab|timer]    [HERMES: complex task]
                          │                           │
                          ▼                           ▼
                 Direct execution              Hermes Agent
                 (no agent overhead)           (full tool access)
```

- **Tier 1 (simple):** The LLM classifies the request. If it's a keyword-triggered action like "Spotify next song" or "open YouTube", the LLM responds with `[ACTION:spotify|tab|timer] ...` — the script executes it directly without agent overhead. Response time: ~2-5s.
- **Tier 2 (complex):** If the request involves coding, multi-step planning, or research, the LLM responds with `[HERMES: task description]`. The script passes the task to Hermes Agent for full tool access.

## VAD-Only Wake Word (No API Key)

Instead of ML-based wake word engines (Porcupine, openWakeWord) that require API keys or model downloads, use **VAD-only detection** with a post-transcription text check:

```
1. webrtcvad detects voice activity → starts recording
2. Record continues for 3s after last speech (silence timeout)
3. faster-whisper transcribes the audio
4. Scan transcription for "gemma" (or your wake word)
5. If found → remove "gemma" and process the rest as the command
6. If not found → discard (false positive from background noise)
```

**Benefits:** No API keys, no model downloads, no false positives on short sounds, works with arbitrary wake words.

### Implementation

```python
import webrtcvad
import sounddevice as sd

# Phase 1: VAD triggers on speech (collects audio from the start)
vad_check = webrtcvad.Vad(1)  # mode 1 = less aggressive
with sd.InputStream(samplerate=16000, channels=1, dtype='int16', blocksize=480) as s:
    speech_frames = 0
    while not detected:
        frame = s.read(480)[0]
        if vad_check.is_speech(frame.tobytes(), 16000):
            speech_frames += 1
            if speech_frames > 2:  # ~90ms of speech = trigger
                detected = True
        else:
            speech_frames = 0
            audio_buffer.extend(frame.tobytes())  # collect audio during VAD wait

# Phase 2: separate stream for continuous recording (avoids alloc conflicts)
time.sleep(0.1)
# ... record until 3s silence ...

# Phase 3: STT + wake word check
text = faster_whisper_transcribe(wav_file)
if 'gemma' not in text.lower():
    discard()  # not directed at assistant
command = text.lower().replace('gemma', '', 1).strip()
```

**Pitfall:** Use **two separate sounddevice streams** (VAD detection + recording) with a `time.sleep(0.1)` gap. A single stream causes `alloc: invalid block` errors when the buffer overruns the VAD wait loop.

**Pitfall:** The `webrtcvad` package shows a deprecation warning on Python 3.14 (`pkg_resources is deprecated`). This is cosmetic — the library works correctly. Suppress with `import warnings; warnings.filterwarnings('ignore', category=UserWarning, module='webrtcvad')`.

## STT: faster-whisper via WSL

If the LLM runs in WSL (Linux), run faster-whisper there too:

```python
import subprocess

def stt(wav_path):
    result = subprocess.run(["wsl", "-e", "bash", "-c",
        f"python3 -c \"from faster_whisper import WhisperModel; "
        f"m = WhisperModel('base', device='cpu', compute_type='int8'); "
        f"print(' '.join(s.text for s in m.transcribe('{wav_path}')"
        f"[0]))\""
    ], capture_output=True, text=True, timeout=60)
    return result.stdout.strip()
```

Key: Convert Windows path (`C:\...`) to WSL path (`/mnt/c/...`).

## TTS: Edge-TTS with playsound

For natural voice output on Windows, use Microsoft Edge Neural TTS:

```cmd
pip install edge-tts playsound
```

```python
import edge_tts, asyncio, tempfile
from playsound import playsound

def speak(text, voice="de-DE-SeraphinaMultilingualNeural"):
    mp3 = tempfile.mktemp(suffix=".mp3")
    asyncio.run(edge_tts.Communicate(text, voice).save(mp3))
    playsound(mp3)  # blocking
    os.unlink(mp3)
```

**Voice options (German):**
- `de-DE-SeraphinaMultilingualNeural` — natural female voice
- `de-DE-KatjaNeural` — female
- `de-DE-ConradNeural` — male

**Pitfall:** `playsound` is pure Python (no C extension) so it works with Python 3.14+. `pygame` requires compilation and fails on 3.14. `miniaudio` has API instability (no stable `play_file` function across versions).

**Pitfall:** `edge-tts` requires internet on first call (downloads voice model). After caching, it works offline. If edge-tts is unavailable, fall back to `pyttsx3` (Windows SAPI5).

## GUI Overlay: tkinter Notch

Always-on-top transparent overlay showing assistant status:

```python
import tkinter as tk

class NotchOverlay:
    def __init__(self):
        self.root = tk.Tk()
        self.root.overrideredirect(True)
        self.root.attributes('-topmost', True)
        self.root.attributes('-transparentcolor', '#000001')
        # ... canvas drawing, status dot, live text ...
    
    def set_listening(self):  # green dot
    def set_thinking(self):    # yellow dot
    def set_speaking(self):    # blue dot
    def show_text(self, msg):  # live transcription
```

**Key tkinter techniques:**
- `overrideredirect(True)` = no title bar
- `attributes('-topmost', True)` = always on top
- `attributes('-transparentcolor', color)` = click-through transparency
- `create_polygon(smooth=True)` + `math.cos/sin` for smooth rounded rectangles
- `after(16, loop)` for 60fps animation
- `queue.Queue` for thread-safe updates from async TTS/STT workers

**Pitfall:** tkinter accepts **only 6-digit hex** colors (`#ffffff`). 8-digit RGBA (`#00000000`) causes `_tkinter.TclError: invalid color name`.

## Microphone Selection

Auto-detect a specific microphone by name:

```python
devices = sd.query_devices()
for i, dev in enumerate(devices):
    if 'fifine' in dev['name'].lower():
        sd.default.device = i
        break
```

## System Architecture Overview

```
┌───────────────────────────────────────────────────────┐
│                   Windows PC                          │
│                                                       │
│  start_assistent.bat (Autostart via shell:startup)   │
│         │                                             │
│  voice_assistant_windows.py                           │
│    ├── tkinter Notch (GUI overlay, always-on-top)    │
│    ├── VAD + sounddevice (16kHz, 30ms frames)        │
│    ├── STT → subprocess → WSL: faster-whisper        │
│    ├── LLM → http://127.0.0.1:8080 (llama-server)    │
│    ├── Action dispatch (local or Hermes)             │
│    └── TTS → Edge-TTS → playsound                    │
│                                                       │
│  ┌────────── WSL ───────────────────────────────┐    │
│  │  llama-server (gemma-4-E4B-it-Q5_K_M.gguf)   │    │
│  │     ↓                                         │    │
│  │  faster-whisper (STT)                         │    │
│  │     ↓                                         │    │
│  │  hermes agent (for complex tasks)             │    │
│  └───────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```
