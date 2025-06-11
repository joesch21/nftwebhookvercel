require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// ✅ Apply CORS globally to all routes and preflight
app.use(cors({
  origin: 'https://gcc-wallet.vercel.app',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.options('*', cors()); // Handle preflight requests

// ✅ Stripe webhook route — MUST use raw body parser
app.post(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  require('./api/webhook.cjs')
);

// ✅ Parse JSON for all other routes
app.use(express.json());

// ✅ Warn if reCAPTCHA secret is missing
if (!process.env.RECAPTCHA_SECRET) {
  console.warn('⚠️ Missing RECAPTCHA_SECRET in .env');
}

// ✅ Import API route handlers
const createWallet = require('./api/create_wallet.cjs');
const createCheckoutSession = require('./api/create_checkout_session.cjs');
const sendNFT = require('./api/send_nft.cjs');
const checkPurchase = require('./api/check_purchase.cjs');
const checkAvailability = require('./api/available_nfts.cjs');
const walletOverview = require('./api/wallet_overview.cjs');
const condorChat = require('./api/condor_chat.cjs');


// ✅ API Routes
app.get('/api/available_nfts', checkAvailability);
app.post('/api/create_wallet', createWallet);
app.post('/api/create_checkout_session', createCheckoutSession);
app.post('/api/send_nft', sendNFT);
app.post('/api/check_purchase', checkPurchase);
app.post('/api/wallet_overview', walletOverview);
app.post('/api/condor_chat', condorChat);


// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
