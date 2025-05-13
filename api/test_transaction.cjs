// File: api/test_transaction.cjs
const admin = require('firebase-admin')
const { ethers } = require('ethers')

const { RPC_URL, PRIVATE_KEY, SIGNAL_CONTRACT } = process.env

const provider = new ethers.JsonRpcProvider(RPC_URL)
const signer = new ethers.Wallet(PRIVATE_KEY, provider)
const nftContract = new ethers.Contract(
  SIGNAL_CONTRACT,
  ['function mintTo(address recipient, uint256 tokenId) external returns (uint256)'],
  signer
)

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
    const { tokenId } = req.body

    const walletDoc = await admin.firestore().collection('wallets').doc(uid).get()
    const wallet = walletDoc.exists ? walletDoc.data().address : null

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for user' })
    }

    console.log(`🎯 Minting tokenId ${tokenId} to wallet ${wallet}...`)
    const tx = await nftContract.mintTo(wallet, tokenId)
    await tx.wait()

    console.log(`✅ NFT #${tokenId} minted to ${wallet}`)

    return res.status(200).json({
      message: `NFT #${tokenId} minted to ${wallet}`,
      txHash: tx.hash,
    })

  } catch (err) {
    console.error('❌ Minting failed:', err)
    return res.status(500).json({ error: 'Minting failed', detail: err.message })
  }
}
