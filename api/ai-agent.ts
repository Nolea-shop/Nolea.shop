import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  endPreflight,
  isValidEmail,
  rejectLargeRequest,
  requireMethod,
} from './_security';

/**
 * Nolea AI Chat Agent
 * 
 * Server-side proxy that:
 * 1. Fetches product data from Firestore (read-only, safe fields only)
 * 2. Sends user message + context to OpenRouter (free model)
 * 3. Returns AI response
 * 4. Can trigger support email via Resend if needed
 * 
 * Security: No API keys exposed to frontend, no Firestore edit access,
 * no contentUrl/imageUrl sent to AI, email only to one address.
 */

const SYSTEM_PROMPT = `You are the Nolea Shop Assistant — a friendly, helpful AI customer support agent for the Nolea Shop (nolea.shop).

ABOUT NOLEA:
Nolea is an online shop for digital PDF guides and e-books on various topics like home, cleaning, AI, lifestyle and more. All products are digital downloads after purchase.

YOUR TASKS:
- Answer questions about products in the shop
- Help customers find the right product
- Explain how the checkout process works (Cart → Checkout → Download)
- Help with technical issues with checkout or downloads
- Be friendly, concise and precise

IMPORTANT RULES:
- You ONLY have read-only access to product data
- You CANNOT process or cancel orders
- You have NO access to servers, databases or internal systems
- You must NOT share any URLs or internal file paths
- For real complaints or issues: Offer to send an email to the support team
- Keep responses short (max 3-4 sentences per paragraph)
- Use emojis sparingly but friendly

PRODUCT INFORMATION:
You receive a current list of all products in the shop. Use this to:
- Give product recommendations
- Compare prices
- Explain categories
- Search for specific products

If a customer asks about a product that doesn't exist, be honest and suggest similar products.

WHEN A CUSTOMER NEEDS REAL SUPPORT OR HAS A ISSUE:
Tell the customer you'll forward their request to the support team and they'll receive an email shortly. Ask for their email address if not known.`;

interface ProductData {
  title: string;
  description: string;
  price: number;
  category: string;
  isOnline: boolean;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function normalizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-10)
    .filter((entry): entry is { role: string; content: string } => {
      const candidate = entry as { role?: unknown; content?: unknown } | null;
      return (
        !!candidate &&
        typeof candidate === 'object' &&
        typeof candidate.role === 'string' &&
        typeof candidate.content === 'string' &&
        (candidate.role === 'user' || candidate.role === 'assistant')
      );
    })
    .map((entry) => ({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: entry.content.slice(0, 1000),
    }));
}

async function getAccessToken(): Promise<string | null> {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64;
  
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY_B64 not set');
    return null;
  }

  try {
    const sa = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf8'));
    
    // Build JWT
    const b64 = (d: Buffer | string) => {
      const data = typeof d === 'string' ? Buffer.from(d) : d;
      return data.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };
    
    const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = b64(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }));

    // Sign with private key
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(sa.private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = `${header}.${payload}.${signature}`;
    
    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    if (!response.ok) {
      console.error('Token exchange failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

async function fetchProducts(): Promise<ProductData[]> {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    console.error('Could not get access token');
    return [];
  }

  const projectId = 'gen-lang-client-0195318958';

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/recipes?pageSize=100`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      console.error('Firestore fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data.documents) return [];
    
    return data.documents
      .filter((doc: any) => doc.fields?.isOnline?.booleanValue === true)
      .map((doc: any) => ({
        title: doc.fields?.title?.stringValue || '',
        description: doc.fields?.description?.stringValue || '',
        price: doc.fields?.price?.integerValue ? parseInt(doc.fields.price.integerValue) : 0,
        category: doc.fields?.category?.stringValue || '',
        isOnline: true,
      }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function sendSupportEmail(
  customerEmail: string,
  message: string,
  conversationHistory: { role: string; content: string }[]
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  
  if (!resendKey) {
    console.error('RESEND_API_KEY not set');
    return false;
  }

  const supportEmail = 'noleashop@gmail.com';
  
  // Build conversation summary for the support team
  const conversationSummary = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'Kunde' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const emailBody = `
New support request via Nolea AI Chat:

Customer: ${customerEmail || 'Not provided'}
Message: ${message}

--- Chat History ---
${conversationSummary}
--- End ---

This email was automatically generated by the Nolea AI Chat Agent.
`.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Nolea/1.0',
      },
      body: JSON.stringify({
        from: 'Nolea Support <noreply@nolea.shop>',
        to: supportEmail,
        subject: `[Nolea Support] Neue Chat-Anfrage von ${customerEmail || 'Unbekannt'}`,
        text: emailBody,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend email failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending support email:', error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ['POST']);

  if (endPreflight(req, res)) return;
  if (!requireMethod(req, res, 'POST')) return;
  if (rejectLargeRequest(req, res, 32 * 1024)) return;

  const { message, history = [], customerEmail } = req.body;

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (customerEmail && !isValidEmail(customerEmail)) {
    return res.status(400).json({ error: 'Invalid customer email' });
  }

  const safeHistory = normalizeHistory(history);

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    // 1. Fetch products from Firestore (read-only)
    const products = await fetchProducts();
    
    // 2. Build product context (safe fields only - no image/content URLs)
    const productContext = products.length > 0
      ? `\n\nAKTUELLE PRODUKTE IM SHOP:\n${products.map((p, i) => 
          `${i + 1}. ${p.title} — ${(p.price / 100).toFixed(2)}€ — Kategorie: ${p.category}\n   ${p.description.substring(0, 150)}${p.description.length > 150 ? '...' : ''}`
        ).join('\n\n')}`
      : '\n\nKeine Produkte derzeit im Shop verfügbar.';

    // 3. Build messages for OpenRouter
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + productContext },
      ...safeHistory,
      { role: 'user', content: message },
    ];

    // 4. Call OpenRouter
    const model = 'nvidia/nemotron-3-nano-30b-a3b:free';
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nolea.shop',
        'X-Title': 'Nolea Shop Assistant',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Entschuldige, ich konnte keine Antwort generieren.';

    // 5. Check if support email should be sent
    const shouldSendEmail = 
      aiResponse.toLowerCase().includes('weiterleiten') ||
      aiResponse.toLowerCase().includes('support') ||
      aiResponse.toLowerCase().includes('problem') ||
      message.toLowerCase().includes('hilfe') ||
      message.toLowerCase().includes('beschwerde') ||
      message.toLowerCase().includes('fehler') ||
      message.toLowerCase().includes('nicht funktioniert');

    let emailSent = false;
    if (shouldSendEmail && customerEmail) {
      emailSent = await sendSupportEmail(customerEmail, message, [...safeHistory, { role: 'user', content: message }]);
    }

    return res.status(200).json({
      response: aiResponse,
      emailSent,
    });

  } catch (error: any) {
    console.error('AI Agent error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
