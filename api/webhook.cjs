const Stripe = require('stripe');
const { ethers } = require('ethers');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Initialize contract once at startup
let nftContract;
try {
  const { RPC_URL, PRIVATE_KEY, NFT_CONTRACT_ADDRESS, OWNER_ADDRESS } = process.env;

  if (!RPC_URL || !PRIVATE_KEY || !NFT_CONTRACT_ADDRESS || !OWNER_ADDRESS) {
    throw new Error('❌ Missing one or more required environment variables');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  nftContract = new ethers.Contract(
    NFT_CONTRACT_ADDRESS,
    ['function safeTransferFrom(address from, address to, uint256 tokenId) external'],
    signer
  );

  console.log('✅ NFT contract initialized successfully');
} catch (err) {
  console.error('❌ Contract initialization error:', err.message);
  throw err;
}

// ✅ NFT Transfer Logic
async function transferNFT(walletAddress, tokenId) {
  try {
    const tx = await nftContract.safeTransferFrom(process.env.OWNER_ADDRESS, walletAddress, tokenId);
    await tx.wait();
    console.log(`🎉 NFT token ${tokenId} transferred to ${walletAddress} (tx: ${tx.hash})`);
  } catch (error) {
    console.error(`❌ NFT transfer failed:`, error.reason || error.message || error);
    throw error;
  }
}

module.exports = async function (req, res) {
  console.log('🚨 Webhook endpoint hit');

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // ✅ Use req.body (NOT rawBody) if express.raw() is set up in server.cjs
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const wallet = session.metadata?.walletAddress;
    const tokenId = parseInt(session.metadata?.tokenId || '0', 10);

    if (!wallet || isNaN(tokenId)) {
      console.error('❌ Invalid wallet or tokenId in metadata:', session.metadata);
      return res.status(400).send('Missing wallet or tokenId');
    }

    console.log(`✅ Stripe payment confirmed for session ${session.id}`);
    console.log(`👛 Preparing to transfer token ${tokenId} to wallet ${wallet}`);

    try {
      await transferNFT(wallet, tokenId);
      return res.status(200).send('✅ NFT transfer successful');
    } catch (err) {
      return res.status(500).send('❌ NFT transfer failed');
    }
  }

  console.log(`⚠️ Unhandled event type: ${event.type}`);
  res.status(200).send('⚠️ Event type not handled');
};
