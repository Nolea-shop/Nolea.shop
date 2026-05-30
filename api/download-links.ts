     1|import { VercelRequest, VercelResponse } from '@vercel/node';
     2|import {
     3|  applyCors,
     4|  endPreflight,
     5|  extractPdfFilename,
     6|  isValidStripeSessionId,
     7|  requireMethod,
     8|} from './_security';
     9|
    10|/**
    11| * Returns download links for a given Stripe session ID.
    12| * Only accessible after successful payment (validated against Stripe).
    13| * Links expire after 7 days.
    14| */
    15|export default async function handler(req: VercelRequest, res: VercelResponse) {
    16|  applyCors(req, res, ['GET']);
    17|
    18|  
    19|  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    20|
    21|  const sessionId = req.query.session_id as string;
    22|  if (!sessionId) return res.status(400).json({ error: 'session_id is required' });
    23|  if (!isValidStripeSessionId(sessionId)) return res.status(400).json({ error: 'Invalid session_id' });
    24|
    25|  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    26|  if (!stripeSecretKey) return res.status(500).json({ error: 'Stripe not configured' });
    27|
    28|  try {
    29|    const Stripe = (await import('stripe')).default;
    30|    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });
    31|
    32|    const session = await stripe.checkout.sessions.retrieve(sessionId);
    33|    if ((session as any).payment_status !== 'paid') {
    34|      return res.status(403).json({ error: 'Payment not completed' });
    35|    }
    36|
    37|    const EXPIRY = 7 * 24 * 60 * 60; // 7 Tage
    38|    const sessionCreated = typeof (session as any).created === 'number' ? (session as any).created : 0;
    39|    if (!sessionCreated || Date.now() / 1000 - sessionCreated > EXPIRY) {
    40|      return res.status(403).json({ error: 'Download window expired' });
    41|    }
    42|
    43|    const contentUrls = (session as any).metadata?.contentUrls || '';
    44|    const filenames = contentUrls.split(',').map((f: string) => f.trim()).filter(Boolean);
    45|
    46|    const downloadLinks: { url: string; title: string; expiresAt: string }[] = [];
    47|
    48|    for (const raw of filenames) {
    49|      const fn = extractPdfFilename(raw);
    50|      if (!fn) continue;
    51|      downloadLinks.push({
    52|        title: fn.replace('.pdf', ''),
    53|        url: `/api/download?session_id=${encodeURIComponent(sessionId)}&product=${encodeURIComponent(fn)}`,
    54|        expiresAt: new Date(Date.now() + EXPIRY * 1000).toISOString(),
    55|      });
    56|    }
    57|
    58|    return res.status(200).json({
    59|      success: true,
    60|      orderId: sessionId,
    61|      downloadLinks,
    62|    });
    63|  } catch (error: any) {
    64|    console.error('Download link lookup failed:', error?.message || error);
    65|    return res.status(404).json({ error: 'Session not found' });
    66|  }
    67|}
    68|