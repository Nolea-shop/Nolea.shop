import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Secure PDF proxy — validates Stripe session, streams PDF from Supabase.
 * Browser never sees the Supabase Storage URL.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionId = req.query.session_id as string;
  const product = req.query.product as string;

  if (!sessionId) {
    return res.status(400).json({ error: 'session_id is required' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  try {
    // 1. Stripe-Session validieren — muss bezahlt sein
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if ((session as any).payment_status !== 'paid') {
      return res.status(403).json({ error: 'Payment not completed' });
    }

    // 2. Dateiname aus Metadaten extrahieren
    const contentUrls = ((session as any).metadata?.contentUrls || '') as string;
    const filenames = contentUrls
      .split(',')
      .map((f: string) => f.trim())
      .filter(Boolean)
      .map((f: string) => {
        const cleaned = decodeURIComponent(f.split('?')[0]).split('/').pop() || '';
        return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : null;
      })
      .filter(Boolean) as string[];

    if (filenames.length === 0) {
      return res.status(404).json({ error: 'No products found for this session' });
    }

    // 3. Gewünschte Datei auswählen (oder erste)
    const filename = product && product.endsWith('.pdf') ? product : filenames[0];

    // Sicherheitscheck: Darf der User diese Datei runterladen?
    if (!filenames.includes(filename)) {
      return res.status(403).json({ error: 'Product not in your purchase' });
    }

    // 4. PDF von Supabase Public Storage abholen
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mmlqyzcowrckhtaaqzvz.supabase.co';
    const bucket = 'pdfs';
    const pdfUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(filename)}`;

    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      console.error(`Supabase error ${pdfRes.status} for ${filename}`);
      return res.status(502).json({ error: 'Failed to load PDF' });
    }

    // 5. Als Download ausliefern — Browser sieht nur /api/download?session_id=xxx
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).send(pdfBuffer);

  } catch (error: any) {
    console.error('Download error:', error?.message || error);
    return res.status(404).json({ error: 'Session not found or invalid' });
  }
}
