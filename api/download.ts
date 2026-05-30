import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  endPreflight,
  extractPdfFilename,
  isSafePdfFilename,
  isValidStripeSessionId,
  requireMethod,
} from './_security';

const DEFAULT_PDF_BUCKET = 'pdfs';
const STORAGE_BUCKET_PATTERN = /^[a-zA-Z0-9._-]{1,100}$/;

type SupabaseObjectRequest = {
  url: string;
  headers: Record<string, string>;
  mode: 'private' | 'public-fallback';
};

function getSupabaseBaseUrl() {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return null;
    }

    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function getSupabasePdfBucket() {
  const bucket = (process.env.SUPABASE_PDF_BUCKET || DEFAULT_PDF_BUCKET).trim();
  return STORAGE_BUCKET_PATTERN.test(bucket) ? bucket : null;
}

function getSupabaseObjectRequest(
  supabaseUrl: string,
  bucket: string,
  filename: string
): SupabaseObjectRequest | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const objectPath = `${encodeURIComponent(bucket)}/${encodeURIComponent(filename)}`;

  if (serviceKey) {
    return {
      url: `${supabaseUrl}/storage/v1/object/authenticated/${objectPath}`,
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      mode: 'private',
    };
  }

  if (process.env.SUPABASE_ALLOW_PUBLIC_PDF_FALLBACK === 'true') {
    return {
      url: `${supabaseUrl}/storage/v1/object/public/${objectPath}`,
      headers: {},
      mode: 'public-fallback',
    };
  }

  return null;
}

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

    // 4. PDF aus Supabase Storage abholen. Default is private-bucket access.
    const supabaseUrl = getSupabaseBaseUrl();
    const bucket = getSupabasePdfBucket();
    if (!supabaseUrl || !bucket) {
      console.error('Supabase download storage environment is invalid or missing');
      return res.status(500).json({ error: 'Download storage not configured' });
    }

    const storageRequest = getSupabaseObjectRequest(supabaseUrl, bucket, filename);

    if (!storageRequest) {
      console.error('Supabase private storage is not configured');
      return res.status(500).json({ error: 'Download storage not configured' });
    }

    const pdfRes = await fetch(storageRequest.url, {
      headers: storageRequest.headers,
    });
    if (!pdfRes.ok) {
      console.error(`Supabase ${storageRequest.mode} download failed with status ${pdfRes.status}`);
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
