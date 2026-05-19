import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { filename, base64data } = req.body;
  if (!filename || !base64data) return res.status(400).json({ error: 'filename + base64data required' });

  const sbUrl = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

  // Try service role key first, then anon key
  const authKey = serviceKey || anonKey;
  if (!authKey) return res.status(500).json({ error: 'No Supabase key available' });

  const uploadUrl = `${sbUrl}/storage/v1/object/pdfs/${encodeURIComponent(filename)}`;
  const body = Buffer.from(base64data, 'base64');

  try {
    const resp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authKey}`,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
      },
      body,
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
