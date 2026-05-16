# n8n Execution Monitoring — Live-Status für Dashboards

## Problem
Das Dashboard soll anzeigen, ob ein n8n-Workflow **gerade aktiv läuft** — egal ob manuell gestartet oder per Schedule. `wf.get("active")` sagt nur "Workflow ist veröffentlicht", nicht "Workflow läuft gerade".

## Lösung: `/api/v1/executions` Endpoint

```python
import urllib.request, json

def get_n8n_executions(N8N_API_KEY, N8N_WORKFLOW_ID):
    """Prüft ob der Workflow gerade läuft (manuell ODER per Schedule)"""
    try:
        BASE = "http://localhost:5678/api/v1"
        req = urllib.request.Request(
            f"{BASE}/executions?workflowId={N8N_WORKFLOW_ID}&status=running&limit=3",
            headers={"X-N8N-API-KEY": N8N_API_KEY})
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read())
            if "data" in d: d = d["data"]
            if isinstance(d, list) and len(d) > 0:
                e = d[0]
                return {
                    "running": True,
                    "id": e.get("id", "?"),
                    "started": e.get("startedAt", "?")[:19],
                    "mode": e.get("mode", "?")  # "manual" | "trigger"
                }
    except:
        pass
    return {"running": False}
```

## Response-Format

```json
{
  "data": [
    {
      "id": "174",
      "finished": false,
      "mode": "manual",
      "retryOf": null,
      "retrySuccessId": null,
      "status": "running",
      "startedAt": "2026-05-15T18:30:08.073Z",
      "stoppedAt": null,
      "workflowId": "WCopdGEIx5F6Q3ZF",
      "waitTill": null
    }
  ],
  "nextCursor": null
}
```

## Wichtige Erkenntnisse

1. **`/api/v1/executions` wrappt in `{"data": [...]}`** — anders als `/api/v1/workflows` (flaches JSON). Immer `d["data"]` parsen.
2. **`mode: "manual"`** = User hat "Execute Workflow" geklickt. **`mode: "trigger"`** = Schedule/Webhook.
3. **`status: "running"`** filtert nur aktive, nicht abgeschlossene oder fehlgeschlagene Executions.
4. **Timeout 5s** — falls n8n nicht antwortet, `except` fängt es ab und gibt `running: False` zurück.
5. **Dashboard sollte zwischen manual/trigger unterscheiden** — User will sehen ob jemand den Workflow manuell gestartet hat.

## Integration ins Dashboard

```python
# In dashboard-server.py:
execution = get_n8n_executions()
is_running = execution.get("running", False)  # NUR execution check, nicht wf.get("active")
status = "running" if is_running else "idle"
```

**Pitfall:** `wf.get("active")` bedeutet "Workflow ist veröffentlicht", nicht "Workflow läuft gerade". Nicht für Live-Status verwenden.
