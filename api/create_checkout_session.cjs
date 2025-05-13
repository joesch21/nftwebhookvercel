// File: api/create_checkout_session.cjs
const Stripe = require('stripe')

if (!process.env.STRIPE_SECRET_KEY || !process.env.CLIENT_URL) {
  throw new Error('❌ Missing required STRIPE_SECRET_KEY or CLIENT_URL environment variables')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { walletAddress, tokenId } = req.body

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid wallet address' })
  }

  if (tokenId === undefined || !['0', '1'].includes(String(tokenId))) {
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
            unit_amount: 10000, // $100.00 in cents
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
