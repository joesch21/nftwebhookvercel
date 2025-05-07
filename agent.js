// agent.js
import { ethers } from 'ethers';

export async function processEvent(payload, wallet, nftContract) {
  const { to, tokenId } = payload;

  // Validate inputs
  if (!to || typeof tokenId === 'undefined') {
    return { error: 'Missing "to" address or "tokenId"' };
  }

  const id = parseInt(tokenId);
  if (!ethers.isAddress(to) || isNaN(id)) {
    return { error: 'Invalid address or tokenId' };
  }

  try {
    console.log(`🧠 Agent: Checking tokenId ${id} for wallet ${to}`);

    const currentOwner = await nftContract.ownerOf(id);
    if (currentOwner.toLowerCase() === to.toLowerCase()) {
      console.log('⚠️ Token already owned by recipient.');
      return { status: 'already owned', tokenId: id };
    }

    console.log('🚀 Preparing NFT transfer...');
    const from = await wallet.getAddress();
    const txRequest = await nftContract.populateTransaction.safeTransferFrom(from, to, id);
    const gasEstimate = await wallet.estimateGas(txRequest);

    const tx = await wallet.sendTransaction({
      ...txRequest,
      gasLimit: gasEstimate.mul(2),
    });

    console.log('📤 Transaction submitted:', tx.hash);
    const receipt = await tx.wait();

    return {
      status: 'transferred',
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      tokenId: id,
      to,
    };
  } catch (err) {
    console.error('❌ Transfer failed:', {
      message: err.message,
      code: err.code,
      reason: err.reason,
      stack: err.stack,
    });
    return {
      error: 'Transfer failed',
      reason: err.message,
      tokenId: id,
      to,
    };
  }
}
