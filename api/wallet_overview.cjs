const admin = require('firebase-admin');
const { ethers } = require('ethers');
require('dotenv').config();

const {
  RPC_URL_MAINNET,
  PRIVATE_KEY_MAINNET,
  PRIVATE_KEY_TESTNET,
  RPC_URL_TESTNET,
  GCC_TOKEN_CONTRACT,
  NFT_CONTRACT_ADDRESS,
} = process.env;

const mainnetProvider = new ethers.JsonRpcProvider(RPC_URL_MAINNET);
const testnetProvider = new ethers.JsonRpcProvider(RPC_URL_TESTNET);

const mainnetSigner = new ethers.Wallet(PRIVATE_KEY_MAINNET, mainnetProvider);
const testnetSigner = new ethers.Wallet(PRIVATE_KEY_TESTNET, testnetProvider);

const tokenContract = new ethers.Contract(
  GCC_TOKEN_CONTRACT,
  ['function balanceOf(address account) view returns (uint256)'],
  mainnetSigner
);

const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  [
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)'
  ],
  testnetSigner
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
    const nftIds = [];

    try {
      const rawBalance = await tokenContract.balanceOf(wallet);
      balance = ethers.formatUnits(rawBalance, 18);
    } catch (err) {
      console.error('❌ Token balanceOf failed:', err.message);
    }

    try {
      const nftBalance = await nftContract.balanceOf(wallet);
      const count = parseInt(nftBalance.toString());
      for (let i = 0; i < count; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(wallet, i);
        nftIds.push(Number(tokenId));
      }
    } catch (err) {
      console.error('❌ NFT enumeration failed:', err.message);
    }

    return res.status(200).json({ wallet, balance, nftIds });
  } catch (err) {
    console.error('❌ Error in wallet_overview handler:', err.message || err);
    return res.status(500).json({ error: 'Failed to fetch wallet overview' });
  }
};
