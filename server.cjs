require('dotenv').config()

const express = require('express')
const cors = require('cors')
const createWallet = require('./api/create_wallet.cjs')
const createCheckoutSession = require('./api/create_checkout_session.cjs')
const webhook = require('./api/webhook.cjs')
const testTransaction = require('./api/test_transaction.cjs')

const app = express() // ✅ App is initialized first

app.use(cors())

// Stripe webhook needs raw body first
app.post('/api/webhook', express.raw({ type: 'application/json' }), webhook)

// All other API routes use JSON parser
app.use(express.json())

// ✅ Now we register routes
app.post('/api/create_wallet', createWallet)
app.post('/api/create_checkout_session', createCheckoutSession)
app.post('/api/test_transaction', testTransaction)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
