import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Returns download links for a given Stripe session.
 * Used by the Success page to show PDF download links after purchase.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.session_id as string;
  if (!sessionId) {
    return res.status(400).json({ error: 'session_id is required' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Get contentUrls from checkout metadata
    const contentUrls = (session as any).metadata?.contentUrls || '';
    const filenames = contentUrls.split(',').filter((f: string) => f.trim());

    // Supabase Storage Bucket (öffentlich)
    const base = 'https://mmlqyzcowrckhtaaqzvz.supabase.co';
    const bucket = 'pdfs';

    // Build direct download links to Supabase Storage
    const downloadLinks = filenames.map((filename: string) => ({
      title: filename.trim().replace('.pdf', ''),
      url: `${base}/storage/v1/object/public/${bucket}/${encodeURIComponent(filename.trim())}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }));

    return res.status(200).json({
      success: true,
      orderId: sessionId,
      customerEmail: (session as any).customer_details?.email || '',
      downloadLinks,
    });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return res.status(404).json({ error: 'Session not found' });
  }
}
