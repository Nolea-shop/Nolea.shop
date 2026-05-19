import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const report: any = {
    env: {
      STRIPE_SECRET_KEY_set: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_SECRET_KEY_len: (process.env.STRIPE_SECRET_KEY || '').length,
      FIREBASE_KEY_set: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      FIREBASE_KEY_len: (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '').length,
      FIREBASE_B64_set: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64,
      FIREBASE_B64_len: (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64 || '').length,
    },
    stripe: null as any,
    firebase: null as any,
  };

  // Test Stripe
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: '2025-11-17.acacia' });
      const acct = await stripe.accounts.retrieve();
      report.stripe = { ok: true, id: acct.id, country: acct.country };
    } else {
      report.stripe = { ok: false, error: 'STRIPE_SECRET_KEY is empty' };
    }
  } catch (e: any) {
    report.stripe = { ok: false, error: `${e.code}: ${e.message}` };
  }

  // Test Firebase
  try {
    const b64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64 || '';
    const raw = b64Key ? Buffer.from(b64Key, 'base64').toString('utf8') : (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '');
    const parsed = JSON.parse(raw);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(parsed), projectId: 'gen-lang-client-0195318958' });
    }
    const db = admin.firestore();
    const snap = await db.collection('recipes').count().get();
    report.firebase = { ok: true, projectId: 'gen-lang-client-0195318958', recipeCount: snap.data().count };
  } catch (e: any) {
    report.firebase = { ok: false, error: `${e.code || e.name}: ${e.message}`, rawLen: (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64 || '').length };
  }

  res.status(200).json(report);
}
