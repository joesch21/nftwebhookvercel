// server.cjs
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const createWallet = require('./api/create_wallet.cjs')
const createCheckoutSession = require('./api/create_checkout_session.cjs')
const webhook = require('./api/webhook.cjs')

const app = express()

app.use(cors())

// JSON parser for all routes *except* webhook
app.use(express.json())

// Raw parser only for the Stripe webhook
app.post('/api/webhook', express.raw({ type: 'application/json' }), webhook)

// Other routes
app.post('/api/create_wallet', createWallet)
app.post('/api/create_checkout_session', createCheckoutSession)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
