// File: /api/webhook.js
import { buffer } from 'micro'
import Stripe from 'stripe'
import { ethers } from 'ethers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

// Blockchain setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
const nftContract = new ethers.Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  ['function mintTo(address recipient) external returns (uint256)'],
  signer
)

async function mintNFT(walletAddress) {
  const tx = await nftContract.mintTo(walletAddress)
  await tx.wait()
  console.log(`🎉 NFT minted to ${walletAddress}`)
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
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

  switch (event.type) {
    case 'checkout.session.completed': {
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

      break
    }

    default:
      console.log(`⚠️ Unhandled event type: ${event.type}`)
      break
  }

  res.status(200).json({ received: true })
}
