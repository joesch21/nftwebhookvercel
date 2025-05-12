// File: server.cjs
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const createWallet = require('./api/create_wallet.cjs')
const createCheckoutSession = require('./api/create_checkout_session.cjs')
const webhook = require('./api/webhook.cjs')
const testTransaction = require('./api/test_transaction.cjs')
app.post('/api/test_transaction', testTransaction)

const app = express()

app.use(cors())

// ✅ Stripe webhook must use raw body parser before JSON middleware
app.post('/api/webhook', express.raw({ type: 'application/json' }), webhook)

// ✅ Now JSON parser for all other API routes
app.use(express.json())

// Normal backend routes
app.post('/api/create_wallet', createWallet)
app.post('/api/create_checkout_session', createCheckoutSession)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
