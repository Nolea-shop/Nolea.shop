---
name: n8n-api-control
title: n8n API Control
description: Steuerung von n8n über REST API - Workflow erstellen und ausführen ohne grafisches Interface
tags: [n8n, api, automation, devops]
version: 1.0
---

# n8n API Control Skill

Dieser Skill ermöglicht die Steuerung von n8n über die REST API anstelle von Mausklicks im Interface.

## Konfiguration

```python
import requests
import json

N8N_BASE_URL = "http://localhost:5678/api/v1"  # Standard-URL für lokales n8n
N8N_API_KEY = "HIER_N8N_API_KEY_EINFÜGEN"       # API Key aus n8n Settings

HEADERS = {
    "X-N8N-API-KEY": N8N_API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

## Funktionen

### create_workflow(name: str, nodes: list, connections: dict)

Erstellt einen neuen n8n-Workflow direkt über die API.

**Parameter:**
- `name`: Name des Workflows
- `nodes`: Liste von n8n-Nodes (Dictionaries)
- `connections`: Dictionary der Verbindungen

**Rückgabe:** JSON-Response mit Workflow-Daten oder None bei Fehler

```python
def create_workflow(name: str, nodes: list, connections: dict):
    payload = {
        "name": name,
        "nodes": nodes,
        "connections": connections,
        "active": False
    }
    
    try:
        response = requests.post(f"{N8N_BASE_URL}/workflows", headers=HEADERS, json=payload)
        response.raise_for_status()
        print(f"Erfolg! Workflow '{name}' wurde erstellt. ID: {response.json().get('id')}")
        return response.json()
    except Exception as e:
        print(f"Fehler beim Erstellen des Workflows: {e}")
        return None
```

### execute_workflow(workflow_id: str)

Startet einen Workflow in n8n anhand seiner ID.

**Parameter:**
- `workflow_id`: Die ID des zu startenden Workflows

**Rückgabe:** JSON-Response mit Ausführungsstatus oder None bei Fehler

```python
def execute_workflow(workflow_id: str):
    try:
        response = requests.post(
            f"{N8N_BASE_URL}/workflows/{workflow_id}/execute",
            headers=HEADERS
        )
        response.raise_for_status()
        print(f"Workflow erfolgreich ausgeführt!")
        return response.json()
    except Exception as e:
        print(f"Fehler bei der Ausführung: {e}")
        return None
```

## Ablauf für Phase 1

1. Bei Workflow-Erstellung: Nutze `create_workflow()` mit generiertem JSON für Nodes
2. Bei Workflow-Test: Nutze `execute_workflow()` mit der Workflow-ID
3. Immer mit API Key konfigurieren bevor Funktionen aufgerufen werden

## Fallback: Workflows via SQLite exportieren

Wenn die REST API nicht verfügbar ist (Cookie-Auth, kein API-Key konfiguriert), können Workflows direkt aus der SQLite-Datenbank gelesen werden:

```python
import json, sqlite3

db = sqlite3.connect("~/.n8n/database.sqlite")
db.row_factory = sqlite3.Row

rows = db.execute("SELECT id, name, active, nodes, connections, settings, staticData, createdAt, updatedAt FROM workflow_entity").fetchall()

for row in rows:
    wf = dict(row)
    # JSON-Felder parsen
    for field in ["nodes", "connections", "settings", "staticData"]:
        val = wf.get(field)
        if val and isinstance(val, str):
            try:
                wf[field] = json.loads(val)
            except:
                pass
    
    export = {
        "id": wf["id"],
        "name": wf["name"],
        "active": bool(wf["active"]),
        "createdAt": wf["createdAt"],
        "updatedAt": wf["updatedAt"],
        "nodes": wf.get("nodes", []),
        "connections": wf.get("connections", {}),
        "settings": wf.get("settings", {}),
        "staticData": wf.get("staticData", None),
    }
    
    safe_name = wf["name"].replace(" ", "-").replace("/", "-").lower()
    with open(f"n8n/{safe_name}.json", "w") as f:
        json.dump(export, f, indent=2, ensure_ascii=False)
```

**Tabelle:** `workflow_entity` enthält alle Workflows. Die Spalten `nodes`, `connections`, `settings`, `staticData` sind JSON-Strings.

## n8n CLI Import/Export

Falls die n8n CLI verfügbar ist (npm install -g n8n), Workflows exportieren/importieren:

```bash
# Alle Workflows exportieren
n8n export:workflow --all --output=./n8n-exports/

# Workflows importieren
n8n import:workflow --input=./n8n-exports/

# Einzelnen Workflow importieren
n8n import:workflow --input=./n8n-exports/nolea-produkt-und-content.json
```

**Pitfall:** `n8n export:workflow` kann bei großen Datenbanken timeouten (60s+). In dem Fall SQLite-Fallback nutzen.

## Pitfalls

### Cookie-basierte Auth statt API Key
Nicht alle n8n-Instanzen haben einen API-Key konfiguriert. Lokale/native Installationen (npm, nicht Docker) laufen oft mit Cookie-Auth. In dem Fall:
- REST API gibt `401 Unauthorized` zurück
- API-Key-basierte Funktionen funktionieren nicht
- **Lösung:** SQLite-Fallback (s.o.) oder Cookie aus Browser DevTools extrahieren

### n8n Datenbank-Pfad
- **WSL (npm):** `~/.n8n/database.sqlite`
- **Docker:** Im Docker-Volume (meist unter `./n8n-data/database.sqlite`)
- **Windows:** `%APPDATA%/n8n/database.sqlite`