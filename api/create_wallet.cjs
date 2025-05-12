// File: api/create_wallet.cjs
const { Wallet } = require('ethers')
const admin = require('firebase-admin')
const path = require('path')
const { readFileSync } = require('fs')

// Prevent re-initialization in serverless environments
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    readFileSync(path.join(process.cwd(), 'config/firebase-service-account.json'), 'utf8')
  )

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')

  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const userId = decoded.uid

    const docRef = db.collection('wallets').doc(userId)
    const doc = await docRef.get()

    if (doc.exists) {
      return res.status(200).json({ address: doc.data().address })
    }

    // Generate and store new wallet
    const newWallet = Wallet.createRandom()

    await docRef.set({
      address: newWallet.address,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return res.status(200).json({ address: newWallet.address })
  } catch (err) {
    console.error('❌ Wallet creation error:', err)
    return res.status(500).json({ error: 'Wallet creation failed' })
  }
}
