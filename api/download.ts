import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  endPreflight,
  extractPdfFilename,
  isSafePdfFilename,
  isValidStripeSessionId,
  requireMethod,
} from './_security';

/**
 * Secure PDF proxy — validates Stripe session, streams PDF from Supabase.
 * Browser never sees the Supabase Storage URL.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ['GET']);

  if (endPreflight(req, res)) return;
  if (!requireMethod(req, res, 'GET')) return;

  const sessionId = req.query.session_id as string;
  const product = req.query.product as string;

  if (!sessionId) {
    return res.status(400).json({ error: 'session_id is required' });
  }

  if (!isValidStripeSessionId(sessionId)) {
    return res.status(400).json({ error: 'Invalid session_id' });
  }

  if (product && !isSafePdfFilename(product)) {
    return res.status(400).json({ error: 'Invalid product' });
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

    const EXPIRY = 7 * 24 * 60 * 60; // 7 Tage
    const sessionCreated = typeof (session as any).created === 'number' ? (session as any).created : 0;
    if (!sessionCreated || Date.now() / 1000 - sessionCreated > EXPIRY) {
      return res.status(403).json({ error: 'Download window expired' });
    }

    // 2. Dateiname aus Metadaten extrahieren
    const contentUrls = ((session as any).metadata?.contentUrls || '') as string;
    const filenames = contentUrls
      .split(',')
      .map((f: string) => f.trim())
      .filter(Boolean)
      .map((f: string) => extractPdfFilename(f))
      .filter(Boolean) as string[];

    if (filenames.length === 0) {
      return res.status(404).json({ error: 'No products found for this session' });
    }

    // 3. Gewünschte Datei auswählen (oder erste)
    const filename = product && isSafePdfFilename(product) ? product : filenames[0];

    // Sicherheitscheck: Darf der User diese Datei runterladen?
    if (!filenames.includes(filename)) {
      return res.status(403).json({ error: 'Product not in your purchase' });
    }

    // 4. PDF von Supabase Public Storage abholen
    const supabaseUrl = (process.env.SUPABASE_URL || 'https://mmlqyzcowrckhtaaqzvz.supabase.co').replace(/\/+$/, '');
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
