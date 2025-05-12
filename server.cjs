// server.cjs
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const createWallet = require('./api/create_wallet.cjs')
const createCheckoutSession = require('./api/create_checkout_session.cjs')
const webhook = require('./api/webhook.cjs')

const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use('/api/webhook', bodyParser.raw({ type: 'application/json' })) // raw body for Stripe
app.post('/api/create_wallet', createWallet)
app.post('/api/create_checkout_session', createCheckoutSession)
app.post('/api/webhook', webhook)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
