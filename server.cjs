// server.js
const express = require('express');
const { ethers } = require('ethers');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const abi = require('./abi.json');
const { processEvent } = require('./agent.cjs');

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

console.log('🔑 ENV CHECK →', {
  PRIVATE_KEY: PRIVATE_KEY ? '[loaded]' : '❌ MISSING',
  RPC_URL,
  CONTRACT_ADDRESS,
});

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const nftContract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

app.post('/webhook', async (req, res) => {
  console.log('📡 Webhook endpoint hit!');
  console.log('🔍 Payload received:', req.body);

  try {
    const result = await processEvent(req.body, wallet, nftContract);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', reason: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
