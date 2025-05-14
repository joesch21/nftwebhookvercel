const { Wallet } = require('ethers')
const admin = require('firebase-admin')
const { readFileSync } = require('fs')

// ✅ Load service account credentials from Render Secret File
const serviceAccountPath = '/etc/secrets/firebase-service-account.json'
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

// ✅ Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
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
    console.log(`✅ Firebase token verified for ${email} (UID: ${userId})`)

    const docRef = db.collection('wallets').doc(userId)
    const doc = await docRef.get()

    if (doc.exists) {
      const existing = doc.data()
      if (!existing || !existing.address) {
        console.error(`❌ Malformed wallet record for UID ${userId}`)
        return res.status(500).json({ error: 'Corrupt wallet record' })
      }

      console.log(`📦 Wallet already exists for UID: ${userId}`)
      return res.status(200).json({ address: existing.address })
    }

    // ✅ Create new wallet
    const newWallet = Wallet.createRandom()

    // 🛡️ Only save the address in Firestore (not private key or mnemonic)
    await docRef.set({
      address: newWallet.address,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    console.log(`🎉 New wallet created: ${newWallet.address}`)

    // 🚫 Never store the mnemonic — return it only once
    return res.status(200).json({
      address: newWallet.address,
      mnemonic: newWallet.mnemonic.phrase,
    })
  } catch (err) {
    console.error('❌ Wallet creation error:', err.message)
    return res.status(500).json({ error: err.message || 'Wallet creation failed' })
  }
}
