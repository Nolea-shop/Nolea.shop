import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { getBearerToken } from './_security';

const PROJECT_ID = 'gen-lang-client-0195318958';
const OWNER_ADMIN_EMAIL = 'julianlegendstar@gmail.com';

export interface VerifiedAdminUser {
  uid: string;
  email: string;
}

function parseServiceAccount(rawKey: string) {
  try {
    return JSON.parse(Buffer.from(rawKey, 'base64').toString('utf8'));
  } catch {
    return JSON.parse(rawKey);
  }
}

export function initFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64 || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) return null;

  const serviceAccount = parseServiceAccount(rawKey);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: PROJECT_ID,
  });
}

export async function requireFirebaseAdminUser(req: VercelRequest, res: VercelResponse) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  try {
    const app = initFirebaseAdmin();
    if (!app) {
      res.status(500).json({ error: 'Admin authentication is not configured' });
      return null;
    }

    const decoded = await admin.auth(app).verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();

    let isAdmin = email === OWNER_ADMIN_EMAIL;
    if (!isAdmin) {
      const profile = await admin.firestore(app).collection('users').doc(decoded.uid).get();
      isAdmin = profile.exists && profile.data()?.role === 'admin';
    }

    if (!isAdmin) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }

    return { uid: decoded.uid, email } satisfies VerifiedAdminUser;
  } catch (error) {
    console.error('Admin auth failed:', error instanceof Error ? error.message : error);
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}
