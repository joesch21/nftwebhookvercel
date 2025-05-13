// File: api/webhook.cjs
const { buffer } = require('micro');
const Stripe = require('stripe');
const { ethers } = require('ethers');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

let nftContract;

try {
  const { RPC_URL, PRIVATE_KEY, SIGNAL_CONTRACT } = process.env;
  if (!RPC_URL || !PRIVATE_KEY || !SIGNAL_CONTRACT) {
    throw new Error('❌ Missing one or more required environment variables');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  nftContract = new ethers.Contract(
    SIGNAL_CONTRACT,
    ['function mintTo(address recipient, uint256 tokenId) external'],
    signer
  );
} catch (err) {
  console.error('❌ Contract initialization error:', err.message);
  throw err;
}

async function mintNFT(walletAddress, tokenId) {
  const tx = await nftContract.mintTo(walletAddress, tokenId);
  await tx.wait();
  console.log(`🎉 NFT token ${tokenId} minted to ${walletAddress}`);
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  let event;
  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    console.log('🪝 Incoming webhook');
    console.log('🪝 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🪝 Stripe Signature:', sig);

    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    console.log('📦 Parsed Event:', JSON.stringify(event, null, 2));
  } catch (err) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('🔥 Webhook event type:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const wallet = session?.metadata?.wallet || session?.metadata?.walletAddress;
    const tokenId = session?.metadata?.tokenId;

    if (!wallet || tokenId === undefined) {
      console.error('❌ Missing wallet or tokenId in metadata');
      return res.status(400).send('Missing wallet or tokenId');
    }

    console.log('✅ Payment completed for session:', session.id);
    console.log(`👛 Minting token ${tokenId} to wallet ${wallet}`);

    try {
      await mintNFT(wallet, tokenId);
    } catch (err) {
      console.error('❌ Error minting NFT:', err);
      return res.status(500).send('NFT minting failed');
    }
  } else {
    console.log(`⚠️ Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};
