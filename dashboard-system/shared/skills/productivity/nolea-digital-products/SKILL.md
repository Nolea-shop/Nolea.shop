---
name: nolea-digital-products
description: "NOLEA Digital Products Shop — Next.js/Vercel Frontend, n8n Workflow Automation, Digital Product Sales"
version: 1.0.0
author: Damia
metadata:
  hermes:
    tags: [nolea, nextjs, vercel, n8n, digital-products, ecommerce]
---

# NOLEA — Digital Products Shop

## Überblick
NOLEA ist ein Digital Products Shop gebaut mit:
- **Frontend**: Next.js (Vercel)
- **Backend/Automation**: n8n Workflows
- **Produkte**: Digitale Güter (E-Books, Templates, Kurse, etc.)

## Workflows

### 1. Deployment
```bash
# Vercel Deploy
cd /home/damia/nolea-brain-app  # oder NOLEA Projektpfad
npm run build
vercel --prod
```

### 2. n8n Workflow Management
- Workflows für: Bestellabwicklung, Email-Benachrichtigungen, Produkt-Delivery
- n8n läuft lokal oder via API

### 3. Produkt Management
- Neues Produkt anlegen (Titel, Beschreibung, Preis, Datei)
- Kategorien verwalten
- Rabattaktionen einrichten

## Nützliche Befehle
```bash
# n8n Status
# Vercel Logs: vercel logs
```

## Pitfalls
- Node.js Projekte NIEMALS auf /mnt/ (NTFS) — immer /home/damia/ verwenden
- n8n Workflows regelmäßig testen
- Digitale Produkte brauchen klare Delivery-Pipeline (Email + Download-Link)