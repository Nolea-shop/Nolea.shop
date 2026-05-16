# Checking if a Hugging Face Model is Available in GGUF Format

When you want to use a model with `llama.cpp`, you need to verify that the model is available in GGUF format on the Hugging Face Hub.

## Method 1: Using the `?local-app=llama.cpp` URL

1. Go to the model's Hugging Face page: `https://huggingface.co/<repo_id>`
2. Append `?local-app=llama.cpp` to the URL: `https://huggingface.co/<repo_id>?local-app=llama.cpp`
3. If the model has GGUF files, you will see a section titled "Hardware compatibility" (or similar) that lists the available quantizations and a button to run `llama-server` or `llama-cli` with a specific quantization.

   Example: For `bartowski/Llama-3.2-3B-Instruct-GGUF`, the local-app view shows:
   - Recommended quant: `Q8_0`
   - `llama-server` command: `llama-server -hf bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0`

## Method 2: Using the Hub's Tree API

1. Query the tree API for the model's repository:
   `https://huggingface.co/api/models/<repo_id>/tree/main?recursive=true`
2. Look for files ending with `.gguf` in the response.
3. If there are no `.gguf` files, the model is not available in GGUF format and must be converted first (if you have the original weights) or you cannot use it with `llama.cpp`.

   Example response snippet for a GGUF repo:
   ```json
   [
     {"type":"file","path":"model-Q4_K_M.gguf","size":...},
     {"type":"file","path":"model-Q8_0.gguf","size":...}
   ]
   ```

## Method 3: Using the `hf` CLI (if installed)

You can also use the `hf` CLI to list the files in a repository:

```bash
hf ls <repo_id>
```

Then look for `.gguf` files in the output.

## Important Notes

- Some repositories may have both the original Transformers/SafeTensors weights and GGUF conversions. The GGUF files are usually in the same repository but may be in a subdirectory or have a specific naming convention.
- If the model repository does not contain any `.gguf` files, you cannot use it directly with `llama.cpp`. You would need to convert the model to GGUF first (which requires the original weights and significant RAM/VRAM).
- Always prefer the `?local-app=llama.cpp` view for the most user-friendly and accurate information about available quantizations and the exact command to run.

## Example: Checking google/gemma-4-31B-it-assistant

Using the tree API method:
```bash
curl -s https://huggingface.co/api/models/google/gemma-4-31B-it-assistant/tree/main?recursive=true
```
The response shows files like `model.safetensors`, `config.json`, etc., but **no `.gguf` files**. Therefore, this model is not available in GGUF format and cannot be used with `llama.cpp` without conversion.

## Related Skills

- See the `llama-cpp` skill for instructions on running GGUF models with `llama.cpp`.
- See the `huggingface-hub` skill for general Hub interactions via the `hf` CLI.