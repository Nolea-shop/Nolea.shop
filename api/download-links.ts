import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Returns download links for a given Stripe session ID.
 * Only accessible after successful payment (validated against Stripe).
 * Links expire after 7 days.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionId = req.query.session_id as string;
  if (!sessionId) return res.status(400).json({ error: 'session_id is required' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || '';
  if (!stripeSecretKey) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if ((session as any).payment_status !== 'paid') {
      return res.status(403).json({ error: 'Payment not completed' });
    }

    const contentUrls = (session as any).metadata?.contentUrls || '';
    const filenames = contentUrls.split(',').map((f: string) => f.trim()).filter(Boolean);

    function extractFilename(input: string): string | null {
      const lastSegment = decodeURIComponent(input.split('?')[0]).split('/').pop() || '';
      return lastSegment.toLowerCase().endsWith('.pdf') ? lastSegment : null;
    }

    const EXPIRY = 7 * 24 * 60 * 60; // 7 Tage
    const bucket = 'pdfs';
    const downloadLinks: { url: string; title: string; expiresAt: string }[] = [];

    for (const raw of filenames) {
      const fn = extractFilename(raw);
      if (!fn) continue;
      downloadLinks.push({
        title: fn.replace('.pdf', ''),
        url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(fn)}`,
        expiresAt: new Date(Date.now() + EXPIRY * 1000).toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      orderId: sessionId,
      customerEmail: (session as any).customer_details?.email || '',
      downloadLinks,
    });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(404).json({ error: 'Session not found' });
  }
}
