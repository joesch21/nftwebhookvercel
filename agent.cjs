let signalStatus = 'undefined';

function getSignalStatus() {
  return { status: signalStatus };
}

async function processEvent(payload) {
  console.log('🧠 Agent activated!');
  signalStatus = 'signal on';
  return { status: signalStatus };
}

module.exports = { processEvent, getSignalStatus };

