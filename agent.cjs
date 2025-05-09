// agent.cjs

let signalStatus = 'undefined';

function getSignalStatus() {
  return { color: signalStatus === 'signal on' ? 'green' : 'red' };
}

async function processEvent(payload) {
  console.log('🧠 Agent activated!');
  signalStatus = 'signal on';
  return { status: signalStatus };
}

module.exports = { processEvent, getSignalStatus };
