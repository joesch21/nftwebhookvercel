require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser') // optional if unused elsewhere
const cors = require('cors')

const createWallet = require('./api/create_wallet.cjs')
const createCheckoutSession = require('./api/create_checkout_session.cjs')
const webhook = require('./api/webhook.cjs')

const app = express()

app.use(cors())

// ✅ Raw parser FIRST — required for Stripe webhook signature verification
app.post('/api/webhook', express.raw({ type: 'application/json' }), webhook)

// ✅ THEN JSON parser for all other routes
app.use(express.json())

app.post('/api/create_wallet', createWallet)
app.post('/api/create_checkout_session', createCheckoutSession)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
