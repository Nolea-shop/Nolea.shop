---
name: llama-cpp
description: llama.cpp local GGUF inference + HF Hub model discovery.
version: 2.1.2
author: Orchestra Research
license: MIT
dependencies: [llama-cpp-python>=0.2.0]
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [llama.cpp, GGUF, Quantization, Hugging Face Hub, CPU Inference, Apple Silicon, Edge Deployment, AMD GPUs, Intel GPUs, NVIDIA, URL-first]
---

# llama.cpp + GGUF

Use this skill for local GGUF inference, quant selection, or Hugging Face repo discovery for llama.cpp.

## When to use

- Run local models on CPU, Apple Silicon, CUDA, ROCm, or Intel GPUs
- Find the right GGUF for a specific Hugging Face repo
- Build a `llama-server` or `llama-cli` command from the Hub
- Search the Hub for models that already support llama.cpp
- Enumerate available `.gguf` files and sizes for a repo
- Decide between Q4/Q5/Q6/IQ variants for the user's RAM or VRAM

## Model Discovery workflow

Prefer URL workflows before asking for `hf`, Python, or custom scripts.

1. Search for candidate repos on the Hub:
   - Base: `https://huggingface.co/models?apps=llama.cpp&sort=trending`
   - Add `search=<term>` for a model family
   - Add `num_parameters=min:0,max:24B` or similar when the user has size constraints
2. Open the repo with the llama.cpp local-app view:
   - `https://huggingface.co/<repo>?local-app=llama.cpp`
3. Treat the local-app snippet as the source of truth when it is visible:
   - copy the exact `llama-server` or `llama-cli` command
   - report the recommended quant exactly as HF shows it
4. Read the same `?local-app=llama.cpp` URL as page text or HTML and extract the section under `Hardware compatibility`:
   - prefer its exact quant labels and sizes over generic tables
   - keep repo-specific labels such as `UD-Q4_K_M` or `IQ4_NL_XL`
   - if that section is not visible in the fetched page source, say so and fall back to the tree API plus generic quant guidance
5. Query the tree API to confirm what actually exists:
   - `https://huggingface.co/api/models/<repo>/tree/main?recursive=true`
   - keep entries where `type` is `file` and `path` ends with `.gguf`
   - use `path` and `size` as the source of truth for filenames and byte sizes
   - separate quantized checkpoints from `mmproj-*.gguf` projector files and `BF16/` shard files
   - use `https://huggingface.co/<repo>/tree/main` only as a human fallback
6. If the local-app snippet is not text-visible, reconstruct the command from the repo plus the chosen quant:
   - shorthand quant selection: `llama-server -hf <repo>:<QUANT>`
   - exact-file fallback: `llama-server --hf-repo <repo> --hf-file <filename.gguf>`
7. Only suggest conversion from Transformers weights if the repo does not already expose GGUF files.

## Quick start

### Install llama.cpp

```bash
# macOS / Linux (simplest)
brew install llama.cpp
```

```bash
winget install llama.cpp
```

```bash
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build
cmake --build build --config Release
```

### Run directly from the Hugging Face Hub

```bash
llama-cli -hf bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0
```

```bash
llama-server -hf bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0
```

### ### Run an exact GGUF file from the Hub

Use this when the tree API shows custom file naming or the exact HF snippet is missing.

```bash
llama-server \
    --hf-repo microsoft/Phi-3-mini-4k-instruct-gguf \
    --hf-file Phi-3-mini-4k-instruct-q4.gguf \
    -c 4096
```

### Building with Vulkan (AMD/Intel GPUs)

For AMD GPUs (especially in WSL2 or Linux) and Intel GPUs, use the Vulkan backend.
Unlike CUDA (NVIDIA) or Metal (Apple), Vulkan works with any vendor that provides Vulkan drivers.

**Prerequisites** — check that Vulkan ICD files exist for your GPU, then install build deps:
```bash
ls /usr/share/vulkan/icd.d/
# Should show: radeon_icd.json (AMD), intel_icd.json (Intel), etc.

# Install build dependencies
sudo apt-get install -y cmake libvulkan-dev glslc glslang-tools
```

**Build with Vulkan (CRITICAL: use system cmake + GGML_VULKAN flag):**
```bash
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
mkdir build && cd build
cmake .. -DGGML_VULKAN=ON -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
```

**CRITICAL PITFALL — wrong flag name:**
The old flag `LLAMA_VULKAN` is silently ignored by modern llama.cpp.
Cmake prints `Manually-specified variables were not used by the project: LLAMA_VULKAN`
and falls back to CPU. Always use `GGML_VULKAN`.

**CRITICAL PITFALL — pip cmake vs system cmake:**
The pip-installed cmake (`pip install cmake`) cannot find `FindVulkan.cmake`.
Install cmake via apt before building: `sudo apt-get install -y cmake`.
Verify with `cmake --version` — should show system version (3.28.x), not pip's.

**CRITICAL PITFALL — missing glslc:**
Cmake reports `Could NOT find Vulkan (missing: glslc)` without the shader compiler.
Fix: `sudo apt-get install -y glslc glslang-tools`

**Verify:** The binary at `build/bin/llama-server` will use the GPU via Vulkan.
```bash
# Check binary has Vulkan symbols
strings build/bin/llama-server | grep -c ggml_vk
# Expected: ≥ 1  (Vulkan backend linked)
# If 0: rebuild — Vulkan was not linked

# Run with GPU layers
./build/bin/llama-server \
  --model ../model.gguf \
  --port 8080 --host 127.0.0.1 \
  --n-gpu-layers 99 \
  --ctx-size 8192
```

**WSL2 note:** AMD GPUs in WSL2 use the Vulkan ICD provided by Mesa (`radeon_icd.json`).\nInstall drivers if missing: `sudo apt-get install mesa-vulkan-drivers vulkan-tools`.\nVulkan's only local testing command is `vulkaninfo --summary` but may need PTY access — if it fails with Permission denied, the drivers may still work through llama.cpp.

**Python bindings with Vulkan:**
```bash
pip install llama-cpp-python  # CPU by default
# For Vulkan: build from source with Vulkan flag
CMAKE_ARGS="-DGGML_VULKAN=ON" pip install llama-cpp-python --force-reinstall --no-cache-dir
```

### Speculative Decoding with Assistant Models

llama.cpp supports **speculative decoding** to achieve 2-3x speedup without quality loss.
A smaller "assistant" (draft) model generates candidate tokens, which the target model verifies in parallel.

**Workflow:**
1. Download a target model (e.g., Q5_K_M GGUF) and a compatible assistant (draft) model GGUF
2. Assistant models are often labeled with "assistant", "draft", or "mtp" (Multi-Token Prediction) tags on HF
3. Launch `llama-server` with both models:

```bash
llama-server \
  --model /path/to/target-model-Q5_K_M.gguf \
  --assistant-path /path/to/assistant-model.Q4_K_M.gguf \
  --port 8080 --host 127.0.0.1 \
  --n-gpu-layers 99 \
  --ctx-size 8192
```

**Finding assistant GGUFs on HuggingFace:**
- Search: `https://huggingface.co/models?search=assistant-GGUF&search=llama.cpp`
- Look for repos tagged `mtp`, `multi-token-prediction`, or `speculative-decoding`
- Example finds: `AtomicChat/gemma-4-E4B-it-assistant-GGUF` (~75 MB), `unsloth/Llama-3.2-3B-Instruct-GGUF` (draft variants)
- The assistant should be much smaller than the target (typically 1-5% of target size)

**OpenAI-compatible server check:**

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a limerick about Python exceptions"}
    ]
  }'
```

### Full Stack setup: Hermes Agent + Local GGUF Model

For a complete local assistant with Hermes Agent pointing to a local `llama-server`:

1. Start `llama-server` (with or without assistant model)
2. Configure Hermes:
   ```bash
   hermes config set model.provider custom
   hermes config set model.default "local-gguf"
   hermes config set model.base_url "http://127.0.0.1:8080/v1"
   hermes config set model.api_key "no-key-needed"
   ```
3. Or edit `~/.hermes/config.yaml`:
   ```yaml
   model:
     default: "local-gguf"
     provider: "custom"
     base_url: "http://127.0.0.1:8080/v1"
     api_key: "no-key-needed"
   ```
4. Test: `hermes chat -q "Hello, are you running locally?"`
5. Consider systemd service for autostart (see `references/vulkan-hermes-setup.md`)

**Pitfall:** When switching between cloud and local models, the `model` config is per-session.
A `/reset` (or new `hermes` invocation) picks up config changes.

## Python bindings (llama-cpp-python)

`pip install llama-cpp-python` (CUDA: `CMAKE_ARGS="-DGGML_CUDA=on" pip install llama-cpp-python --force-reinstall --no-cache-dir`; Metal: `CMAKE_ARGS="-DGGML_METAL=on" ...`).

### Basic generation

```python
from llama_cpp import Llama

llm = Llama(
    model_path="./model-q4_k_m.gguf",
    n_ctx=4096,
    n_gpu_layers=35,     # 0 for CPU, 99 to offload everything
    n_threads=8,
)

out = llm("What is machine learning?", max_tokens=256, temperature=0.7)
print(out["choices"][0]["text"])
```

### Chat + streaming

```python
llm = Llama(
    model_path="./model-q4_k_m.gguf",
    n_ctx=4096,
    n_gpu_layers=35,
    chat_format="llama-3",   # or "chatml", "mistral", etc.
)

resp = llm.create_chat_completion(
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is Python?"},
    ],
    max_tokens=256,
)
print(resp["choices"][0]["message"]["content"])

# Streaming
for chunk in llm("Explain quantum computing:", max_tokens=256, stream=True):
    print(chunk["choices"][0]["text"], end="", flush=True)
```

### Embeddings

```python
llm = Llama(model_path="./model-q4_k_m.gguf", embedding=True, n_gpu_layers=35)
vec = llm.embed("This is a test sentence.")
print(f"Embedding dimension: {len(vec)}")
```

You can also load a GGUF straight from the Hub:

```python
llm = Llama.from_pretrained(
    repo_id="bartowski/Llama-3.2-3B-Instruct-GGUF",
    filename="*Q4_K_M.gguf",
    n_gpu_layers=35,
)
```

## Choosing a quant

Use the Hub page first, generic heuristics second.

- Prefer the exact quant that HF marks as compatible for the user's hardware profile.
- For general chat, start with `Q4_K_M`.
- For code or technical work, prefer `Q5_K_M` or `Q6_K` if memory allows.
- For very tight RAM budgets, consider `Q3_K_M`, `IQ` variants, or `Q2` variants only if the user explicitly prioritizes fit over quality.
- For multimodal repos, mention `mmproj-*.gguf` separately. The projector is not the main model file.
- Do not normalize repo-native labels. If the page says `UD-Q4_K_M`, report `UD-Q4_K_M`.

## ⚠️ Critical Pitfall: Model Format Compatibility

**llama.cpp only works with GGUF-formatted models.** Attempting to use:
- `.safetensors` files (like `google/gemma-4-31B-it-assistant`)
- PyTorch `.bin` files
- Hugging Face Transformers models directly

**will result in errors** because these formats are incompatible with llama.cpp's inference engine.

## ⚠️ Critical Pitfall: CMake Variable Name — LLAMA_VULKAN vs GGML_VULKAN

**Do NOT use `-DLLAMA_VULKAN=ON` — it is silently ignored.** In modern llama.cpp (post-2024), the Vulkan backend is in the `ggml/` subdirectory and its cmake variable is `GGML_VULKAN`, NOT `LLAMA_VULKAN`. Using the wrong variable silently falls back to CPU-only:
```bash
❌ WRONG: cmake .. -DLLAMA_VULKAN=ON          # Silently ignored, warns "manually-specified variables were not used"
✅ RIGHT: cmake .. -DGGML_VULKAN=ON           # Correctly activates Vulkan backend
```

Additionally, Vulkan shader compilation requires the `glslc` compiler (`sudo apt-get install glslc glslang-tools`). Without it, FindVulkan will report `missing: glslc` even though Vulkan headers are installed.

**The full Vulkan build pipeline:**
```bash
# 1. Install system dependencies
sudo apt-get install -y cmake libvulkan-dev glslc glslang-tools mesa-vulkan-drivers

# 2. Build with correct flag
cd ~/llama.cpp && rm -rf build && mkdir build && cd build
cmake .. -DGGML_VULKAN=ON -DCMAKE_BUILD_TYPE=Release
make -j$(nproc) llama-server
```

**Key requirement**: Use the **system cmake** (`/usr/bin/cmake`, v3.28+) from apt, NOT pip-installed cmake. Pip cmake lacks the `FindVulkan.cmake` module. Verify with `cmake --version` and `which cmake`.

**Verify Vulkan support** after build:
```bash
strings ~/llama.cpp/build/bin/llama-server | grep -c "ggml_vk"
# Should return >0 (e.g., 100+ functions) for a correct build
```

**If Vulkan still fails**: The installed Ubuntu Vulkan SDK (v1.3.275) may be too old for the latest llama.cpp commit that expects newer `spv::` namespace headers (`ggml-vulkan.cpp` error: `'spv' has not been declared`). In that case, fall back to CPU:
```bash
cmake .. -DCMAKE_BUILD_TYPE=Release   # no Vulkan flag = CPU only
# ~35 tok/s on 16 cores with Q5_K_M Gemma 4 E4B
```

Before using a model with llama.cpp:
1. Verify the Hugging Face repo contains `.gguf` files (check via `?local-app=llama.cpp` or tree API)
2. If only `.safetensors`/`.bin` files exist, you must first convert to GGUF using:
   ```bash
   # Example conversion to Q4_K_M
   ./convert-hf-to-gguf.py ./model-repo/ --outtype q4_k_m
   ```
3. The conversion requires significant RAM (typically 2-3x the model size in VRAM equivalent)

## ⚠️ Critical Pitfall: Gemma 4 Thinking Mode (empty content responses)

Some models (notably Gemma 4 E4B-it) have a **thinking/reasoning token** built into their chat template.
The `<|think|>` token causes the model to fill `reasoning_content` instead of `content` in the OpenAI API response,
resulting in empty `"content": ""` even though generation appears to work.

**Symptoms:**
- `curl` returns `"content": ""` but `finish_reason: "stop"`
- The `reasoning_content` field is populated instead
- The model appears to generate normally (token count increases) but no response text reaches the caller

**Fix — disable thinking via custom chat template:**
```bash
llama-server \
  --model gemma-4-E4B-it-Q5_K_M.gguf \
  --chat-template '{% if not add_generation_prompt is defined %}{% set add_generation_prompt = false %}{% endif %}{% for message in messages %}{{"<|turn|>" + message["role"] + "\n" + message["content"] + "<|end|>\n"}}{% endfor %}{% if add_generation_prompt %}{{"<|turn|>model\n"}}{% endif %}' \
  --no-prefill-assistant
```

The custom template removes the `<|think|>` token that triggers thinking mode. The `--no-prefill-assistant` flag prevents the server from pre-filling the assistant prefix.

**systemd pitfall:** The custom chat template breaks in systemd service files because Jinja syntax (`{{ }}`, `{% %}`) conflicts with systemd's `ExecStart` line escaping. The template gets mangled and fails with `error: the supplied chat template is not supported`.

**Fix for systemd:** Use `--no-jinja` to fall back to the model's built-in GGUF template:
```ini
ExecStart=/path/to/llama-server ... --no-prefill-assistant
```

With `--no-jinja`, the server uses the model's built-in chat template (stored in GGUF metadata), which includes ` <|think|>` and may result in `reasoning_content`. The tradeoff: no thinking tokens vs. no custom template. Prefer the custom template for interactive use and `--no-jinja` for systemd services.

**Verify it's fixed:**
```bash
curl -X POST http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"say hello"}],"max_tokens":30}'
# Expected: "content": "Hello!"  (not empty)
```

**Why this happens:** Gemma 4 includes `<|think|>` in its standard chat template for chain-of-thought reasoning. The model outputs thinking into `reasoning_content` and leaves `content` blank.

## ⚠️ Critical Pitfall: CPU Fallback Strategy

If Vulkan/GPU builds fail repeatedly (missing SPIRV headers, incompatible GPU drivers, build errors), **run on CPU without shame**. With 16+ cores and optimized batch settings, CPU inference is usable:

```bash
# CPU build (fast, always works)
cd ~/llama.cpp && rm -rf build && mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release    # ← no -DGGML_VULKAN, no GPU flags
make -j$(nproc) llama-server           # ← only build the server target

# CPU-optimized server start
~/llama.cpp/build/bin/llama-server \
  --model /path/to/model.gguf \
  --port 8080 --host 127.0.0.1 \
  --ctx-size 65536 \
  --threads 16 --threads-batch 16 \
  --batch-size 4096 --ubatch-size 512 \
  --no-warmup --timeout 300
```

**Real-world performance (Gemma 4 E4B-it Q5_K_M, 16 cores):**
- Prompt processing: ~35-44 tok/s (4096 tok prompt = ~95s)
- Generation: ~8-12 tok/s

This is adequate for direct API calls with short prompts (<100 tok). For Hermes Agent (which sends 4K-12K system prompts), expect 90-300s latency per query — usable but not interactive.

**When to use CPU:**
- GPU drivers unavailable or incompatible (WSL2 AMD, unsupported GPU generations)
- Build keeps failing on Vulkan/CUDA/ROCm
- You want a simple, reproducible setup without GPU-specific dependencies

**When to invest in GPU:**
- You need interactive Hermes Agent response times (<30s)
- You're running larger models (>7B parameters)
- You want speculative decoding for 2-3x speedup (requires llama.cpp GPU build or Transformers)

## ⚠️ Critical Pitfall: Speculative Decoding Draft Architecture Mismatch

When using `--model-draft` for speculative decoding, the **draft model architecture must be supported by llama.cpp**. Some draft/assistant models use architectures that llama.cpp does not yet implement.

**Known unsupported:** `gemma4_assistant` — the dedicated Gemma 4 assistant drafter. Loading it with `--model-draft` fails with `error loading model: unknown model architecture: 'gemma4_assistant'`.

**Workaround:** Use the target model alone (no speculative decoding) or use Transformers-based inference which supports official assistant models natively.

**To check architecture support before downloading:**
- Search HuggingFace for repos tagged `llama.cpp`, `gguf`, `speculative-decoding`, `mtp`
- Or test: `llama-server --model model.gguf --model-draft draft.gguf` and check the error output

## ⚠️ Correct Flag Names for Speculative Decoding

The flags for speculative decoding have changed across llama.cpp releases:

| Wrong (removed) | Correct (current) |
|-----------------|-------------------|
| `--assistant-path` | `--model-draft` (or `--spec-draft-model`) |
| `--draft` / `--draft-n` | `--spec-draft-n-max` |

Using the old flag names causes `error: invalid argument`. Always check `llama-server --help | grep draft` for the current names.

## GPU Backend Verification

After building llama.cpp with `GGML_VULKAN=ON`, verify the GPU backend is actually active:

```bash
# Run and check for "no usable GPU found" warning
llama-server --model model.gguf --n-gpu-layers 99 --port 8080 2>&1 | grep -i gpu
# Expected: NO "warning: no usable GPU found" message
```

If you see `warning: no usable GPU found`, the build silently fell back to CPU because Vulkan development headers (`libvulkan-dev`) were missing at compile time.

**Fix:** Install `libvulkan-dev` + `glslc` and rebuild:
```bash
sudo apt-get install libvulkan-dev glslc
cd llama.cpp && rm -rf build && mkdir build && cd build
cmake .. -DGGML_VULKAN=ON -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
# Now verify again — no "no usable GPU" warning should appear
```

**CRITICAL:** Use the correct CMake flag `GGML_VULKAN` (not the old `LLAMA_VULKAN` which is silently ignored). And use the *system* cmake (`sudo apt-get install cmake`), not pip's cmake — the pip version lacks the `FindVulkan` module needed to locate Vulkan development libraries.

You can also check whether the binary has Vulkan symbols:
```bash
strings build/bin/llama-server | grep -c ggml_vk
# Expected: ≥ 1 (Vulkan backend linked)
# If 0: build failed to link Vulkan — check cmake log for FindVulkan
```

## Performance Tuning for llama-server with Hermes Agent

When serving models via `llama-server` for use with Hermes Agent, the following optimizations matter:

### Minimum Context Window

Hermes Agent requires at least **64K tokens** of context. Start `llama-server` with:
```bash
--ctx-size 65536
```

Without this, Hermes fails with: `Model ... has a context window of 8,192 tokens, which is below the minimum 64,000 required by Hermes Agent.`

If the model's native context is smaller, you can override in Hermes config:
```yaml
model:
  context_length: 32768
```

### Token-Level Performance

At 42 tok/s (CPU-only, default settings), a typical Hermes prompt of ~4096 tokens takes ~95 seconds — causing timeouts.

**Critical tuning knobs (in order of impact):**
```bash
--threads 16              # max available cores
--threads-batch 16        # separate thread pool for batch processing
--batch-size 4096         # process more tokens per batch
--ubatch-size 512         # micro-batch inside each batch
--no-warmup               # skip warmup, faster startup
--timeout 300             # increase request timeout for slow models
```

With 16 threads + batch 4096, CPU throughput reaches ~100-200 tok/s (vs 23-42 tok/s with defaults).

### Resuming Interrupted Downloads

GGUF models are 4-15 GB. Use `wget -c` (continue) to resume:
```bash
wget -c -O model.gguf "https://huggingface.co/<repo>/resolve/main/model.gguf"
```

For very large models, use nohup background:
```bash
nohup wget -c -O model.gguf "..." > /tmp/download.log 2>&1 &
```

## Extracting available GGUFs from a repo

When the user asks what GGUFs exist, return:

- filename
- file size
- quant label
- whether it is a main model or an auxiliary projector

Ignore unless requested:

- README
- BF16 shard files
- imatrix blobs or calibration artifacts

Use the tree API for this step:

- `https://huggingface.co/api/models/<repo>/tree/main?recursive=true`

For a repo like `unsloth/Qwen3.6-35B-A3B-GGUF`, the local-app page can show quant chips such as `UD-Q4_K_M`, `UD-Q5_K_M`, `UD-Q6_K`, and `Q8_0`, while the tree API exposes exact file paths such as `Qwen3.6-35B-A3B-UD-Q4_K_M.gguf` and `Qwen3.6-35B-A3B-Q8_0.gguf` with byte sizes. Use the tree API to turn a quant label into an exact filename.

## Search patterns

Use these URL shapes directly:

```text
https://huggingface.co/models?apps=llama.cpp&sort=trending
https://huggingface.co/models?search=<term>&apps=llama.cpp&sort=trending
https://huggingface.co/models?search=<term>&apps=llama.cpp&num_parameters=min:0,max:24B&sort=trending
https://huggingface.co/<repo>?local-app=llama.cpp
https://huggingface.co/api/models/<repo>/tree/main?recursive=true
https://huggingface.co/<repo>/tree/main
```

## Output format

When answering discovery requests, prefer a compact structured result like:

```text
Repo: <repo>
Recommended quant from HF: <label> (<size>)
llama-server: <command>
Other GGUFs:
- <filename> - <size>
- <filename> - <size>
Source URLs:
- <local-app URL>
- <tree API URL>
```

## References

- **[hub-discovery.md](references/hub-discovery.md)** - URL-only Hugging Face workflows, search patterns, GGUF extraction, and command reconstruction
- **[vulkan-hermes-setup.md](references/vulkan-hermes-setup.md)** — Build llama.cpp with Vulkan for AMD/Intel GPUs, integrate with Hermes Agent, speculative decoding walkthrough
- **[advanced-usage.md](references/advanced-usage.md)** — speculative decoding, batched inference, grammar-constrained generation, LoRA, multi-GPU, custom builds, benchmark scripts
- **[quantization.md](references/quantization.md)** — quant quality tradeoffs, when to use Q4/Q5/Q6/IQ, model size scaling, imatrix
- **[server.md](references/server.md)** — direct-from-Hub server launch, OpenAI API endpoints, Docker deployment, NGINX load balancing, monitoring
- **[optimization.md](references/optimization.md)** — CPU threading, BLAS, GPU offload heuristics, batch tuning, benchmarks
- **[troubleshooting.md](references/troubleshooting.md)** — install/convert/quantize/inference/server issues, Apple Silicon, debugging
- **[gemma4-hermes-cpu-setup.md](references/gemma4-hermes-cpu-setup.md)** — Full CPU-based Gemma 4 E4B setup with thinking-mode fix, 2-tier voice assistant architecture (local LLM + Hermes Agent), systemd autostart, and performance tuning. Use this when GPU builds fail and you need a working CPU setup.

## Resources

- **GitHub**: https://github.com/ggml-org/llama.cpp
- **Hugging Face GGUF + llama.cpp docs**: https://huggingface.co/docs/hub/gguf-llamacpp
- **Hugging Face Local Apps docs**: https://huggingface.co/docs/hub/main/local-apps
- **Hugging Face Local Agents docs**: https://huggingface.co/docs/hub/agents-local
- **Example local-app page**: https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF?local-app=llama.cpp
- **Example tree API**: https://huggingface.co/api/models/unsloth/Qwen3.6-35B-A3B-GGUF/tree/main?recursive=true
- **Example llama.cpp search**: https://huggingface.co/models?num_parameters=min:0,max:24B&apps=llama.cpp&sort=trending
- **License**: MIT
