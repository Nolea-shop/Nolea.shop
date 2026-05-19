import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const env = {
    SUPABASE_URL_set: !!process.env.SUPABASE_URL,
    SUPABASE_URL_len: (process.env.SUPABASE_URL || '').length,
    SUPABASE_SECRET_KEY_set: !!process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SECRET_KEY_len: (process.env.SUPABASE_SECRET_KEY || '').length,
    SUPABASE_ANON_KEY_set: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY_len: (process.env.SUPABASE_ANON_KEY || '').length,
    NEXT_PUBLIC_SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL_len: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').length,
  };
  res.status(200).json(env);
}
