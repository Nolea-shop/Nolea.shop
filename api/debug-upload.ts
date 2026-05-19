import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { filename, base64data } = req.body;
  if (!filename || !base64data) return res.status(400).json({ error: 'filename + base64data required' });

  const sbUrl = process.env.SUPABASE_URL || '';
  const sbKey = process.env.SUPABASE_SECRET_KEY || '';

  const uploadUrl = `${sbUrl}/storage/v1/object/pdfs/${encodeURIComponent(filename)}`;
  const body = Buffer.from(base64data, 'base64');

  try {
    const resp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sbKey}`,
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
