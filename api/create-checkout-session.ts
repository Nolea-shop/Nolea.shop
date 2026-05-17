import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')),
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

  const { items: clientItems, userId, userEmail } = req.body;

  if (!clientItems || !clientItems.length) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  const APP_URL = process.env.APP_URL || 'https://www.nolea.shop';

  try {
    // HIGH-END SECURITY: Verify prices server-side via Firestore
    const validatedItems = [];
    for (const item of clientItems) {
      const recipeDoc = await db.collection('recipes').doc(item.id).get();
      if (!recipeDoc.exists) {
        throw new Error(`Produkt ${item.title} nicht gefunden.`);
      }
      const actualData = recipeDoc.data();
      if (!actualData?.isOnline) {
        throw new Error(`Produkt ${item.title} ist momentan nicht verfügbar.`);
      }
      
      // Use price from DB, not from client request
      validatedItems.push({
        id: item.id,
        title: actualData.title,
        price: actualData.price, // In cents
        imageUrl: actualData.imageUrl
      });
    }

    // Dynamic import stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'],
      line_items: validatedItems.map((item) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            images: item.imageUrl ? [item.imageUrl] : [],
          },
          unit_amount: Math.round(item.price), // price in cents
        },
        quantity: 1,
      })),
      mode: 'payment',
      success_url: `${APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/cart`,
      customer_email: userEmail,
      metadata: {
        userId: userId || '',
        recipeIds: validatedItems.map((i) => i.id).join(','),
        recipeTitles: validatedItems.map((i) => i.title).join(', '),
        // High-End: Pass author info for split payments
        authorIds: validatedItems.map(i => i.authorId || 'admin').join(',')
      },
    });

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
