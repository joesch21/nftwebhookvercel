require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// ✅ Middleware setup
app.use(cors()); // Always first

// ✅ Stripe webhook MUST come before JSON body parser
app.post('/api/webhook', express.raw({ type: 'application/json' }), require('./api/webhook.cjs'));

// ✅ JSON body parser for everything else
app.use(express.json());

// ✅ API route imports
const createWallet = require('./api/create_wallet.cjs');
const createCheckoutSession = require('./api/create_checkout_session.cjs');
const sendNFT = require('./api/send_nft.cjs');
const checkPurchase = require('./api/check_purchase.cjs');

// ✅ Normal API routes
app.post('/api/create_wallet', createWallet);
app.post('/api/create_checkout_session', createCheckoutSession);
app.post('/api/send_nft', sendNFT);
app.post('/api/check_purchase', checkPurchase);

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
