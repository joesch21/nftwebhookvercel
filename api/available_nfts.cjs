// File: api/available_nfts.cjs
const { ethers } = require('ethers');

// ✅ Load required env vars
const {
  RPC_URL_TESTNET,
  PRIVATE_KEY_TESTNET,
  NFT_CONTRACT_ADDRESS,
  OWNER_ADDRESS,
} = process.env;

// ✅ Validate environment setup
if (!RPC_URL_TESTNET || !PRIVATE_KEY_TESTNET || !NFT_CONTRACT_ADDRESS || !OWNER_ADDRESS) {
  throw new Error('❌ Missing one or more required environment variables for /available_nfts');
}

// ✅ Setup provider and contract connection
const provider = new ethers.JsonRpcProvider(RPC_URL_TESTNET);
const signer = new ethers.Wallet(PRIVATE_KEY_TESTNET, provider);
const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  ['function ownerOf(uint256 tokenId) view returns (address)'],
  signer
);

// ✅ Main route handler
module.exports = async function (req, res) {
  try {
    const tokenIds = [1, 2, 3, 4, 5, 6]; // Expandable
    const availability = {};

    for (const id of tokenIds) {
      try {
        const owner = await nftContract.ownerOf(id);
        availability[id] = owner.toLowerCase() === OWNER_ADDRESS.toLowerCase();
      } catch (err) {
        // Most likely means token does not exist or is burned
        console.warn(`⚠️ Could not fetch owner for token ${id}: ${err.message}`);
        availability[id] = false;
      }
    }

    return res.status(200).json(availability);
  } catch (err) {
    console.error('❌ Error fetching NFT availability:', err.message);
    return res.status(500).json({ error: 'Internal server error while checking availability' });
  }
};
