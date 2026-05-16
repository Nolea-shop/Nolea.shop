#!/usr/bin/env python3
"""
Gemma 4 E4B-it FastAPI server with speculative decoding.
Template: copy to ~/.hermes/models/gemma4/server.py and adjust paths/quant.

Requirements:
  pip install torch transformers accelerate fastapi uvicorn

Run:
  python server.py --host 127.0.0.1 --port 8000
"""

import os
import argparse
from pathlib import Path
import torch
from transformers import AutoProcessor, AutoModelForCausalLM, AutoModelForMultimodalLM
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
from typing import Optional, List, Union
import json

# ─── CONFIGURATION ────────────────────────────────────────────────────────────

MODEL_DIR = Path.home() / ".hermes" / "models" / "gemma4"

# Adjust quant selection based on your RAM:
#   Q5_K_M (~5.1 GB) — best quality (default)
#   Q4_K_M (~4.5 GB) — smaller, still excellent
#   Q3_K_M (~3.8 GB) — tight RAM budget
TARGET_GGUF = MODEL_DIR / "gemma-4-E4B-it-Q5_K_M.gguf"

# Assistant drafter (~75 MB) — MUST match target model family
ASSISTANT_GGUF = MODEL_DIR / "gemma-4-E4B-it-assistant.Q4_K_M.gguf"

# Use multimodal model (vision + audio) or text-only?
# Text-only saves ~1-2 GB VRAM/RAM
USE_MULTIMODAL = True

# ─── MODEL LOADING ────────────────────────────────────────────────────────────

print("Loading Gemma 4 E4B-it...")
print(f"  Target:      {TARGET_GGUF.name}")
print(f"  Assistant:   {ASSISTANT_GGUF.name}")
print(f"  Multimodal:  {USE_MULTIMODAL}")

# Note: We load from local directory; HuggingFace will find the files
target_model_kwargs = {
    "torch_dtype": torch.bfloat16,
    "device_map": "auto",
    "local_files_only": True,
}

if USE_MULTIMODAL:
    target_model = AutoModelForMultimodalLM.from_pretrained(
        MODEL_DIR, **target_model_kwargs
    )
else:
    target_model = AutoModelForCausalLM.from_pretrained(
        MODEL_DIR, **target_model_kwargs
    )

assistant_model = AutoModelForCausalLM.from_pretrained(
    MODEL_DIR, **target_model_kwargs
)

processor = AutoProcessor.from_pretrained(MODEL_DIR, local_files_only=True)

print("✓ Models loaded")
print(f"  Device: {target_model.device}")
print(f"  dtype:  {target_model.dtype}")

# ─── FASTAPI APP ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Gemma 4 E4B-it Local API",
    description="OpenAI-compatible endpoint with speculative decoding",
    version="1.0.0"
)

class ChatMessage(BaseModel):
    role: str
    content: Union[str, List[dict]]

class ChatCompletionRequest(BaseModel):
    model: str = "gemma-4-E4B-it"
    messages: List[ChatMessage]
    max_tokens: int = 512
    temperature: float = 1.0
    top_p: float = 0.95
    top_k: int = 64
    enable_thinking: bool = False
    stream: bool = False

@app.post("/v1/chat/completions")
async def chat_completions(req: ChatCompletionRequest):
    """OpenAI-compatible chat completion"""

    # Build prompt via chat template
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    text = processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=req.enable_thinking,
    )

    # Tokenize
    inputs = processor(text=text, return_tensors="pt").to(target_model.device)
    input_len = inputs["input_ids"].shape[-1]

    # Generate with speculative decoding
    with torch.no_grad():
        outputs = target_model.generate(
            **inputs,
            assistant_model=assistant_model,
            max_new_tokens=req.max_tokens,
            temperature=req.temperature,
            top_p=req.top_p,
            top_k=req.top_k,
            do_sample=True,
        )

    # Decode
    response = processor.decode(outputs[0][input_len:], skip_special_tokens=False)
    parsed = processor.parse_response(response)
    content = parsed.get("final_answer", str(parsed)) if isinstance(parsed, dict) else str(parsed)

    return {
        "id": "chat-" + os.urandom(4).hex(),
        "object": "chat.completion",
        "created": 1740000000,
        "model": req.model,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": content},
            "finish_reason": "stop",
        }],
        "usage": {
            "prompt_tokens": input_len,
            "completion_tokens": outputs.shape[-1] - input_len,
            "total_tokens": outputs.shape[-1],
        },
    }

@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [{
            "id": "gemma-4-E4B-it",
            "object": "model",
            "created": 1740000000,
            "owned_by": "google",
            "capabilities": ["chat", "tools", "vision", "audio"],
        }],
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "gemma-4-E4B-it"}

# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    print(f"\nServer ready at http://{args.host}:{args.port}")
    print("  POST /v1/chat/completions")
    print("  GET  /v1/models")
    print("  GET  /health")

    uvicorn.run(app, host=args.host, port=args.port)
