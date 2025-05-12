const admin = require('firebase-admin')

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed')
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '').trim()

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const email = decoded.email
    const uid = decoded.uid

    const walletDoc = await admin.firestore().collection('wallets').doc(uid).get()
    const wallet = walletDoc.exists ? walletDoc.data().address : null

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for user' })
    }

    // Simulate sending an email or test action
    console.log(`📨 Simulating message to ${email} for wallet ${wallet}`)

    return res.status(200).json({
      message: `Test transaction sent to ${email} for wallet ${wallet}`,
    })
  } catch (err) {
    console.error('❌ Test transaction error:', err)
    return res.status(500).json({ error: 'Test transaction failed' })
  }
}
