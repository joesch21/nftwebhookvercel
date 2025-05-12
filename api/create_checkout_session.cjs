// File: /api/create-checkout-session.js
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { walletAddress } = req.body

  if (!walletAddress) {
    return res.status(400).json({ error: 'Missing wallet address' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        wallet: walletAddress, // 👈 This is used in the webhook
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'GCC Membership NFT',
              description: 'Includes automatic wallet mint and GCC bonus tokens',
            },
            unit_amount: 10000, // $100.00 in cents
          },
          quantity: 1,
        },
      ],
    })

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('❌ Stripe session creation failed:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
