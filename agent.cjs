// agent.cjs

const { ethers } = require('ethers');
const abi = require('./abi/signalControllerABI.json'); // update the path if needed

// Environment vars (set in Render dashboard)
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.SIGNAL_CONTRACT;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const signalContract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

// Optional internal state mirror for front-end
let signalStatus = 'undefined';

function getSignalStatus() {
  return { color: signalStatus === 'signal on' ? 'green' : 'red' };
}

async function processEvent(payload) {
  console.log('🧠 Agent activated!');

  try {
    const tx = await signalContract.activateSignal();
    console.log('📤 Contract tx submitted:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Signal activated on-chain, block:', receipt.blockNumber);

    signalStatus = 'signal on';
    return {
      status: 'signal on',
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (err) {
    console.error('❌ On-chain signal activation failed:', {
      msg: err.message,
      reason: err.reason,
    });
    return { error: 'Smart contract call failed', reason: err.message };
  }
}

module.exports = { processEvent, getSignalStatus };
