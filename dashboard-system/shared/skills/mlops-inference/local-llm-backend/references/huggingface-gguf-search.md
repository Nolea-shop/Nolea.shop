# HuggingFace GGUF Model Search

## URL patterns

**API search** (returns JSON):
```
https://huggingface.co/api/models?search=<QUERY>&sort=trending&limit=20
```

**Web UI** (browsable):
```
https://huggingface.co/models?search=<QUERY>&sort=trending
```

**Filter by llama.cpp**:
```
https://huggingface.co/models?apps=llama.cpp&sort=trending
```

**Local-app view** (shows one-click commands):
```
https://huggingface.co/<repo>?local-app=llama.cpp
```

**Tree API** (list files in a repo):
```
https://huggingface.co/api/models/<repo>/tree/main?recursive=true
```

## Examples

Find all Gemma 4 GGUF repos:
```
https://huggingface.co/models?search=gemma-4+gguf
```

Find llama.cpp-compatible models only:
```
https://huggingface.co/models?apps=llama.cpp&search=llama-3.2
```

Check what GGUF files exist in `unsloth/gemma-4-E4B-it-GGUF`:
```
https://huggingface.co/api/models/unsloth/gemma-4-E4B-it-GGUF/tree/main?recursive=true
```

Then filter for `.gguf`:
```bash
curl -s "https://huggingface.co/api/models/unsloth/gemma-4-E4B-it-GGUF/tree/main?recursive=true" | \
  jq -r '.[] | select(.path | endswith(".gguf")) | .path'
```

## Direct download pattern

Once you have repo ID + filename:
```
https://huggingface.co/<repo>/resolve/main/<filename.gguf>
```

Example:
```
https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q5_K_M.gguf
```

Use `wget` or `curl -L -O` to download.

## Using `huggingface-cli`

```bash
pip install huggingface_hub
huggingface-cli download unsloth/gemma-4-E4B-it-GGUF gemma-4-E4B-it-Q5_K_M.gguf --local-dir ~/.hermes/models/gemma4
```

## Pitfalls

- Some repos have custom file naming (e.g. `UD-Q4_K_M.gguf`). Always check the tree API or browser to get exact filename.
- `?local-app=llama.cpp` may not show for all repos — if missing, fall back to tree API.
- Large files (>4GB) may need `git lfs` or resumable download tools.
