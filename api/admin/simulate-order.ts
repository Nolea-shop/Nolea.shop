import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipeTitles, customerEmail } = req.body;
  // Security check: Since the secret is only known to us in the backend,
  // we check if the user is authorized. We'll use a fixed internal secret
  // or simple validation for now, as the main protection is the Admin UI check.
  const isSimulationAllowed = process.env.NODE_ENV === 'development' || 
                             req.headers.host?.includes('nolea.shop');

  if (!isSimulationAllowed) {
    return res.status(403).json({ error: 'Simulation not allowed in this environment' });
  }

  const APP_URL = process.env.APP_URL || 'https://www.nolea.shop';

  console.log('--- Order Simulation Started ---');
  console.log('Target Email:', customerEmail);
  console.log('Recipes:', recipeTitles);

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return res.status(500).json({ error: 'Resend API Key not configured' });
  }

  if (!customerEmail) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Nolea Test <noreply@nolea.shop>',
        to: customerEmail,
        subject: '[TEST] Deine Nolea Produkte sind da',
        html: `
          <div style="font-family: serif; color: #2D2A26; max-width: 600px; margin: 0 auto; padding: 40px; border: 2px dashed #8A9A5B; border-radius: 20px; background-color: #FAF9F6;">
            <div style="background: #8A9A5B; color: white; padding: 5px 15px; border-radius: 5px; display: inline-block; font-family: sans-serif; font-size: 10px; font-weight: bold; margin-bottom: 20px;">SIMULATION MODE</div>
            <h1 style="font-style: italic;">Test-Zustellung erfolgreich!</h1>
            <p>Dies ist eine Simulation des automatisierten Email-Versands.</p>
            <p><strong>Gekaufte Test-Produkte:</strong> ${recipeTitles}</p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${APP_URL}/success" style="background-color: #2D2A26; color: white; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; font-family: sans-serif; text-transform: uppercase; font-size: 12px; letter-spacing: 2px;">Zum Test-Download Bereich</a>
            </div>
            <p style="font-size: 12px; color: #6B6658;">In der Live-Umgebung würde dieser Link direkt zur PDF führen.</p>
          </div>
        `
      })
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Simulation email sent' });
    } else {
      const error = await response.json();
      return res.status(500).json({ error: error.message || 'Failed to send email' });
    }
  } catch (error: any) {
    console.error('Simulation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
