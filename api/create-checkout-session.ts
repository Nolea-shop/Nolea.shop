import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
function parseFirebaseKey(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    // Vercel double-escapes the private_key newlines: try to unescape
    const unescaped = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return JSON.parse(unescaped);
  }
}

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}';
  admin.initializeApp({
    credential: admin.credential.cert(parseFirebaseKey(raw)),
    projectId: 'gen-lang-client-0195318958'
  });
}

const db = admin.firestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - secure to main domain
  const allowedOrigins = ['https://www.nolea.shop', 'https://nolea.shop'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin && process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
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

  // Highly End: Validate prices server-side against Firestore
  // userId und userEmail sind optional — bei Gast-Checkout kann beides null sein
  const { items: clientItems, userId, userEmail } = req.body;

  if (!clientItems || !clientItems.length) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  const APP_URL = process.env.APP_URL || 'https://www.nolea.shop';

  try {
    // Validate each item against Firestore — never trust client prices
    const validatedItems = [];
    for (const item of clientItems) {
      const recipeDoc = await db.collection('recipes').doc(item.id).get();
      if (!recipeDoc.exists) {
        throw new Error(`Produkt ${item.title} nicht gefunden.`);
      }
      const actualData = recipeDoc.data();
      if (!actualData?.isOnline) {
        throw new Error(`Produkt ${item.title} ist momentan nicht verf\u00fcgbar.`);
      }
      
      validatedItems.push({
        id: item.id,
        title: actualData.title,
        price: actualData.price, // In cents — from DB, not from client
        imageUrl: actualData.imageUrl,
        contentUrl: actualData.contentUrl || '',
        authorId: actualData.authorId || 'admin',
      });
    }

    // Dynamic import stripe (Vercel Functions bundle no node_modules directly)
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });

    // Metadata: userId nur setzen, wenn ein eingeloggter Benutzer vorhanden ist
    // Bei Gast-Checkout (userId = null) entf\u00e4llt userId aus metadata
    const metadata: Record<string, string> = {
      recipeIds: validatedItems.map((i: any) => i.id).join(','),
      recipeTitles: validatedItems.map((i: any) => i.title).join(', '),
      contentUrls: validatedItems.map((i: any) => i.contentUrl || '').filter(Boolean).join(','),
      // High-End: Pass author info for potential split payments
      authorIds: validatedItems.map((i: any) => i.authorId || 'admin').join(','),
    };
    if (userId) metadata.userId = userId;

    // Stripe erwartet undefined statt null f\u00fcr customer_email bei G\u00e4sten
    const customerEmail = userEmail || undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'],
      line_items: validatedItems.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            images: item.imageUrl ? [item.imageUrl] : [],
          },
          unit_amount: Math.round(item.price), // Price in cents — from DB
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
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
