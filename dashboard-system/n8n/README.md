# n8n Workflows — Export

Exportierte Workflows aus der lokalen n8n-Instanz.

## Workflows

| Workflow | Datei | Aktiv |
|----------|-------|-------|
| Nolea Produkt und Content | `nolea-produkt-und-content.json` | ✅ Ja |
| My workflow | `my-workflow.json` | ❌ Nein |

## Import auf Julians Server

Sobald n8n auf dem Server läuft, Workflows importieren:

```bash
# Alle Workflows importieren
n8n import:workflow --input ~/multi-agent-dashboard/n8n/
```

Oder einzeln:

```bash
n8n import:workflow --input ~/multi-agent-dashboard/n8n/nolea-produkt-und-content.json
```

Danach in der n8n-UI (`http://localhost:5678`) Credentials setzen und Workflows aktivieren.
