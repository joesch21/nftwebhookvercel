// File: api/create_checkout_session.cjs
const Stripe = require('stripe');
const nftMetadata = require('./nft_metadata.cjs');

if (!process.env.STRIPE_SECRET_KEY || !process.env.CLIENT_URL) {
  console.error('❌ Missing STRIPE_SECRET_KEY or CLIENT_URL', {
    STRIPE_SECRET_KEY_SET: !!process.env.STRIPE_SECRET_KEY,
    CLIENT_URL: process.env.CLIENT_URL,
  });
  throw new Error('❌ Missing required STRIPE_SECRET_KEY or CLIENT_URL environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { wallet, tokenId } = req.body;

  console.log('📥 Incoming checkout session request');
  console.log('🧾 Received wallet:', wallet);
  console.log('🆔 Received tokenId:', tokenId);

  // ✅ Relaxed wallet check for test/dev use
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
  console.warn('⚠️ Invalid wallet format');
  return res.status(400).json({ error: 'Invalid wallet format' });
  }


  const parsedTokenId = parseInt(tokenId, 10);
  if (isNaN(parsedTokenId) || parsedTokenId < 1) {
    console.warn('⚠️ Invalid token ID:', tokenId);
    return res.status(400).json({ error: 'Invalid tokenId' });
  }

  const metadata = nftMetadata[parsedTokenId];
  if (!metadata || !metadata.priceUsd) {
    console.warn(`⚠️ No metadata for token ID ${parsedTokenId}`);
    return res.status(400).json({ error: 'NFT metadata not found' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success?wallet=${encodeURIComponent(wallet)}&token=${parsedTokenId}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        wallet,
        tokenId: String(parsedTokenId),
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `GCC NFT - Token ${parsedTokenId}`,
              description: `Membership NFT Token ID ${parsedTokenId} with wallet delivery`,
            },
            unit_amount: metadata.priceUsd, // price in cents
          },
          quantity: 1,
        },
      ],
    });

    console.log(`✅ Stripe session created: ${session.id}`);
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('❌ Stripe session creation failed:', error.message);
    return res.status(500).json({ error: 'Stripe session creation failed' });
  }
};
