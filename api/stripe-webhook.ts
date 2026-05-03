import { VercelRequest, VercelResponse } from '@vercel/node';

// Disable body parsing for webhook - we need raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!stripeSecretKey || !webhookSecret) {
    return res.status(400).send('Webhook missing configuration');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  // Get raw body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const rawBody = Buffer.concat(chunks);

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' as any });

    const event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const customerEmail = session.customer_details?.email;
      const recipeTitles = session.metadata?.recipeTitles || 'deine Rezepte';

      console.log('Payment successful for session:', session.id);

      // Send delivery email via Resend
      if (resendApiKey && customerEmail) {
        const APP_URL = process.env.APP_URL || 'https://www.nolea.shop';

        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Nolea Studio <onboarding@resend.dev>',
              to: customerEmail,
              subject: 'Vielen Dank! Deine Nolea Produkte sind da',
              html: `
                <div style="font-family: serif; color: #2D2A26; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #E5E2D9; border-radius: 20px;">
                  <h1 style="font-style: italic; text-align: center;">Vielen Dank für dein Vertrauen!</h1>
                  <p>Hallo,</p>
                  <p>vielen Dank für deinen Kauf bei Nolea. Deine Guides sind nun zum Download bereit:</p>
                  <p><strong>${recipeTitles}</strong></p>
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${APP_URL}/success" style="background-color: #8A9A5B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; font-family: sans-serif; text-transform: uppercase; font-size: 12px; letter-spacing: 2px;">Zum Download-Bereich</a>
                  </div>
                  <p style="font-size: 12px; color: #6B6658;">Der Download-Link ist 48 Stunden gültig. Falls du Fragen hast, antworte einfach auf diese Email.</p>
                  <hr style="border: 0; border-top: 1px solid #F2EFE9; margin: 30px 0;" />
                  <p style="font-style: italic; font-size: 14px; text-align: center;">Dein Nolea Team</p>
                </div>
              `
            })
          });

          if (emailResponse.ok) {
            console.log('Automated delivery email sent to:', customerEmail);
          } else {
            const err = await emailResponse.json();
            console.error('Failed to send delivery email:', err);
          }
        } catch (emailError) {
          console.error('Failed to send delivery email:', emailError);
        }
      } else {
        console.warn('Skipping email delivery: Resend not configured or customer email missing');
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
