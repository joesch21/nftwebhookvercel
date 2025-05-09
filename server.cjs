// server.cjs

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { processEvent, getSignalStatus } = require('./agent.cjs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files (frontend HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON payloads
app.use(bodyParser.json());

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  console.log('📡 Webhook endpoint hit!');
  console.log('🔍 Payload received:', req.body);

  try {
    const result = await processEvent(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Webhook handling failed:', err);
    res.status(500).json({ error: 'Internal Server Error', reason: err.message });
  }
});

// Frontend polling route
app.get('/signal', (req, res) => {
  const signal = getSignalStatus();
  res.json(signal);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
