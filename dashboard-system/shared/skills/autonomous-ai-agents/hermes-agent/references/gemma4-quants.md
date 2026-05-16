# Gemma 4 E4B-it GGUF Quant Comparison

Source: `unsloth/gemma-4-E4B-it-GGUF` on HuggingFace (quality-tested conversions)

## Quantization Sizes & Quality

| Quant    | Size (GB) | Quality Rating | Use Case |
|----------|-----------|----------------|----------|
| **Q5_K_M** | 5.11      | ⭐⭐⭐⭐⭐ Excellent | Default best balance |
| Q4_K_M   | 4.64      | ⭐⭐⭐⭐ Very Good | Smaller download, still excellent |
| Q6_K     | 6.59      | ⭐⭐⭐⭐⭐ Excellent | Maximum quality (if RAM allows) |
| Q8_0     | 7.63      | ⭐⭐⭐⭐⭐ Maximum | Highest quality, largest |
| Q4_0     | 4.50      | ⭐⭐⭐ Good | Basic quant, decent |
| Q3_K_M   | 3.78      | ⭐⭐⭐ Moderate | Tight RAM (<8GB) |
| IQ4_NL   | 4.50      | ⭐⭐⭐⭐ Good | Alternative quality |
| UD-Q5_K_XL| 6.20     | ⭐⭐⭐⭐⭐ Excellent | Larger, higher quality |

## Recommendations by Hardware

- **32GB RAM**: Q5_K_M (5.1 GB) → leaves ~25GB for OS + other apps
- **16GB RAM**: Q4_K_M (4.6 GB) → tight but workable
- **<16GB RAM**: Q3_K_M (3.8 GB) or use CPU offloading (llama.cpp)
- **NVIDIA GPU with 8GB+ VRAM**: Q6_K or Q8_0 for maximum quality

## Why Not Convert Yourself?

Converting from `.safetensors` to GGUF requires:
- 20-40 GB RAM during conversion
- Time-consuming (1-2 hours)
- Risk of suboptimal quantization

Pre-converted GGUF from `unsloth/` is optimized and tested.

## Download Commands

```bash
# Q5_K_M (recommended)
wget -c https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q5_K_M.gguf

# Q4_K_M (smaller alternative)
wget -c https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_K_M.gguf
```

## Assistant Model (Drafter)

Regardless of target quant, use the assistant model from `AtomicChat/gemma-4-E4B-it-assistant-GGUF`:
- Q4_K_M: 74.9 MB (recommended)
- Q5_K_M: 76.2 MB
- F16: 165.8 MB (uncompressed)

The assistant is tiny; download the Q4_K_M for minimal footprint.
