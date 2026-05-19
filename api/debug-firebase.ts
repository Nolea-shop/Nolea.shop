import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
  const keyLen = keyJson.length;
  const hasNewlines = keyJson.includes('\n');
  const hasEscaped = keyJson.includes('\\n');
  const startsWith = keyJson.substring(0, 60);

  let firebaseStatus: string = 'not_init';
  let error: string | null = null;
  let recipeCount: number | null = null;

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(keyJson)),
        projectId: 'gen-lang-client-0195318958',
      });
    }
    const db = admin.firestore();
    const snap = await db.collection('recipes').count().get();
    recipeCount = snap.data().count;
    firebaseStatus = 'ok';
  } catch (e: any) {
    error = `${e.code || e.name}: ${e.message}`;
    firebaseStatus = 'error';
  }

  res.status(200).json({
    keyLen,
    hasNewlines,
    hasEscaped,
    startsWith,
    firebaseStatus,
    error,
    recipeCount,
  });
}
