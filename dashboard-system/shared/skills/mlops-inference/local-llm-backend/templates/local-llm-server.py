#!/usr/bin/env python3
"""
Local LLM FastAPI server — OpenAI-compatible endpoint for Hermes Agent.
Supports speculative decoding via assistant_model parameter.
"""
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

app = FastAPI(title="Local LLM Server")

# ── Config via environment variables ────────────────────────────────────────
TARGET_MODEL_PATH = os.getenv("TARGET_MODEL_PATH", "/path/to/target/model")
ASSISTANT_MODEL_PATH = os.getenv("ASSISTANT_MODEL_PATH", "")  # empty = disabled
PORT = int(os.getenv("LLM_SERVER_PORT", "8000"))
DEVICE = os.getenv("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
DTYPE = getattr(torch, os.getenv("DTYPE", "bfloat16" if torch.cuda.is_available() else "float32"))

# ── Model loading ────────────────────────────────────────────────────────────
print(f"→ Loading target model from: {TARGET_MODEL_PATH}")
print(f"   Device: {DEVICE} | Dtype: {DTYPE}")

tokenizer = AutoTokenizer.from_pretrained(TARGET_MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(
    TARGET_MODEL_PATH,
    torch_dtype=DTYPE,
    device_map=DEVICE,
    trust_remote_code=True,
)
print(f"✓ Target model ready on {model.device}")

assistant_model = None
if ASSISTANT_MODEL_PATH and os.path.exists(ASSISTANT_MODEL_PATH):
    print(f"→ Loading assistant model from: {ASSISTANT_MODEL_PATH}")
    assistant_model = AutoModelForCausalLM.from_pretrained(
        ASSISTANT_MODEL_PATH,
        torch_dtype=DTYPE,
        device_map=DEVICE,
        trust_remote_code=True,
    )
    print(f"✓ Assistant model loaded — speculative decoding ENABLED")
else:
    print("→ No assistant model configured (speculative decoding disabled)")

# ── Request schemas ──────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str = "local"
    messages: list[ChatMessage]
    max_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.95

# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "target_model": TARGET_MODEL_PATH,
        "assistant_model": ASSISTANT_MODEL_PATH if assistant_model else None,
        "device": DEVICE,
        "speculative_decoding": assistant_model is not None,
    }

@app.post("/v1/chat/completions")
async def chat_completion(request: ChatRequest):
    # Format messages
    text = tokenizer.apply_chat_template(
        [m.dict() for m in request.messages],
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    input_len = inputs["input_ids"].shape[-1]

    # Generation kwargs
    gen_kwargs = dict(
        max_new_tokens=request.max_tokens,
        temperature=request.temperature,
        top_p=request.top_p,
        do_sample=True,
    )
    if assistant_model is not None:
        gen_kwargs["assistant_model"] = assistant_model

    # Generate
    with torch.no_grad():
        outputs = model.generate(**inputs, **gen_kwargs)

    response = tokenizer.decode(outputs[0][input_len:], skip_special_tokens=True)

    return {
        "id": "local-compl",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": response},
                "finish_reason": "stop",
            }
        ],
    }

# ── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print(f"→ Starting Local LLM Server on 0.0.0.0:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
