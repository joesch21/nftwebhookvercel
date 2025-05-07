import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// ✅ Root route just for testing
app.get('/', (req, res) => {
  res.send('✅ Stripe NFT Webhook Server is running');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
