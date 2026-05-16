---
name: ai-smart-home
description: "AI_SMART_HOME — Smart Home Automation Projekt, IoT Integration, Sprachsteuerung"
version: 1.0.0
author: Damia
metadata:
  hermes:
    tags: [smart-home, iot, automation, home-assistant, ai-smart-home]
---

# AI_SMART_HOME — Smart Home Projekt

## Überblick
AI_SMART_HOME ist ein Smart Home Automatisierungsprojekt. Integration von IoT-Geräten, Sprachsteuerung und AI-gestützter Automation.

## Mögliche Komponenten
- **Home Assistant** / OpenHue — Zentrale Steuerung
- **Philips Hue** — Lichtsteuerung (via OpenHue CLI)
- **Sprachsteuerung** — TTS/STT Integration
- **Sensoren** — Temperatur, Bewegung, Tür/Fenster
- **Automation** — Zeitgesteuert, Ereignisgesteuert, AI-gesteuert

## Workflows

### 1. Geräte einrichten
1. Hardware anschließen und im Netzwerk finden
2. In Home Assistant / OpenHue integrieren
3. Testen ob Steuerung funktioniert

### 2. Automationen bauen
- Zeitgesteuert (Licht an bei Sonnenuntergang)
- Ereignisgesteuert (Licht an bei Bewegung)
- AI-gesteuert (Hermes entscheidet basierend auf Kontext)

### 3. Sprachsteuerung
- Telegram als Interface
- TTS für Ansagen
- STT für Sprachbefehle

## Nützliche Befehle
```bash
# OpenHue: Lichtsteuerung
# Home Assistant API
```

## Pitfalls
- IoT-Geräte brauchen oft 2.4GHz WLAN
- Firewall-Ports für lokale Kommunikation freigeben
- Regelmäßige Firmware-Updates nicht vergessen