// File: api/send_nft.cjs
const admin = require('firebase-admin');
const { ethers } = require('ethers');

// ✅ Load env vars
const { RPC_URL, PRIVATE_KEY, NFT_CONTRACT_ADDRESS, OWNER_ADDRESS } = process.env;

if (!RPC_URL || !PRIVATE_KEY || !NFT_CONTRACT_ADDRESS || !OWNER_ADDRESS) {
  throw new Error('❌ Missing required env vars: RPC_URL, PRIVATE_KEY, NFT_CONTRACT_ADDRESS, OWNER_ADDRESS');
}

// ✅ Setup blockchain connection
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// ✅ Setup NFT contract instance
const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  ['function safeTransferFrom(address from, address to, uint256 tokenId) external'],
  signer
);

// ✅ Express handler
module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  try {
    // 🔒 Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email;

    // ✅ Get tokenId from request
    const { tokenId } = req.body;
    if (!Number.isInteger(tokenId) || tokenId < 0) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    // 🔍 Retrieve wallet address from Firestore
    const doc = await admin.firestore().collection('wallets').doc(uid).get();
    const wallet = doc.exists ? doc.data().address : null;

    if (!wallet || !ethers.isAddress(wallet)) {
      return res.status(404).json({ error: 'Valid wallet not found for user' });
    }

    console.log(`📤 Transferring tokenId ${tokenId} to ${wallet}`);

    // 🚀 Send NFT via contract
    const tx = await nftContract.safeTransferFrom(OWNER_ADDRESS, wallet, tokenId);
    await tx.wait();

    console.log(`✅ NFT #${tokenId} successfully transferred to ${wallet}`);

    return res.status(200).json({
      message: `NFT #${tokenId} transferred to ${wallet}`,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error('❌ send_nft error:', err);
    return res.status(500).json({ error: 'NFT transfer failed', detail: err.message });
  }
};
