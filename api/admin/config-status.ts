import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, endPreflight, requireMethod } from '../_security';
import { requireFirebaseAdminUser } from '../_firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ['GET']);
  if (endPreflight(req, res)) return;
  if (!requireMethod(req, res, 'GET')) return;

  const adminUser = await requireFirebaseAdminUser(req, res);
  if (!adminUser) return;

  const configStatus = {
    services: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      resend: !!process.env.RESEND_API_KEY,
      webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      systemDump: !!process.env.ADMIN_API_KEY,
    },
    checkedBy: adminUser.email,
    checkedAt: new Date().toISOString(),
  };

  return res.status(200).json(configStatus);
}
