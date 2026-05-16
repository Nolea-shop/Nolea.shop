# Vulkan + Hermes Agent: Local GGUF Model Setup

Complete walkthrough for running a local GGUF model with AMD/Intel GPU acceleration (Vulkan)
and integrating it as a Hermes Agent provider.

## Use Case

Run any GGUF-compatible model fully locally with:
- **GPU acceleration** via Vulkan (works with AMD Radeon, Intel Arc/UHD, NVIDIA with NVK)
- **Speculative decoding** with assistant (draft) model for 2-3x speedup
- **Hermes Agent** as the client (OpenAI-compatible API)
- Optional: local STT (faster-whisper) + TTS (Edge-TTS / neutts) for voice I/O

## Prerequisites

| Requirement | Check |
|-------------|-------|
| WSL2 or Linux | `wsl --version` (Windows) or `uname -a` |
| 32GB+ RAM recommended | `free -h` |
| AMD/Intel GPU with Vulkan | `ls /usr/share/vulkan/icd.d/` should show GPU ICD |
| Mesa Vulkan drivers | `sudo apt-get install mesa-vulkan-drivers vulkan-tools` |
| ~10 GB disk per 4B model | `df -h` |
| Hermes Agent installed | `hermes --version` |
| cmake | `sudo apt-get install cmake` — **pip cmake fehlt FindVulkan!** |
| git, gcc, g++, make | `sudo apt-get install build-essential git` |
| Vulkan dev + shader compiler | `sudo apt-get install libvulkan-dev glslc glslang-tools` |

## Step 1: Find and Download GGUF Models

### Target Model
Search HF for the model you want in GGUF format:
```bash
curl -s "https://huggingface.co/api/models?search=<MODEL>-GGUF&limit=10" | python3 -m json.tool
# Or browse: https://huggingface.co/models?apps=llama.cpp&search=<model>
```

Download (choose quant based on RAM — Q5_K_M is a good default for quality/speed balance):
```bash
# From unsloth (often has the most quant variants)
wget https://huggingface.co/unsloth/<MODEL>-GGUF/resolve/main/<MODEL>-Q5_K_M.gguf

# From another publisher (e.g., bartowski, or specific community quantizer)
wget https://huggingface.co/<REPO>/resolve/main/<FILE>.gguf
```

### Assistant Model (for Speculative Decoding)
Search for a tiny draft GGUF tagged `multi-token-prediction` or `speculative-decoding`:
```bash
curl -s "https://huggingface.co/api/models?search=<MODEL>-assistant-GGUF&limit=5"
```

Download (usually 50-170 MB):
```bash
wget https://huggingface.co/<REPO>/resolve/main/<ASSISTANT>.gguf
```

## Step 2: Build llama.cpp with Vulkan

```bash
cd ~
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
mkdir build && cd build
cmake .. -DLLAMA_VULKAN=ON -DLLAMA_VULKAN_DEBUG=OFF -DCMAKE_BUILD_TYPE=Release
# ⚠️ CRITICAL: Use GGML_VULKAN, NOT the old LLAMA_VULKAN flag
# LLAMA_VULKAN is silently ignored by modern llama.cpp!
# Also: MUST use system cmake (apt), not pip cmake — pip's lacks FindVulkan
cmake .. -DGGML_VULKAN=ON -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)

**Verify:**
```bash
ls -lh bin/llama-server  # Should show ~5-20 MB binary
# Check for Vulkan symbols (≥1 = Vulkan linked)
strings bin/llama-server | grep -c ggml_vk
# Expected: ≥ 1
```

## Step 3: Start llama-server

### Context Length for Hermes

Hermes Agent requires **at least 64K context**. Use `--ctx-size 65536` (not 8192).
With 32GB RAM, this fits comfortably for a 4-5B model.

### With Speculative Decoding (Recommended for Speed)

⚠️ **Pitfall**: The `gemma4_assistant` draft architecture is NOT supported by llama.cpp.
Test your draft model first — if you get `unknown model architecture`, run without it.

```bash
llama-server \
  --model /path/to/model-Q5_K_M.gguf \
  --model-draft /path/to/assistant.Q4_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --n-gpu-layers 99 \
  --ctx-size 65536 \
  --threads 16 --threads-batch 16 \
  --batch-size 4096
```

### Without Assistant (Fallback)

```bash
llama-server \
  --model /path/to/model-Q5_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --n-gpu-layers 99 \
  --ctx-size 65536 \
  --threads 16 --threads-batch 16 \
  --batch-size 4096 --ubatch-size 512
```

### Verify Server is Running

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"local","messages":[{"role":"user","content":"Hello"}],"max_tokens":30}'
```

## Step 4: Configure Hermes Agent

### Option A: CLI (Quick)

```bash
hermes config set model.provider custom
hermes config set model.default "local-gguf"
hermes config set model.base_url "http://127.0.0.1:8080/v1"
hermes config set model.api_key "no-key-needed"
```

### Option B: Direct Config Edit

Add/edit in `~/.hermes/config.yaml`:
```yaml
model:
  default: "local-gguf"
  provider: "custom"
  base_url: "http://127.0.0.1:8080/v1"
  api_key: "no-key-needed"
```

### Test

```bash
# Start a new session (config loaded at startup)
hermes chat -q "What are you? Tell me about yourself."
```

To switch back to cloud: `hermes config set model.provider openrouter` (or provider of choice).
Changes take effect on next `/reset`.

## Step 5: Persistent Service (systemd)

Create `~/.config/systemd/user/gemma4-server.service`:
```ini
[Unit]
Description=Local GGUF Model Server (llama.cpp + Vulkan)
After=network.target

[Service]
Type=simple
ExecStart=/home/USER/llama.cpp/build/bin/llama-server \
  --model /home/USER/.hermes/models/gemma4/model-Q5_K_M.gguf \
  --model-draft /home/USER/.hermes/models/gemma4/assistant.Q4_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --n-gpu-layers 99 --ctx-size 65536 --threads 16 --batch-size 4096
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
```

Enable:
```bash
systemctl --user daemon-reload
systemctl --user enable --now gemma4-server
systemctl --user status gemma4-server
```

Logs: `journalctl --user -u gemma4-server -f`

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `cmake: command not found` | cmake not in PATH | Use full path: `~/gemma4-env/bin/cmake` or install system-wide |
| `failed to create vulkan device` | Vulkan drivers missing/wrong | Check `ls /dev/dri/`. Install `mesa-vulkan-drivers` |
| `Could NOT find Vulkan (missing: glslc)` | Shader compiler missing | `sudo apt-get install glslc glslang-tools` |
| `Manually-specified variables were not used: LLAMA_VULKAN` | Wrong cmake flag! | Use `GGML_VULKAN=ON` (not `LLAMA_VULKAN`) |
| `FindVulkan` not found in cmake | Using pip cmake | Install system cmake: `sudo apt-get install cmake` |
| Server starts but Hermes gets 404 | Wrong port/endpoint | Test with `curl http://127.0.0.1:8080/v1/chat/completions` |
| `unknown model architecture: gemma4_assistant` | Draft arch unsupported | Run without draft, or use Transformers server with `assistant_model=` |
| `context window below 64K` | ctx-size too small | Use `--ctx-size 65536` or override `model.context_length` in Hermes |
| Hermes times out >180s | CPU-only with small batch | Set `--threads 16 --batch-size 4096 --ubatch-size 512 --timeout 300` |
| Server exits immediately | OOM | Use smaller quant (Q4_K_M instead of Q5_K_M) or reduce `--ctx-size` |
| `hermes` still uses cloud model | Config cached | Start new session (`/reset` or exit/relaunch) |
| Slow inference despite GPU | Vulkan offloading partial | Increase `--n-gpu-layers` (99 = all layers) |

## Example: Gemma 4 E4B-it Setup

```bash
# 1. Create model directory
mkdir -p ~/.hermes/models/gemma4

# 2. Download models
cd ~/.hermes/models/gemma4
wget https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q5_K_M.gguf
wget https://huggingface.co/AtomicChat/gemma-4-E4B-it-assistant-GGUF/resolve/main/gemma-4-E4B-it-assistant.Q4_K_M.gguf

# 3. Build llama.cpp with Vulkan (use system cmake, NOT pip cmake)
cd ~
git clone https://github.com/ggml-org/llama.cpp && cd llama.cpp
mkdir build && cd build
# ⚠️ CRITICAL: GGML_VULKAN, not the old LLAMA_VULKAN flag!
cmake .. -DGGML_VULKAN=ON -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)

# 4. Start server
cd ~/.hermes/models/gemma4
~/llama.cpp/build/bin/llama-server \
  --model gemma-4-E4B-it-Q5_K_M.gguf \
  --model-draft gemma-4-E4B-it-assistant.Q4_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --n-gpu-layers 99 --ctx-size 65536 --threads 16 \
  --batch-size 4096 --ubatch-size 512 --timeout 300

# 5. Configure Hermes
hermes config set model.provider custom
hermes config set model.default "gemma-4-E4B-it"
hermes config set model.base_url "http://127.0.0.1:8080/v1"

# 6. Test
hermes chat -q "Hello! Tell me a quick joke about RAM."
```

## Performance Notes

- **Speculative Decoding**: Expect 2-3x token/s improvement with a well-matched assistant model
  - But: check draft architecture support FIRST. `gemma4_assistant` is NOT supported by llama.cpp
  - Alternative: Use Transformers-based FastAPI server, which supports `assistant_model=` natively
- **Vulkan vs CUDA**: Vulkan is typically 10-30% slower than CUDA on NVIDIA, but on AMD it's the only GPU option — still much faster than CPU-only
- **16-core system**: Build time ~5-10 min; use `--threads 16 --threads-batch 16` for best throughput
- **32GB RAM + 5GB model**: Comfortable for 8K context; 64K context needs careful batch tuning
- **CPU-only fallback**: If Vulkan build fails (e.g. SPIRV header mismatch), CPU with 16 threads and batch 4096 reaches ~100-200 tok/s pipeline — usable but slow for Hermes prompts
- **Hermes timeout**: Without GPU, prompt processing of 4K+ tokens takes 60-95s. Set `--timeout 300` and ensure Hermes doesn't timeout (configure `agent: {max_turn_wait: 300}`)
