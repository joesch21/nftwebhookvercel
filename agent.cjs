// agent.cjs

// Placeholder version since we're shifting to frontend signaling.
// No longer attempts on-chain transfer.

let signalColor = 'red'; // Global signal state

async function processEvent(payload) {
  const { to, tokenId } = payload;

  if (!to || typeof tokenId === 'undefined') {
    return { error: 'Missing "to" address or "tokenId"' };
  }

  const id = parseInt(tokenId);

  console.log(`🧠 Agent: Received tokenId ${id} for address ${to}`);
  console.log('💡 Triggering frontend signal (red → green)...');

  // Simulate a signal trigger
  signalColor = 'green';

  return {
    status: 'triggered',
    signal: 'change-light',
    color: signalColor,
    tokenId: id,
    to,
  };
}

function getSignalStatus() {
  return { color: signalColor };
}

module.exports = { processEvent, getSignalStatus };
