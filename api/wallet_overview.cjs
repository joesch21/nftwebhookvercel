const admin = require('firebase-admin');
const { ethers } = require('ethers');
require('dotenv').config();

const {
  RPC_URL_MAINNET,
  PRIVATE_KEY_MAINNET,
  GCC_TOKEN_CONTRACT,
  NFT_CONTRACT_ADDRESS
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
  ['function balanceOf(address owner) view returns (uint256)'],
  signer
);

module.exports = async function (req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const doc = await admin.firestore().collection('wallets').doc(uid).get();
    const wallet = doc.exists ? doc.data().address : null;

    if (!wallet || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const balanceRaw = await tokenContract.balanceOf(wallet);
    const nftBalanceRaw = await nftContract.balanceOf(wallet);

    const balance = ethers.formatUnits(balanceRaw, 18);
    const nftCount = nftBalanceRaw.toString();

    return res.status(200).json({ wallet, balance, nftCount });
  } catch (err) {
    console.error('❌ Error fetching wallet overview:', err.message);
    return res.status(500).json({ error: 'Failed to fetch wallet overview' });
  }
};
