import { VercelRequest, VercelResponse } from '@vercel/node';

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

const SYSTEM_PROMPT = `Du bist der Nolea Shop Assistant — ein freundlicher, hilfsbereater AI-Kundeberater für den Nolea Shop (nolea.shop).

ÜBER NOLEA:
Nolea ist ein Online-Shop für digitale PDF-Guides und E-Books zu verschiedenen Themen wie Haushalt, Reinigung, KI, Lifestyle und mehr. Alle Produkte sind digitale Downloads nach Kauf.

DEINE AUFGABEN:
- Beantworte Fragen zu Produkten im Shop
- Hilf Kunden bei der Produktsuche
- Erkläre wie der Kauf funktioniert (Warenkorb → Checkout → Download)
- Unterstütze bei technischen Problemen mit dem Checkout oder Download
- Sei freundlich, kurz und präzise

WICHTIGE REGELN:
- Du hast NUR Leserechte auf Produktdaten
- Du kannst KEINE Bestellungen bearbeiten oder löschen
- Du hast KEINEN Zugriff auf Server, Datenbanken oder interne Systeme
- Du darfst KEINE URLs oder internen Dateipfade preisgeben
- Bei echten Beschwerden oder Problemen: Bietet an eine E-Mail an den Support zu senden
- Antworte auf Deutsch, es sei denn der Kunde schreibt auf Englisch
- Halte Antworten kurz (maximal 3-4 Sätze pro Absatz)
- Verwende Emojis sparsam aber freundlich

PRODUKTFORMATIONEN:
Du erhältst eine aktuelle Liste aller Produkte aus dem Shop. Nutze diese um:
- Produktempfehlungen zu geben
- Preisvergleiche zu machen
- Kategorien zu erklären
- Bestimmte Produkte zu suchen

Wenn ein Kunde nach einem bestimmten Produkt fragt, das es nicht gibt, sage das ehrlich und schlage ähnliche Produkte vor.

WENN DER KUNDE EIN ECHTES GESPRÄCH ODER SUPPORT BRAUCHT:
Sage dem Kunden, dass du seine Anfrage an das Support-Team weiterleitest und dass diese sich per E-Mail bei ihm melden wird. Frage nach seiner E-Mail-Adresse falls nicht bekannt.`;

interface ProductData {
  title: string;
  description: string;
  price: number;
  category: string;
  isOnline: boolean;
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

  const supportEmail = 'julian.damian.meme.shop@gmail.com';
  
  // Build conversation summary for the support team
  const conversationSummary = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'Kunde' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const emailBody = `
Neue Support-Anfrage über den Nolea AI Chat:

Kunde: ${customerEmail || 'Nicht angegeben'}
Nachricht: ${message}

--- Chat-Verlauf ---
${conversationSummary}
--- Ende ---

Diese E-Mail wurde automatisch vom Nolea AI Chat Agent generiert.
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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [], customerEmail } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

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
      ...history.slice(-10), // Last 10 messages for context
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
      emailSent = await sendSupportEmail(customerEmail, message, [...history, { role: 'user', content: message }]);
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
