# NOLEA_BRAIN: Import-Fix für api/endpoints.py

## Problem (2026-05-06)
Beim Starten des Backends aus WSL2 trat folgender Fehler auf:
```
ImportError: cannot import name 'business' from partially initialized module 'api' 
(most likely due to a circular import) (/mnt/d/hermes/NOLEA_BRAIN_APP/engine/api/__init__.py)
```

## Ursache
`api/endpoints.py` versuchte `from . import business`, aber `business.py` liegt im Ordner `core/`, nicht in `api/`.

## Lösung
In `api/endpoints.py` den Import-Pfad korrigieren:

```python
# VORHER (falsch):
from fastapi import APIRouter, HTTPException
from . import business

# NACHHER (korrekt):
from fastapi import APIRouter, HTTPException
import sys
import os

# Füge engine/ zum Pfad hinzu, damit core importiert werden kann
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core import business
```

## WSL2 Python Environment
Der Server muss mit dem korrekten Python-Interpreter gestartet werden (Hermes-venv):
```bash
cd /mnt/d/hermes/NOLEA_BRAIN_APP/engine
/home/damia/.hermes/hermes-agent/venv/bin/python3 main.py
```

## Getestet
- `GET /` → `{"status":"NOLEA_BRAIN ENGINE RUNNING",...}`
- `GET /api/hermes/stats` → Funktional
- `GET /api/nodes` → Liefert Nodes aus brain.db
