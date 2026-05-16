# Herzstuck / Next.js Product Pipeline — E2E Test Workflow

## Purpose
A minimal n8n workflow that validates the entire product-publishing pipeline without needing Reddit or Stripe credentials. Fires a mock topic through `Generate Product` → `Push to Shop` and verifies the product appears in the Next.js shop instantly.

## JSON

```json
{
  "name": "Herzstuck - E2E Test",
  "nodes": [
    {
      "parameters": {},
      "id": "trigger",
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "jsCode": "return [{json: {\n  title: '30 leichte Sommerkuchen ohne Backen',\n  keywords: ['nobake','sommer','kuchen','einfach','schnell'],\n  engagement_score: 45.2\n}}];"
      },
      "id": "mock",
      "name": "Mock Topic",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [440, 300]
    },
    {
      "parameters": {
        "jsCode": "const t = $input.first().json;\nconst price = t.suggested_price || 7.99;\nconst slug = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0,40);\nreturn [{json: {\n  slug, title: t.title.slice(0,60),\n  subtitle: 'Das ultimative Guide basierend auf Community-Trends',\n  price,\n  category: 'backen',\n  tags: t.keywords.slice(0,5),\n  description: `Entdecke ${t.title} - basierend auf Tausenden Community-Diskussionen.`,\n  features: [t.title + ' Schritt-fuer-Schritt Anleitung','Druckfertiges PDF','Sofortiger Download'],\n  faq: [{q:'Welches Format?', a:'PDF - druckfertig und mobil optimiert.'}],\n  status: 'active'\n}}];"
      },
      "id": "generate",
      "name": "Generate Product",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [640, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3000/api/n8n-product",
        "sendHeaders": true,
        "headerParameters": {"parameters":[{"name":"x-n8n-secret","value":"Herzstueck2024!"}]},
        "sendBody": true,
        "contentType": "json",
        "bodyParameters": {
          "parameters": [
            {"name":"slug","value":"={{$json.slug}}"},
            {"name":"title","value":"={{$json.title}}"},
            {"name":"subtitle","value":"={{$json.subtitle}}"},
            {"name":"price","value":"={{$json.price}}"},
            {"name":"description","value":"={{$json.description}}"},
            {"name":"features","value":"={{$json.features}}"},
            {"name":"faq","value":"={{$json.faq}}"},
            {"name":"category","value":"={{$json.category}}"},
            {"name":"tags","value":"={{$json.tags}}"}
          ]
        }
      },
      "id": "push",
      "name": "Push to Shop",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [840, 300]
    }
  ],
  "connections": {
    "Manual Trigger": {"main":[[{"node":"Mock Topic","type":"main","index":0}]]},
    "Mock Topic": {"main":[[{"node":"Generate Product","type":"main","index":0}]]},
    "Generate Product": {"main":[[{"node":"Push to Shop","type":"main","index":0}]]}
  },
  "settings": {"executionOrder":"v1"},
  "tags": ["herzstuck","test"]
}
```

## How to validate

1. Import JSON to n8n (UI → Import, or `POST /rest/workflows` with auth cookie)
2. Click **Execute workflow** in UI
3. Check `content/products/` for the new JSON file
4. Browse to `http://localhost:3000/shop` — the product card must appear immediately

## Notes
- Replace `Herzstueck2024!` with your actual `N8N_SECRET`
- Replace `http://localhost:3000` with your deployed URL for production
- No Stripe or Reddit credentials needed — this is a pure "does the pipe flow" test
