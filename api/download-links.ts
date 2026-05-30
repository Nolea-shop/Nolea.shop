import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  endPreflight,
  extractPdfFilename,
  isValidStripeSessionId,
  requireMethod,
} from './_security';

/**
 * Returns download links for a given Stripe session ID.
 * Only accessible after successful payment (validated against Stripe).
 * Links expire after 7 days.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ['GET']);

  if (endPreflight(req, res)) return;
  if (!requireMethod(req, res, 'GET')) return;

  const sessionId = req.query.session_id as string;
  if (!sessionId) return res.status(400).json({ error: 'session_id is required' });
  if (!isValidStripeSessionId(sessionId)) return res.status(400).json({ error: 'Invalid session_id' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if ((session as any).payment_status !== 'paid') {
      return res.status(403).json({ error: 'Payment not completed' });
    }

    const EXPIRY = 7 * 24 * 60 * 60; // 7 Tage
    const sessionCreated = typeof (session as any).created === 'number' ? (session as any).created : 0;
    if (!sessionCreated || Date.now() / 1000 - sessionCreated > EXPIRY) {
      return res.status(403).json({ error: 'Download window expired' });
    }

    const contentUrls = (session as any).metadata?.contentUrls || '';
    const filenames = contentUrls.split(',').map((f: string) => f.trim()).filter(Boolean);

    const downloadLinks: { url: string; title: string; expiresAt: string }[] = [];

    for (const raw of filenames) {
      const fn = extractPdfFilename(raw);
      if (!fn) continue;
      downloadLinks.push({
        title: fn.replace('.pdf', ''),
        url: `/api/download?session_id=${encodeURIComponent(sessionId)}&product=${encodeURIComponent(fn)}`,
        expiresAt: new Date(Date.now() + EXPIRY * 1000).toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      orderId: sessionId,
      downloadLinks,
    });
  } catch (error: any) {
    console.error('Download link lookup failed:', error?.message || error);
    return res.status(404).json({ error: 'Session not found' });
  }
}
