import { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';

/**
 * Pinterest Conversions API — Server-Side Event Tracking
 * 
 * Full Pinterest API v5 spec:
 * - event_name: add_to_cart, checkout, page_visit (underscore!)
 * - action_source: 'web'
 * - user_data: client_ip_address, client_user_agent required
 * - custom_data: contents array with item_price + quantity
 * - event_id for deduplication with browser pixel
 * 
 * POST /api/pinterest-conversions
 */

const PINTEREST_API_URL = 'https://api.pinterest.com/v5/ad_accounts/549770436900/events';
const AD_ACCOUNT_ID = '549770436900';

function sha256(str: string): string {
  return createHash('sha256').update(str.toLowerCase().trim()).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('PINTEREST_ACCESS_TOKEN not set');
    return res.status(500).json({ error: 'Pinterest API not configured' });
  }

  const { event, data, user_email, event_source_url } = req.body;

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ error: 'Event name is required' });
  }

  // Map event names to Pinterest API format (underscore)
  const eventMap: Record<string, string> = {
    'checkout': 'checkout',
    'addtocart': 'add_to_cart',
    'add_to_cart': 'add_to_cart',
    'pagevisit': 'page_visit',
    'page_visit': 'page_visit',
    'search': 'search',
    'signup': 'signup',
    'lead': 'lead',
    'viewcategory': 'view_category',
    'view_category': 'view_category',
  };

  const eventName = eventMap[event] || event;

  // Build user_data (required)
  const userData: any = {
    client_ip_address: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '0.0.0.0',
    client_user_agent: req.headers['user-agent'] || '',
  };

  // Add hashed email if provided (for better matching)
  if (user_email) {
    userData.em = [sha256(user_email)];
  }

  // Build custom_data
  const customData: any = {};
  if (data) {
    if (data.value !== undefined) customData.value = String(data.value);
    if (data.currency) customData.currency = data.currency;
    if (data.order_id) customData.order_id = data.order_id;
    if (data.search_query) customData.search_string = data.search_query;
    if (data.property) customData.content_category = data.property;

    // Contents array (Pinterest format)
    if (data.line_items && Array.isArray(data.line_items)) {
      customData.contents = data.line_items.map((item: any) => ({
        item_price: String(item.product_price || 0),
        quantity: item.product_quantity || 1,
      }));
      customData.content_ids = data.line_items.map((item: any) => item.product_id);
      customData.num_items = data.line_items.length;
      if (data.line_items[0]) {
        customData.content_name = data.line_items[0].product_name;
        customData.content_brand = data.line_items[0].product_brand || 'Nolea';
      }
    }
  }

  // Build Pinterest event
  const pinterestEvent: any = {
    event_name: eventName,
    action_source: 'web',
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
  };

  // event_id for deduplication (same as browser pixel)
  if (data?.event_id) {
    pinterestEvent.event_id = data.event_id;
  }

  // event_source_url
  if (event_source_url) {
    pinterestEvent.event_source_url = event_source_url;
  }

  // custom_data
  if (Object.keys(customData).length > 0) {
    pinterestEvent.custom_data = customData;
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
        data: [pinterestEvent],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Pinterest API error:', response.status, result);
      return res.status(response.status).json({ error: 'Pinterest API error', details: result });
    }

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Pinterest Conversions API error:', error);
    return res.status(500).json({ error: 'Failed to send event to Pinterest' });
  }
}
