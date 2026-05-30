     1|import { VercelRequest, VercelResponse } from '@vercel/node';
     2|import {
     3|  applyCors,
     4|  endPreflight,
     5|  extractPdfFilename,
     6|  isSafePdfFilename,
     7|  isValidStripeSessionId,
     8|  requireMethod,
     9|} from './_security';
    10|
    11|const DEFAULT_PDF_BUCKET = 'pdfs';
    12|const STORAGE_BUCKET_PATTERN = /^[a-zA-Z0-9._-]{1,100}$/;
    13|
    14|type SupabaseObjectRequest = {
    15|  url: string;
    16|  headers: Record<string, string>;
    17|  mode: 'private' | 'public-fallback';
    18|};
    19|
    20|function getSupabaseBaseUrl() {
    21|  const rawUrl = process.env.SUPABASE_URL?.trim();
    22|  if (!rawUrl) return null;
    23|
    24|  try {
    25|    const url = new URL(rawUrl);
    26|    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    27|      return null;
    28|    }
    29|
    30|    url.pathname = '';
    31|    url.search = '';
    32|    url.hash = '';
    33|    return url.toString().replace(/\/+$/, '');
    34|  } catch {
    35|    return null;
    36|  }
    37|}
    38|
    39|function getSupabasePdfBucket() {
    40|  const bucket = (process.env.SUPABASE_PDF_BUCKET || DEFAULT_PDF_BUCKET).trim();
    41|  return STORAGE_BUCKET_PATTERN.test(bucket) ? bucket : null;
    42|}
    43|
    44|function getSupabaseObjectRequest(
    45|  supabaseUrl: string,
    46|  bucket: string,
    47|  filename: string
    48|): SupabaseObjectRequest | null {
    49|  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    50|  const objectPath = `${encodeURIComponent(bucket)}/${encodeURIComponent(filename)}`;
    51|
    52|  if (serviceKey) {
    53|    return {
    54|      url: `${supabaseUrl}/storage/v1/object/authenticated/${objectPath}`,
    55|      headers: {
    56|        Authorization: `Bearer ${serviceKey}`,
    57|        apikey: serviceKey,
    58|      },
    59|      mode: 'private',
    60|    };
    61|  }
    62|
    63|  if (process.env.SUPABASE_ALLOW_PUBLIC_PDF_FALLBACK === 'true') {
    64|    return {
    65|      url: `${supabaseUrl}/storage/v1/object/public/${objectPath}`,
    66|      headers: {},
    67|      mode: 'public-fallback',
    68|    };
    69|  }
    70|
    71|  return null;
    72|}
    73|
    74|/**
    75| * Secure PDF proxy — validates Stripe session, streams PDF from Supabase.
    76| * Browser never sees the Supabase Storage URL.
    77| */
    78|export default async function handler(req: VercelRequest, res: VercelResponse) {
    79|  applyCors(req, res, ['GET']);
    80|
    81|  
    82|  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    83|
    84|  const sessionId = req.query.session_id as string;
    85|  const product = req.query.product as string;
    86|
    87|  if (!sessionId) {
    88|    return res.status(400).json({ error: 'session_id is required' });
    89|  }
    90|
    91|  if (!isValidStripeSessionId(sessionId)) {
    92|    return res.status(400).json({ error: 'Invalid session_id' });
    93|  }
    94|
    95|  if (product && !isSafePdfFilename(product)) {
    96|    return res.status(400).json({ error: 'Invalid product' });
    97|  }
    98|
    99|  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
   100|  if (!stripeSecretKey) {
   101|    return res.status(500).json({ error: 'Stripe not configured' });
   102|  }
   103|
   104|  try {
   105|    // 1. Stripe-Session validieren — muss bezahlt sein
   106|    const Stripe = (await import('stripe')).default;
   107|    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });
   108|    const session = await stripe.checkout.sessions.retrieve(sessionId);
   109|
   110|    if ((session as any).payment_status !== 'paid') {
   111|      return res.status(403).json({ error: 'Payment not completed' });
   112|    }
   113|
   114|    const EXPIRY = 7 * 24 * 60 * 60; // 7 Tage
   115|    const sessionCreated = typeof (session as any).created === 'number' ? (session as any).created : 0;
   116|    if (!sessionCreated || Date.now() / 1000 - sessionCreated > EXPIRY) {
   117|      return res.status(403).json({ error: 'Download window expired' });
   118|    }
   119|
   120|    // 2. Dateiname aus Metadaten extrahieren
   121|    const contentUrls = ((session as any).metadata?.contentUrls || '') as string;
   122|    const filenames = contentUrls
   123|      .split(',')
   124|      .map((f: string) => f.trim())
   125|      .filter(Boolean)
   126|      .map((f: string) => extractPdfFilename(f))
   127|      .filter(Boolean) as string[];
   128|
   129|    if (filenames.length === 0) {
   130|      return res.status(404).json({ error: 'No products found for this session' });
   131|    }
   132|
   133|    // 3. Gewünschte Datei auswählen (oder erste)
   134|    const filename = product && isSafePdfFilename(product) ? product : filenames[0];
   135|
   136|    // Sicherheitscheck: Darf der User diese Datei runterladen?
   137|    if (!filenames.includes(filename)) {
   138|      return res.status(403).json({ error: 'Product not in your purchase' });
   139|    }
   140|
   141|    // 4. PDF aus Supabase Storage abholen. Default is private-bucket access.
   142|    const supabaseUrl = getSupabaseBaseUrl();
   143|    const bucket = getSupabasePdfBucket();
   144|    if (!supabaseUrl || !bucket) {
   145|      console.error('Supabase download storage environment is invalid or missing');
   146|      return res.status(500).json({ error: 'Download storage not configured' });
   147|    }
   148|
   149|    const storageRequest = getSupabaseObjectRequest(supabaseUrl, bucket, filename);
   150|
   151|    if (!storageRequest) {
   152|      console.error('Supabase private storage is not configured');
   153|      return res.status(500).json({ error: 'Download storage not configured' });
   154|    }
   155|
   156|    const pdfRes = await fetch(storageRequest.url, {
   157|      headers: storageRequest.headers,
   158|    });
   159|    if (!pdfRes.ok) {
   160|      console.error(`Supabase ${storageRequest.mode} download failed with status ${pdfRes.status}`);
   161|      return res.status(502).json({ error: 'Failed to load PDF' });
   162|    }
   163|
   164|    // 5. Als Download ausliefern — Browser sieht nur /api/download?session_id=xxx
   165|    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
   166|
   167|    res.setHeader('Content-Type', 'application/pdf');
   168|    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
   169|    res.setHeader('Content-Length', pdfBuffer.length);
   170|    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
   171|    res.status(200).send(pdfBuffer);
   172|
   173|  } catch (error: any) {
   174|    console.error('Download error:', error?.message || error);
   175|    return res.status(404).json({ error: 'Session not found or invalid' });
   176|  }
   177|}
   178|