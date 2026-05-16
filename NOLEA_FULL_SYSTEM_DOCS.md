# NOLEA — Vollständige Systemdokumentation für AI Agents

> **WICHTIG:** Diese Datei ist das zentrale Handbuch für **jeden Agenten**, der am Nolea-System arbeitet.
> Sie beschreibt *alle* Komponenten, Datenflüsse, Fehlerquellen und offenen Aufgaben.
> Der Agent, der diese Datei liest, soll danach ohne Rückfragen selbstständig arbeiten können.

---

## 1. WAS IST NOLEA?

**Nolea** (Marke: "Nolea Studio", "Nolea – Digital Lifestyle Studio") ist ein Ein-Personen-Shop für digitale PDF-Guides.

- **Domain:** https://www.nolea.shop (via Strato → Vercel)
- **Repo:** https://github.com/legifx/Herzst-ck (private, legifx-Organisation)
- **Betreiber:** Julian (julianlegendstar@gmail.com)
- **Design:** "sssalty"
- **Stil:** Elegant, erdig, serifenbetont (#FAF9F6 Hintergrund, #8A9A5B Akzentgrün, #2D2A26 Text)

**Geschäftslogik in einem Satz:**
Kunde kauft PDF-Guide im Shop → Stripe-Zahlung → PDF wird mit E-Mail des Käufers watermarkt → Kunde erhält E-Mail mit Download-Link (24h gültig) → Kunde kann PDF direkt auf der Erfolgsseite herunterladen.

---

## 2. GESAMTARCHITEKTUR

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTERNET                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    Stripe.js     ┌───────────────────┐           │
│  │  React SPA    │◄──────────────►│  Stripe API       │           │
│  │  (Herzst-ck)  │                 │  (extern)          │           │
│  │  Vite + TSX   │                 └────────┬──────────┘           │
│  └──────┬───────┘                          │                        │
│         │                                   │ Webhook              │
│         ▼                                   ▼                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    VERCEL (Serverless)                       │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  │  │
│  │  │ create-      │  │ stripe-webhook   │  │ download-    │  │  │
│  │  │ checkout-    │  │ (handler.ts)     │  │ links        │  │  │
│  │  │ session.ts   │  │ POST /api/       │  │ (handler.ts) │  │  │
│  │  │              │  │ stripe-webhook   │  │              │  │  │
│  │  └──────┬───────┘  └────────┬─────────┘  └──────┬───────┘  │  │
│  │         │                   │                    │           │  │
│  └─────────┼───────────────────┼────────────────────┼───────────┘  │
│            │                   │                    │              │
│            │              ┌────▼────┐               │              │
│            │              │ Resend  │               │              │
│            │              │ (Email) │               │              │
│            │              └─────────┘               │              │
│            │                                        │              │
│  ┌─────────▼────────────────────────────────────────▼───────────┐ │
│  │              NOLEA PDF SERVICE (Linux Server :3001)          │ │
│  │                                                              │ │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐ │ │
│  │  │ POST /     │  │ POST /api/  │  │ GET /download/:token │ │ │
│  │  │api/admin/  │  │ process     │  │ (JWT-geschützt)      │ │ │
│  │  │upload      │  │ (watermark) │  │                      │ │ │
│  │  └────────────┘  └─────────────┘  └──────────────────────┘ │ │
│  │                                                              │ │
│  │  Dateien:  /home/server/nolea-pdf-service/originals/         │ │
│  │            /home/server/nolea-pdf-service/processed/         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              FIREBASE (Backend-as-a-Service)                  │  │
│  │                                                              │  │
│  │  Collections:  recipes  (Produkte/PDF-Guides)                │  │
│  │                orders   (Bestellungen)                       │  │
│  │                users    (Benutzerprofile)                    │  │
│  │  Auth:         Google Sign-In, E-Mail/Passwort               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              n8n (Linux Server :5678, optional)              │  │
│  │                                                              │  │
│  │  Workflow "Stripe PDF Delivery v2" — alternative Pipeline    │  │
│  │  (16 Workflows gesamt, 27 Credentials)                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. REPO-STRUKTUR (`legifx/Herzst-ck`)

```
Herzst-ck/
├── NOLEA_FULL_SYSTEM_DOCS.md     ← DIESE DATEI
├── README.md                      ← Kurz-README (existiert bereits)
├── package.json                   ← React 19, Vite, Firebase, Stripe, Resend
├── tsconfig.json                  ← TypeScript-Konfiguration
├── vite.config.ts                 ← Vite-Build mit Tailwind v4
├── vercel.json                    ← Rewrites für stripe-webhook, CORS-Header
├── index.html                     ← SPA-Entry
├── .env.example                   ← Vorlage für alle Environment-Variablen
├── .env                           ← AKTUELLE LOKALE ENV (nicht in git)
├── firebase-applet-config.json    ← Firebase-Projekt-Konfiguration
├── firebase-blueprint.json        ← Firestore-Sicherheitsregeln-Entwurf
├── firestore.rules                ← Firestore Security Rules (produktiv)
├── metadata.json                  ← Projekt-Metadaten
├── .gitignore
│
├── src/                           ← React Frontend
│   ├── main.tsx                   ← Entry Point
│   ├── App.tsx                    ← Router + Layout (BrowserRouter)
│   ├── index.css                  ← Tailwind v4 + Custom Styles
│   ├── types.ts                   ← Recipe, CartItem, UserProfile Interfaces
│   ├── lib/
│   │   ├── firebase.ts            ← Firebase Init, Auth, Firestore, Error Handling
│   │   └── stripe.ts              ← Stripe Publishable Key Loader
│   ├── hooks/
│   │   └── useUserSync.ts         ← Firebase User → Firestore Sync
│   ├── context/
│   │   └── CartContext.tsx         ← Warenkorb-Zustand (localStorage)
│   ├── services/
│   │   ├── recipeService.ts       ← CRUD recipes (getAll, create, delete, update, toggleOnline)
│   │   ├── orderService.ts        ← getAllOrders, getUserOrders
│   │   └── adminService.ts        ← ensureAdminRole, initAdminIfNeeded
│   ├── components/
│   │   ├── Layout.tsx             ← Navigation + Footer + Mobile Menu
│   │   └── RecipeCard.tsx         ← Produktkarte
│   └── pages/
│       ├── Home.tsx               ← Startseite
│       ├── Shop.tsx               ← Produktliste (Filter, Sortierung)
│       ├── Cart.tsx               ← Warenkorb + Checkout
│       ├── Success.tsx            ← Nach-Kauf-Seite (Download-Links)
│       ├── Admin.tsx              ← Admin-Panel (Produkte, Bestellungen, System)
│       └── Impressum.tsx          ← Impressum
│
├── api/                           ← Vercel Serverless Functions
│   ├── create-checkout-session.ts ← Stripe Checkout Session erstellen
│   ├── stripe-webhook.ts          ← Webhook: Zahlung → PDF-Token → E-Mail
│   ├── download-links.ts          ← Download-Links für Success-Seite (Proxy zu PDF-Service)
│   └── admin/
│       ├── config-status.ts       ← Config-Prüfung (Stripe, Resend, Webhook)
│       ├── simulate-order.ts      ← Test-Kauf simulieren
│       └── system-dump.ts         ← System-Info für AI Agents
│
├── dist/                          ← Vite-Build-Output
└── node_modules/
```

### Externes Repo: nolea-pdf-service

```
/home/server/nolea-pdf-service/
├── package.json                   ← Express, pdf-lib, jsonwebtoken
├── .env                           ← PORT=3001, JWT_SECRET, TOKEN_EXPIRY, BASE_URL, DIRS
├── src/
│   └── index.js                   ← Express-Server mit allen Endpunkten
├── originals/                     ← Hochgeladene PDF-Rohlinge
├── processed/                     ← Watermarkierte PDFs
├── logs/                          ← Service-Logs
├── test_e2e.cjs                   ← End-to-End-Test
├── test_manual.sh                 ← Manueller Test
├── test_token.cjs                 ← Token-Generierung-Test
└── test_token.js                  ← Token-Generierung-Test (alt)
```

---

## 4. FRONTEND (React SPA)

### 4.1 Technologie-Stack
| Technologie | Version | Zweck |
|-------------|---------|-------|
| React | 19.x | UI Framework |
| TypeScript | 5.8 | Typsicherheit |
| Vite | 6.2 | Build-Tool + Dev-Server |
| Tailwind CSS | 4.x | Styling (via @tailwindcss/vite) |
| motion (framer-motion) | 12.x | Animationen |
| react-router-dom | 7.x | Routing |
| Firebase JS SDK | 12.x | Auth, Firestore |
| Stripe JS | 9.x | Zahlungsfrontend |
| lucide-react | 0.546 | Icons (SVG) |
| react-hot-toast | 2.x | Toast-Benachrichtigungen |
| react-firebase-hooks | 5.x | Firebase React Hooks |

### 4.2 Routing (App.tsx)
| Route | Page | Beschreibung |
|-------|------|-------------|
| `/` | Home | Landing Page |
| `/shop` | Shop | Produktliste mit Filter/Sortierung |
| `/cart` | Cart | Warenkorb + Stripe Checkout |
| `/success` | Success | Nach Kauf: Download-Seite |
| `/admin` | Admin | Admin-Panel (passwortgeschützt) |
| `/impressum` | Impressum | Rechtliche Angaben |

### 4.3 Datenmodell (types.ts)

```typescript
interface Recipe {
  id: string;                    // Firestore-Dokument-ID
  title: string;                 // z.B. "Mein erster Guide"
  description: string;           // Kurzbeschreibung
  price: number;                 // IN CENT (z.B. 1499 = 14,99 €)
  imageUrl: string;              // Produktbild-URL
  category: string;              // Lifestyle, Wellness, Food, Business, Quick
  contentUrl?: string;           // PDF-Dateiname (z.B. "mein-guide.pdf")
  createdAt: Timestamp;          // Firestore-Timestamp
  isOnline: boolean;             // Sichtbarkeit im Shop (toggle)
}

interface CartItem extends Recipe {
  quantity: number;              // immer 1 (digitale Produkte)
}

interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  purchasedRecipeIds: string[];
}
```

### 4.4 Shop-Logik (Shop.tsx)
- Lädt ALLE Recipes aus Firestore (`getAllRecipes()`) via `useEffect`
- Filtert nur `r.isOnline === true` (unsichtbare Produkte tauchen nicht auf)
- Filter nach Kategorie (Alle, Lifestyle, Wellness, Food, Business, Quick)
- Sortierung: Standard, Preis auf/ab, Name A-Z
- View-Mode: Grid (3 Spalten) oder Liste

### 4.5 Admin-Panel (Admin.tsx)
- **Auth:** Zwei Wege:
  1. Google Sign-In mit E-Mail `julianlegendstar@gmail.com` → automatisch Admin
  2. Passwort-Eingabe (hartcodiert in Admin.tsx Zeile 45)
- **Tab "Produkte":**
  - Tabelle mit allen Produkten (Bild, Titel, Kategorie, Preis, Online/Offline-Status)
  - Aktionen: Online/Offline togglen (Augen-Icon), Bearbeiten (Edit-Modal), Löschen
  - Formular für neue Produkte (Titel, Kategorie, Beschreibung, Preis in Cent, Bild-URL, PDF-URL)
  - Fortschrittsbalken beim "Veröffentlichen" (simuliert, kein echtes Backend)
  - **Achtung:** `price` wird im Formular in Cent eingegeben (nicht Euro!)
- **Tab "Bestellungen":**
  - Liste aller Bestellungen aus Firestore `orders` Collection
- **Tab "System / AI":**
  - Config-Status (Stripe, Resend, Webhook, AI-Access)
  - Kauf-Simulator (sendet Test-E-Mail über `/api/admin/simulate-order`)
  - AI-Info: `/api/admin/system-dump` Endpunkt

### 4.6 Warenkorb (CartContext.tsx)
- `localStorage`-Key: `herzstueck-cart`
- Keine Mehrfach-Items (digitale Produkte, immer qty=1)
- Checkout ruft `/api/create-checkout-session` (Vercel Function) auf

### 4.7 Success-Seite (Success.tsx)
- Leert Warenkorb bei Mount
- Holt `session_id` aus URL-Parametern
- Ruft `/api/download-links?session_id=...` auf (pollt alle 30s)
- Zeigt Download-Liste mit 24h-Gültigkeitshinweis

---

## 5. SERVER / VERCEL FUNCTIONS

### 5.1 `server.ts` (Lokaler Express-Server, Port 3000)
- Wird via `tsx server.ts` gestartet (lokal)
- **Endpunkte:**
  - `GET /api/admin/system-dump` — Systeminfo für AI Agents (Bearer Auth mit ADMIN_API_KEY)
  - `GET /api/admin/config-status` — Config-Prüfung für Admin-UI
  - `POST /api/admin/simulate-order` — Test-E-Mail-Versand (Admin-Key-geschützt)
  - `POST /api/create-checkout-session` — Stripe Session erstellen
  - `GET /api/download-links` — PDF-Download-Links generieren (Proxy zu PDF-Service :3001)
  - `POST /api/webhook` — Stripe Webhook (Raw Body!) → Resend-E-Mail an Kunden

### 5.2 `api/stripe-webhook.ts` (Vercel Function)
- **WICHTIG:** `bodyParser: false` — Rohdaten für Stripe-Signatur-Prüfung
- **Ablauf:**
  1. Stripe-Event `checkout.session.completed` empfangen
  2. `contentUrls` aus Session-Metadata lesen (kommagetrennte Dateinamen)
  3. JWT-Download-Token für jede PDF generieren (48h Gültigkeit)
  4. E-Mail via Resend API senden (direkter `fetch` zu `api.resend.com`, ohne SDK)
  5. E-Mail enthält Download-Links in der Form: `http://<pdf-service>/download/<token>`
- **Achtung:** `JWT_SECRET` muss identisch sein in Vercel-Umgebungsvariablen UND im nolea-pdf-service

### 5.3 `api/create-checkout-session.ts` (Vercel Function)
- Erzeugt Stripe Checkout Session mit `contentUrls` in Metadata
- Akzeptiert: `{ items, userId, userEmail }` im Body
- Return: `{ id, url }` (Session-ID und Checkout-URL)

### 5.4 `api/download-links.ts` (Vercel Function)
- Proxy-Endpunkt: Liest Session von Stripe, ruft PDF-Service (`/api/process`) auf
- Wird von der Success-Seite aufgerufen
- Return: `{ downloadLinks: [{ title, url, expiresAt }], customerEmail }`

---

## 6. NOLEA PDF SERVICE (Node.js, Port 3001)

### 6.1 Endpunkte

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/admin/upload` | POST | PDF-Rohling hochladen (base64) |
| `/api/pdfs` | GET | Liste aller Original-PDFs |
| `/api/process` | POST | PDF watermarken + Download-Token generieren (für n8n/Webhook) |
| `/download/:token` | GET | PDF mit gültigem JWT-Token herunterladen |
| `/health` | GET | Health-Check |
| `/info` | GET | Service-Info + Config-Status |

### 6.2 Watermarking
Zwei Layer pro Seite:
1. **Footer:** `Purchased by: <email> | <Datum> | NOLEA.SHOP` (8px, grau, 30% opacity)
2. **Diagonal:** `NOLEA STUDIO` (40px, 8% opacity, 45° rotiert) — Hintergrund-Wasserzeichen

### 6.3 Download-Strategie (wichtig für Tests!)
- **Pre-processed (bevorzugt):** Wenn Token `processedFilename` enthält → serviere fertige Datei aus `processed/`
- **Lazy (Fallback):** Wenn Token nur `originalFilename` hat → watermarks on-the-fly und speichert Kopie

### 6.4 Aktuelle Config (.env)
```
PORT=3001
JWT_SECRET=qWOZcMC3s0GN/uAUb6PfjlsJkyz/1SnrpOLYrF6K+0Q=
TOKEN_EXPIRY=24h
BASE_URL=http://192.168.1.182:3001
ORIGINAL_DIR=/home/server/nolea-pdf-service/originals
PROCESSED_DIR=/home/server/nolea-pdf-service/processed
LOG_LEVEL=info
```

### 6.5 Wichtige technische Details
- **ESM:** `"type": "module"` in package.json
- **PDF-Bibliothek:** `pdf-lib` (kein PDFKit, kein Puppeteer)
- **JWT:** `jsonwebtoken` (sign + verify)
- **Systemd-Service:** Läuft als `nolea-pdf-service.service`
  - ProtectHome=read-only (wichtig: Zugriff auf /home/server/originals nur via read-only, nicht blocked)
- **Port:** 3001, gebunden an `::` (IPv6 + IPv4)

---

## 7. FIREBASE

### 7.1 Projekt-Konfiguration
- Config-Datei: `firebase-applet-config.json` (im Repo, KEINE Secrets)
- Firebase-Projekt (Name unbekannt, vermutlich `nolea-shop` oder ähnlich)
- Admin-E-Mail: `julianlegendstar@gmail.com`

### 7.2 Firestore Collections

**`recipes`**
```json
{
  "id": "auto-generated",
  "title": "string (max 200)",
  "description": "string (max 2000)",
  "price": "number (cents)",
  "imageUrl": "string (URL)",
  "category": "Lifestyle | Wellness | Food | Business | Quick",
  "contentUrl": "string (PDF-Dateiname, regex: ^[a-zA-Z0-9_\\-]+\\.pdf$)",
  "createdAt": "timestamp",
  "isOnline": "boolean"
}
```

**`orders`**
```json
{
  "id": "auto-generated",
  "userId": "string (Firebase UID)",
  "items": "array",
  "total": "number (cents)",
  "status": "pending | completed | cancelled",
  "createdAt": "timestamp (== request.time)"
}
```

**`users`**
```json
{
  "id": "string (Firebase UID)",
  "email": "string",
  "role": "user | admin",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 7.3 Firestore Security Rules (firestore.rules)
- **recipes:** Lesen für alle, Schreiben nur für Admin
- **orders:** Lesen für Besitzer oder Admin, Erstellen für authentifizierte User (nur `pending`)
- **users:** Lesen für Besitzer oder Admin, Erstellen für authentifizierte User
- **Default:** Alles deny
- `isAdmin()`: Prüft auf E-Mail `julianlegendstar@gmail.com` ODER `role == 'admin'` in users-Dokument

### 7.4 Auth
- Google Sign-In (`signInWithPopup`)
- GoogleProvider ist konfiguriert in `firebase.ts`
- `useUserSync.ts`: Erstellt automatisch User-Profil bei erstmaligem Login
- Admin wird automatisch anhand der E-Mail erkannt

### 7.5 Bekanntes Problem
- **Firebase Auth muss aktiviert sein:** In der Firebase Console müssen die entsprechenden Sign-In-Methoden aktiviert werden (Google)
- **Authorisierte Domains:** `nolea.shop` und `www.nolea.shop` müssen in Firebase Auth → Settings → Authorized domains eingetragen sein, sonst schlägt Google Login fehl

---

## 8. ZAHLUNGSFLUSS (End-to-End)

```
Schritt 1: Kunde legt Produkt in den Warenkorb
──────────────────────────────────────────────
Shop.tsx → addToCart() → CartContext (localStorage)

Schritt 2: Kunde klickt "Zur Kasse"
──────────────────────────────────────────────
Cart.tsx → POST /api/create-checkout-session
         → Vercel Function erstellt Stripe Session
         → Weiterleitung zu Stripe Checkout

Schritt 3: Kunde bezahlt (Karte/PayPal)
──────────────────────────────────────────────
Stripe Checkout → Erfolg → Umleitung zu /success?session_id=xxx
                → Stripe sendet Webhook an /api/stripe-webhook

Schritt 4a: Webhook verarbeitet Zahlung (Vercel)
─────────────────────────────────────────────────
stripe-webhook.ts:
  - Validiert Event-Signatur
  - Liest contentUrls aus Metadata
  - Generiert JWT-Download-Tokens (48h gültig)
  - Sendet E-Mail via Resend mit Download-Links
  - KEIN Aufruf des PDF-Service (Token-basiert, lazy)

Schritt 4b: Success-Seite holt Links (Parallel)
─────────────────────────────────────────────────
Success.tsx:
  - Ruft GET /api/download-links?session_id=xxx auf
  - download-links.ts ruft POST /api/process auf (PDF-Service :3001)
  - PDF-Service watermarkt PDF + gibt Download-URL zurück
  - Zeigt Links auf der Seite an

Schritt 5: Kunde lädt PDF herunter
─────────────────────────────────────
GET /download/<token> → PDF-Service prüft Token
→ Serviert watermarkt PDF (aus processed/ oder on-the-fly)
```

---

## 9. ENVIRONMENT-VARIABLEN (Vollständig)

### 9.1 Benötigt in Vercel (Production)
| Variable | Beispiel | Quelle | Beschreibung |
|----------|----------|--------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard | Stripe API Key (Live) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe Dashboard | Stripe Publishable Key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard | Für Webhook-Signatur |
| `RESEND_API_KEY` | `re_...` | Resend Dashboard | E-Mail-Versand |
| `APP_URL` | `https://www.nolea.shop` | Eigen | Basis-URL für Links |
| `VITE_ADMIN_API_KEY` | Eigen (random) | `openssl rand -base64 32` | Admin-API-Zugriff für AI Agents |
| `PDF_SERVICE_BASE` | `http://<server-ip>:3001` | Eigen | PDF-Service erreichbar |
| `JWT_SECRET` | Eigen (random) | `openssl rand -base64 32` | **MUSS identisch mit pdf-service!** |

### 9.2 Benötigt in Vercel (Preview/Dev)
- Normalerweise gleiche Werte, aber Stripe Test-Modus (`sk_test_...`, `pk_test_...`)
- `RESEND_API_KEY` kann Test-Key sein (Resend bietet Test-Modus)

### 9.3 Benötigt im PDF-Service (.env)
| Variable | Beispiel | Beschreibung |
|----------|----------|-------------|
| `PORT` | `3001` | Service-Port |
| `JWT_SECRET` | `qWOZcMC3s0GN/uAUb6PfjlsJkyz/...` | **MUSS identisch mit Vercel!** |
| `TOKEN_EXPIRY` | `24h` | Gültigkeit der Download-Links |
| `BASE_URL` | `http://<ip>:3001` | Öffentliche Basis-URL |
| `ORIGINAL_DIR` | `/home/server/nolea-pdf-service/originals` | PDF-Rohlinge |
| `PROCESSED_DIR` | `/home/server/nolea-pdf-service/processed` | Watermarkierte PDFs |
| `LOG_LEVEL` | `info` | Loglevel |

---

## 10. DEPLOYMENT & INFRASTRUKTUR

### 10.1 Vercel (Frontend + API)
- Auto-Deploy via GitHub Push auf `main`
- Production: https://www.nolea.shop (oder https://herzst-ck.vercel.app)
- **Vercel.json:** Rewrite für stripe-webhook (bodyParser: false), CORS-Header
- **API-Routen:** Alle `api/*` Files werden automatisch zu Serverless Functions
- Wichtig: `stripe-webhook` braucht `bodyParser: false` (in der Datei deklariert)

### 10.2 DNS (Strato)
| Record | Typ | Wert | Status |
|--------|-----|------|--------|
| `nolea.shop` | A | `76.76.243.145`, `76.76.243.146` | ✅ Fertig |
| `www.nolea.shop` | CNAME | `cname.vercel-dns.com` | ✅ Fertig |
| `pdf.nolea.shop` | CNAME | ??? (Server-IP oder Tunnel) | ❌ FEHLT |

### 10.3 Linux Server (Lokal, Hermes-Host)
- **Hostname:** unbekannt (lokal im Netzwerk)
- **IP:** `192.168.1.182` (lokal) oder öffentliche IP
- **Betrieb:** Ubuntu/Debian, systemd
- **Nutzername:** `server`
- **Arbeitsverzeichnis:** `/home/server/`

#### Dienste auf dem Server:
| Dienst | Port | Status |
|--------|------|--------|
| nolea-pdf-service | 3001 | ✅ systemd (running) |
| n8n | 5678 | ✅ (Docker oder npm) |
| OpenClaw | 6767 | ✅ |
| Hermes Monitor | 6770 | ✅ systemd |
| Hermes Gateway | 3000 (oder anderer) | ✅ |

---

## 11. N8N-WORKFLOWS

n8n läuft auf dem Server (Port 5678, Version 2.19.5). SQLite-Datenbank unter `/home/server/.n8n/database.sqlite`.

**16 Workflows insgesamt, darunter:**
- `Stripe PDF Delivery v2` — Haupt-Workflow für PDF-Lieferung (ID: `I1JKbbM9crWnxjv0`)
- `AffiliateAssistent`
- `Hunter Alpha`
- `PlyMrktTempl8`
- `Auto Sync ON to GD`
- `Kokoro TTS`
- u.a.

**27 Credentials** (verschlüsselt in DB)

**Bekanntes Problem:** n8n API gibt 401 zurück. Ursache vermutlich fehlender `N8N_ENCRYPTION_KEY` im Container. Ohne API-Zugriff können keine Workflows programmatisch aktiviert/deaktiviert werden.

---

## 12. BEKANNTE PROBLEME & OFFENE PUNKTE

### 🔴 KRITISCH — Blockiert Produktivbetrieb

#### P1: pdf.nolea.shop DNS fehlt
- **Problem:** Download-Links in E-Mails zeigen auf `http://192.168.1.182:3001/download/<token>` — funktioniert nur im lokalen Netzwerk
- **Lösung:** CNAME oder A-Record für `pdf.nolea.shop` einrichten, Reverse Proxy (nginx/caddy) auf :3001, SSL-Zertifikat (Let's Encrypt)
- **Alternativ:** Download über Vercel proxy-en (dann kein separater DNS nötig)

#### P2: Stripe Webhook nicht registriert
- **Problem:** Stripe sendet keine Webhook-Events, weil die URL nicht im Stripe Dashboard konfiguriert ist
- **Lösung:** In Stripe Dashboard → Webhooks → Endpoint hinzufügen:
  - URL: `https://www.nolea.shop/api/stripe-webhook`
  - Events: `checkout.session.completed`
  - Webhook-Secret in Vercel-Umgebungsvariable `STRIPE_WEBHOOK_SECRET` speichern

#### P3: Resend API Key untested
- **Problem:** Resend-Account existiert, aber E-Mail-Versand wurde nie erfolgreich getestet
- **Lösung:** Resend Dashboard prüfen (API-Key gültig?), Test-E-Mail über Admin-Panel-Simulator senden

#### P4: JWT_SECRET nicht synchron
- **Problem:** `JWT_SECRET` muss **identisch** sein in:
  1. Vercel Environment Variables (für stripe-webhook.ts)
  2. nolea-pdf-service `.env`
  - Aktuell: Im PDF-Service ist ein Secret gesetzt, in Vercel ist der Status unbekannt
- **Lösung:** Gleichen Wert (`openssl rand -base64 32`) in beiden Umgebungen setzen

### 🟡 WICHTIG — Beeinträchtigt Funktionalität

#### P5: Firebase Google Login
- **Problem:** Google Sign-In wurde nie getestet, vermutlich fehlen:
  - Authorisierte Domains in Firebase Auth Console (`www.nolea.shop`)
  - Google Sign-In-Methode aktiviert
  - OAuth-Consent-Screen konfiguriert
- **Lösung:** Firebase Console → Authentication → Sign-in method → Google aktivieren + Domains eintragen

#### P6: n8n API 401
- **Problem:** n8n API antwortet mit 401 Unauthorized auf alle Anfragen
- **Verdacht:** Fehlender `N8N_ENCRYPTION_KEY` beim Container-Start
- **Lösung:** Container mit `-e N8N_ENCRYPTION_KEY=<key>` starten (gleicher Key wie bei erster Installation)

#### P7: End-to-End-Test nie durchgeführt
- **Problem:** Komplette Kette Stripe → Webhook → PDF → E-Mail wurde nie getestet
- **Lösung:** Stripe-Test-Zahlung durchführen (Karte `4242 4242 4242 4242`, beliebiges Datum/CVC)

### 🟢 NIEDRIG — Verbesserungen / UI-Tweaks

#### P8: "System Online" aus Footer entfernen
- **Problem:** Footer enthält "System Online" Text, der entfernt werden soll
- **Datei:** `src/components/Layout.tsx` (ca. Zeile 346)

#### P9: Emoji-Icons durch SVG ersetzen
- **Problem:** Einige UI-Elemente haben Emojis statt der Lucide-SVGs
- **Ziel:** Einheitlicher Look mit dem Design-Style

#### P10: Recipe-Type hat `isOnline` — aber alte Daten evtl. ohne
- **Problem:** `isOnline` wurde später hinzugefügt. Alte Rezepte in Firestore haben dieses Feld nicht → werden im Shop nicht angezeigt
- **Lösung:** Migration: Alle Recipes ohne `isOnline` auf `true` setzen

#### P11: Automatische Bereinigung alter PDFs
- **Problem:** Watermarkierte PDFs sammeln sich in `processed/` an, nie gelöscht
- **Lösung:** Cron-Job, der Dateien älter als Token-Gültigkeit löscht

#### P12: Download-Link-Text "48 Stunden" veraltet
- **Problem:** `Success.tsx` zeigt "Gültig für 48 Stunden" (hardcoded), aber Token läuft nach 24h
- **Lösung:** Wert aus env oder Token-Response lesen

#### P13: VITE_ADMIN_API_KEY fehlt evtl. in Vercel
- **Problem:** Der Admin-API-Key für AI-Agent-Zugriff muss in Vercel-Umgebungsvariablen gesetzt sein, sonst schlägt `/api/admin/system-dump` fehl

### ⬛ NOCH NICHT ANGEFANGEN

#### P14: PDF.nolea.shop mit SSL (optional)
- Reverse Proxy (nginx/Caddy) vor den PDF-Service setzen
- SSL-Zertifikat via Let's Encrypt

#### P15: Hermes /cntrl Command
- Sicherheitsbefehl, der riskante Aktionen vor Ausführung reviewt
- Code existiert als Skill, aber Integration in CLI ist unvollständig

#### P16: Multi-Agent-Dashboard vollständig deployen
- Separates Projekt auf Port 8383 (Jeff, NAME, ClaudiCloudy)

---

## 13. SCHRITT-FÜR-SCHRITT PRIORITÄTENLISTE

### Phase 1: Production-Ready machen (Reihenfolge!)

```
[ ] 1. JWT_SECRET konsistent setzen
       → openssl rand -base64 32
       → In Vercel env setzen
       → In pdf-service .env setzen
       → pdf-service neustarten: systemctl restart nolea-pdf-service

[ ] 2. Firebase Google Login aktivieren
       → Firebase Console → Authentication → Sign-in method
       → Google aktivieren
       → Authorized domains: www.nolea.shop, nolea.shop

[ ] 3. Stripe Webhook registrieren
       → Stripe Dashboard → Webhooks → Add endpoint
       → URL: https://www.nolea.shop/api/stripe-webhook
       → Event: checkout.session.completed
       → Secret in Vercel env: STRIPE_WEBHOOK_SECRET

[ ] 4. Resend API Key verifizieren
       → Resend Dashboard prüfen (Ist Domain verified?)
       → Test-E-Mail via Admin-Panel-Simulator senden
       → Falls nötig: Domain bei Resend verifizieren

[ ] 5. End-to-End-Test
       → Stripe Test-Modus verwenden
       → Karte: 4242 4242 4242 4242
       → Prüfen: E-Mail erhalten? PDF-Download möglich?
       → Prüfen: Erfolgsseite zeigt Links?
```

### Phase 2: Infrastruktur
```
[ ] 6. pdf.nolea.shop DNS + Reverse Proxy + SSL
[ ] 7. n8n API-Fix (Encryption Key)
[ ] 8. Bereinigung alter PDFs (Cron-Job)
```

### Phase 3: UI/UX
```
[ ] 9. "System Online" aus Footer entfernen
[ ] 10. Emoji → SVG Icons
[ ] 11. "48 Stunden" → dynamisch aus env
[ ] 12. Alte Recipes ohne isOnline migrieren
```

---

## 14. WICHTIGE BEFEHLE & PATHS (für Agenten-Zugriff)

```bash
# Repo
cd /home/server/Herzst-ck

# PDF Service
cd /home/server/nolea-pdf-service
# Manueller Start: node src/index.js
# Systemd: systemctl --user restart nolea-pdf-service

# n8n
cd /home/server/.n8n
# Datenbank: sqlite3 database.sqlite
# Workflows auflisten: n8n export:workflow --all
# Credentials: n8n export:credentials --all

# Firestore Rules deployen:
# firebase deploy --only firestore:rules

# Env in Vercel setzen:
# vercel env add <KEY> production

# Logs PDF Service:
tail -f /home/server/nolea-pdf-service/logs/service.log
# Oder: journalctl --user -u nolea-pdf-service -f
```

---

## 15. WICHTIGE FIREBUGS & FALLSTRICKE

1. **Price ist IN CENT, nicht Euro.** Ein Produkt für 14,99 € hat `price: 1499`.
2. **JWT_SECRET muss überall identisch sein** — in Vercel, im n8n-Workflow, im PDF-Service.
3. **contentUrl in Firestore ist der DATEINAME** (z.B. `mein-guide.pdf`), nicht die vollständige URL. Der PDF-Service sucht in `originals/` nach dieser Datei.
4. **Vercel-Funktionen haben kein persistentes Dateisystem** — deshalb läuft der PDF-Service separat auf dem Server.
5. **Stripe Webhook braucht rawBody** — `bodyParser: false` ist in der Function-Datei deklariert.
6. **Der Shop zeigt NUR Produkte mit `isOnline: true`** — ein neu erstelltes Produkt muss online geschaltet werden.
7. **PDF-Service bindet an `::`** — das ist IPv6 Any, funktioniert aber auch für IPv4 (via Dual-Stack).
8. **systemd ProtectHome=read-only** — der PDF-Service kann auf /home/server/ zugreifen, aber nicht schreiben (außerhalb seiner eigenen Verzeichnisse).
9. **n8n 2.19.5** — 16 Workflows, 27 Credentials. Port 5678. API 401 (ungelöst).
10. **Hermes Monitor auf Port 6770** — hat 14 tmux-Sessions, inklusive `hermes_nolea`.

---

## 16. OFFENE FRAGEN (muss ein Mensch beantworten)

- [ ] Sind Stripe-Live-Keys bereits vorhanden oder nur Test-Keys?
- [ ] Ist die Domain `www.nolea.shop` bereits bei Vercel registriert/verifiziert?
- [ ] Wurde der Resend-Domain-Check durchgeführt? (Resend verlangt Domain-Verifikation für E-Mail-Versand)
- [ ] Welche Firebase-Projekt-ID wird verwendet? (Für Firestore Rules Deploy)
- [ ] Läuft der PDF-Service hinter einem Reverse Proxy oder direkt?
- [ ] Ist der n8n-Encryption-Key bekannt oder muss ein neuer gesetzt werden?

---

*Stand: Mai 2026 — Erstellt von HERMES (Nolea Master Coordination Agent)*
*Für andere AI Agents: Wenn du Änderungen an diesem System vornimmst, aktualisiere bitte diese Datei!*
