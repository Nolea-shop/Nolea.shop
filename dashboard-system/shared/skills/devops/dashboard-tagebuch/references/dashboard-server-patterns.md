# Dashboard Server (BaseHTTPRequestHandler) Patterns

## Path Matching mit Query-Parametern

Der Dashboard Server verwendet `BaseHTTPRequestHandler`. `self.path` enthält den kompletten Pfad inkl. Query-String (`/api/diary?limit=30`).

**FALSCH** — bricht mit Query-Parametern:
```python
elif self.path == "/api/diary":
```

**RICHTIG** — unterstützt Query-Parameter:
```python
elif self.path == "/api/diary" or self.path.startswith("/api/diary?"):
```

**BESSER** — sauberes URL-Parsing:
```python
from urllib.parse import urlparse, parse_qs
parsed = urlparse(self.path)
path = parsed.path        # "/api/diary"
params = parse_qs(parsed.query)  # {"limit": ["30"]}
```

## JSON Response Helper
```python
def json_resp(handler, data):
    handler.send_response(200)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(json.dumps(data).encode())
```

## HTML Response Helper
```python
def html_resp(handler, content):
    handler.send_response(200)
    handler.send_header("Content-Type", "text/html; charset=utf-8")
    handler.end_headers()
    handler.wfile.write(content.encode())
```

## SSE (Server-Sent Events)
The dashboard uses SSE for live updates via `/api/events`. Events are pushed every 5s:
```python
while True:
    time.sleep(5)
    if _changed("system", data):
        self.wfile.write(f"event: system\ndata: {json.dumps(data)}\n\n".encode())
        self.wfile.flush()
```
