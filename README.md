<div align="center">

<br>

# ✦ Nolea ✦

### Digital Lifestyle Studio

**Handverlesene PDF-Guides für einen bewussten Alltag**

<br>

[![Vercel](https://img.shields.io/badge/deployed_on-vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://www.nolea.shop)
[![React](https://img.shields.io/badge/react_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Firebase](https://img.shields.io/badge/firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Stripe](https://img.shields.io/badge/stripe-008CDD?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com)
[![TypeScript](https://img.shields.io/badge/typescript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

<br>

</div>

---

## Überblick

**Nolea** ist ein minimalistischer Ein-Personen-Shop für digitale PDF-Guides.

> Kunde kauft Guide → Stripe-Zahlung → PDF wird personalisiert (Buyer-Email-Watermark) → E-Mail mit 24h-Download-Link → alles automatisch.

Der gesamte Zahlungs- und Lieferprozess läuft vollautomatisch ab — vom Stripe-Checkout über die PDF-Watermarking-Pipeline bis zur Resend-E-Mail.

---

## 🧭 Architektur

```
                    ┌──────────────────────┐
                    │    Stripe Checkout    │
                    │    (Zahlungsseite)    │
                    └──────────┬───────────┘
                               │ Webhook
         ┌─────────────────────┼─────────────────────┐
         │                     ▼                     │
         │         ┌─────────────────────┐          │
         │         │   Vercel (API)      │          │
         │         │  stripe-webhook.ts  │          │
         │         └──────────┬──────────┘          │
         │                    │                     │
    ┌────▼────┐        ┌─────▼──────┐        ┌─────▼──────┐
    │  React   │        │   Resend   │        │ PDF-Service│
    │   SPA    │        │  (E-Mail)  │        │  (:3001)   │
    │ Vite/TSX │        └────────────┘        │ watermark  │
    └──────────┘                               │ + download │
                                               └─────┬──────┘
          ┌──────────────────────────────────────────┘
          ▼
    ┌──────────────┐     ┌──────────────────┐
    │   Firebase   │     │   Server (Linux)  │
    │  Auth + FS   │     │  nolea-pdf-svc   │
    │  (Cloud)     │     │  n8n ⋯           │
    └──────────────┘     └──────────────────┘
```

---

## ✨ Features

| Feature | Beschreibung |
|---------|-------------|
| 🛒 **Stripe Checkout** | Kreditkarte & PayPal, Preise in Cent |
| 🖼️ **PDF-Watermarking** | Jeder Download personalisiert mit Käufer-E-Mail |
| 📧 **Auto-Email** | Download-Links per Resend nach Zahlungseingang |
| 🔐 **Download Tokens** | JWT-gesichert, 24h gültig |
| 🧑‍💼 **Admin-Panel** | Produkte verwalten, On/Off-Toggle, Simulator |
| 🔍 **Shop-Filter** | Nach Kategorie, Preis, Name sortierbar |
| 🔄 **n8n-Pipeline** | Alternative Workflow-Engine (16 Workflows) |
| 🤖 **AI-Ready** | REST-API für Agenten (`/api/admin/system-dump`) |

---

## 🛠️ Tech-Stack

| Bereich | Technologie |
|---------|------------|
| **UI** | React 19 · TypeScript · Vite 6 · Tailwind CSS 4 |
| **Animation** | motion (framer-motion) · react-hot-toast |
| **Routing** | react-router-dom 7 |
| **Backend** | Express · Vercel Serverless Functions |
| **Datenbank** | Firebase Firestore (recipes, orders, users) |
| **Auth** | Firebase Authentication (Google Sign-In) |
| **Zahlung** | Stripe (Checkout Sessions · Webhooks) |
| **Email** | Resend |
| **PDF** | pdf-lib · jsonwebtoken |
| **CI/CD** | GitHub → Vercel (Auto-Deploy) |

---

## 📁 Projektstruktur (Überblick)

```
Herzst-ck/
├── src/          ← React SPA (Shop, Admin, Cart, …)
├── api/          ← Vercel Serverless Functions
├── dist/         ← Build-Output
├── NOLEA_FULL_SYSTEM_DOCS.md   ← Komplettdoku für AI Agents
├── server.ts     ← Lokaler Express-Server (Dev)
├── vercel.json   ← Vercel-Konfiguration
├── firestore.rules  ← Firestore Security Rules
└── .env.example  ← Umgebungsvariablen-Vorlage
```

> 📖 **Für Agenten & Entwickler:** [`NOLEA_FULL_SYSTEM_DOCS.md`](NOLEA_FULL_SYSTEM_DOCS.md) enthält die vollständige Systemdokumentation mit allen Datenflüssen, 16 offenen Aufgaben, Firebugs und Schritt-für-Schritt-Prioritätenliste.

---

## 🚀 Quick Start

```bash
# 1. Repository klonen
git clone https://github.com/legifx/Herzst-ck.git
cd Herzst-ck

# 2. Abhängigkeiten installieren
npm install

# 3. Umgebungsvariablen
cp .env.example .env.local
# → Alle Werte in .env.local ausfüllen

# 4. PDF-Service starten (separates Terminal)
cd ../nolea-pdf-service
npm install
node src/index.js

# 5. Dev-Server starten
npm run dev
# → Frontend + API auf http://localhost:3000
```

---

## 🌐 Deployment

| Komponente | Plattform | Hinweis |
|-----------|-----------|---------|
| **Frontend** | **Vercel** | Auto-Deploy via GitHub Push auf `main` |
| **API (Vercel Functions)** | **Vercel** | `api/*.ts` → automatisch Serverless Functions |
| **PDF-Service** | **Linux Server** | systemd, Port 3001, kein öffentlicher DNS ⚠️ |
| **n8n** | **Linux Server** | Port 5678, Docker oder npm |
| **Firebase** | **Cloud** | Firestore + Auth |

**Wichtige Environment-Variablen für Vercel:**
```
STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET,
RESEND_API_KEY, APP_URL, ADMIN_API_KEY, PDF_SERVICE_BASE, JWT_SECRET,
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PDF_BUCKET
```

> **JWT_SECRET muss identisch sein** in Vercel und im PDF-Service!

---

## 🧪 Test-Modus

Über das Admin-Panel (`/admin`) gibt es einen **Kauf-Simulator** im "System"-Tab:
- Test-E-Mail-Adresse eintragen
- Produkt auswählen
- "Kauf simulieren & Email senden" klicken

Zum Stripe-Test: Karte `4242 4242 4242 4242`, beliebiges Datum + CVC.

---

## 🧩 Externe Dienste

| Dienst | Zweck | Status |
|--------|-------|--------|
| **Stripe** | Zahlungsabwicklung | 🔴 Webhook nicht registriert |
| **Resend** | E-Mail-Versand | 🟡 API-Key ungetestet |
| **Firebase** | Auth + Datenbank | 🟡 Google Login unkonfiguriert |
| **Strato** | Domain `nolea.shop` | ✅ DNS live |
| **Vercel** | Hosting + API | ✅ Aktiv |

---

## 🐛 Offene Baustellen (Top 4)

1. **🔴 Stripe Webhook** nicht im Stripe Dashboard registriert  
2. **🔴 pdf.nolea.shop DNS** fehlt — Download-Links zeigen auf lokale IP  
3. **🔴 Resend-API-Key** nie getestet  
4. **🔴 JWT_SECRET** muss konsistent zwischen Vercel und PDF-Service sein  

> Vollständige Liste (16 Punkte, nach Priorität sortiert) in [`NOLEA_FULL_SYSTEM_DOCS.md`](NOLEA_FULL_SYSTEM_DOCS.md#12-bekannte-probleme--offene-punkte).

---

## 📜 Lizenz

Privatprojekt — Alle Rechte vorbehalten.

<br>

<div align="center">
  <sub>designed by <strong>sssalty</strong></sub>
  <br>
  <sub>built with ❤️ and React</sub>
</div>
\n<!-- Trigger Deploy 2 -->
