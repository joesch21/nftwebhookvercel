// server.js
import express from 'express';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import abi from './abi.json' assert { type: 'json' };
import { processEvent } from './agent.js';

dotenv.config();

const app = express();
app.use(express.json());

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

app.get('/', (_, res) => {
  res.send('✅ NFT Sender Webhook Server is live');
});

app.post('/webhook', async (req, res) => {
  console.log('📡 Webhook endpoint hit!');
  console.log('🔍 Payload received:', req.body);

  try {
    const result = await processEvent(req.body, wallet, nftContract);
    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Agent processing failed:', err);
    res.status(500).json({ error: 'Agent processing failed', details: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
