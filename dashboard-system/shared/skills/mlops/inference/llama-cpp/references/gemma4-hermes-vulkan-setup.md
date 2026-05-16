# Gemma 4 E4B-it with Vulkan + Hermes — Full Setup Guide

## Session Context

Complete local AI assistant deployment: Gemma 4 E4B-it (Q5_K_M, 5.1 GB) running via `llama-server` with Vulkan GPU acceleration on an AMD Radeon 6500 (32GB RAM, WSL2 on Windows), connected to Hermes Agent as a custom OpenAI-compatible provider.

## Key Components

| Component | Path | Size |
|-----------|------|------|
| Target model GGUF (unsloth) | `~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf` | 5.11 GB |
| Assistant model GGUF (AtomicChat) | `~/.hermes/models/gemma4/gemma-4-E4B-it-assistant.Q4_K_M.gguf` | 75 MB |
| llama-server binary | `~/llama.cpp/build/bin/llama-server` | 7.9 MB |
| Hermes config | `~/.hermes/config.yaml` | — |
| Server log | `/tmp/llama-server.log` | — |
| Build log (cmake) | `/tmp/llama-cmake.log` | — |

## Build Steps

### Prerequisites (one-time)

```bash
# Install cmake (MUST use system cmake for FindVulkan module)
sudo apt-get install -y cmake

# Install Vulkan development headers and shader compiler (required for GPU build)
sudo apt-get install libvulkan-dev glslc glslang-tools
```

```bash
cd ~
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
rm -rf build && mkdir build && cd build

# Vulkan build — use system cmake (not pip cmake) so FindVulkan works
cmake .. -DGGML_VULKAN=ON -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
```

### Verify Vulkan is actually active

```bash
# Check binary for Vulkan symbols (should be ≥1 with real Vulkan support)
strings build/bin/llama-server | grep -c ggml_vk
# If ≥1, Vulkan backend is linked. If 0, rebuild with proper deps.

# Start server and check logs (no "no usable GPU found" = good)
./build/bin/llama-server --model ~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf \
  --port 8080 --n-gpu-layers 99 --ctx-size 8192 2>&1 | grep -i gpu
```

## Server Startup

### Minimal (fast test)

```bash
~/llama.cpp/build/bin/llama-server \
  --model ~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --ctx-size 65536 \
  --n-gpu-layers 99
```

### Hermes-optimized

```bash
~/llama.cpp/build/bin/llama-server \
  --model ~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --ctx-size 65536 \
  --n-gpu-layers 99 \
  --threads 16 --threads-batch 16 \
  --batch-size 4096 --ubatch-size 512 \
  --no-warmup --timeout 300
```

## Speculative Decoding Status

**Attempted:** `--model-draft ~/.hermes/models/gemma4/gemma-4-E4B-it-assistant.Q4_K_M.gguf`

**Result:** FAILED — `error loading model: unknown model architecture: 'gemma4_assistant'`

The `gemma4_assistant` architecture is not yet supported by llama.cpp. The assistant file (from `AtomicChat/gemma-4-E4B-it-assistant-GGUF`) was downloaded correctly (75 MB), and the `--model-draft` flag name is correct — the issue is the architecture itself.

**Workaround:** 
1. Run without draft model (target alone) 
2. Or use Transformers-based FastAPI which supports `assistant_model=` natively

## Hermes Configuration

### config.yaml

```yaml
model:
  default: "gemma-4-E4B-it-local"
  provider: "custom"
  base_url: "http://127.0.0.1:8080/v1"
  api_key: "no-key-needed"
  context_length: 65536  # Must be ≥64000 for Hermes
```

### Apply

```bash
hermes config set model.provider custom
hermes config set model.base_url "http://127.0.0.1:8080/v1"
hermes config set model.context_length 65536
```

## Performance Measurements

| Mode | Threads | Batch | Prompt Processing | tok/s |
|------|---------|-------|------------------|-------|
| Default | 4 | 512 | 4096 tok / 95s | 23 |
| Optimized | 16 | 4096 | not measured | ~42+ |
| CPU-only (no Vulkan) | 16 | 4096 | not measured | ~42 |

> Expected Vulkan-accelerated throughput: 200-500+ tok/s (not achieved due to missing `libvulkan-dev` at initial build time).

## Verification

```bash
# 1. Server health
curl http://127.0.0.1:8080/v1/models

# 2. Chat test
curl -X POST http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"say hello"}],"max_tokens":30}'

# 3. Hermes test
hermes chat -q "Hello from local Gemma 4!"
```

## Troubleshooting

### "no usable GPU found, --gpu-layers option will be ignored"

**Cause:** llama.cpp was built without `libvulkan-dev` installed. CMake skipped Vulkan.

**Fix:**
```bash
sudo apt-get install libvulkan-dev glslc
cd ~/llama.cpp && rm -rf build && mkdir build && cd build
cmake .. -DGGML_VULKAN=ON -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
```

Then verify: `strings build/bin/llama-server | grep -c ggml_vk` should be ≥1.

### "context window ... below the minimum 64,000 required by Hermes Agent"

**Cause:** `--ctx-size` set too low (e.g., 8192). Hermes requires 64K+.

**Fix:** Use `--ctx-size 65536` or configure `model.context_length: 64000` in config.yaml.

### "curl: exit 7" (Failed to connect)

**Cause:** Server not running or crashed during model loading.

**Check:** `tail -30 /tmp/llama-server.log` for error messages.

### Server responds but Hermes times out

**Cause:** Too few threads / small batch size. Prompt processing takes >60s.

**Fix:** Increase `--threads`, `--batch-size`, `--ubatch-size`. See Hermes-optimized startup above.

## Files Created This Session

| Path | Purpose |
|------|---------|
| `/home/damia/.hermes/models/gemma4/server.py` | FastAPI server (alternative to llama.cpp) |
| `/home/damia/.hermes/models/gemma4/wait-for-download.sh` | Auto-monitor download completion |
| `/home/damia/.hermes/models/gemma4/test-server.py` | Server health & chat test |
| `/home/damia/start-gemma4.sh` | Manual start wrapper |
| `/home/damia/setup-gemma4-vulkan.sh` | Full automated setup script |
| `/home/damia/.config/systemd/user/gemma4-server.service` | systemd service for autostart |
