# Leyna V2 Implementation — Session Record

## Date
2026-05-15

## Context
Migrated Gemma V1 (blocking, CPU-only) → Leyna V2 (streaming, GPU-accelerated).

## Architecture

| Component | Location | Tech | Port |
|-----------|----------|------|------|
| STT Server | WSL | FastAPI + WebSocket, Whisper Turbo CPU int8 | 8000 |
| LLM Server | Windows | llama-server.exe + ggml-vulkan.dll (RX 6700) | 8080 |
| Client | Windows | Python 3.14, sounddevice, webrtcvad | — |
| GUI | Windows | tkinter (Notch overlay) | — |
| TTS | Windows | edge-tts + ctypes.winmm MCI | — |

## Hardware
- AMD Radeon RX 6700 (10GB VRAM) — only accessible from Windows Vulkan, NOT from WSL
- AMD Ryzen 7 5700X — 32GB RAM
- Fifine microphone (Index 1 on Windows)

## File Manifest (D:\hermes\GemmaAssistant\)

| File | Purpose | Size |
|------|---------|------|
| `voice_assistant_windows_v2.py` | Main V2 client (12KB) | Active |
| `stt_server.py` | FastAPI WebSocket STT server (WSL) | Active |
| `gui_overlay.py` | Tkinter notch overlay | Shared with V1 |
| `start_leyna_complete.bat` | All-in-one startup (STT+GPU+Client) | Active |
| `start_gpu_helper.bat` | GPU server in separate window | Helper |
| `CUSTOM_WAKE_WORD.md` | Colab training instructions | Reference |
| `gemma-4-E4B-it-Q5_K_M.gguf` | Main model, 5.2GB | WSL + Windows copies |
| `llama-server-win/llama-server.exe` | Windows Vulkan binary, 12MB | Pre-built |
| `llama-server-win/ggml-vulkan.dll` | Vulkan backend, 55MB | Pre-built |

## WSL Files

| Path | Purpose |
|------|---------|
| `/home/damia/.hermes/models/gemma4/stt_server.py` | STT server (WSL copy) |
| `/home/damia/.config/systemd/user/stt-server.service` | Systemd auto-start |
| `/home/damia/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf` | Model (5.2GB) |
| `/home/damia/.config/systemd/user/gemma4-server.service` | Old CPU server service |

## Bugs Found & Fixed (5 total)

### 1. asyncio event loop in sounddevice callback
**Symptom:** Program connects to STT server but never processes audio (hangs silently).
**Root cause:** `asyncio.get_running_loop()` raises RuntimeError in sounddevice's callback thread.
**Fix:** Save loop reference in `run()` as `self._loop`, use `self._loop.call_soon_threadsafe()` in callback.
**Line:** `self._loop = asyncio.get_running_loop()` in `run()`, `self._loop` in `audio_callback()`.

### 2. webrtcvad frame size validation
**Symptom:** "Error while processing frame" in infinite loop after wake-word.
**Root cause:** webrtcvad only accepts 160/320/480 samples (10/20/30ms @ 16kHz). CHUNK_SIZE=1280 is 80ms.
**Fix:** `VAD_SIZE = 480`, use `audio_np[:VAD_SIZE]` for VAD checks.
**Line: 18, 211**
**Lesson:** Always validate VAD frame size against sample rate.

### 3. TTS event loop conflict
**Symptom:** "Cannot run the event loop while another loop is running" from edge-tts.
**Root cause:** `asyncio.new_event_loop()` called inside an async function's synchronous context.
**Fix:** Run TTS in a separate daemon thread with `asyncio.new_event_loop()` + `set_event_loop()`.

### 4. TTS variable name collision
**Symptom:** edge-tts error "text must be str" even though a string was passed.
**Root cause:** Variable `t` used for BOTH the cleaned text string AND the Thread object. Closure captured the Thread.
**Fix:** Rename thread variable to `thr`.

### 5. VAD aggressiveness too high
**Symptom:** Assistant stops listening immediately after wake-word (no pause allowed).
**Root cause:** webrtcvad.Vad(3) requires very high energy to detect speech. Normal pauses between words trigger silence.
**Fix:** Vad(2) + 1.5s minimum-listening-time guard after wake-word.

## GPU Note
AMD GPU (RX 6700) is NOT visible to WSL Vulkan (`PHYSICAL_DEVICE_TYPE_CPU`).
The GPU IS visible to Windows Vulkan. Solution: run llama-server.exe on Windows
natively using the pre-built binary from GitHub Releases.
`vulkaninfo` on WSL: GPU0 vendorID=0x10005 (Mesa/LLVMpipe), NOT the RX 6700.
`vulkaninfo` on Windows: actual AMD Radeon RX 6700 with 10GB VRAM.

## Remaining Issues
- `alloc: invalid block` warning from llama-server (may indicate VRAM pressure)
- Gemma 4 chat template needs `<|think|>` mode disabled for assistant role
- Wake-word via VAD+STT has ~2.5s latency (could use openWakeWord if trained)
