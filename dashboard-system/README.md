# 🤖 Multi-Agent System

**Root:** `D:\hermes\multi-agent\`

## Struktur
```
D:\hermes\multi-agent\
├── configs/
│   ├── agents.yaml              # Sub-Agent Konfiguration
│   ├── setup-main-agent.sh      # Setup-Script für neue Main Agents
│   └── ssh-config-template.txt  # SSH Config für Cross-Device-Sync
├── dashboard/
│   └── index.html               # Frontend (HTML/CSS)
├── scripts/
│   ├── dashboard-server.py      # Web-Dashboard (Port 8383)
│   ├── multi-agent-dashboard.py # CLI Dashboard
│   ├── multi-agent-sync.sh      # Sync-Script
│   └── token-tracker.py         # Token-Tracking
└── shared/
    ├── skills/                   # Geteilte Skills
    ├── logs/                     # Sync-Logs
    ├── tokens/                   # Token-Verbrauch
    ├── plans/                    # Task-Pläne
    └── calendar/                 # Content-Kalender
```

## Main Agents
| Agent | Host | Status |
|-------|------|--------|
| Jeff | Suffix (Damian's PC) | ✅ Active |
| NAME | Julian's Server | ⏳ Setup pending |
| Claudi/Cloudy | Julian's PC | ⏳ Setup pending |

## Befehle (WSL nach `source ~/.bashrc`)
| Befehl | Funktion |
|--------|----------|
| `dashboard` | CLI Dashboard |
| `dashboard-web` | Web-Dashboard (http://localhost:8383) |
| `tokens` | Token-Report |
| `sync-agents` | Manueller Sync |
| `ts-status` | Tailscale Status |
| `sub-agents` | Agent-Konfiguration |
| `jeff` | Whoami + Dashboard |
| `open-hermes` | D:\hermes im Explorer öffnen |

## Setup für neue Main Agents
Siehe `configs/setup-main-agent.sh`
