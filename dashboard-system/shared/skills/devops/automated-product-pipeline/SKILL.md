---
name: automated-product-pipeline
description: >
  Full-stack automated digital product pipeline: scrape social platforms for demand signals,
  score opportunities with an AI analysis engine, generate PDF + social posts + shop pages,
  publish via Stripe + Vercel, and auto-post to Facebook/Instagram/Pinterest.
  Built on n8n (self-hosted), Next.js (Vercel), Stripe, Canva API, and AI agents.
triggers:
  - "automated product pipeline"
  - "n8n product automation"
  - "scrape analyze create publish"
  - "digital product factory"
  - "automated shop builder"
  - "stripe n8n social auto post"
---

# Automated Product Pipeline

A complete architecture for discovering digital product opportunities from social demand signals, evaluating them with AI, generating brand-consistent products (PDF + social content), and publishing them to a shop + social platforms automatically.

## Architecture Overview

```
PHASE 1: DEEP SCRAPE          Cron (2x daily)
  └── Reddit, Forums, Google Trends, Facebook Groups, Pinterest
  └── Output: 200+ raw posts → unified JSON

PHASE 2: ANALYSIS ENGINE
  └── L1 Deduplication (BoW cosine similarity)
  └── L2 Engagement Scoring
  └── L3 AI Gap Analysis (Hermes agent)
  └── L4 Competitor Check + Seasonality
  └── Decision: PROCEED (>7.0) | QUEUE (5-7) | DISCARD (<5)

PHASE 3: CREATION ENGINE
  └── A) PDF Product (Canva API or generated layout)
  └── B) Social Posts (1-5 per product, carousel + single)
  └── C) Shop Page Content (SEO meta, features, FAQ)

PHASE 4: PUBLISH ENGINE
  └── Stripe: Product → Price → Payment Link
  └── Vercel: Push product JSON → auto-deploy shop page
  └── Social: Scheduled posts (Teaser D0, Value D1, Proof D3, BTS D5, Urgency D7)
```

## Tech Stack

| Layer | Tool | Role |
|-------|------|------|
| Orchestration | n8n (self-hosted) | Phases 1-4 automation |
| Shop Frontend | Next.js (App Router) + Tailwind | Product pages, checkout, download |
| Payment | Stripe | Payment Links + webhooks |
| Design | Canva API or HTML-to-PDF | PDF + social graphics |
| AI Content | Hermes / OpenAI | Gap analysis, content generation |
| Social | Facebook Graph API, Pinterest API | Carousel & single-image posts |
| Storage | Vercel Blob / S3 / R2 | PDF delivery |

## Phase 1: Deep Scrape — n8n Workflow Pattern

**Trigger:** Schedule Trigger (07:00 + 17:00 UTC)

**Key nodes:**
- `n8n-nodes-base.httpRequest` → Reddit OAuth2 (`oauth.reddit.com/r/{subreddit}/hot.json?limit=50`)
- Subreddit list via Code node (array → SplitInBatches)
- Normalize posts to unified schema:
```
{source, subreddit, title, body, upvotes, comments, url, score, keywords[], category}
```
- Merge All Sources → Data Aggregator

**Pitfall:** Reddit API requires `User-Agent` header and OAuth2 credentials. Test token with `curl -H "Authorization: Bearer $TOKEN" https://oauth.reddit.com/api/v1/me`.

## Phase 2: Analysis Engine — Scoring Formula

**L1 Deduplication:** Bag-of-words cosine similarity > 0.65 clusters similar posts.

**L2 Engagement Score:**
```
engagement_score = (upvotes × 1.0 + comments × 2.5 + cross_platform_mentions × 5.0) / age_in_hours
Threshold: > 15
```

**L3 AI Gap Analysis prompt (send to LLM agent):**
- `question_detected`: bool (is someone asking for a solution?)
- `answer_quality`: 1-10 (are existing answers good?)
- `recurrence`: 1-10 (how often repeated?)
- `product_potential`: 1-10 (can become a 20+ page PDF?)
- `feasibility`: 1-10 (can AI create the content?)
- Output: `gap_score`, `product_type`, `suggested_title`, `suggested_price`

**L4-5 Final Score:**
```
total = engagement×0.25 + gap×0.30 + monetization×0.20 + (10−competition)×0.15 + timing×0.10
Proceed if total > 7.0
```

## Phase 3: Creation Engine — Content Generation

### AI-Generated Content Prompt Pattern

Send analyzed topic to LLM with brand voice constraints. Request structured JSON:
```json
{
  "product": { "slug", "title", "subtitle", "description", "features[]", "faq[]", "price" },
  "social_posts": [ { "post_number", "post_type", "caption", "hashtags[]", "scheduled_day", "slides[]" } ]
}
```

### Canva API Patterns

**Create design from template:**
```json
POST https://api.canva.com/rest/v1/designs
{"design_type": "Presentation", "template_id": "{{tmpl_id}}", "title": "..."}
```

**Autofill placeholders:**
```json
POST https://api.canva.com/rest/v1/designs/{{id}}/autofill
{"brand_template_id": "...", "data": {"headline": "...", "body_text": "...", "cta_text": "..."}}
```

**Export as PNG/PDF:**
```json
POST https://api.canva.com/rest/v1/exports
{"design_id": "...", "format": {"type": "png", "width": 1080, "height": 1080}}
```

**Pitfall:** Canva API requires OAuth2 and brand kit setup. For PDFs, export each page as PNG, then assemble to PDF server-side with `pdf-lib` or `img2pdf`.

## Phase 4: Publish Engine — Stripe + Vercel + Social

### Stripe API Sequence (n8n HTTP Request nodes)

**1. Create Product:**
```json
POST /v1/products
{"name": "...", "description": "...", "metadata": {"slug": "...", "category": "...", "pages": "..."}}
```

**2. Create Price:**
```json
POST /v1/prices
{"product": "prod_xxx", "unit_amount": 799, "currency": "eur"}
```

**3. Create Payment Link:**
```json
POST /v1/payment_links
{"line_items": [{"price": "price_xxx", "quantity": 1}], "after_completion": {"type": "redirect", "redirect": {"url": "https://yoursite.de/danke/{slug}"}}}
```

### Vercel Product Push

Push JSON to Next.js app via `POST /api/n8n-product`:
```bash
curl -X POST https://yoursite.de/api/n8n-product \
  -H "x-n8n-secret: $N8N_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"slug":"...","title":"...","price":7.99,"stripe_payment_link":"...",...}'
```

Next.js endpoint writes to `content/products/{slug}.json` (or CMS/DB), triggering rebuild.

### Social Auto-Posting (n8n)

**Schedule:** Use Wait nodes or separate scheduled triggers:
- Teaser: Day 0 (immediate)
- Value: Day +1
- Social Proof: Day +3
- Behind Scenes: Day +5
- Urgency: Day +7

**Facebook/Instagram Carousel:**
1. Upload each slide image unpublished to `/{page_id}/photos` (`published: false`)
2. Collect media_fbid values
3. Post to `/{page_id}/feed` with `attached_media: [{media_fbid}, ...]`

**Pinterest Pin:**
```json
POST /v5/pins
{"board_id": "...", "title": "...", "description": "...", "link": "...", "media_source": {"source_type": "image_url", "url": "..."}}
```

**Pitfall:** Instagram requires Meta Business API — create media container first for each slide, then carousel container, then publish. Much more steps than Facebook.

## Next.js Shop — Minimal Viable Structure

```
app/
  page.tsx              Hero + product teaser
  shop/page.tsx         Product grid (loads from content/products/*.json)
  shop/[slug]/page.tsx  Dynamic product page
  danke/[slug]/page.tsx Thank-you + download
  api/n8n-product/      Product intake from n8n
  api/stripe-webhook/   Payment completion handler
  api/download/         Secure download with token
components/
  Navbar, Footer, ProductHero, ProductFeatures, PriceCard, ProductPreview, FAQAccordion
lib/products.ts         Async loader for JSON products
content/products/       Product JSON files (git-tracked or CMS-driven)
```

### SEO Product JSON Schema

```json
{
  "slug": "low-kal-kuchen-30",
  "title": "30 Kuchen unter 200 Kalorien",
  "subtitle": "...",
  "price": 7.99,
  "stripe_payment_link": "https://buy.stripe.com/...",
  "description": "...",
  "features": ["..."],
  "faq": [{"q":"...","a":"..."}],
  "images": {"cover":"...","mockup":"...","previews":["..."]},
  "seo": {"title":"...","description":"...","keywords":["..."]}
}
```

### Global CSS Brand System (Tailwind)

```css
@theme inline {
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Lora', serif;
  --color-brand-primary: #E8985E;
  --color-brand-secondary: #F5E6D3;
  --color-brand-accent: #6B8F71;
  --color-brand-dark: #3D2B1F;
  --color-brand-light: #FFF8F0;
}
```

Set `--max-w: 960px`, `--radius-lg: 24px`.

## Wiring n8n Phases Together

**Phase 1 → Phase 2:** Phase 1 workflow ends with Data Aggregator. Phase 2 triggers via `Execute Workflow` node or webhook, pointing to Phase 1's workflow ID.

**Actual production workflow IDs from the Herzstuck session:**
- Phase 1 (Scrape): `xWaFdKEXdj0jvJBM`
- Phase 2 (Analysis): `ANAJumBg1mHQUCH4`
- Phase 3 (Basic Publish): `dEUvW8YsFOb4rzdV`
- Phase 3 (Stripe Publish): `6VkVcqFYCd2GDzys`
- Orchestrator: `nZAW9CAN52NMxOfX`
- E2E Test: `OOzgkqheMYcpynbA`

**Phase 2 → Phase 3:** If `total_score > 7.0`, Phase 2 ends with an `Execute Workflow` node pointing to Phase 3 workflow ID, passing the top topic as JSON.

**Phase 3 → Phase 4:** After content generation, stripe product creation + vercel push run in parallel branches (IF/split node).

## Environment Variables

```
N8N_SECRET=your_n8n_webhook_secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CANVA_ACCESS_TOKEN=...
FACEBOOK_PAGE_ACCESS_TOKEN=...
PINTEREST_ACCESS_TOKEN=...
VERCEL_DEPLOY_HOOK=...
```
