import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// ── Firebase Admin: lazy init so startup failures land inside try/catch
let db: admin.firestore.Firestore | null = null;
let firebaseReady = false;

function initFirebase() {
  if (firebaseReady) return;
  try {
    const fbKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64
      || process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      || '';
    const json = JSON.parse(Buffer.from(fbKey, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(json),
      projectId: 'gen-lang-client-0195318958',
    });
    db = admin.firestore();
    firebaseReady = true;
  } catch (err: any) {
    console.error('[stripe-webhook] Firebase init failed:', err.message);
  }
}

// Disable body parsing for webhook — we need raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Init Firebase inside handler so cold-start failures are caught by try/catch
  initFirebase();

  // CORS headers — secure to main domain
  const allowedOrigins = ['https://www.nolea.shop', 'https://nolea.shop'];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!stripeSecretKey || !webhookSecret) {
    return res.status(400).send('Webhook missing configuration');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  // Collect raw body from stream
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const rawBody = Buffer.concat(chunks);

  try {
    // Dynamic Stripe import
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });

    const event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const customerEmail = session.customer_details?.email;
      const recipeTitles = session.metadata?.recipeTitles || 'deine Rezepte';
      const userId = session.metadata?.userId;
      const recipeIds = session.metadata?.recipeIds;

      console.log('Payment successful for session:', session.id);

      // Create order in Firestore
      if (db) {
        await db.collection('orders').add({
          stripeSessionId: session.id,
          userId: userId || 'anonymous',
          userEmail: customerEmail,
          recipeIds: recipeIds ? recipeIds.split(',') : [],
          recipeTitles: recipeTitles,
          total: session.amount_total,
          commissionCents: Math.round(session.amount_total * 0.10),
          payoutCents: session.amount_total - Math.round(session.amount_total * 0.10),
          authorIds: session.metadata?.authorIds ? session.metadata.authorIds.split(',') : [],
          status: 'completed',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        console.warn('Firebase not ready — order not written to Firestore');
      }

      // Send delivery email via Resend
      if (resendApiKey && customerEmail) {
        const APP_URL = process.env.APP_URL || 'https://www.nolea.shop';

        // Build order items HTML
        const titles = recipeTitles.split(', ');
        const price = session.amount_total ? (session.amount_total / 100).toFixed(2) : '0.00';
        const orderItemsHtml = titles.map((title: string) => `
          <div style="display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center;margin-bottom:16px;">
            <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#FDFEFB;border:1px solid #E8ECE3;border-radius:6px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7F4A" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h4M9 15h2"/></svg>
            </div>
            <div>
              <div style="font-size:15px;font-weight:500;color:#1A1F16;">${title}</div>
              <div style="font-size:12px;color:#8B9486;margin-top:3px;">PDF Guide</div>
            </div>
            <div style="font-size:15px;font-weight:600;color:#1A1F16;">€ ${price}</div>
          </div>
        `).join('');

        // Read and populate email template
        let emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Nolea - Download Ready</title><style>:root{--ink:#1A1F16;--ink-soft:#4A5245;--ink-muted:#8B9486;--matcha:#6B7F4A;--matcha-soft:#8BA86B;--matcha-glow:rgba(107,127,74,0.12);--paper:#FDFEFB;--paper-alt:#F5F7F2;--paper-warm:#F8F9F5;--line:#E8ECE3;--line-soft:#EFF2EB}*{margin:0;padding:0;box-sizing:border-box}body{background:linear-gradient(180deg,#E3E7DB 0%,#EBEDE5 30%,#F0F2EC 100%);font-family:'Helvetica Neue',Arial,sans-serif;color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}.email{max-width:600px;margin:48px auto;background:var(--paper);border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(26,31,22,0.04),0 4px 12px rgba(26,31,22,0.03),0 16px 40px rgba(26,31,22,0.06)}.header{padding:28px 44px;border-bottom:1px solid var(--line-soft);display:flex;justify-content:space-between;align-items:center}.logo{display:flex;align-items:center;gap:11px;text-decoration:none}.logo-text{font-size:17px;font-weight:600;letter-spacing:3.5px;color:var(--ink);text-transform:uppercase}.badge{font-size:10px;font-weight:500;color:var(--matcha);text-transform:uppercase;letter-spacing:1.2px;padding:7px 14px;background:var(--matcha-glow);border:1px solid rgba(107,127,74,0.2);border-radius:100px;display:inline-flex;align-items:center;gap:6px}.badge-dot{width:6px;height:6px;background:var(--matcha);border-radius:50%}.status-bar{padding:20px 44px;background:var(--paper-warm);border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:28px}.status-step{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:500;letter-spacing:0.5px;color:var(--ink-muted)}.status-step.active{color:var(--matcha)}.status-step.completed{color:var(--matcha-soft)}.status-icon{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--line);background:var(--paper)}.status-step.completed .status-icon{border-color:var(--matcha);background:var(--matcha)}.status-step.active .status-icon{border-color:var(--matcha);background:var(--matcha-glow)}.status-connector{flex:1;height:1px;background:var(--line)}.status-connector.done{background:var(--matcha-soft)}.hero{padding:32px 44px 0}.hero-img-wrap{position:relative;border-radius:6px;overflow:hidden}.hero-img{width:100%;display:block;border-radius:6px;aspect-ratio:16/7;object-fit:cover}.hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(26,31,22,0.6) 100%);border-radius:6px}.hero-text{position:absolute;bottom:0;left:0;right:0;padding:28px 32px;color:var(--paper)}.hero-eyebrow{font-size:10px;font-weight:500;letter-spacing:3px;text-transform:uppercase;opacity:0.7;margin-bottom:8px}.hero-title{font-size:32px;font-weight:500;line-height:1.2;font-family:Georgia,serif}.hero-title em{font-style:italic;color:#B8D49A}.content{padding:36px 44px 40px}.greeting{font-size:14px;color:var(--ink-muted);margin-bottom:20px}.greeting strong{color:var(--ink-soft);font-weight:500}.lead{font-size:15.5px;color:var(--ink-soft);max-width:440px;line-height:1.7;margin-bottom:32px}.cta-group{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.cta{display:inline-flex;align-items:center;gap:10px;padding:15px 30px;background:var(--ink);color:var(--paper);text-decoration:none;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;border-radius:4px}.cta-secondary{display:inline-flex;align-items:center;gap:6px;padding:15px 24px;background:transparent;color:var(--ink-soft);text-decoration:none;font-size:12px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;border-radius:4px;border:1px solid var(--line)}.cta-note{display:block;font-size:12px;color:var(--ink-muted);margin-top:18px}.cta-note a{color:var(--matcha);text-decoration:none}.order-box{margin:0 44px 40px;padding:28px;background:var(--paper-alt);border:1px solid var(--line);border-radius:6px}.order-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid var(--line)}.order-title{font-size:10px;font-weight:500;letter-spacing:2.5px;color:var(--matcha);text-transform:uppercase}.order-id{font-size:12px;color:var(--ink-muted)}.order-details{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}.order-row{display:flex;justify-content:space-between;padding:6px 0}.order-row-label{font-size:13px;color:var(--ink-muted)}.order-row-value{font-size:13px;color:var(--ink-soft)}.order-total{display:flex;justify-content:space-between;align-items:baseline;margin-top:12px;padding-top:16px;border-top:1.5px solid var(--ink)}.order-total-label{font-size:13px;font-weight:500;color:var(--ink)}.order-total-value{font-size:22px;font-weight:600;color:var(--matcha)}.included{margin:0 44px 40px}.included-title{font-size:10px;font-weight:500;letter-spacing:2.5px;color:var(--matcha);text-transform:uppercase;margin-bottom:16px}.included-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.included-item{padding:18px 16px;background:var(--paper-alt);border:1px solid var(--line-soft);border-radius:6px;text-align:center}.included-icon{width:36px;height:36px;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;background:var(--paper);border-radius:50%;border:1px solid var(--line)}.included-label{font-size:11px;font-weight:500;color:var(--ink-soft)}.included-count{font-size:10px;color:var(--ink-muted);margin-top:2px}.section-divider{margin:8px 44px 40px;display:flex;align-items:center;gap:16px}.section-divider .line{flex:1;height:1px;background:var(--line)}.recommend{padding:0 44px 44px}.recommend-head{text-align:center;margin-bottom:28px}.recommend-head .eyebrow{font-size:10px;font-weight:500;letter-spacing:3px;color:var(--matcha);text-transform:uppercase;display:block;margin-bottom:10px}.recommend-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.product{text-decoration:none;display:block;background:var(--paper);border:1px solid var(--line);border-radius:6px;overflow:hidden}.product-body{padding:18px}.product-cat{font-size:10px;font-weight:500;letter-spacing:1.5px;color:var(--ink-muted);text-transform:uppercase}.product-name{font-size:15px;font-weight:500;color:var(--ink);margin:6px 0 4px}.product-desc{font-size:12px;color:var(--ink-muted);line-height:1.5}.product-foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--line-soft)}.product-price{font-size:16px;font-weight:600;color:var(--ink)}.product-link{font-size:10px;font-weight:500;color:var(--matcha);letter-spacing:1px;text-transform:uppercase}.browse{display:inline-flex;align-items:center;gap:8px;margin-top:28px;font-size:11px;font-weight:500;color:var(--ink-soft);text-decoration:none;letter-spacing:1.5px;text-transform:uppercase}.help{margin:0 44px 44px;display:grid;grid-template-columns:1fr 1fr;gap:12px}.help-card{padding:22px 20px;background:var(--paper-alt);border:1px solid var(--line-soft);border-radius:6px;text-decoration:none;display:flex;align-items:flex-start;gap:14px}.help-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--paper);border:1px solid var(--line);border-radius:6px;flex-shrink:0}.help-title{font-size:13px;font-weight:500;color:var(--ink);margin-bottom:3px}.help-desc{font-size:11px;color:var(--ink-muted);line-height:1.5}.footer{padding:36px 44px;background:var(--ink);color:var(--paper)}.footer-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06)}.footer-logo-text{font-size:14px;font-weight:600;letter-spacing:3px;text-transform:uppercase}.footer-tagline{font-size:11px;color:rgba(255,255,255,0.3);font-weight:300;margin-top:4px}.footer-links{display:flex;justify-content:center;gap:24px;margin-bottom:20px}.footer-links a{font-size:11px;color:rgba(255,255,255,0.3);text-decoration:none}.footer-copy{text-align:center;font-size:11px;color:rgba(255,255,255,0.18);line-height:1.8}.footer-copy a{color:rgba(255,255,255,0.25);text-decoration:none}@media(max-width:620px){.email{margin:0;border-radius:0;min-height:100vh;box-shadow:none}.header,.status-bar,.hero,.content,.order-box,.included,.recommend,.help,.footer{padding-left:24px!important;padding-right:24px!important}.order-box,.included,.recommend,.help{margin-left:24px!important;margin-right:24px!important}.hero-title{font-size:24px}.cta-group{flex-direction:column;align-items:stretch}.cta,.cta-secondary{justify-content:center}.recommend-grid,.help{grid-template-columns:1fr}}</style></head><body><div class="email"><header class="header"><a href="https://www.nolea.shop/" class="logo"><svg width="34" height="34" viewBox="0 0 34 34" fill="none"><rect width="34" height="34" rx="8" fill="#E8ECE3"/><path d="M17 7C17 7 9 12 9 21C9 25 11.5 28 17 28C22.5 28 25 25 25 21C25 12 17 7 17 7Z" fill="#6B7F4A"/><path d="M17 11V23" stroke="white" stroke-width="1.5" stroke-linecap="round"/><path d="M17 16L14 13" stroke="white" stroke-width="1.2" stroke-linecap="round"/><path d="M17 19L20 16" stroke="white" stroke-width="1.2" stroke-linecap="round"/></svg><span class="logo-text">NOLEA</span></a><span class="badge"><span class="badge-dot"></span> Order Confirmed</span></header><div class="status-bar"><div class="status-step completed"><div class="status-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>Paid</div><div class="status-connector done"></div><div class="status-step completed"><div class="status-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>Confirmed</div><div class="status-connector done"></div><div class="status-step active"><div class="status-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7F4A" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>Download</div></div><div class="hero"><div class="hero-img-wrap"><img class="hero-img" src="https://images.unsplash.com/photo-1515378960530-7c0da6231faa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt=""><div class="hero-overlay"></div><div class="hero-text"><div class="hero-eyebrow">Thank you for your order</div><h1 class="hero-title">Your download is <em>ready</em></h1></div></div></div><main class="content"><p class="greeting">Hi <strong>${customerEmail.split('@')[0]}</strong>,</p><p class="lead">Your files are prepared and waiting. Click below to download instantly — your access never expires, so you can come back anytime.</p><div class="cta-group"><a href="${APP_URL}/success?session_id=${session.id}" class="cta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download Now</span></a><a href="${APP_URL}/cart" class="cta-secondary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:14px;height:14px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h4M9 15h2"/></svg>View Receipt</a></div><span class="cta-note">Questions? <a href="mailto:noleashop@gmail.com">Reply to this email</a> — we usually respond within a few hours.</span></main><div class="order-box"><div class="order-head"><span class="order-title">Order Summary</span><span class="order-id">#${session.id.slice(-8).toUpperCase()}</span></div>${orderItemsHtml}<div class="order-details"><div class="order-row"><span class="order-row-label">Subtotal</span><span class="order-row-value">€ ${price}</span></div><div class="order-row"><span class="order-row-label">Tax</span><span class="order-row-value">€ 0.00</span></div></div><div class="order-total"><span class="order-total-label">Total Paid</span><span class="order-total-value">€ ${price}</span></div></div><div class="included"><div class="included-title">What's Included</div><div class="included-grid"><div class="included-item"><div class="included-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7F4A" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="included-label">PDF Guides</div><div class="included-count">${titles.length} files</div></div><div class="included-item"><div class="included-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7F4A" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg></div><div class="included-label">Instant Access</div><div class="included-count">Lifetime</div></div><div class="included-item"><div class="included-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7F4A" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="included-label">Secure</div><div class="included-count">Encrypted</div></div></div></div><div class="section-divider"><div class="line"></div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="opacity:0.3;color:#6B7F4A"><path d="M12 2C12 2 5 8 5 15C5 19 8 22 12 22C16 22 19 19 19 15C19 8 12 2 12 2Z" stroke="currentColor" stroke-width="1.5"/><path d="M12 8V16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg><div class="line"></div></div><section class="recommend"><div class="recommend-head"><span class="eyebrow">You might like</span><h2 style="font-size:22px;font-weight:500;margin-top:8px;color:var(--ink);font-family:Georgia,serif">Selected for you</h2></div><div class="recommend-grid"><a href="${APP_URL}/shop" class="product"><div class="product-body"><span class="product-cat">Browse</span><h3 class="product-name">Explore All Guides</h3><p class="product-desc">Discover our full collection of digital products.</p><div class="product-foot"><span class="product-price">From €4.99</span><span class="product-link">View →</span></div></div></a><a href="${APP_URL}/shop" class="product"><div class="product-body"><span class="product-cat">Shop</span><h3 class="product-name">Nolea Shop</h3><p class="product-desc">Quality digital guides for every need.</p><div class="product-foot"><span class="product-price">€4.99+</span><span class="product-link">Browse →</span></div></div></a></div><div style="text-align:center"><a href="${APP_URL}/shop" class="browse">Browse all products →</a></div></section><div class="help"><a href="${APP_URL}/privacy" class="help-card"><div class="help-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7F4A" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div class="help-title">Need help?</div><div class="help-desc">Check our FAQ for common questions.</div></div></a><a href="mailto:noleashop@gmail.com" class="help-card"><div class="help-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7F4A" stroke-width="1.5" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div><div class="help-title">Contact us</div><div class="help-desc">Reply to this email or chat with us.</div></div></a></div><footer class="footer"><div class="footer-top"><div><div style="display:flex;align-items:center;gap:10px"><svg width="20" height="20" viewBox="0 0 32 32" fill="none"><path d="M16 4C16 4 8 9 8 18C8 22 10.5 25 16 25C21.5 25 24 22 24 18C24 9 16 4 16 4Z" fill="#6B7F4A"/><path d="M16 9V21" stroke="#FDFEFB" stroke-width="1.5" stroke-linecap="round"/></svg><span class="footer-logo-text">NOLEA</span></div><div class="footer-tagline">Natural digital products</div></div></div><div class="footer-links"><a href="${APP_URL}/">Shop</a><a href="${APP_URL}/privacy">Privacy</a><a href="${APP_URL}/terms">Terms</a><a href="${APP_URL}/impressum">Legal</a></div><div class="footer-copy">© 2026 Nolea Studio. All rights reserved.<br><a href="${APP_URL}/">nolea.shop</a></div></footer></div></body></html>`;

        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Nolea/1.0',
            },
            body: JSON.stringify({
              from: 'Nolea Studio <noreply@nolea.shop>',
              to: customerEmail,
              subject: 'Your Nolea Download is Ready! 🎉',
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            console.log('Automated delivery email sent to:', customerEmail);
          } else {
            const err = await emailResponse.json();
            console.error('Failed to send delivery email:', err);
          }
        } catch (emailError: any) {
          console.error('Failed to send delivery email:', emailError.message);
        }
      } else {
        console.warn('Skipping email delivery: Resend not configured or customer email missing');
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
