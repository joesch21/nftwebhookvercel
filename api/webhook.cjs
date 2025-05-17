const Stripe = require('stripe');
const { ethers, parseUnits } = require('ethers');
const admin = require('firebase-admin');
const nftMetadata = require('./nft_metadata.cjs'); // Import metadata for reward lookup

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const {
  RPC_URL_TESTNET,
  PRIVATE_KEY_TESTNET,
  RPC_URL_MAINNET,
  PRIVATE_KEY_MAINNET,
  NFT_CONTRACT_ADDRESS,
  GCC_TOKEN_CONTRACT,
  OWNER_ADDRESS,
} = process.env;

if (!RPC_URL_TESTNET || !PRIVATE_KEY_TESTNET ||
    !RPC_URL_MAINNET || !PRIVATE_KEY_MAINNET ||
    !NFT_CONTRACT_ADDRESS || !GCC_TOKEN_CONTRACT || !OWNER_ADDRESS) {
  throw new Error('❌ Missing one or more required environment variables');
}

const testnetProvider = new ethers.JsonRpcProvider(RPC_URL_TESTNET);
const mainnetProvider = new ethers.JsonRpcProvider(RPC_URL_MAINNET);

const testnetSigner = new ethers.Wallet(PRIVATE_KEY_TESTNET, testnetProvider);
const mainnetSigner = new ethers.Wallet(PRIVATE_KEY_MAINNET, mainnetProvider);

const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  [
    'function safeTransferFrom(address from, address to, uint256 tokenId) external',
    'function ownerOf(uint256 tokenId) view returns (address)'
  ],
  testnetSigner
);

const tokenContract = new ethers.Contract(
  GCC_TOKEN_CONTRACT,
  ['function transfer(address to, uint256 amount) public returns (bool)'],
  mainnetSigner
);

async function transferNFT(wallet, tokenId) {
  const currentOwner = await nftContract.ownerOf(tokenId);
  if (currentOwner.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
    console.warn(`⚠️ NFT #${tokenId} already transferred to ${currentOwner}`);
    return;
  }

  const tx = await nftContract.safeTransferFrom(OWNER_ADDRESS, wallet, tokenId);
  await tx.wait();
  console.log(`🎨 NFT token ${tokenId} transferred to ${wallet} (tx: ${tx.hash})`);
}

async function rewardTokens(wallet, tokenId) {
  const claimRef = admin.firestore().collection('claims').doc(`${wallet.toLowerCase()}-${tokenId}`);
  const existing = await claimRef.get();

  if (existing.exists && existing.data().claimed) {
    console.log(`⚠️ Wallet ${wallet} already claimed tokens for tokenId ${tokenId}.`);
    return;
  }

  const metadata = nftMetadata[tokenId];
  if (!metadata || !metadata.gccReward) {
    console.warn(`⚠️ No reward metadata found for tokenId ${tokenId}`);
    return;
  }

  const amount = parseUnits(metadata.gccReward.toString(), 18);
  const tx = await tokenContract.transfer(wallet, amount);
  await tx.wait();

  await claimRef.set({
    claimed: true,
    claimedAt: Date.now(),
    txHash: tx.hash,
  });

  console.log(`🎁 Sent ${metadata.gccReward} GCC to ${wallet} (tx: ${tx.hash})`);
}

module.exports = async function (req, res) {
  console.log('🚨 Webhook endpoint hit');

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const wallet = session.metadata?.wallet;
    const tokenId = parseInt(session.metadata?.tokenId || '0', 10);

    console.log(`📦 Parsed tokenId: ${tokenId}, wallet: ${wallet}`);

    if (!wallet || wallet.length !== 42 || isNaN(tokenId) || tokenId < 0) {
      console.error('❌ Invalid wallet or tokenId');
      return res.status(400).send('Invalid wallet or tokenId');
    }

    try {
      console.log(`👛 Transferring NFT on testnet to ${wallet}...`);
      await transferNFT(wallet, tokenId);

      console.log(`💰 Rewarding GCC tokens on mainnet to ${wallet}...`);
      await rewardTokens(wallet, tokenId);

      return res.status(200).send('✅ NFT and tokens sent');
    } catch (err) {
      console.error('❌ Error sending NFT or tokens:', err.message || err);
      return res.status(500).send('NFT or token transfer failed');
    }
  }

  console.log(`⚠️ Unhandled event type: ${event.type}`);
  res.status(200).send('Unhandled event type');
};
