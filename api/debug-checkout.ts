import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let logs: string[] = [];

  function log(msg: string) {
    logs.push(msg);
    console.log(msg);
  }

  try {
    // 1. Check env
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const b64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64 || '';
    log(`stripeKey_len=${stripeKey.length} b64Key_len=${b64Key.length}`);

    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is empty');

    // 2. Init Firebase
    const raw = Buffer.from(b64Key, 'base64').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(parsed), projectId: 'gen-lang-client-0195318958' });
    }
    const db = admin.firestore();
    log('Firebase initialized OK');

    // 3. Test Firestore query (same as create-checkout-session)
    const recipeId = 'nahihPkpYlDgBi7lI5e1';
    const doc = await db.collection('recipes').doc(recipeId).get();
    if (!doc.exists) throw new Error(`Recipe ${recipeId} not found`);
    const data = doc.data()!;
    log(`Recipe found: title=${data.title} isOnline=${data.isOnline} price=${data.price}`);

    // 4. Init Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' as any });
    log('Stripe initialized');

    // 5. Create checkout session (same as create-checkout-session)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: data.title },
          unit_amount: Math.round(data.price),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://www.nolea.shop/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.nolea.shop/cart',
      metadata: {
        recipeIds: recipeId,
        contentUrls: data.contentUrl || '',
      },
    });
    log(`Checkout session created: id=${session.id} url=${session.url?.substring(0, 80)}`);

    res.status(200).json({ ok: true, sessionId: session.id, url: session.url, logs });

  } catch (e: any) {
    log(`ERROR: ${e.code || e.name}: ${e.message}`);
    res.status(500).json({ ok: false, error: `${e.code || e.name}: ${e.message}`, logs });
  }
}
