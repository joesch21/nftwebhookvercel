const admin = require('firebase-admin');
const { ethers } = require('ethers');

// ✅ Load testnet environment variables
const {
  RPC_URL_TESTNET,
  PRIVATE_KEY_TESTNET,
  NFT_CONTRACT_ADDRESS,
  OWNER_ADDRESS
} = process.env;

if (!RPC_URL_TESTNET || !PRIVATE_KEY_TESTNET || !NFT_CONTRACT_ADDRESS || !OWNER_ADDRESS) {
  throw new Error('❌ Missing required env vars: RPC_URL_TESTNET, PRIVATE_KEY_TESTNET, NFT_CONTRACT_ADDRESS, OWNER_ADDRESS');
}

// ✅ Setup testnet provider and signer
const provider = new ethers.JsonRpcProvider(RPC_URL_TESTNET);
const signer = new ethers.Wallet(PRIVATE_KEY_TESTNET, provider);

// ✅ Sanity check: signer matches OWNER_ADDRESS
if (signer.address.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
  console.error(`❌ PRIVATE_KEY_TESTNET does not match OWNER_ADDRESS:
  Signer: ${signer.address}
  Expected: ${OWNER_ADDRESS}`);
  throw new Error('Signer mismatch');
}

// ✅ NFT contract instance (testnet)
const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  [
    'function safeTransferFrom(address from, address to, uint256 tokenId) external',
    'function ownerOf(uint256 tokenId) view returns (address)'
  ],
  signer
);

// ✅ Express handler
module.exports = async function (req, res) {
  console.log(`📨 [send_nft] Incoming POST request`);

  if (req.method !== 'POST') {
    console.warn('❌ Method not allowed:', req.method);
    return res.status(405).send('Method Not Allowed');
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email;
    const { tokenId } = req.body;

    console.log(`👤 Authenticated user: ${email} (UID: ${uid})`);
    console.log(`🔢 Raw tokenId from request:`, tokenId);

    const parsedTokenId = parseInt(tokenId, 10);
    if (isNaN(parsedTokenId)) {
      return res.status(400).json({ error: 'Invalid tokenId format' });
    }

    const doc = await admin.firestore().collection('wallets').doc(uid).get();
    const wallet = doc.exists ? doc.data().address : null;

    if (!wallet || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid or missing wallet address' });
    }

    console.log(`📦 Attempting to send NFT #${parsedTokenId} → ${wallet}`);

    let currentOwner;
    try {
      currentOwner = await nftContract.ownerOf(parsedTokenId);
      console.log(`🎯 Current owner of token #${parsedTokenId}: ${currentOwner}`);
    } catch (err) {
      console.warn(`⚠️ Could not verify token ownership:`, err.message);
    }

    try {
      const tx = await nftContract.safeTransferFrom(OWNER_ADDRESS, wallet, parsedTokenId);
      await tx.wait();

      console.log(`✅ NFT #${parsedTokenId} successfully sent to ${wallet} (tx: ${tx.hash})`);

      return res.status(200).json({
        message: `NFT #${parsedTokenId} transferred to ${wallet}`,
        txHash: tx.hash,
      });
    } catch (contractError) {
      console.error('❌ Transfer failed:', contractError.reason || contractError.message);
      return res.status(500).json({
        error: 'Blockchain transaction failed',
        detail: contractError.reason || contractError.message,
      });
    }

  } catch (err) {
    console.error('❌ send_nft error:', err.message);
    return res.status(500).json({
      error: 'NFT transfer failed',
      detail: err.message,
    });
  }
};
