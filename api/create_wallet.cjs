// File: api/create_wallet.cjs
const { Wallet } = require('ethers')
const admin = require('firebase-admin')

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  })
}

const db = admin.firestore()

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    console.warn('⚠️ Received non-POST request to /api/create_wallet')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    console.warn('⚠️ No auth token provided')
    return res.status(401).json({ error: 'Missing auth token' })
  }

  try {
    console.log('🔐 Verifying Firebase ID token...')
    const decoded = await admin.auth().verifyIdToken(token)

    const userId = decoded.uid
    const email = decoded.email || '(no email)'
    console.log('✅ Firebase token verified.')
    console.log(`👤 UID: ${userId}`)
    console.log(`📧 Email: ${email}`)

    const docRef = db.collection('wallets').doc(userId)
    const doc = await docRef.get()

    if (doc.exists) {
      console.log(`📦 Wallet already exists for UID: ${userId}`)
      return res.status(200).json({ address: doc.data().address })
    }

    const newWallet = Wallet.createRandom()

    await docRef.set({
      address: newWallet.address,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    console.log(`🎉 New wallet created for UID: ${userId} → ${newWallet.address}`)
    return res.status(200).json({ address: newWallet.address })

  } catch (err) {
    console.error('❌ Wallet creation error:', err.message)
    console.error('👉 Raw token:', token)
    console.error(err.stack)
    return res.status(500).json({ error: err.message || 'Wallet creation failed' })
  }
}
