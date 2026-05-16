# Gemma 4 E4B-it GGUF Sources

> Curated list of HuggingFace repos with Gemma 4 E4B-it in GGUF format, compatible with llama.cpp and speculative decoding setups.

## Target Model (Main)

**Repo**: `unsloth/gemma-4-E4B-it-GGUF`

Direct download (replace `QUANT`):
```
https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-QUANT.gguf
```

Available quants (size approx):
| Quant | Size (GB) | Use case |
|-------|-----------|----------|
| Q5_K_M | 4.6 | Best balance — recommended |
| Q4_K_M | 4.5 | Slightly smaller, similar quality |
| Q3_K_M | 3.9 | Tight RAM budget |
| IQ4_NL | 4.6 | Integer quantization, good quality |
| IQ4_XS | 4.5 | Extra small integer quant |
| BF16 | 14.4 | Maximum quality, huge RAM |

Example:
```bash
# Download Q5_K_M
wget https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q5_K_M.gguf -O ~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf
```

## Assistant Model (Drafter for Speculative Decoding)

**Repo**: `AtomicChat/gemma-4-E4B-it-assistant-GGUF`

This is the **small, fast draft model** that predicts tokens ahead of the main model. Only ~75 MB.

Files:
- `gemma-4-E4B-it-assistant.Q4_K_M.gguf` — 74.9 MB (recommended)
- `gemma-4-E4B-it-assistant.Q4_K_S.gguf` — 74.7 MB
- `gemma-4-E4B-it-assistant.Q5_K_M.gguf` — 76.2 MB
- `gemma-4-E4B-it-assistant.Q8_0.gguf` — 95.6 MB
- `gemma-4-E4B-it-assistant.F16.gguf` — 165.8 MB (full precision)

Download:
```bash
wget https://huggingface.co/AtomicChat/gemma-4-E4B-it-assistant-GGUF/resolve/main/gemma-4-E4B-it-assistant.Q4_K_M.gguf -O ~/.hermes/models/gemma4/gemma-4-E4B-it-assistant.gguf
```

## Using both together (Speculative Decoding)

### llama.cpp
```bash
llama-server \
  -hf unsloth/gemma-4-E4B-it-GGUF:Q5_K_M \
  --draft-model hf://AtomicChat/gemma-4-E4B-it-assistant-GGUF:Q4_K_M \
  -c 8192 \
  --port 8080
```

### Transformers (Python)
```python
target_model = AutoModelForCausalLM.from_pretrained(
    "/path/to/unsloth/gemma-4-E4B-it-GGUF",  # or local safetensors dir
    torch_dtype=torch.bfloat16,
    device_map="cuda",
)
assistant_model = AutoModelForCausalLM.from_pretrained(
    "/path/to/AtomicChat/gemma-4-E4B-it-assistant-GGUF",
    torch_dtype=torch.bfloat16,
    device_map="cuda",
)
# Then pass assistant_model=assistant_model to model.generate()
```

**Speedup**: 2-3x faster generation with identical output quality (draft tokens are verified by target).

## Search pattern for other models

```bash
# List all GGUF models matching pattern
curl -s "https://huggingface.co/api/models?search=gemma-4&limit=50" | \
  jq -r '.[] | select(.tags | index("gguf")) | .id'
```

Or browse: https://huggingface.co/models?search=gemma-4+gguf

## Notes

- **Token counts**: Gemma 4 E4B has 262K vocab, uses sliding attention (512 window) + periodic full attention layers.
- **Context**: 128K tokens for E4B. Set `-c 131072` in llama.cpp for full context.
- **VRAM estimate**: Q5_K_M ~5 GB loaded + overhead. With assistant model, total ~6 GB GPU RAM.
- **CPU inference**: llama.cpp works well on CPU with `-t 8` (threads) and `--mlock` to keep in RAM.
