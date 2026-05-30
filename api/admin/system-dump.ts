import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, endPreflight, getBearerToken, requireMethod } from '../_security';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ['GET']);
  if (endPreflight(req, res)) return;
  if (!requireMethod(req, res, 'GET')) return;

  // Check authorization
  const bearerToken = getBearerToken(req);
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || bearerToken !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized AI access' });
  }

  return res.status(200).json({
    appName: "Nolea",
    version: "1.2.0",
    features: ["pdf_delivery", "stripe_payments", "resend_emails"],
    schemas: {
      recipe: ["id", "title", "description", "price", "imageUrl", "category", "isOnline"],
      order: ["id", "userId", "total", "status", "items", "createdAt"]
    },
    integrations: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      resend: !!process.env.RESEND_API_KEY,
      webhook: !!process.env.STRIPE_WEBHOOK_SECRET
    }
  });
}
