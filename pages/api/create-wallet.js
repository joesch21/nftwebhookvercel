// File: /api/create-wallet.js
import { ethers } from 'ethers'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // Optional: Validate Firebase token here from req.headers.authorization

  try {
    // Generate a new random wallet
    const wallet = ethers.Wallet.createRandom()

    // Optionally: save the wallet to your DB (DO NOT expose private key here)

    res.status(200).json({
      address: wallet.address,
      // 🚫 DO NOT send privateKey unless it's a test/staging-only prototype
    })
  } catch (err) {
    console.error('❌ Wallet creation error:', err)
    res.status(500).json({ error: 'Wallet creation failed' })
  }
}
