# NOLEA_BRAIN Optimierungsplan

## Deep Analyse Ergebnisse

### Projektstruktur
```
NOLEA_BRAIN_APP/
├── engine/
│   ├── main.py       (508 Zeilen, FastAPI + SQLite)
│   ├── api/          (LEER - Platzhalter)
│   ├── core/         (LEER - Platzhalter)
│   └── data/brain.db
├── desktop-app/
│   ├── main.cjs
│   ├── preload.cjs
│   └── src/App.tsx   (970 Zeilen, React + Tailwind)
├── build-exe.bat
├── start-all.bat
└── setup-syncthing.ps1
```

## Kritische Issues

1. **Leere Verzeichnisse** - api/ und core/ existieren aber leer
2. **SQLite File Lock** - brain.db auf /mnt/d/ hat WSL2 File-Lock-Probleme
3. **Kein Real Graph** - Kein Force-Directed Layout, nur manuelle Positionierung
4. **Keine Tests** - Kein pytest, kein Vitest, kein CI/CD
5. **Background Sync sinnlos** - background_sync() macht nichts

## Optimierungsphasen

### Phase 1: Sofort
- Datenbank auf Windows-Pfad
- Syncthing korrekt konfigurieren
- Dependencies checken

### Phase 2: Architektur
- api/ und core/ nutzen für Routes/Business Logic
- SQLite WAL-Mode für Concurrency
- Dependency Injection

### Phase 3: UI/UX
- Force-Directed Graph Layout (d3-force)
- Keyboard Shortcuts
- Bulk Actions

### Phase 4: Features
- Agent-Framework
- Export/Import (JSON, Markdown)
- Tag-Hierarchie

### Phase 5: Infrastructure
- pytest + Vitest
- GitHub Actions CI/CD
- Auto-Update
