import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - secure to main domain
  const allowedOrigins = ['https://www.nolea.shop', 'https://nolea.shop'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin && process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authorization
  const authHeader = req.headers.authorization;
  // Use a proper backend secret, NOT VITE_
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
    return res.status(401).json({ error: 'Unauthorized AI access' });
  }

  return res.status(200).json({
    appName: "Nolea",
    version: "1.2.0",
    features: ["pdf_delivery", "stripe_payments", "resend_emails"],
    schemas: {
      recipe: ["id", "title", "description", "price", "imageUrl", "category", "contentUrl", "isOnline"],
      order: ["id", "userId", "total", "status", "items", "createdAt"]
    },
    integrations: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      resend: !!process.env.RESEND_API_KEY,
      webhook: !!process.env.STRIPE_WEBHOOK_SECRET
    }
  });
}
