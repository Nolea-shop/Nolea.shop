# Windows Voice Assistant — Full Implementation Reference

This file documents the complete Windows-native voice assistant system built
during this session: an always-on, wake-word-activated assistant with a
tkinter GUI overlay and Hermes Agent integration.

## Architecture Decisions

### Why openWakeWord over Porcupine

| Factor | openWakeWord | Porcupine |
|--------|-------------|-----------|
| API key | **None** | Required (free, but still) |
| Offline | ✅ | ✅ |
| Wake words | 5 built-in ("computer", "alexa", etc.) | Many, but most need custom training |
| CPU usage | ~10-15% of one core | ~5-8% |
| pip install | `pip install openwakeword` | `pip install pvporcupine` |

### Why pyttsx3 over edge-tts / gTTS

pyttsx3 uses Windows' built-in SAPI5 speech synthesizer — no network calls
and no audio file management. Edge TTS is better quality but requires async
I/O and temporary files.

### Why tkinter over PyQt / Electron

tkinter ships with Python stdlib — no extra dependency. The overlay needs
only basic shapes, text, and transparency. PyQt or Electron would add
50-300 MB of dependencies for identical functionality.

## Complete File Structure on D:\

```
D:\hermes\GemmaAssistant\
├── start_assistent.bat       ← Windows autostart entry point
├── voice_assistant_windows.py ← Main loop
└── gui_overlay.py            ← tkinter overlay (imported)
```

## BAT File

Purpose: Validate Python, start WSL Gemma server, launch Python script,
keep console open so errors are visible.

```batch
:: start_assistent.bat
@echo off
title Gemma 4 Sprachassistent

:: Pruefe Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python nicht gefunden!
    pause
    exit /b 1
)

:: WSL Gemma Server starten (im Hintergrund)
start /B wsl -e bash -c \
  "systemctl --user start gemma4-server 2>/dev/null || \
   nohup ~/llama.cpp/build/bin/llama-server \
   --model ~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf \
   --port 8080 --host 127.0.0.1 --ctx-size 8192 --threads 16 \
   > /dev/null 2>&1 &"
timeout /t 5 /nobreak >nul

python "%~dp0voice_assistant_windows.py"

echo ===== Skript beendet (Code: %ERRORLEVEL%) =====
echo Drueck Enter zum Schliessen...
pause >nul
```

## Main Python Script — Key Sections

### 1. Wake-word listener (openWakeWord)

```python
def wait_for_wake():
    oww = WakeModel(wakeword_models=[], inference_framework="onnx")
    WAKE_WORDS = ["alexa", "hey google", "hey computer", "computer"]
    
    with sd.InputStream(samplerate=16000, channels=1, dtype='int16', blocksize=1280) as s:
        while True:
            pcm = s.read(1280)[0]
            oww.predict(pcm[:, 0] / 32768.0)
            
            for ww in WAKE_WORDS:
                if ww in oww.prediction_buffer:
                    scores = oww.prediction_buffer[ww]
                    max_score = max(scores[-20:]) if scores else 0
                    if max_score > 0.5:
                        return
```

**Critical**: openWakeWord scores fluctuate. Check the max of the last 20
samples, not the instantaneous value. Threshold of 0.5 works well for
"computer" and "alexa".

### 2. Recording with VAD (3s silence)

```python
vad = webrtcvad.Vad(2)
buffer = bytearray()
last_voice = None

with sd.InputStream(samplerate=16000, channels=1, dtype='int16', blocksize=480) as s:
    while True:
        frame = s.read(480)[0].tobytes()
        buffer.extend(frame)
        
        is_speech = vad.is_speech(frame, SR)
        if is_speech:
            last_voice = time.time()
        elif last_voice and time.time() - last_voice >= 3:
            break  # 3s silence → stop
```

VAD aggressiveness of 2 (medium) works best for desktop environments.
Level 3 (most aggressive) cuts off natural pauses. Level 1 misses quiet speech.

### 3. STT via WSL faster-whisper

```python
def transcribe(wav_path):
    r = subprocess.run(["wsl", "-e", "bash", "-c",
        f"cd ~/.hermes/models/gemma4 && ~/gemma4-env/bin/python3 -c \""
        f"from faster_whisper import WhisperModel; "
        f"m = WhisperModel('base',device='cpu',compute_type='int8'); "
        f"print(' '.join(s.text for s in m.transcribe('{wav_path}',language='de')[0]))"
        "\""],
        capture_output=True, text=True, timeout=60)
    return r.stdout.strip()
```

Note: The `language='de'` parameter is required for German. Remove it for
auto-detection (slower but multilingual).

### 4. Gemma 4 HTTP call

```python
def ask(text):
    r = requests.post("http://127.0.0.1:8080/v1/chat/completions", json={
        "messages": [
            {"role":"system","content":SYSTEM_PROMPT},
            {"role":"user","content":text}
        ],
        "max_tokens":100,"temperature":0.3
    }, timeout=60)
    return r.json()['choices'][0]['message']['content']
```

### 5. Action dispatch

```python
def do_action(response, gui):
    if response.startswith("[HERMES:"):
        task = response.split("] ",1)[-1] if "] " in response else response[8:].rstrip("]")
        gui.set_hermes()
        speak("Ich leite das an Hermes weiter.", gui)
        subprocess.Popen(["wsl","-e","hermes","chat","-q",task],
                        creationflags=subprocess.CREATE_NO_WINDOW)
    elif response.startswith("[ACTION:"):
        # Parse action type from [ACTION:spotify], [ACTION:tab], etc.
        parts = response.split("] ",1)
        atype = parts[0][8:].strip().lower()
        # Dispatch to spotify/tab/timer/app handlers
        ...
```

## Debugging Guide

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| BAT closes instantly | Python not in PATH | `where python` in cmd |
| GUI never appears | tkinter missing | Reinstall Python with "tcl/tk" option |
| "no module named openwakeword" | Not installed | `pip install openwakeword` |
| AttributeError: 'NotchOverlay' has no attribute 'running' | self.running too late | Must set before _poll_queue() |
| No audio recorded | Wrong mic device | `sounddevice.query_devices()` |
| STT returns empty | WSL not running | `wsl --status` |
| Gemma server no response | Server not started | `systemctl --user status gemma4-server` |
| TTS speaks English | No German voice | Check `engine.getProperty('voices')` |
| High CPU (20%+ idle) | openWakeWord polling | Acceptable for always-on (~10-15%) |
