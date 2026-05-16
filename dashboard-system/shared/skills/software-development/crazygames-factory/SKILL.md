---
name: crazygames-factory
description: "CrazyGames Game Factory — Phaser 3 + TypeScript Game Development Pipeline, n8n Automation, Multi-Game Architektur"
version: 1.0.0
author: Damia
metadata:
  hermes:
    tags: [crazygames, phaser, typescript, game-dev, n8n, game-factory]
---

# CrazyGames Game Factory

## Überblick
Automatisierte Browser-Game-Produktion mit Phaser 3 + TypeScript. Multi-Game-Architektur mit n8n-Workflow-Steuerung.

## Projektstruktur
```
D:\hermes\crazygames-factory\
├── games/                    # Ein Unterordner pro Spiel (games/<gameId>/)
│   └── <gameId>/
│       ├── src/
│       ├── assets/
│       └── dist/
├── tools/
│   └── hermes-runner.mjs     # CLI Adapter (TODO: echten Hermes Befehl einbinden)
├── package.json
└── tsconfig.json
```

## Technologie-Stack
- **Engine**: Phaser 3
- **Sprache**: TypeScript
- **Pipeline**: 39 Source Files, 11 Node.js Scripts
- **Automation**: n8n Workflows
- **Speicher**: D: Drive (609GB frei)

## Workflows

### 1. Neues Spiel erstellen
1. `games/<gameId>/` Verzeichnis anlegen
2. Phaser 3 Grundgerüst kopieren
3. Game-Logik implementieren
4. Assets einbinden
5. Build + Test

### 2. Build & Deploy
```bash
cd /mnt/d/hermes/crazygames-factory
npm run build:<gameId>
```

### 3. n8n Automation
- Workflows für: Game-Generierung, Testing, Deployment
- n8n triggert Hermes für Code-Erstellung

## Pitfalls
- D: Drive ist NTFS — Node.js Abhängigkeiten können EPERM-Fehler verursachen
- Phaser 3 Canvas Rendering im Browser testen
- CrazyGames hat spezifische API-Anforderungen (SDK einbinden)
- Mobile Performance optimieren (60 FPS Ziel)