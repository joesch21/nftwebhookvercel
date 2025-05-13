const admin = require('firebase-admin')

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed')
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '').trim()

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const uid = decoded.uid

    const doc = await admin.firestore().collection('purchases').doc(uid).get()
    const purchased = doc.exists && doc.data().status === 'paid'

    return res.status(200).json({ purchased })
  } catch (err) {
    console.error('❌ Error checking purchase status:', err)
    return res.status(500).json({ purchased: false, error: err.message })
  }
}
