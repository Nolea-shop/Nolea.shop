import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { Resend } from 'resend';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Resend
let resendInstance: Resend | null = null;
function getResend() {
  if (!resendInstance) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.warn('RESEND_API_KEY is not set');
      return null;
    }
    resendInstance = new Resend(key);
  }
  return resendInstance;
}

// Initialize Stripe with lazy loading pattern to avoid crash if key is missing
let stripeInstance: Stripe | null = null;
function getStripe() {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn('STRIPE_SECRET_KEY is not set');
      return null;
    }
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

// Check for required env vars
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// AI Assistant Helper API (for agents like Hermes or Openclaw)
// Accessible via Bearer VITE_ADMIN_API_KEY
app.get('/api/admin/system-dump', (req, res) => {
  const authHeader = req.headers.authorization;
  const adminKey = process.env.VITE_ADMIN_API_KEY;

  if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
    return res.status(401).json({ error: 'Unauthorized AI access' });
  }

  res.json({
    appName: "Nolea",
    version: "1.2.0",
    features: ["pdf_delivery", "stripe_payments", "resend_emails"],
    schemas: {
      recipe: ["id", "title", "description", "price", "imageUrl", "category", "contentUrl"],
      order: ["id", "userId", "total", "status", "items", "createdAt"]
    },
    integrations: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      resend: !!process.env.RESEND_API_KEY,
      webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET
    }
  });
});

// Config check for the UI
app.get('/api/admin/config-status', (req, res) => {
  res.json({
    stripe: !!process.env.STRIPE_SECRET_KEY,
    resend: !!process.env.RESEND_API_KEY,
    webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    adminKey: !!process.env.VITE_ADMIN_API_KEY
  });
});

// Simulation Mode Endpoint
app.post('/api/admin/simulate-order', async (req, res) => {
  const { recipeTitles, customerEmail, adminKey } = req.body;
  const realAdminKey = process.env.VITE_ADMIN_API_KEY;

  if (!realAdminKey || adminKey !== realAdminKey) {
    return res.status(401).json({ error: 'Unauthorized simulation' });
  }

  const resend = getResend();
  console.log('--- Order Simulation Started ---');
  console.log('Target Email:', customerEmail);
  console.log('Recipes:', recipeTitles);

  if (resend && customerEmail) {
    try {
      await resend.emails.send({
        from: 'Nolea Test <noreply@nolea.shop>',
        to: customerEmail,
        subject: '[TEST] Deine Nolea Produkte sind da ✨',
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
      });
      return res.json({ success: true, message: 'Simulation email sent' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(400).json({ error: 'Email service not configured' });
});

// API Routes
app.post('/api/create-checkout-session', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  const { items, userId, userEmail } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            images: [item.imageUrl],
          },
          unit_amount: Math.round(item.price), // price in cents
        },
        quantity: 1,
      })),
      mode: 'payment',
      success_url: `${APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/cart`,
      customer_email: userEmail,
      metadata: {
        userId,
        recipeIds: items.map((i: any) => i.id).join(','),
        recipeTitles: items.map((i: any) => i.title).join(', '),
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook for automated delivery
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  const resend = getResend();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !sig || !webhookSecret) {
    return res.status(400).send('Webhook missing configuration');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email;
    const recipeTitles = session.metadata?.recipeTitles || 'deine Rezepte';

    console.log('Payment successful for session:', session.id);

    // Automatisierter Email-Versand mit Resend
    if (resend && customerEmail) {
      try {
        await resend.emails.send({
          from: 'Nolea Studio <noreply@nolea.shop>',
          to: customerEmail,
          subject: 'Vielen Dank! Deine Nolea Produkte sind da ✨',
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
        });
        console.log('Automated delivery email sent to:', customerEmail);
      } catch (emailError) {
        console.error('Failed to send delivery email:', emailError);
      }
    } else {
      console.warn('Skipping email delivery: Resend not configured or customer email missing');
    }
  }

  res.json({ received: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
