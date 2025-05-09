// agent.cjs
let signalOn = false;

function processEvent(payload) {
  console.log('🧠 Agent activated!');
  signalOn = true;
  return { status: 'signal on' };
}

function getSignalStatus() {
  return { signalOn };
}

module.exports = { processEvent, getSignalStatus };
