# NOLEA_BRAIN Debugging Notes

## Symptom: App zeigt nur Demo-Daten statt echte brain.db Daten

**Betroffen:** Desktop App öffnet sich, aber zeigt nur die hartcodierten `fallbackNodes` aus App.tsx.

**Ursache:** Port-Mismatch zwischen Frontend und Backend.

| Component | Erwarteter Port | Tatsächlicher Port |
|-----------|------------------|-------------------|
| Backend (main.py) | - | 8001 |
| App.tsx API_URL | 8000 ❌ | sollte 8001 sein |

**Diagnose-Schritte:**
1. App öffnet → zeigt nur 5 Demo-Nodes (Brand Memory, Launch Tasks, etc.)
2. Backend-Terminal prüfen → läuft auf Port 8001
3. App.tsx Zeile 27 → `const API_URL = "http://localhost:8000"` gefunden
4. Fix: `8000` → `8001`

**Warum keine Fehlermeldung?** Die App.tsx hat `fallbackNodes` als Fallback wenn API nicht erreichbar.

---

## Symptom: "electron" konnte nicht gefunden werden

**Betroffen:** `npm start` in desktop-app Ordner.

**Ursache:** `npm start` sucht nach globalem `electron`, aber electron ist local in node_modules.

**Fix:** `npx electron .` statt `npm start`

---

## Symptom: Batch-Datei schließt sofort

**Ursache:** `cmd /c` schließt Fenster nach Ausführung.

**Fix:** 
- `cmd /k` statt `cmd /c` ( Fenster bleibt offen)
- `pause` am Ende anbringen
- `%~dp0` Variable vor `cd` Befehlen speichern: `set NOLEA_DIR=%~dp0`

---

## Symptom: Backend startet nicht von WSL aus

**Ursache:** 
- pip nicht in WSL Python
- SQLite auf /mnt/d/ (NTFS) hat Lock-Probleme unter WSL2

**Fix:** Immer `start-all.bat` auf Windows ausführen, nicht aus WSL terminal.