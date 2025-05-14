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

// ✅ Sanity check: signer must match owner
if (signer.address.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
  console.error(`❌ PRIVATE_KEY does not control OWNER_ADDRESS:
  Signer: ${signer.address}
  Expected: ${OWNER_ADDRESS}`);
  throw new Error('Signer mismatch: PRIVATE_KEY does not match OWNER_ADDRESS');
}

const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  ['function safeTransferFrom(address from, address to, uint256 tokenId) external', 'function ownerOf(uint256 tokenId) view returns (address)'],
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
      console.warn('⚠️ Invalid tokenId:', tokenId);
      return res.status(400).json({ error: 'Invalid tokenId format' });
    }

    const doc = await admin.firestore().collection('wallets').doc(uid).get();
    const wallet = doc.exists ? doc.data().address : null;

    if (!wallet || !ethers.isAddress(wallet)) {
      console.warn('⚠️ Invalid wallet address for UID:', uid, '→', wallet);
      return res.status(400).json({ error: 'Invalid or missing wallet address' });
    }

    console.log(`📦 Will attempt to send NFT #${parsedTokenId} → ${wallet}`);

    let currentOwner;
    try {
      currentOwner = await nftContract.ownerOf(parsedTokenId);
      console.log(`🎯 Current owner of token #${parsedTokenId} is: ${currentOwner}`);
    } catch (ownerCheckError) {
      console.error(`❌ Could not check current owner:`, ownerCheckError.message);
    }

    try {
      console.log(`🚀 Sending from ${OWNER_ADDRESS} → ${wallet} | Token ID: ${parsedTokenId}`);

      const tx = await nftContract.safeTransferFrom(OWNER_ADDRESS, wallet, parsedTokenId);
      await tx.wait();

      console.log(`✅ NFT #${parsedTokenId} successfully sent to ${wallet} in tx: ${tx.hash}`);

      return res.status(200).json({
        message: `NFT #${parsedTokenId} transferred to ${wallet}`,
        txHash: tx.hash,
      });
    } catch (contractError) {
      console.error('❌ Transfer transaction failed:', contractError.reason || contractError.message || contractError);
      return res.status(500).json({
        error: 'Blockchain transaction failed',
        detail: contractError.reason || contractError.message,
      });
    }

  } catch (err) {
    console.error('❌ General send_nft error:', err.message);
    return res.status(500).json({
      error: 'NFT transfer failed',
      detail: err.message,
    });
  }
};
