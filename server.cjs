require('dotenv').config()

const express = require('express')
const cors = require('cors')

const createWallet = require('./api/create_wallet.cjs')
const createCheckoutSession = require('./api/create_checkout_session.cjs')
const webhook = require('./api/webhook.cjs')
const testTransaction = require('./api/test_transaction.cjs')
const sendNFT = require('./api/send_nft.cjs')
const checkPurchase = require('./api/check_purchase.cjs')

const app = express() // ✅ Define app BEFORE using it

app.use(cors())

// ✅ Stripe webhook must be defined first with raw parser
app.post('/api/webhook', express.raw({ type: 'application/json' }), webhook)

// ✅ JSON parser for all other routes
app.use(express.json())

// ✅ API routes
app.post('/api/create_wallet', createWallet)
app.post('/api/create_checkout_session', createCheckoutSession)
app.post('/api/test_transaction', testTransaction)
app.post('/api/send_nft', sendNFT)
app.post('/api/check_purchase', checkPurchase)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
