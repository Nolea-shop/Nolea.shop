import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Returns signed download links for a given Stripe session.
 * Uses Supabase signed URLs (7-day expiry) instead of public URLs.
 * Only accessible after successful payment (session_id validated against Stripe).
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
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseUrl = process.env.SUPABASE_URL || '';
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }
  if (!supabaseSecretKey || !supabaseUrl) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });

    // 1. Validate session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Only serve links for completed/paid sessions
    const paymentStatus = (session as any).payment_status;
    if (paymentStatus !== 'paid') {
      return res.status(403).json({ error: 'Payment not completed' });
    }

    // 2. Get filenames from checkout metadata
    const contentUrls = (session as any).metadata?.contentUrls || '';
    const filenames = contentUrls.split(',').map((f: string) => f.trim()).filter(Boolean);

    function extractFilename(input: string): string | null {
      const noQuery = input.split('?')[0];
      const decoded = decodeURIComponent(noQuery);
      const lastSegment = decoded.split('/').pop() || '';
      if (lastSegment.toLowerCase().endsWith('.pdf')) {
        return lastSegment;
      }
      return null;
    }

    // 3. Generate signed URLs via Supabase Storage API
    const EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 Tage

    async function generateSignedUrl(filename: string): Promise<string> {
      const resp = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/pdfs/${encodeURIComponent(filename)}`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseSecretKey,
            'Authorization': `Bearer ${supabaseSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: EXPIRY_SECONDS }),
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        console.error(`Supabase signed URL error for ${filename}:`, err);
        throw new Error(`Failed to generate signed URL for ${filename}`);
      }
      const data = await resp.json() as { signedURL: string };
      // signedURL is relative: /object/sign/pdfs/... → build full URL
      return `${supabaseUrl}${data.signedURL}`;
    }

    // 4. Build signed download links
    const downloadLinks: { url: string; title: string; expiresAt: string }[] = [];
    for (const raw of filenames) {
      const fn = extractFilename(raw);
      if (!fn) continue;
      try {
        const signedUrl = await generateSignedUrl(fn);
        downloadLinks.push({
          title: fn.replace('.pdf', ''),
          url: signedUrl,
          expiresAt: new Date(Date.now() + EXPIRY_SECONDS * 1000).toISOString(),
        });
      } catch (err: any) {
        console.error(`Error generating signed URL for ${fn}:`, err.message);
      }
    }

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
