require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const cors = require('cors')
const { Wallet } = require('ethers')
const admin = require('./firebase-admin')
const { processEvent, getSignalStatus } = require('./agent.cjs')

const app = express()
const PORT = process.env.PORT || 5000

// ✅ Configure CORS to allow frontend requests
app.use(cors({
  origin: 'https://gcc-wallet.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ✅ JSON + Body parsing
app.use(express.json())
app.use(bodyParser.json())

// Optional: Serve frontend static files (if needed)
app.use(express.static(path.join(__dirname, 'public')))


// 🔐 /create-wallet (Firebase + wallet gen)
app.post('/create-wallet', async (req, res) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1]
  if (!idToken) return res.status(401).json({ error: 'Missing auth token' })

  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    console.log('✅ Firebase user verified:', decoded.uid)

    const wallet = Wallet.createRandom()

    res.json({
      address: wallet.address,
      privateKey: wallet.privateKey,
    })

  } catch (err) {
    console.error('❌ Firebase token verification failed:', err)
    res.status(403).json({ error: 'Unauthorized' })
  }
})


// 📡 Stripe Webhook handler
app.post('/webhook', async (req, res) => {
  console.log('📡 Webhook endpoint hit!')
  console.log('🔍 Payload received:', req.body)

  try {
    const result = await processEvent(req.body)
    res.status(200).json(result)
  } catch (err) {
    console.error('❌ Webhook handling failed:', err)
    res.status(500).json({ error: 'Internal Server Error', reason: err.message })
  }
})

// 🧭 Signal poll endpoint
app.get('/signal', (req, res) => {
  const signal = getSignalStatus()
  res.json(signal)
})

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`)
})
