import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import {
  applyCors,
  endPreflight,
  isValidEmail,
  rejectLargeRequest,
  requireMethod,
} from './_security';

// Initialize Firebase Admin if not already initialized
function initFirebase() {
  if (admin.apps.length) return;
  // Try base64-encoded key first (avoids Vercel newline escaping issues)
  const b64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64 || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
  try {
    const json = Buffer.from(b64Key, 'base64').toString('utf8');
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(json)),
      projectId: 'gen-lang-client-0195318958'
    });
    return;
  } catch {
    // Fallback: try direct JSON parse
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(b64Key)),
        projectId: 'gen-lang-client-0195318958'
      });
      return;
    } catch {
      throw new Error('Failed to initialize Firebase: invalid FIREBASE_SERVICE_ACCOUNT_KEY_B64');
    }
  }
}

initFirebase();

const db = admin.firestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ['POST']);
  if (endPreflight(req, res)) return;
  if (!requireMethod(req, res, 'POST')) return;
  if (rejectLargeRequest(req, res, 64 * 1024)) return;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  // Highly End: Validate prices server-side against Firestore
  // userId und userEmail sind optional — bei Gast-Checkout kann beides null sein
  const { items: clientItems, userId, userEmail } = req.body;

  if (!Array.isArray(clientItems) || !clientItems.length) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  if (clientItems.length > 20) {
    return res.status(400).json({ error: 'Too many items in cart' });
  }

  if (userEmail && !isValidEmail(userEmail)) {
    return res.status(400).json({ error: 'Invalid customer email' });
  }

  if (userId && (typeof userId !== 'string' || userId.length > 128)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  const APP_URL = process.env.APP_URL || 'https://www.nolea.shop';

  try {
    // Validate each item against Firestore — never trust client prices
    const validatedItems = [];
    for (const item of clientItems) {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(item.id)) {
        return res.status(400).json({ error: 'Invalid cart item' });
      }

      const recipeDoc = await db.collection('recipes').doc(item.id).get();
      if (!recipeDoc.exists) {
        return res.status(400).json({ error: 'Product not found' });
      }
      const actualData = recipeDoc.data();
      if (!actualData?.isOnline) {
        return res.status(400).json({ error: 'Product is currently unavailable' });
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
      payment_method_types: ['card'], // TEMP: 'paypal' removed — nicht im Stripe-Dashboard aktiviert (2026-05-25). Bei Bedarf wieder hinzufügen + Dashboard aktivieren.
      line_items: validatedItems.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            images: item.imageUrl && item.imageUrl.startsWith('http') ? [item.imageUrl] : [],
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
    console.error('Checkout error:', error?.message || error);
    return res.status(500).json({ error: 'Checkout failed' });
  }
}
