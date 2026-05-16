# TinyFish Integration — Hermes Agent Session Notes (2025-05-14)

## Problem Sequence

1. **TinyFish not installed** — `which tinyfish` returned false; `pip show tinyfish` returned nothing in system Python.
2. **Attempted install via pip** — hit PEP 668 externally-managed-environment. Used `python3 -m venv /tmp/tinyfish-venv` then pip install inside venv → succeeded but created venv with Python 3.12.
3. **Import error** — `No module named 'pydantic_core._pydantic_core'` when importing tinyfish from `/tmp/tinyfish-venv` while agent runs Python 3.11. Root cause: binary wheel compiled for Python 3.12, incompatible with agent's Python 3.11.
4. **Wrong venv pip path** — tried `/home/damia/.hermes/hermes-agent/venv/bin/pip` but actual binary is `pip3.11`.
5. **TINYFISH_API_KEY not set** — fetch would fail even after install.

## Solutions Applied

### Install TinyFish in the Agent's Venv (Correct Python Version)

```bash
# Hermes venv pip location (Python 3.11 as of this session)
HERMES_PIP="/home/damia/.hermes/hermes-agent/venv/bin/pip3.11"

$HERMES_PIP install tinyfish
# → Success. Installs to /home/damia/.hermes/hermes-agent/venv/lib/python3.11/site-packages
```

### Verify Installation

```python
import sys
sys.path.insert(0, '/home/damia/.hermes/hermes-agent/venv/lib/python3.11/site-packages')
import tinyfish
print(tinyfish.__version__)  # 0.2.5
```

### Set API Key (once per session)

```bash
export TINYFISH_API_KEY="your_key_here"
```

Or in Python before using tinyfish:
```python
import os
os.environ['TINYFISH_API_KEY'] = 'your_key_here'
```

### Basic Fetch Usage

```python
from tinyfish.fetch import fetch

response = fetch(
    url="https://example.com",
    format="markdown"  # or "html", "text"
)
print(response.content)
```

## Key Paths

- Hermes venv: `/home/damia/.hermes/hermes-agent/venv`
- Hermes pip: `/home/damia/.hermes/hermes-agent/venv/bin/pip3.11`
- Hermes python: `/home/damia/.hermes/hermes-agent/venv/bin/python3.11`
- Tinyfish module: `/home/damia/.hermes/hermes-agent/venv/lib/python3.11/site-packages/tinyfish`

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `FileNotFoundError: .../tinyfish-venv/bin/tinyfish` | Expected CLI binary; tinyfish only provides Python SDK | Import `tinyfish` module; call `tinyfish.fetch()` directly |
| `No module named 'pydantic_core._pydantic_core'` | venv Python version != wheel compile version | Recreate venv with same Python version as agent; reinstall package |
| `externally-managed-environment` | System Python protected by PEP 668 | Use venv or `--break-system-packages` (not recommended) |
| `TINYFISH_API_KEY not set` (env) | Environment variable missing | `export TINYFISH_API_KEY=...` before session or set in code |
| `403 Forbidden` from Gamma API | Missing/invalid key or rate limit | Verify key validity; check dashboard; add delay/retry |

## Alternative: System-Wide Install via pipx (Future Option)

If `pipx` is available:
```bash
pipx install tinyfish
# then use: /home/damia/.local/bin/tinyfish ...
```

But the Python SDK import approach is more reliable within `execute_code`.

## Notes on YouTube Trending

YouTube's trending page is heavily JavaScript-driven; `tinyfish.fetch` returns initial HTML without client-rendered content. For reliable trending data:
- Use YouTube Data API v3 (requires separate API key)
- Use `yt-dlp --get-info --dump-json "https://youtube.com/feed/trending"` (may need `--playlist-end 5`)
- Prefer: `yt-dlp --get-title --get-view-count --get-duration --get-id --get-url --get-upload-date --get-channel --get-like-count --get-description "https://www.youtube.com/feed/trending"` with JSON output
