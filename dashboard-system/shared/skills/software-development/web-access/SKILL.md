---
name: web-access
description: Integrate external web services (TinyFish, APIs, scraping) into hermes-agent sessions — install, configure, and use in isolated environments with proper venv and dependency handling.
version: 1.0.0
author: Hermes Agent
tags: [web, scraping, api, tinyfish, integration, setup]
platforms: [linux, macos, windows]
---

# Web Access & External Service Integration

Integrate third-party web access tools (TinyFish, web scraping libraries, REST APIs) into hermes-agent sessions. Handles installation in isolated venvs, dependency conflicts, API key management, and fallback strategies.

## When to Use

- User asks to scrape, fetch, or browse websites programmatically
- User requests use of TinyFish for web tasks
- External Python package needed (requests, beautifulsoup4, httpx, etc.) but not in base environment
- API requires key setup or environment variables
- Working around permission/installation constraints in the agent venv

## Key Concepts

- **Agent Python version**: The running agent uses a specific Python version (often Python 3.11 as of 2025). New venvs must match this version to avoid binary compatibility errors (pydantic_core, httpx, etc.).
- **Hermes venv path**: `/home/damia/.hermes/hermes-agent/venv` (or `sys.executable`'s `dirname(2)`). Use this as the target venv for package installation when write-access is available.
- **Isolated venv**: When system-wide install is blocked (PEP 668), create a project-local venv with the same Python version as the agent.
- **TINYFISH_API_KEY**: Required environment variable for all TinyFish API calls. Must be set before using `tinyfish.fetch`.
- **Binary wheel errors**: `No module named 'pydantic_core._pydantic_core'` indicates Python version mismatch between venv and installed wheel.

## Standard Workflow

### 1. Check Prerequisites

- Verify `TINYFISH_API_KEY` (if using TinyFish)
- Check current Python version: `sys.version`
- Check if package already available: `import tinyfish` (or target package)

### 2. Install Target Package

**Preferred**: Install into Hermes venv (persistent, reusable):
```bash
/home/damia/.hermes/hermes-agent/venv/bin/pip install <package>
```

**Alternative**: Create matching venv when Hermes venv is read-only:
```bash
python3 -m venv /tmp/tool-venv
/tmp/tool-venv/bin/pip install <package>
```

**Critical**: The `python3` used for `python3 -m venv` must match agent's Python major.minor version (e.g., both 3.11.x). Check with `python3 --version` and `sys.version`.

### 3. Resolve Binary Dependencies

If import fails with `_pydantic_core` or similar binary extension errors:
```bash
# Ensure pydantic-core matches Python version
pip install --force-reinstall --no-cache-dir pydantic-core
```

If that fails, recreate the venv with the correct Python version and reinstall.

### 4. Validate Installation

```python
import sys
sys.path.insert(0, '/path/to/venv/lib/python3.X/site-packages')
import target_package
print(target_package.__version__)
```

### 5. Execute Task

Use the installed package within `execute_code` or pass the venv's Python as `workdir` interpreter for terminal commands.

## TinyFish-Specific

TinyFish provides:
- `tinyfish.fetch` — clean content extraction from URLs
- `tinyfish.search` — web search queries
- `tinyfish.browser` — automated browser sessions (if available in plan)

### TinyFish Setup Checklist

- [ ] `TINYFISH_API_KEY` set in environment (check with `echo $TINYFISH_API_KEY`)
- [ ] Package installed in accessible venv
- [ ] Test fetch: `tinyfish.fetch(url="https://example.com")`
- [ ] Handle `FetchError`, `APIError` gracefully

### Without API Key

If no key available, fall back to:
- `requests` + `beautifulsoup4` for static HTML
- `yt-dlp` for YouTube (if installed system-wide)
- Manual JSON API calls (e.g., YouTube Data API v3 requires separate key)

## Pitfalls

- **PEP 668 externally-managed-environment**: Don't use `--break-system-packages`. Use venv or pipx instead.
- **Python version mismatch**: Creating a venv with Python 3.12 and trying to use it from a Python 3.11 agent causes binary incompatibility. Always match versions.
- **venv binary not on PATH**: The `tinyfish` CLI is not installed by default; use Python import within execute_code or call venv's `python -m tinyfish`.
- **API key scopes**: TinyFish key may have rate limits or feature restrictions. Check provider dashboard if calls fail with 403/429.
- **Dynamic JavaScript pages**: TinyFish fetch returns server-rendered HTML; for SPA content (YouTube trending), you may need browser automation or API endpoints instead.
- **YouTube Trending**: Not reliably accessible via static fetch; use YouTube Data API v3 or `yt-dlp --get-info` with `--dump-json` for video metadata.

## Verification & Quick Start

After installation, run:
```bash
/path/to/venv/bin/python -c "import tinyfish; print(tinyfish.version)"
```
If this succeeds, TinyFish is ready.

For web scraping without TinyFish:
```bash
python -c "import requests, bs4; print('OK')"
```

### Quick Start — First-Time TinyFish Setup in Hermes (from 2025-05-14 session)

Based on actual integration work:

1. **Find Hermes venv pip path** (Python 3.11 as of this session):
   ```bash
   HERMES_PIP="/home/damia/.hermes/hermes-agent/venv/bin/pip3.11"
   ```
   Adjust if your agent lives elsewhere (check `sys.executable`).

2. **Install TinyFish into that venv**:
   ```bash
   $HERMES_PIP install --quiet tinyfish
   ```

3. **Set the API key** (once per shell):
   ```bash
   export TINYFISH_API_KEY="your_key"
   ```

4. **Test it**:
   ```python
   import sys
   sys.path.insert(0, '/home/damia/.hermes/hermes-agent/venv/lib/python3.11/site-packages')
   from tinyfish.fetch import fetch
   result = fetch(url="https://example.com")
   print(result.content[:200])
   ```

**If you see** `No module named 'pydantic_core._pydantic_core'`: Python version mismatch. Recreate the venv with the **same Python version as the running agent** (`python3 --version`), then reinstall tinyfish.

Full troubleshooting: `references/tinyfish-hermes-integration.md`.

## Related Skills

- `polymarket` — uses Gamma/CLOB APIs (similar HTTP pattern, but no browser)
- `youtube-content` — YouTube transcripts/summaries via yt-dlp or official APIs
- `playwright-web-automation` — when the target is a JS-heavy web app without public API; uses Playwright for browser automation, session cookie persistence, and JS bundle reverse-engineering
