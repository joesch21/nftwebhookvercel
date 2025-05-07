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
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('🛰️ Webhook route hit');
  console.log('Headers:', req.headers);
  console.log('Raw body:', req.body.toString());

  res.status(200).send('ok');
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
