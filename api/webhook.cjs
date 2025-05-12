// File: api/webhook.cjs
const { buffer } = require('micro')
const Stripe = require('stripe')
const { ethers } = require('ethers')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

let nftContract

try {
  // Validate critical env vars first
  const { RPC_URL, PRIVATE_KEY, SIGNAL_CONTRACT } = process.env

  if (!RPC_URL || !PRIVATE_KEY || !SIGNAL_CONTRACT) {
    throw new Error('❌ Missing one or more required environment variables')
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const signer = new ethers.Wallet(PRIVATE_KEY, provider)

  nftContract = new ethers.Contract(
    SIGNAL_CONTRACT,
    ['function mintTo(address recipient) external returns (uint256)'],
    signer
  )
} catch (err) {
  console.error('❌ Contract initialization error:', err.message)
  // We'll throw here so the server startup fails fast and clean
  throw err
}

async function mintNFT(walletAddress) {
  const tx = await nftContract.mintTo(walletAddress)
  await tx.wait()
  console.log(`🎉 NFT minted to ${walletAddress}`)
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed')
  }

  let event
  try {
    const buf = await buffer(req)
    const sig = req.headers['stripe-signature']
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
  } catch (err) {
    console.error('❌ Webhook verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  console.log('🔥 Webhook received:', event.type)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const wallet = session?.metadata?.wallet || session?.metadata?.walletAddress

    if (!wallet) {
      console.error('❌ No wallet address found in Stripe metadata')
      return res.status(400).send('Missing wallet address')
    }

    console.log('✅ Payment completed for session:', session.id)
    console.log('👛 Minting NFT to wallet:', wallet)

    try {
      await mintNFT(wallet)
    } catch (err) {
      console.error('❌ Error minting NFT:', err)
      return res.status(500).send('NFT minting failed')
    }
  } else {
    console.log(`⚠️ Unhandled event type: ${event.type}`)
  }

  res.status(200).json({ received: true })
}
