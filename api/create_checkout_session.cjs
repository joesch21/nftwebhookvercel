// File: api/create_checkout_session.cjs
const Stripe = require('stripe')

if (!process.env.STRIPE_SECRET_KEY || !process.env.CLIENT_URL) {
  console.error('❌ Missing STRIPE_SECRET_KEY or CLIENT_URL', {
    STRIPE_SECRET_KEY_SET: !!process.env.STRIPE_SECRET_KEY,
    CLIENT_URL: process.env.CLIENT_URL,
  })
  throw new Error('❌ Missing required STRIPE_SECRET_KEY or CLIENT_URL environment variables')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { walletAddress, tokenId } = req.body

  console.log('📥 Incoming request to create checkout session')
  console.log('🧾 Wallet Address:', walletAddress)
  console.log('🆔 Token ID:', tokenId)

  if (!walletAddress || typeof walletAddress !== 'string') {
    console.warn('⚠️ Invalid or missing wallet address')
    return res.status(400).json({ error: 'Missing or invalid wallet address' })
  }

  if (tokenId === undefined || !['0', '1'].includes(String(tokenId))) {
    console.warn('⚠️ Invalid or missing tokenId')
    return res.status(400).json({ error: 'Missing or invalid tokenId' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        wallet: walletAddress,
        tokenId: String(tokenId),
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `GCC NFT - Token ${tokenId}`,
              description: `Membership NFT Token ID ${tokenId} with wallet delivery`,
            },
            unit_amount: 1, // $1 
          },
          quantity: 1,
        },
      ],
    })

    console.log(`✅ Stripe Checkout session created for wallet ${walletAddress} (token ${tokenId})`)
    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('❌ Stripe session creation failed:', error.message)
    return res.status(500).json({ error: 'Stripe session creation failed' })
  }
}
