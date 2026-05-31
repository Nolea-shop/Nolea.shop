import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Pinterest Conversions API — Server-Side Event Tracking
 * 
 * Sends events to Pinterest from the server (more reliable than browser pixel).
 * Browser pixel stays as fallback, this endpoint adds server-side tracking.
 * 
 * POST /api/pinterest-conversions
 * Body: { event: 'checkout'|'addtocart'|'pagevisit', data: {...} }
 */

const PINTEREST_API_URL = 'https://api.pinterest.com/v5/ad_accounts/549770436900/events';

interface PinterestEvent {
  event_name: string;
  event_time: number;
  event_id?: string;
  user_data?: {
    em?: string;
    hashed_email?: string;
  };
  custom_data?: {
    value?: number;
    order_quantity?: number;
    currency?: string;
    order_id?: string;
    line_items?: Array<{
      product_name: string;
      product_id: string;
      product_category: string;
      product_price: number;
      product_quantity: number;
      product_brand: string;
    }>;
    search_query?: string;
    property?: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('PINTEREST_ACCESS_TOKEN not set');
    return res.status(500).json({ error: 'Pinterest API not configured' });
  }

  const { event, data } = req.body;

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ error: 'Event name is required' });
  }

  // Build Pinterest event
  const pinterestEvent: PinterestEvent = {
    event_name: event,
    event_time: Math.floor(Date.now() / 1000),
  };

  // Add event_id if provided
  if (data?.event_id) {
    pinterestEvent.event_id = data.event_id;
  }

  // Add custom_data
  if (data) {
    pinterestEvent.custom_data = {};
    
    if (data.value !== undefined) pinterestEvent.custom_data.value = data.value;
    if (data.order_quantity !== undefined) pinterestEvent.custom_data.order_quantity = data.order_quantity;
    if (data.currency) pinterestEvent.custom_data.currency = data.currency;
    if (data.order_id) pinterestEvent.custom_data.order_id = data.order_id;
    if (data.search_query) pinterestEvent.custom_data.search_query = data.search_query;
    if (data.property) pinterestEvent.custom_data.property = data.property;
    if (data.line_items) pinterestEvent.custom_data.line_items = data.line_items;
  }

  // Send to Pinterest Conversions API
  try {
    const response = await fetch(PINTEREST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [pinterestEvent],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Pinterest API error:', result);
      return res.status(response.status).json({ error: 'Pinterest API error', details: result });
    }

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Pinterest Conversions API error:', error);
    return res.status(500).json({ error: 'Failed to send event to Pinterest' });
  }
}
