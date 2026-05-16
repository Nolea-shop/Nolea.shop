---
name: local-llm-backend
description: Run local LLMs as OpenAI-compatible backends for Hermes Agent — transformers (safetensors, speculative decoding with assistant models) OR llama.cpp (GGUF). Covers FastAPI server setup, model discovery on HuggingFace, quant selection, and Hermes config integration.
version: 0.1.0
author: Hermes Agent + Damia
license: MIT
metadata:
  hermes:
    tags: [local-llm, transformers, llama.cpp, GGUF, speculative-decoding, fastapi, gemma, custom-backend]
    related_skills: [hermes-agent, llama-cpp, serving-llms-vllm]
---

# Local LLM Backend Integration

Run any local LLM (GGUF via llama.cpp OR Transformers safetensors) as an OpenAI-compatible HTTP server and point Hermes to it. Supports speculative decoding with assistant/drafter models for 2-3x speedup.

## When to use

- You have local model files (GGUF or safetensors) and want Hermes to use them
- You want speculative decoding with an assistant model (Gemma 4 assistant, etc.)
- You prefer CPU-only or GPU-accelerated local inference without cloud APIs
- You need a persistent local server that Hermes connects to via `custom` provider
- Models are too large for llama.cpp conversion or you want to use native Transformers optimizations

## Quick start

### Option A: Transformers (safetensors, assistant_model support)

**Prerequisites**: `pip install torch transformers accelerate fastapi uvicorn`

1. **Create server script**: `~/local-llm-server.py`

```python
# ~/local-llm-server.py
from fastapi import FastAPI
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

app = FastAPI()

# CONFIG
TARGET_MODEL_PATH = "/path/to/your/model"  # e.g. /mnt/d/googlegemma-4-E4B-it/googlegemma-4-E4B-it
ASSISTANT_MODEL_PATH = None  # Set to assistant model path for speculative decoding
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.bfloat16 if torch.cuda.is_available() else torch.float32

print(f"Loading target model from {TARGET_MODEL_PATH}...")
tokenizer = AutoTokenizer.from_pretrained(TARGET_MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(
    TARGET_MODEL_PATH,
    torch_dtype=DTYPE,
    device_map=DEVICE,
    trust_remote_code=True,
)
print(f"Target model loaded on {model.device}")

if ASSISTANT_MODEL_PATH:
    print(f"Loading assistant model from {ASSISTANT_MODEL_PATH}...")
    assistant_model = AutoModelForCausalLM.from_pretrained(
        ASSISTANT_MODEL_PATH,
        torch_dtype=DTYPE,
        device_map=DEVICE,
        trust_remote_code=True,
    )
    print(f"Assistant model loaded (speculative decoding enabled)")

@app.post("/v1/chat/completions")
async def chat_completion(request: dict):
    messages = request.get("messages", [])
    # Apply chat template (model-specific)
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    input_len = inputs["input_ids"].shape[-1]

    # Generation params
    gen_kwargs = dict(
        max_new_tokens=request.get("max_tokens", 512),
        temperature=request.get("temperature", 0.7),
        top_p=request.get("top_p", 0.95),
        do_sample=True,
    )
    if ASSISTANT_MODEL_PATH:
        gen_kwargs["assistant_model"] = assistant_model

    outputs = model.generate(**inputs, **gen_kwargs)
    response = tokenizer.decode(outputs[0][input_len:], skip_special_tokens=True)

    return {
        "id": "local-compl",
        "object": "chat.completion",
        "choices": [{"message": {"role": "assistant", "content": response}}],
    }

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "model": TARGET_MODEL_PATH}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

2. **Start server**:
```bash
cd ~
python3 ~/local-llm-server.py
# or background: nohup python3 ~/local-llm-server.py > ~/llm-server.log 2>&1 &
```

3. **Configure Hermes** (`config.yaml`):
```yaml
model:
  default: "local-gemma"
  provider: "custom"
  base_url: "http://localhost:8000/v1"
  # No API key needed for local server
```

4. **Test**:
```bash
hermes chat -q "Hello, who are you?"
```

### Option B: llama.cpp (GGUF)

**Prerequisites**: `llama-server` compiled and in PATH

1. **Download GGUF** from HuggingFace (see `references/gemma4-gguf-sources.md` for recommended repos)
2. **Start llama.cpp server**:
```bash
llama-server \
  -hf bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M \
  -c 8192 \
  --port 8080
```
Or with local file:
```bash
llama-server -m /path/to/model.gguf -c 8192 --port 8080
```
3. **Hermes config**:
```yaml
model:
  provider: "custom"
  base_url: "http://localhost:8080/v1"
```

## Model selection

### Gemma 4 E4B-it (GGUF)

Recommended HF repos with GGUF conversions:
- `unsloth/gemma-4-E4B-it-GGUF` — high-quality quants (Q5_K_M ~4.6GB, Q4_K_M ~4.5GB)
- `AtomicChat/gemma-4-E4B-it-assistant-GGUF` — assistant/drafter model for speculative decoding (~75MB)

**Quant selection heuristics**:
- **Q5_K_M** — best quality/speed balance (recommended)
- **Q4_K_M** — slightly smaller, minimal quality loss
- **Q3_K_M** — smallest, noticeable quality drop

**Speculative decoding with Gemma 4 (TRANSFORMERS only — llama.cpp doesn't support gemma4_assistant)**:
- Target model: `unsloth/gemma-4-E4B-it-GGUF:Q5_K_M`
- Assistant model: `AtomicChat/gemma-4-E4B-it-assistant-GGUF:Q4_K_M`
- For Transformers fastAPI server, the assistant model path is passed to `AutoModelForCausalLM.from_pretrained()` and enabled with `assistant_model=` in generation
- **llama.cpp NOTE**: The `gemma4_assistant` architecture is NOT supported by llama.cpp's `--model-draft`. If you get `error loading model: unknown model architecture: 'gemma4_assistant'`, run without the draft model or use the Transformers backend instead.

```bash
# Transformers server with assistant_model support (use -sm, `--speculate` for draft):
python3 ~/local-llm-server.py
```

For **compatible** draft models (e.g., Llama-based drafts with standard architectures), use llama.cpp:
```bash
llama-server \
  --model /path/to/model.gguf \
  --model-draft /path/to/draft.gguf \
  -c 8192 \
  --port 8080
```

### Finding GGUF models

```bash
# Search HuggingFace API
curl -s "https://huggingface.co/api/models?search=gemma-4-E4B-it&limit=20" | \
  jq '.[] | select(.tags[] | contains("gguf")) | .id'
```

Or use the local-app view in browser:
```
https://huggingface.co/<repo>?local-app=llama.cpp
```

See `references/huggingface-gguf-search.md` for detailed URL patterns.

## Pitfalls

### Transformers backend
- **VRAM**: Gemma 4 E4B (~4.5B effective) needs ~8-12 GB GPU RAM in bfloat16. Use `device_map="cpu"` for CPU-only (slow).
- **Trust remote code**: Some repos need `trust_remote_code=True` in `from_pretrained()`.
- **Chat template mismatch**: If model doesn't have a built-in chat template, manually format messages: `[INST] ... [/INST]` for Gemma.
- **Assistant model compatibility**: The assistant must have identical tokenizer architecture. For Gemma 4, use `google/gemma-4-E4B-it-assistant` as drafter.

### llama.cpp backend
- **GGUF format only**: `.safetensors` or `.bin` won't work. Convert via `convert-hf-to-gguf.py` if needed.
- **Speculative decoding availability**: Not all llama.cpp builds have draft model support. Check `llama-server --help` for `--draft-model` flag.
- **Context length**: Set `-c` (ctx-size) at least 2x your expected conversation length. Gemma 4 supports 128K but requires huge RAM.
- **Gemma 4 thinking mode**: The built-in `<|think|>` token causes empty `content` fields (content goes in `reasoning_content`). Fix by using a custom `--chat-template` that omits `<|think|>` (see Gemma 4 Thinking Mode section below).
- **Draft model architecture mismatch**: `gemma4_assistant` architecture is NOT supported by llama.cpp. Use `--model-draft` and expect error `unknown model architecture: 'gemma4_assistant'`. Fall back to CPU-only no-draft mode.
- **CPU inference speed**: Gemma 4 E4B (Q5_K_M) on 16-core CPU runs at ~35 tok/s prompt processing and ~8 tok/s generation. Hermes' large system prompt (4K-12K tokens) takes 90-300s for prompt processing alone, causing timeouts. Always use a fast (cloud) model for Hermes, reserving the local model for short voice-assistant prompts.

### Gemma 4 Thinking Mode Fix
When `content` is empty but `reasoning_content` has the response, the `<|think|>` token is active. Fix with a custom Jinja template:

```bash
llama-server \
  --model model.gguf \
  --chat-template '{% if not add_generation_prompt is defined %}{% set add_generation_prompt = false %}{% endif %}{% for message in messages %}{{"<|turn|>" + message["role"] + "\n" + message["content"] + "<|end|>\n"}}{% endfor %}{% if add_generation_prompt %}{{"<|turn|>model\n"}}{% endif %}' \
  --no-prefill-assistant
```

**For systemd services**: The multi-line template gets mangled in `ExecStart`. Use `--no-jinja` as fallback or inline as a single shell-safe line. Test the template with `llama-server --chat-template '...'` before deploying to systemd.

**Verification**: After starting with the fix, the response should have `content` populated and `reasoning_content` should be absent.

### General
- **Port conflicts**: Ensure port 8000 (or your chosen port) is free.
- **Hermes caching**: Hermes caches the model config on first use. After changing `base_url`, restart Hermes (`/reset` or new session).
- **WSL networking**: If Hermes runs in WSL and server too, use `127.0.0.1` not `localhost` sometimes. If connecting from Windows to WSL, use WSL IP (`hostname -I`).

## Verification

```bash
# 1. Check server health
curl http://localhost:8000/health

# 2. Test completion
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }' | python3 -m json.tool

# 3. Connect Hermes
hermes chat -q "Test connection to local model"
```

## Templates

See `templates/local-llm-server.py` — ready-to-use FastAPI server with assistant_model support.

## Scripts

- `scripts/check-gpu-memory.py` — reports available GPU/CPU RAM for quant selection

## References

- **Gemma 4 GGUF sources**: `references/gemma4-gguf-sources.md` — curated HuggingFace repos and quant sizes
- **HuggingFace GGUF search**: `references/huggingface-gguf-search.md` — URL patterns for finding GGUF models
- **llama.cpp docs**: https://github.com/ggml-org/llama.cpp
- **Transformers speculative decoding**: https://huggingface.co/docs/transformers/main/en/generation_strategies#speculative-decoding
