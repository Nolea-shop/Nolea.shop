import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
function initFirebase() {
  if (admin.apps.length) return;
  const b64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64 || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
  if (!b64Key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_B64 not configured');
  }
  try {
    const json = Buffer.from(b64Key, 'base64').toString('utf8');
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(json)),
      projectId: 'gen-lang-client-0195318958'
    });
  } catch (e) {
    // Fallback: try direct JSON parse
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(b64Key)),
        projectId: 'gen-lang-client-0195318958'
      });
    } catch {
      throw new Error('Failed to initialize Firebase: invalid FIREBASE_SERVICE_ACCOUNT_KEY_B64');
    }
  }
}

// Lazy init
let db: FirebaseFirestore.Firestore | null = null;
function getDb() {
  if (!db) {
    initFirebase();
    db = admin.firestore();
  }
  return db;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { items: clientItems, userId, userEmail } = req.body;

  if (!Array.isArray(clientItems) || !clientItems.length) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  if (clientItems.length > 20) {
    return res.status(400).json({ error: 'Too many items in cart' });
  }

  const APP_URL = process.env.APP_URL || 'https://www.nolea.shop';

  try {
    // Validate each item against Firestore — never trust client prices
    const validatedItems = [];
    for (const item of clientItems) {
      if (!item || typeof item.id !== 'string') {
        return res.status(400).json({ error: 'Invalid cart item' });
      }

      const recipeDoc = await getDb().collection('recipes').doc(item.id).get();
      if (!recipeDoc.exists) {
        return res.status(400).json({ error: `Product ${item.id} not found` });
      }
      const actualData = recipeDoc.data();
      if (!actualData?.isOnline) {
        return res.status(400).json({ error: `Product ${item.id} is currently unavailable` });
      }
      
      validatedItems.push({
        id: item.id,
        title: actualData.title,
        price: actualData.price,
        imageUrl: actualData.imageUrl,
        contentUrl: actualData.contentUrl || '',
        authorId: actualData.authorId || 'admin',
      });
    }

    // Dynamic import stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });

    const metadata: Record<string, string> = {
      recipeIds: validatedItems.map((i: any) => i.id).join(','),
      recipeTitles: validatedItems.map((i: any) => i.title).join(', '),
      contentUrls: validatedItems.map((i: any) => i.contentUrl || '').filter(Boolean).join(','),
      authorIds: validatedItems.map((i: any) => i.authorId || 'admin').join(','),
    };
    if (userId) metadata.userId = userId;

    const customerEmail = userEmail || undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: validatedItems.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            images: item.imageUrl && item.imageUrl.startsWith('http') ? [item.imageUrl] : [],
          },
          unit_amount: Math.round(item.price),
        },
        quantity: 1,
      })),
      mode: 'payment',
      success_url: `${APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/cart`,
      customer_email: customerEmail,
      metadata,
    });

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error?.message || error);
    return res.status(500).json({ error: 'Checkout failed' });
  }
}
