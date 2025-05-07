// server.js
import express from 'express';
import { buffer } from 'micro';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// 🧪 Basic test route to confirm server is up
app.get('/', (_, res) => {
  res.send('✅ Stripe Webhook Server is running on Render');
});

// 🧠 Webhook route (Stripe sends POST requests here)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('🛰️ Webhook hit');

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.warn('❌ Missing Stripe signature header');
    return res.status(400).send('Missing signature');
  }

  try {
    const rawBody = req.body.toString('utf8');
    console.log('📦 Raw body:', rawBody);
    console.log('🔏 Signature:', sig);

    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Stripe event received:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const wallet = session.metadata?.wallet || '❓ No wallet metadata';
      console.log(`💰 Session ID: ${session.id}`);
      console.log(`👛 Wallet: ${wallet}`);
      // TODO: Mint NFT here
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Signature verification or parsing failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
