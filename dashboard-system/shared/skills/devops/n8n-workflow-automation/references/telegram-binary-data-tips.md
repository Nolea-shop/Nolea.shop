# Telegram & Binary Data Tips for n8n Workflows

## Telegram Integration Fixes (from 2026-05-01 session)
- **Credential Refresh**: If Telegram nodes return 404, delete old credentials and recreate with valid bot token (verify via `curl https://api.telegram.org/bot<TOKEN>/getMe`).
- **Chat ID**: Use personal User ID (from @userinfobot), not bot ID.
- **400 "no photo" Error Fix**:
  1. Set HTTP Request node's **Response Format** to `File` (not JSON) when fetching images.
  2. Remove unnecessary Code nodes converting base64 to binary (n8n 2.18.5 Code Node v2 mishandles binary data).
  3. Telegram node's **Binary Property** must match the HTTP Request's output key (default: `data`).

## Binary Data Best Practices
- Prefer direct file responses from upstream services (e.g., Flask `send_file`) over JSON+base64 to simplify workflows.
- n8n 2.18.5 does not support `n8n-nodes-base.readFile` node; use direct file responses or base64 in Code nodes.

## Bridge Server Pattern (WSL→Windows)
For bridge servers forwarding requests to Windows (e.g., Playwright scripts):
- Return files directly using `send_file` with correct mimetype (`image/png` for images) instead of embedding base64 in JSON.
- Example Flask route:
  ```python
  @app.route("/generate", methods=["POST"])
  def generate():
      # ... run script to generate image ...
      if os.path.exists(wsl_path):
          return send_file(wsl_path, mimetype='image/png', as_attachment=True, download_name='arena_image.png')
  ```

## Common Python Pitfalls in Flask Bridge Servers

### 1. Unreachable `send_file()` — orphan `else:` after `except`
If a route has an `else:` block that is not attached to an `if` (e.g., it follows an `except` block without being part of an `if/else` chain), Python raises `SyntaxError` at runtime. In n8n's background Flask process, this exception is caught and handled by a generic error handler that returns JSON — never reaching `send_file()`. Result: n8n gets JSON instead of PNG binary.

**Bad pattern (from arena_bridge_server_wsl.py, lines 120-127):**
```python
try:
    result = subprocess.run(...)
except subprocess.TimeoutExpired:
    return jsonify({"status": "error", "message": "Timeout"}), 504
else:  # ← SyntaxError: this else is not attached to any if
    pass  # ← unreachable, raises SyntaxError when route is called
```
Fix: Remove the orphan `else:` block entirely. Exception handlers should end with a return statement, not fall through to a `else:`.

### 2. Duplicate exception handlers
Python only uses the last matching `except` block — earlier handlers are silently ignored. If multiple `except` blocks handle the same exception type, only the last one fires.

**Bad pattern (from arena_bridge_server_wsl.py, lines 129-132):**
```python
except subprocess.TimeoutExpired:
    return jsonify({"status": "error", "message": "Timeout"}), 504
except Exception as e:  # ← earlier duplicate handler, never fires
    return jsonify({"status": "error", "message": str(e)}), 500
except Exception as e:  # ← this one is used instead
    return jsonify({"status": "error", "message": str(e)}), 500
```

### 3. Verification command for bridge server output
Always verify the bridge server returns PNG binary, not JSON:
```bash
curl -v -X POST http://127.0.0.1:18765/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}' \
  --max-time 90 \
  -o /tmp/test_output.png

file /tmp/test_output.png
# Expected: /tmp/test_output.png: PNG image data
# If ASCII text or JSON: bridge server is returning JSON error instead of image
```

Also check for `Content-Type: image/png` in the curl `-v` output (not `application/json`).
