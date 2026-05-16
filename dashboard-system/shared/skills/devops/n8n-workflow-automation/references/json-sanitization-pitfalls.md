# n8n Workflow JSON Sanitization

## Problem
Python's `json.load()` fails with `JSONDecodeError: Invalid control character` when importing n8n workflow JSONs that contain non-printable ASCII bytes (0x00-0x1F except tab, LF, CR).

**Typical error:** `json.decoder.JSONDecodeError: Invalid control character at: line 49 column 161`

## Root Causes
1. **Windows line endings** (`\r\n`) mixed with Unix (`\n`) — usually fine, but some editors insert literal `\r` as control char
2. **Copy-paste artifacts** from documentation or terminals that introduce `\x08` (backspace), `\x0c` (form feed), or other control chars
3. **Binary data** accidentally embedded in string fields (e.g., base64 strings with padding that got corrupted)
4. **Code node `jsCode`** fields containing `\r` from Windows-originated snippets

## Detection
```python
import json
with open('workflow.json', 'rb') as f:
    data = f.read()
bad = [(i, b) for i, b in enumerate(data) if b < 32 and b not in (9, 10, 13)]
print(f"Bad control chars: {len(bad)}")
for i, b in bad[:10]:
    print(f"  pos {i}: 0x{b:02x}")
```

## Sanitization Function
```python
def sanitize_n8n_json(obj):
    """Recursively clean strings in n8n workflow JSON."""
    if isinstance(obj, str):
        # Remove problematic control chars, keep \t \n \r
        return ''.join(c for c in obj if ord(c) >= 32 or ord(c) in (9, 10, 13))
    elif isinstance(obj, dict):
        return {k: sanitize_n8n_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_n8n_json(v) for v in obj]
    return obj

# Usage
with open('workflow.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
clean = sanitize_n8n_json(data)
with open('workflow-clean.json', 'w', encoding='utf-8') as f:
    json.dump(clean, f, ensure_ascii=False, indent=2)
```

## One-liner CLI
```bash
python3 -c "import json,sys; d=json.load(open('workflow.json')); json.dump(d, open('workflow-clean.json','w'), ensure_ascii=False, indent=2)"
```
If this fails, the JSON contains non-UTF-8 bytes or control chars. Use the sanitize function above.

## Validation After Sanitization
```bash
python3 -m json.tool workflow-clean.json > /dev/null && echo "VALID"
```

## n8n-Specific Fields to Check
- `nodes[].parameters.jsCode` — most common source of `\r` from Windows snippets
- `connections` — if manually edited, may contain stray control chars
- Any `description` or `name` fields — check for pasted text artifacts

## Prevention
When writing workflow JSONs programmatically:
- Use `json.dump(..., ensure_ascii=False)` and open files with `encoding='utf-8'`
- Avoid embedding raw strings from external sources without cleaning
- Test generated JSONs with `python3 -m json.tool` before importing to n8n

## Related
- `schedule-trigger-config.md` — another common JSON schema mismatch issue
- `n8n-owner-lockout.md` — when API login fails, UI import may still work
