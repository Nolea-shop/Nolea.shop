# Nolea Security Audit - 2026-05-30

## 1. Executive Summary

Overall security posture before this change was medium risk for a small digital-product shop, with the highest practical risks concentrated in public admin utilities, permissive CORS, public download/session handling, and public object storage. Payment creation already performed server-side price validation against Firestore, and Stripe webhooks used raw-body signature verification, which are strong controls.

Top risks found:

1. Public production admin simulation endpoint could send Resend emails without real admin authentication.
2. Public config-status endpoint exposed integration state and used wildcard CORS in production.
3. Multiple API routes and `vercel.json` emitted `Access-Control-Allow-Origin: *`.
4. Download links relied on a Stripe session id as a bearer secret and returned buyer email.
5. Supabase `pdfs` delivery still depends on a public bucket URL behind the API proxy.
6. Firebase Storage rules allowed public reads for every object and writes by any signed-in user.
7. AI chat accepted client-supplied message history roles, including possible injected `system` messages.
8. API routes lacked request-size checks and returned raw internal errors in some cases.
9. Security headers were incomplete for the frontend and API surface.
10. `npm audit --omit=dev` reported 25 production dependency vulnerabilities: 7 high, 17 moderate, and 1 low.
11. GitHub supply-chain controls were not present in repo evidence: no `.github` workflows, Dependabot, CODEOWNERS, or branch-protection config in the checkout.

Business impact: the realistic worst cases are unauthorized test-email abuse, customer PII exposure via order-download flows, digital-product leakage, admin metadata exposure, and weakened browser-side protections against clickjacking or injected third-party content.

## 2. Attack Surface / Architecture Overview

Observed repo: `Nolea-shop/Nolea.shop`, Vite/React frontend, Vercel serverless functions in `api/`, Firebase Auth/Firestore, Firebase Storage rules, Supabase Storage for PDFs, Stripe Checkout/Webhooks, Resend email, and OpenRouter AI support.

Main trust boundaries:

- Browser to Vercel API routes: cart, checkout, AI chat, admin utilities, and download links.
- Vercel functions to Stripe: checkout session creation and paid-session verification.
- Vercel functions to Firebase Admin / Firestore: product lookup, order writes, admin checks.
- Vercel functions to Supabase public storage: PDF fetch by metadata-derived filename.
- Stripe to Vercel webhook routes: signed event ingestion.
- GitHub to Vercel deployment: default branch auto-deploy.

Passive production checks performed on 2026-05-30:

- `HEAD https://www.nolea.shop/` returned `Access-Control-Allow-Origin: *` and lacked CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.
- `OPTIONS https://www.nolea.shop/api/ai-agent` with an untrusted Origin returned `Access-Control-Allow-Origin: *`.
- `GET https://www.nolea.shop/api/admin/config-status` returned `{"stripe":true,"resend":true,"webhook":true,"adminKey":false}` to an untrusted Origin.

No active production exploitation, load testing, destructive testing, or cloud mutation was performed.

## 3. Prioritized Findings (Top 10)

### F-001: Public order simulation endpoint

- Severity: High
- Component: `api/admin/simulate-order.ts`
- Risk: Anyone could trigger test delivery emails through the shop's Resend account, causing abuse, reputation damage, and potential cost/noise.
- Cause: Authorization accepted production host presence instead of an authenticated admin identity.
- Affected paths: `api/admin/simulate-order.ts`, `src/pages/Admin.tsx`
- Fix: The endpoint now requires a Firebase-authenticated admin bearer token, validates request size/email/title, removes PII logging, escapes HTML, and returns generic errors.

### F-002: Public configuration disclosure

- Severity: Medium
- Component: `api/admin/config-status.ts`
- Risk: Attackers could fingerprint enabled services and webhook/admin-key status from production.
- Cause: Endpoint was unauthenticated and CORS-accessible from any origin.
- Affected paths: `api/admin/config-status.ts`, `src/pages/Admin.tsx`
- Fix: The endpoint now requires a Firebase-authenticated admin and returns a namespaced status object only to admins.

### F-003: Overly permissive CORS

- Severity: Medium
- Component: API routes and Vercel headers
- Risk: Browser-based cross-origin reads were possible for unauthenticated responses and amplified the impact of public endpoints.
- Cause: `Access-Control-Allow-Origin: *` existed in `vercel.json`, AI, download, admin, and helper routes.
- Affected paths: `vercel.json`, `api/ai-agent.ts`, `api/download*.ts`, `api/admin/*.ts`
- Fix: Added shared CORS helper with explicit allowed origins and removed wildcard CORS from Vercel static headers.

### F-004: Customer email exposure in download-link response

- Severity: Medium
- Component: `/api/download-links`
- Risk: Any holder of a paid Stripe session id could retrieve the buyer email.
- Cause: Response included `customerEmail` after only paid-session verification.
- Affected path: `api/download-links.ts`
- Fix: Removed `customerEmail` from the public response.

### F-005: Session-id bearer download access without expiry enforcement

- Severity: Medium
- Component: `/api/download-links`, `/api/download`
- Risk: A leaked checkout session id could be reused indefinitely to list or download purchased PDFs.
- Cause: Code advertised expiration but did not enforce it server-side.
- Affected paths: `api/download-links.ts`, `api/download.ts`
- Fix: Added Stripe session id validation and 7-day server-side download window enforcement.

### F-006: Public Supabase PDF bucket remains a product-leak risk

- Severity: High
- Component: Supabase Storage `pdfs`
- Risk: If object names are guessed, crawled, or leaked, PDFs can be downloaded outside checkout controls.
- Cause: Repo and audit blueprint indicate `pdfs` is public; API currently proxies public object URLs.
- Affected path: `api/download.ts`; cloud config requires Supabase dashboard export.
- Fix: Code now validates filenames more strictly. Full closure requires making `pdfs` private and replacing public object fetches with service-side signed/private reads.

### F-007: Firebase Storage rules too broad

- Severity: High
- Component: `storage.rules`
- Risk: All stored objects were publicly readable and any signed-in user could write arbitrary objects.
- Cause: Global `allow read: if true` and `allow write: if request.auth != null`.
- Affected path: `storage.rules`
- Fix: Rules now default deny, keep public reads only under `product-assets/`, restrict writes to the owner/admin paths, and add size/content-type limits.

### F-008: AI chat role injection through client history

- Severity: Medium
- Component: `/api/ai-agent`
- Risk: A client could submit prior messages with unexpected roles, including `system`, weakening the server-side prompt boundary.
- Cause: `history.slice(-10)` was passed directly to OpenRouter.
- Affected path: `api/ai-agent.ts`
- Fix: History is normalized to `user` and `assistant` roles only, with length limits and request-size checks.

### F-009: Raw internal error messages

- Severity: Low
- Component: checkout/admin/API routes
- Risk: Internal messages could reveal configuration or implementation details.
- Cause: Some routes returned `error.message` directly.
- Affected paths: `api/create-checkout-session.ts`, `api/admin/simulate-order.ts`
- Fix: Public responses now use generic errors while server logs retain concise diagnostics.

### F-010: Missing repo-level supply-chain controls

- Severity: Medium
- Component: GitHub repository configuration
- Risk: Direct pushes to `main`, unpinned Actions, missing CODEOWNERS, or missing dependency automation can create avoidable release risk.
- Cause: Checkout contains no `.github` directory or policy files; branch protection cannot be verified from code alone.
- Affected paths: repository settings, `.github/*` not present.
- Fix: Add branch protection, secret scanning, Dependabot, CODEOWNERS, and PR-required deployment flow in GitHub settings.

### F-011: Production dependency advisories

- Severity: High
- Component: `package-lock.json`, production dependencies
- Risk: Known advisories exist in transitive dependencies used by Vercel, Firebase Admin, Resend, Express, and WebSocket-related packages.
- Cause: Current dependency graph includes vulnerable versions reported by npm audit.
- Affected paths: `package.json`, `package-lock.json`
- Fix: Run a separate dependency-upgrade PR. Start with non-breaking `npm audit fix`, then evaluate breaking changes for `@vercel/node`, `firebase-admin`, and `resend` with a full checkout/webhook regression test.

## 4. Full Findings Table

| ID | Title | Severity | CWE/OWASP | File/Path | Description | Recommended Fix | Effort | Risk if Unfixed |
|---|---|---|---|---|---|---|---|---|
| F-001 | Public order simulation | High | CWE-306 / A01 | `api/admin/simulate-order.ts` | Production endpoint could send email without admin auth. | Require Firebase admin token, validate input, remove PII logs. | Low | Email abuse and operational noise. |
| F-002 | Config disclosure | Medium | CWE-200 / A05 | `api/admin/config-status.ts` | Public endpoint exposed integration status. | Admin-authenticate or return non-sensitive health only. | Low | Recon for targeted attacks. |
| F-003 | Wildcard CORS | Medium | CWE-942 / A05 | `vercel.json`, `api/*` | Any Origin could read public API responses. | Explicit allowed origins with `Vary: Origin`. | Low | Amplifies public endpoint issues. |
| F-004 | Email in download response | Medium | CWE-359 / A01 | `api/download-links.ts` | Buyer email returned to any session-id holder. | Remove email from response. | Low | PII exposure. |
| F-005 | No download expiry enforcement | Medium | CWE-613 / A01 | `api/download*.ts` | Download links advertised expiry without server check. | Enforce max session age. | Low | Persistent product access after link leak. |
| F-006 | Public Supabase PDF bucket | High | CWE-284 / A01 | Supabase `pdfs`, `api/download.ts` | PDFs can be directly fetched if object names leak. | Private bucket + server-side signed/private access. | Medium | Product leakage and revenue loss. |
| F-007 | Broad Firebase Storage rules | High | CWE-732 / A01 | `storage.rules` | Global public read and broad signed-in writes. | Default deny with scoped public/admin/owner rules. | Low | Data/object leakage and unwanted uploads. |
| F-008 | AI history role injection | Medium | CWE-20 / A03 | `api/ai-agent.ts` | Client history passed to model without role filtering. | Allow only `user`/`assistant`, cap content length. | Low | Prompt-boundary weakening. |
| F-009 | Raw error responses | Low | CWE-209 / A05 | `api/create-checkout-session.ts`, admin routes | Some exceptions returned to clients. | Generic client errors, detailed server logs only. | Low | Recon and support confusion. |
| F-010 | Missing GitHub hardening evidence | Medium | A05 / A08 | `.github/*`, repo settings | No repo evidence for CODEOWNERS, Dependabot, branch protection. | Enable GitHub protections and add policy files. | Medium | Supply-chain and deployment mistakes. |
| F-011 | Production dependency advisories | High | A06 / A08 | `package-lock.json` | `npm audit --omit=dev` reported 25 vulnerabilities, including 7 high. | Separate dependency-upgrade PR with regression testing. | Medium | Known vulnerable transitive code remains deployed. |
| F-012 | AI endpoint lacks durable rate limiting | Medium | CWE-770 / A04 | `api/ai-agent.ts` | OpenRouter-backed route can be abused for token/cost consumption. | Add Vercel Firewall or Upstash/KV rate limiting. | Medium | Abuse, quota exhaustion. |
| F-013 | Checkout lacks durable rate limiting | Low | CWE-770 / A04 | `api/create-checkout-session.ts` | Attackers can create many sessions. | Add IP/session rate limits at edge or provider. | Medium | Stripe/API noise. |
| F-014 | Cloudflare SSL mode unverified | Medium | A05 | Cloudflare/Vercel | Blueprint says Flexible SSL, which is unsafe if accurate. | Use Full (strict), HSTS, DNSSEC, CAA. | Low | TLS downgrade/MITM between proxy and origin. |
| F-015 | Webhook alias duplication | Low | A05 | `api/webhook.ts`, `api/stripe-webhook.ts` | Duplicate webhook functions increase config drift. | Keep one endpoint or share implementation. | Low | Drift and missed fixes. |
| F-016 | Admin role hardcoded by email | Low | CWE-798-ish / A01 | `firestore.rules`, `Admin.tsx` | Admin identity is tied to one email in multiple places. | Centralize admin claims or app metadata. | Medium | Brittle operations and privilege confusion. |

## 5. Hardening Measures

Quick wins under 1 hour:

- Deploy this PR and verify `Access-Control-Allow-Origin: *` is gone from API and app responses.
- Set `ADMIN_API_KEY` in Vercel Production/Preview; remove any `VITE_ADMIN_API_KEY`.
- Rotate any admin key that was ever exposed as a `VITE_` variable.
- Confirm `STRIPE_WEBHOOK_SECRET` is present in Vercel Production and Preview only where intended.
- Confirm no `.env` file is committed and Vercel source maps are not publicly exposed.

Under 1 day:

- Move Supabase `pdfs` to private storage and update `/api/download` to use authenticated storage reads.
- Add Vercel Firewall or durable KV-based rate limits for AI, checkout, downloads, and admin routes.
- Add Dependabot, CODEOWNERS, branch protection, and required PR review on `main`.
- Create a dedicated dependency upgrade PR for the 25 `npm audit --omit=dev` findings.
- Add local unit tests/mocks for CORS, admin auth, download expiry, and AI history normalization.

Structural:

- Replace email-hardcoded admin checks with Firebase custom claims or app metadata.
- Add audit logging for admin actions, simulation emails, webhook processing, and failed download attempts.
- Add incident runbooks: secret rotation, Stripe webhook replay review, Supabase object access review, Firebase rules rollback.

## 6. Exact Technical Fixes Applied

Applied in this PR:

- Added `api/_security.ts` for shared CORS, security headers, bearer-token parsing, request-size limits, email validation, Stripe session id validation, and PDF filename validation.
- Added `api/_firebaseAdmin.ts` for Firebase Admin initialization and admin-token verification.
- Updated `api/admin/config-status.ts` to require Firebase admin auth.
- Updated `api/admin/simulate-order.ts` to require Firebase admin auth, validate inputs, escape HTML, and avoid PII logs.
- Updated `api/admin/system-dump.ts` to use `ADMIN_API_KEY` only and avoid exposing `contentUrl` schema hints.
- Updated `api/ai-agent.ts` to reject oversized requests and strip client-supplied roles except `user`/`assistant`.
- Updated `api/create-checkout-session.ts` to validate body shape and avoid raw error responses.
- Updated `api/download-links.ts` and `api/download.ts` to validate session ids, enforce a 7-day window, validate filenames, and remove buyer email from responses.
- Updated `vercel.json` with CSP, frame protection, content-type sniffing protection, referrer policy, and permissions policy; removed wildcard CORS.
- Updated `storage.rules` to default deny and scope Firebase Storage access.
- Updated `.env.example`, `README.md`, `server.ts`, and the Admin UI to stop referencing `VITE_ADMIN_API_KEY`.

Still required outside this repo:

- Supabase Dashboard: make `pdfs` private, export bucket policies, and verify no public object URL can fetch a paid PDF.
- Vercel Dashboard: verify env scoping, deployment protection for previews, and firewall/rate-limit rules.
- Firebase Console: deploy and test `firestore.rules` and `storage.rules`; verify admin-role paths.
- Stripe Dashboard: verify webhook URL, event list, signing secret, Radar settings, and test/live mode separation.
- Cloudflare: verify SSL mode is Full (strict), HSTS, CAA, DNSSEC, and no Flexible SSL.
- GitHub: enable branch protection, secret scanning, Dependabot, and CODEOWNERS.

## 7. Verification Plan

Local/static:

- `npm run lint` - passed after this patch.
- `npm run build` - passed after this patch; Vite emitted only a large-chunk warning.
- `npm audit --omit=dev` - failed because advisories remain: 25 total, 7 high.
- Secret scan - no real server secrets found outside placeholders/public Firebase config:
  - `rg -n "sk_live|sk_test|whsec_|sb_secret|service_role|sk-or-v1|re_[A-Za-z0-9]|FIREBASE_SERVICE_ACCOUNT|private_key" .`
  - After build: same scan against `dist/`.

Passive production after deploy:

- `curl -I https://www.nolea.shop/`
  - Expect CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
  - Expect no `Access-Control-Allow-Origin: *`.
- `curl -i -X OPTIONS https://www.nolea.shop/api/ai-agent -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST"`
  - Expect no `Access-Control-Allow-Origin: *`.
- `curl -i https://www.nolea.shop/api/admin/config-status -H "Origin: https://evil.example"`
  - Expect `401` without Firebase admin bearer token.
- `curl -i https://www.nolea.shop/api/admin/system-dump`
  - Expect `401` without `Authorization: Bearer $ADMIN_API_KEY`.

Local/mock scenarios:

- Checkout rejects invalid item ids, too many items, invalid email, and oversized body.
- AI agent rejects oversized body, invalid email, and strips `system` roles from history.
- Download endpoints reject malformed `session_id`, unsafe `product`, unpaid sessions, expired sessions, and filenames not present in Stripe metadata.
- Admin config and simulation reject missing, invalid, non-admin, and expired Firebase tokens.
- Stripe webhook rejects invalid signatures and still accepts valid raw-body events.

## 8. Open Questions / Missing Information

- Supabase export needed: bucket list, `pdfs`/`images` public flags, storage policies, object naming conventions, and whether service-role keys exist in Vercel.
- Firebase export needed: deployed Firestore rules, deployed Storage rules, Auth OAuth redirect URIs, App Check status, and service-account key rotation history.
- Vercel export needed: env var scopes, preview protection, latest deployment protection status, build logs, function logs, and firewall/rate-limit config.
- Stripe export needed: live/test key mode, webhook endpoint URL, enabled events, last failed events, Radar status, and payment method settings.
- GitHub settings needed: branch protection, secret scanning, Dependabot status, collaborator permissions, and whether direct pushes to `main` are blocked.
- Cloudflare export needed: SSL mode, HSTS, DNSSEC, CAA records, WAF/bot settings, and proxy/origin configuration.
