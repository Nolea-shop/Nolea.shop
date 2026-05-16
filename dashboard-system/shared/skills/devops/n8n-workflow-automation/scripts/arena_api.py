"""
Arena.ai Direct API Client
Generates images via the Arena.ai internal API without browser automation.

Usage:
    python arena_api.py "<prompt>" [model_name]

Output (stdout):
    JSON: {"status": "ok", "image_path": "...", "model": "...", "prompt": "..."}
    or
    JSON: {"status": "error", "message": "..."}
"""

import json
import time
import uuid
import requests
import sys
import os
from datetime import datetime

# Config
ARENA_API_URL = "https://arena.ai/nextjs-api/stream/create-evaluation"
DOWNLOAD_DIR = os.path.join(os.path.expanduser("~"), ".openclaw", "media")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Model IDs
MODEL_IDS = {
    "gpt-image-2": "019db344-75b0-7acd-aa20-bcc095ca0ed9",
}

# UPDATE THESE with fresh cookies from your browser session
# Extract via: copy(document.cookie) in browser console on arena.ai
COOKIES = {
    "arena-auth-prod-v1.0": "PASTE_FULL_COOKIE_HERE",
    "arena-auth-prod-v1.1": "PASTE_FULL_COOKIE_HERE",
    "_ga": "GA1.1.1723590103.1777154940",
    "cookie-preferences": '{"advertising":true,"functionality":true,"analytics":true,"socialMedia":true}',
    "sidebar_state": "false",
    "user_country_code": "DE",
}

HEADERS = {
    "accept": "*/*",
    "accept-language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "text/plain;charset=UTF-8",
    "origin": "https://arena.ai",
    "referer": "https://arena.ai/image/direct",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
}


def generate_image(prompt: str, model_name: str = "gpt-image-2") -> dict:
    """Generate an image using the Arena.ai direct API."""
    model_id = MODEL_IDS.get(model_name)
    if not model_id:
        return {"status": "error", "message": f"Unknown model: {model_name}"}

    session_id = str(uuid.uuid4())
    user_message_id = str(uuid.uuid4())
    model_message_id = str(uuid.uuid4())

    payload = {
        "id": session_id,
        "mode": "direct-battle",
        "modelAId": model_id,
        "userMessageId": user_message_id,
        "modelAMessageId": model_message_id,
        "userMessage": {
            "content": prompt,
            "experimental_attachments": [],
            "metadata": {}
        },
        "modality": "image",
        "recaptchaV3Token": ""
    }

    print(f"[arena-api] Model: {model_name}, Prompt: {prompt[:80]}...", flush=True)

    try:
        response = requests.post(
            ARENA_API_URL,
            headers=HEADERS,
            cookies=COOKIES,
            json=payload,
            timeout=120,
            stream=True
        )

        print(f"[arena-api] Status: {response.status_code}", flush=True)

        if response.status_code != 200:
            return {"status": "error", "message": f"HTTP {response.status_code}: {response.text[:500]}"}

        image_url = None
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8', errors='replace')
                # Try direct JSON parse
                try:
                    data = json.loads(line_str)
                    if isinstance(data, dict):
                        image_url = data.get('imageUrl') or data.get('image_url') or data.get('url')
                        if image_url:
                            break
                except json.JSONDecodeError:
                    pass
                # Try SSE format: data: {...}
                if line_str.startswith('data: '):
                    try:
                        data = json.loads(line_str[6:])
                        if isinstance(data, dict):
                            image_url = data.get('imageUrl') or data.get('image_url') or data.get('url')
                            if image_url:
                                break
                    except json.JSONDecodeError:
                        pass

        if not image_url:
            return {"status": "error", "message": "No image URL found in response stream"}

        # Download image
        img_response = requests.get(image_url, timeout=60)
        if img_response.status_code != 200:
            return {"status": "error", "message": f"Download failed: HTTP {img_response.status_code}"}

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        image_path = os.path.join(DOWNLOAD_DIR, f"arena_{timestamp}.png")
        with open(image_path, "wb") as f:
            f.write(img_response.content)

        file_size = os.path.getsize(image_path)
        print(f"[arena-api] Saved: {image_path} ({file_size} bytes)", flush=True)

        return {
            "status": "ok",
            "image_path": image_path,
            "model": model_name,
            "prompt": prompt,
            "image_url": image_url
        }

    except requests.Timeout:
        return {"status": "error", "message": "Request timed out"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def main():
    if len(sys.argv) < 2:
        print("Usage: python arena_api.py <prompt> [model_name]")
        sys.exit(1)

    prompt = " ".join(sys.argv[1:])
    model = sys.argv[2] if len(sys.argv) > 2 else "gpt-image-2"

    result = generate_image(prompt, model)
    print(json.dumps(result, indent=2))

    if result.get("status") != "ok":
        sys.exit(1)


if __name__ == "__main__":
    main()
