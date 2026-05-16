# Gemma 4 E4B-it CPU Setup — Full Walkthrough

This reference documents the complete CPU-based deployment of Gemma 4 E4B-it
with llama.cpp, configured for Hermes Agent integration. Use this when GPU
builds fail or are unavailable.

## 1. Download Models

Get pre-converted GGUF files from HuggingFace (skip manual conversion).

**Target model** (Q5_K_M, 5.11 GB — best quality/speed balance):
```bash
mkdir -p ~/.hermes/models/gemma4
wget -c -O ~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf \
  "https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q5_K_M.gguf"
```

**Draft model** (try after verifying target works):
```bash
wget -c -O ~/.hermes/models/gemma4/gemma-4-E4B-it-assistant.Q4_K_M.gguf \
  "https://huggingface.co/AtomicChat/gemma-4-E4B-it-assistant-GGUF/resolve/main/gemma-4-E4B-it-assistant.Q4_K_M.gguf"
```

**⚠ Warning:** The `gemma4_assistant` architecture is not yet supported by
llama.cpp speculative decoding. Using `--model-draft` fails with:
`error loading model: unknown model architecture: 'gemma4_assistant'`
The draft model download is for future-proofing only.

## 2. Build llama.cpp for CPU

```bash
cd ~/llama.cpp
rm -rf build && mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc) llama-server   # ~3-5 min on 16 cores
```

**Avoid** any `-DGGML_VULKAN=ON` flags for CPU-only builds.

## 3. Start Server (with NO thinking mode)

Gemma 4 includes a `<|think|>` token that causes empty `content` responses.
Use a custom chat template to disable it:

```bash
llama-server \
  --model ~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --ctx-size 65536 \
  --threads 16 --threads-batch 16 \
  --batch-size 4096 --ubatch-size 512 \
  --no-warmup --timeout 300 \
  --chat-template '{% if not add_generation_prompt is defined %}{% set add_generation_prompt = false %}{% endif %}{% for message in messages %}{{"<|turn|>" + message["role"] + "\n" + message["content"] + "<|end|>\n"}}{% endfor %}{% if add_generation_prompt %}{{"<|turn|>model\n"}}{% endif %}'
```

## 4. Systemd Service (Autostart)

**⚠ Pitfall:** The custom chat template breaks in systemd `ExecStart` because
Jinja `{{ }}` syntax conflicts with systemd's line escaping. Simple fix:
use `--no-jinja` in the service file and accept thinking content fallback.

Service file: `~/.config/systemd/user/gemma4-server.service`
```ini
[Unit]
Description=Gemma 4 E4B-it Server (llama.cpp CPU)
After=network.target

[Service]
Type=simple
ExecStart=/home/damia/llama.cpp/build/bin/llama-server \
  --model /home/damia/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --ctx-size 65536 --threads 16 --batch-size 4096
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

## 5. Two-Tier Voice Assistant Architecture

Direct Hermes Agent → local llama.cpp is **too slow** (12K system prompt = 300s).
Instead, build a 2-tier system:

```
User → [Voice Assistant (Windows/mic)] → STT → Gemma 4 (short prompt, <5s)
  │                                                  │
  ├─ Simple: [ACTION:spotify|tab|timer]              │
  │     → local action (Spotify CLI, xdg-open)       │
  └─ Complex: [HERMES: task] → Hermes Agent (WSL)    │
                                                      │
Note: For Hermes delegation to be fast, configure     │
Hermes with a fast cloud model (not the local CPU     │
one), or accept 300s+ latency for complex tasks.      │
```

**Key insight:** The voice assistant's system prompt is ~200 tokens.
Gemma 4 processes this in <5s on CPU. This makes 2-tier viable even on
slow hardware.

## 6. Configuration

**server.py** (FastAPI alternative, transformers-based):
```python
# If you want to use the official Google checkpoint (not GGUF):
# pip install transformers torch accelerate
# See hermes-agent skill: references/gemma4-fastapi-server.py template
```

**Hermes config.yaml:**
```yaml
model:
  default: "gemma-4-E4B-it-local"
  provider: "custom"
  base_url: "http://127.0.0.1:8080/v1"
```

## 7. Verification

```bash
# Server running?
curl -s -m 5 http://127.0.0.1:8080/health

# Quick chat test (should return content, not reasoning_content)
curl -s -m 30 -X POST http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"say hello"}],"max_tokens":20}'

# Hermes test (only if Hermes is configured for local server)
hermes chat -q "Sag hallo" --model gemma-4-E4B-it-local
```
