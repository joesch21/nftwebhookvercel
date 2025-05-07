// server.js
import express from 'express';
import { buffer } from 'micro';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10', // lock to a specific API version
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe needs the raw body to verify signature
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Webhook received:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const wallet = session.metadata?.wallet || '❓ No wallet metadata';
    console.log(`💰 Payment confirmed for session: ${session.id}`);
    console.log(`👛 Wallet: ${wallet}`);
    // TODO: Call your minting logic here
  }

  res.status(200).json({ received: true });
});

// Basic route to test server up
app.get('/', (_, res) => {
  res.send('✅ Stripe NFT Webhook Server is running');
});

// Use Render's assigned port or default to 8080 locally
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
