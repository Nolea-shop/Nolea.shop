---
title: "Nolea PDF-Produkt Erstellung — Komplette Agenten-Anleitung"
version: "1.0"
---

# Nolea PDF-Produkt Erstellung — Agenten-Anleitung

Diese Anleitung beschreibt exakt, wie ein AI-Agent ein neues PDF-Produkt für
nolea.shop auf Supabase hochlädt und das zugehörige Firestore-Produkt erstellt.

HINWEIS FÜR EXTERNE AGENTEN:
  Secrets sind NICHT in dieser Datei hinterlegt.
  Lese sie bei Bedarf aus den jeweils angegebenen Pfaden aus.

---

## 1. Prozessübersicht

1. PDF generieren oder vorhandene Datei verwenden
2. PDF zu Supabase Storage Bucket `pdfs` hochladen
3. Firestore Produkt in Collection `recipes` erstellen
4. Composite Index prüfen (falls nötig)
5. Vercel Deployment triggern

---

## 2. Credentials — Pfade & Abfrage

| Name | Wert / Pfad | Abfrage (falls dynamisch) |
|------|-------------|--------------------------|
| **Supabase URL** | `https://mmlqyzcowrckhtaaqzvz.supabase.co` | — |
| **Supabase Anon Key** | Lies aus `/home/server/Herzst-ck/.env` | `grep SUPABASE_ANON_KEY /home/server/Herzst-ck/.env` |
| **Firebase SA** | `/home/server/firebase-service-account.json` | — |
| **Stripe Secret Key** | Lies aus `/home/server/Herzst-ck/.env` | `grep STRIPE_SECRET_KEY /home/server/Herzst-ck/.env` |
| **Vercel Token** | Lies aus `/home/server/.env.vercel` | `grep VCP_TOKEN /home/server/.env.vercel` |
| **Vercel Projekt-ID** | `prj_qoVDgTTO6OFTe1te2rk3KONvUkYK` | — |
| **Vercel Env-Check** | `GET /v8/projects/{id}/env?target=production` | `curl …/env?target=production -H "Authorization: Bearer $VCP_TOKEN"` |

---

## 3. Schritt-für-Schritt

### Schritt 3.1: PDF generieren oder prüfen

PDFs werden mit Python + `fpdf2` generiert.
Referenz-Skript liegt bei: `references/scripts/pdf-generator.py`

```python
from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("helvetica", size=12)
pdf.cell(0, 10, txt="Titel des Produkts", ln=True)
# ... weitere Inhalte ...
pdf.output("/tmp/dateiname.pdf")
```

**Anforderungen an PDFs:**
- Format: A4, Portrait
- MIME-Type: `application/pdf`
- Dateiname: kleingeschrieben, Bindestriche, z.B. `ki-guide-2026-nolea.pdf`
- Speicherort temporär: `/tmp/`

---

### Schritt 3.2: PDF zu Supabase Storage hochladen

**API-Endpunkt:** `POST /storage/v1/object/upload/pdfs/<dateiname>`

```bash
SUPABASE_ANON_KEY=$(grep SUPABASE_ANON_KEY /home/server/Herzst-ck/.env | cut -d= -f2)

curl -s -X POST \
  "https://mmlqyzcowrckhtaaqzvz.supabase.co/storage/v1/object/upload/pdfs/<DATEINAME>.pdf" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/pdf" \
  --data-binary "/tmp/<DATEINAME>.pdf"
```

**Wichtige Regeln:**
- Bucket `pdfs` ist **öffentlich** (public=true)
- Schutz liegt in `/api/download-links`, nicht im Bucket
- **KEINE Supabase Signed URLs** — geben bei Download 404 ("requested path invalid")
- Bei Erfolg: HTTP 200/201
- Dateiname (ohne Pfad) wird in Firestore als `contentUrl` gespeichert

---

### Schritt 3.3: Firestore Produkt in `recipes` erstellen

**Collection:** `recipes`
**Firestore-Projekt:** `gen-lang-client-0195318958`
**Service Account:** `/home/server/firebase-service-account.json`

**Erreichbare Felder:**

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `title` | string | ✅ | Produkttitel |
| `slug` | string | ✅ | URL-freundlicher Name → auch als Document-ID |
| `description` | string | ✅ | Kurzbeschreibung |
| `price` | number | ✅ | Preis in **Cent** (2999 = 29,99 €) |
| `currency` | string | ✅ | "eur" oder "usd" |
| `isOnline` | boolean | ✅ | Muss `true` sein, sonst nicht sichtbar |
| `contentUrl` | string | ✅ | **NUR der Dateiname**, keine volle URL |
| `imageUrl` | string | optional | Bild-URL oder "" |
| `tags` | array[string] | optional | Kategorien |
| `category` | string | optional | Hauptkategorie |
| `contentType` | string | ✅ | "pdf" für PDF-Produkte |

```python
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("/home/server/firebase-service-account.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

doc_id = "<slug>"   # gleicher Wert wie oben, lowercase, Bindestriche
db.collection("recipes").document(doc_id).set({
    "title": "...",
    "slug": "<slug>",
    "description": "...",
    "price": 2999,
    "currency": "eur",
    "isOnline": True,
    "contentUrl": "<DATEINAME>.pdf",   # ← Nur Dateiname!
    "imageUrl": "",
    "tags": ["AI", "Technologie"],
    "category": "ratgeber",
    "contentType": "pdf",
})
```

---

### Schritt 3.4: Composite Index prüfen

Wenn Firestore wirft *"The query requires an index"*:
Firestore liefert eine URL. Öffne sie im Browser → bestätige "Create Index"
→ warten bis Status `Enabled`. Details in `references/firestore-composite-indexes.md`.

---

### Schritt 3.5: Vercel Deployment triggern

Auto-Deploy nach Push funktioniert nicht zuverlässig → immer manuell.

```bash
VCP_TOKEN=$(grep VCP_TOKEN /home/server/.env.vercel | cut -d= -f2)

# Neuestes Deployment holen
LATEST=$(curl -s "https://api.vercel.com/v1/deployments?projectId=prj_qoVDgTTO6OFTe1te2rk3KONvUkYK&limit=1" \
  -H "Authorization: Bearer $VCP_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['deployments'][0]['uid'])")

# Env-Vars auf Richtigkeit prüfen (zeigt Key-Namen und ob sie gesetzt sind)
curl -s "https://api.vercel.com/v8/projects/prj_qoVDgTTO6OFTe1te2rk3KONvUkYK/env?target=production" \
  -H "Authorization: Bearer $VCP_TOKEN" | python3 -c "
import sys,json
for e in json.load(sys.stdin)['envs']:
    print(e['key'], '|', e.get('type'), '| len=', e.get('value_len', '?'))
"
```

Wenn Supabase- oder Stripe-Keys fehlen → Vercel Dashboard → Projekt `prj_qoVDgTTO6OFTe1te2rk3KONvUkYK` → Settings → Environment Variables.

---

## 5. Download-Schutz (für Verständnis)

```
User kauft → Stripe Checkout → Redirect zu /success
Success-Seite ruft /api/download-links?session_id=... auf
  → API prüft bei Stripe: payment_status === 'paid'?
    → Ja: Gibt Supabase-URL zurück
    → Nein: 403 zurück
```

Regeln für Agenten:
- NIEMALS volle Supabase-URLs hartcodieren
- IMMER nur Dateinamen in Firestore contentUrl speichern
- KEINE Supabase Signed URLs verwenden (geben 404)

---

## 6. Häufige Fehler & Lösungen

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| Success-Seite zeigt direkte Supabase-URL | Browser-Cache | Ctrl+Shift+R (Hard Refresh) |
| Firestore: "requires an index" | Fehlender Index | URL im Fehler öffnen → Create Index |
| Supabase Upload 401/403 | Fehlender API Key | SUPABASE_ANON_KEY prüfen |
| Supabase signed URL gibt 404 | Token-Pfad passt nicht | KEINE Signed URLs verwenden |
| contentUrl ist volle URL | Falsch gesetzt | Nur Dateiname eintragen |

---

## 7. Schnellcheckliste vor Abschluss

- [ ] PDF in Supabase Bucket `pdfs` hochgeladen (Dateiname bekannt)
- [ ] Firestore Produkt in `recipes` existiert mit `isOnline=true`
- [ ] `contentUrl` enthält nur Dateinamen (keine volle URL)
- [ ] Firestore Composite Index für `isOnline` existiert
- [ ] Vercel Deployment ist live
- [ ] Test: Testkauf → Success-Seite → Download funktioniert (HTTP 200)
