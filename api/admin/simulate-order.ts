import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  endPreflight,
  escapeHtml,
  isValidEmail,
  rejectLargeRequest,
  requireMethod,
} from '../_security';
import { requireFirebaseAdminUser } from '../_firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ['POST']);
  if (endPreflight(req, res)) return;
  if (!requireMethod(req, res, 'POST')) return;
  if (rejectLargeRequest(req, res, 16 * 1024)) return;

  const adminUser = await requireFirebaseAdminUser(req, res);
  if (!adminUser) return;

  const { recipeTitles, customerEmail } = req.body;
  const safeRecipeTitles = typeof recipeTitles === 'string' ? recipeTitles.trim().slice(0, 500) : '';

  if (!safeRecipeTitles) {
    return res.status(400).json({ error: 'Recipe title is required' });
  }

  if (!isValidEmail(customerEmail)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const APP_URL = process.env.APP_URL || 'https://www.nolea.shop';

  console.log('Order simulation requested by admin:', adminUser.email);

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return res.status(500).json({ error: 'Resend API Key not configured' });
  }

  try {
    const escapedTitles = escapeHtml(safeRecipeTitles);
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
            <p><strong>Gekaufte Test-Produkte:</strong> ${escapedTitles}</p>
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
      console.error('Simulation email failed:', response.status);
      return res.status(502).json({ error: 'Failed to send email' });
    }
  } catch (error: any) {
    console.error('Simulation error:', error?.message || error);
    return res.status(500).json({ error: 'Simulation failed' });
  }
}
