// File: api/send_nft.cjs
const admin = require('firebase-admin');
const { ethers } = require('ethers');

// ✅ Load env vars
const { RPC_URL, PRIVATE_KEY, SIGNAL_CONTRACT, OWNER_ADDRESS } = process.env;

if (!RPC_URL || !PRIVATE_KEY || !SIGNAL_CONTRACT || !OWNER_ADDRESS) {
  throw new Error('❌ Missing required env vars: RPC_URL, PRIVATE_KEY, SIGNAL_CONTRACT, OWNER_ADDRESS');
}

// ✅ Setup blockchain connection
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const nftContract = new ethers.Contract(
  SIGNAL_CONTRACT,
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
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email;
    const { tokenId } = req.body;

    if (typeof tokenId !== 'number') {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }

    const doc = await admin.firestore().collection('wallets').doc(uid).get();
    const wallet = doc.exists ? doc.data().address : null;

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for user' });
    }

    console.log(`📤 Transferring tokenId ${tokenId} to ${wallet}`);

    const tx = await nftContract.safeTransferFrom(OWNER_ADDRESS, wallet, tokenId);
    await tx.wait();

    console.log(`✅ NFT #${tokenId} sent to ${wallet}`);

    return res.status(200).json({
      message: `NFT #${tokenId} transferred to ${wallet}`,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error('❌ send_nft error:', err.message);
    return res.status(500).json({ error: 'NFT transfer failed', detail: err.message });
  }
};
