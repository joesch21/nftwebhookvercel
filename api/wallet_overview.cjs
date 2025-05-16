const admin = require('firebase-admin');
const { ethers } = require('ethers');
require('dotenv').config();

const {
  RPC_URL_MAINNET,
  PRIVATE_KEY_MAINNET,
  GCC_TOKEN_CONTRACT,
  NFT_CONTRACT_ADDRESS,
  OWNER_ADDRESS,
} = process.env;

const provider = new ethers.JsonRpcProvider(RPC_URL_MAINNET);
const signer = new ethers.Wallet(PRIVATE_KEY_MAINNET, provider);

const tokenContract = new ethers.Contract(
  GCC_TOKEN_CONTRACT,
  ['function balanceOf(address account) view returns (uint256)'],
  signer
);

const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  ['function ownerOf(uint256 tokenId) view returns (address)'],
  signer
);

module.exports = async function (req, res) {
  try {
    console.log('🔐 [wallet_overview] Hit endpoint');

    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const doc = await admin.firestore().collection('wallets').doc(uid).get();
    const wallet = doc.exists ? doc.data().address : null;

    if (!wallet || !ethers.isAddress(wallet)) {
      console.warn('⚠️ Invalid or missing wallet address for UID:', uid);
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    console.log(`🔎 Fetching balances for wallet: ${wallet}`);

    let balance = '0';
    let nftIds = [];

    try {
      const rawBalance = await tokenContract.balanceOf(wallet);
      balance = ethers.formatUnits(rawBalance, 18);
    } catch (err) {
      console.error('❌ Token balanceOf failed:', err.message);
    }

    try {
      const knownTokenIds = [1, 2];
      for (const id of knownTokenIds) {
        try {
          const owner = await nftContract.ownerOf(id);
          if (owner.toLowerCase() === wallet.toLowerCase()) {
            nftIds.push(id);
          }
        } catch (e) {
          console.warn(`⚠️ ownerOf failed for token #${id}:`, e.message);
        }
      }
    } catch (err) {
      console.error('❌ NFT token enumeration failed:', err.message);
    }

    return res.status(200).json({ wallet, balance, nftIds });

  } catch (err) {
    console.error('❌ Error in wallet_overview handler:', err.message || err);
    return res.status(500).json({ error: 'Failed to fetch wallet overview' });
  }
};
