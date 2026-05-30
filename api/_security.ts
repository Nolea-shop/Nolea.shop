import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_ALLOWED_ORIGINS = ['https://www.nolea.shop', 'https://nolea.shop'];
const DEV_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const PDF_FILENAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,180}\.pdf$/;
const STRIPE_SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9_]{8,255}$/;

export function getAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const origins = configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;

  if (process.env.NODE_ENV !== 'production') {
    return [...origins, ...DEV_ALLOWED_ORIGINS];
  }

  return origins;
}

export function setSecurityHeaders(res: VercelResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
}

export function applyCors(
  req: VercelRequest,
  res: VercelResponse,
  methods: string[],
  allowedHeaders = 'Content-Type, Authorization'
) {
  setSecurityHeaders(res);

  const origin = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
  if (origin && getAllowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
  res.setHeader('Access-Control-Max-Age', '600');
}

export function endPreflight(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'OPTIONS') return false;
  res.status(204).end();
  return true;
}

export function requireMethod(req: VercelRequest, res: VercelResponse, method: string) {
  if (req.method === method) return true;
  res.setHeader('Allow', `${method}, OPTIONS`);
  res.status(405).json({ error: 'Method not allowed' });
  return false;
}

export function rejectLargeRequest(req: VercelRequest, res: VercelResponse, maxBytes: number) {
  const rawLength = req.headers['content-length'];
  const length = Array.isArray(rawLength) ? rawLength[0] : rawLength;
  if (!length) return false;

  const bytes = Number.parseInt(length, 10);
  if (Number.isFinite(bytes) && bytes > maxBytes) {
    res.status(413).json({ error: 'Request body too large' });
    return true;
  }

  return false;
}

export function getBearerToken(req: VercelRequest) {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
}

export function isValidStripeSessionId(value: unknown): value is string {
  return typeof value === 'string' && STRIPE_SESSION_ID_PATTERN.test(value);
}

export function isSafePdfFilename(value: unknown): value is string {
  return typeof value === 'string' && PDF_FILENAME_PATTERN.test(value) && !value.includes('..');
}

export function extractPdfFilename(input: string): string | null {
  try {
    const cleaned = decodeURIComponent(input.split('?')[0]).split('/').pop() || '';
    return isSafePdfFilename(cleaned) ? cleaned : null;
  } catch {
    return null;
  }
}

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
