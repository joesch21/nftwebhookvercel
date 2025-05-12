const admin = require('firebase-admin')

// 🔥 Parse and fix escaped newlines
const raw = JSON.parse(process.env.FIREBASE_CONFIG)
raw.private_key = raw.private_key.replace(/\\n/g, '\n')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(raw),
  })
}

module.exports = admin
