const { ethers } = require('ethers');
const admin = require('firebase-admin');

const {
  RPC_URL_TESTNET,
  RPC_URL_MAINNET,
  NFT_CONTRACT_ADDRESS,
  GCC_TOKEN_CONTRACT
} = process.env;

const testnetProvider = new ethers.JsonRpcProvider(RPC_URL_TESTNET);
const mainnetProvider = new ethers.JsonRpcProvider(RPC_URL_MAINNET);

const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  ['function ownerOf(uint256 tokenId) view returns (address)'],
  testnetProvider
);

const tokenContract = new ethers.Contract(
  GCC_TOKEN_CONTRACT,
  ['function balanceOf(address account) view returns (uint256)', 'function decimals() view returns (uint8)'],
  mainnetProvider
);

module.exports = async function (req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const doc = await admin.firestore().collection('wallets').doc(uid).get();
    const wallet = doc.exists ? doc.data().address : null;

    if (!wallet || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Wallet not found or invalid' });
    }

    // Check NFT ownership (brute-force for now)
    const ownedNFTs = [];
    for (const id of [1, 2]) {
      try {
        const owner = await nftContract.ownerOf(id);
        if (owner.toLowerCase() === wallet.toLowerCase()) {
          ownedNFTs.push(id);
        }
      } catch (err) {
        // Skip if token doesn't exist or call fails
      }
    }

    const rawBalance = await tokenContract.balanceOf(wallet);
    const decimals = await tokenContract.decimals();
    const gccBalance = ethers.formatUnits(rawBalance, decimals);

    return res.status(200).json({
      wallet,
      nfts: ownedNFTs,
      gccBalance
    });
  } catch (err) {
    console.error('❌ Error fetching wallet overview:', err);
    return res.status(500).json({ error: 'Failed to retrieve wallet overview' });
  }
};
