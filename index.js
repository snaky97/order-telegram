require('dotenv').config();
const express = require('express');
const { sendReceiptToTelegram } = require('./loyverse');

const app = express();
app.use(express.json());

const webhookToken = process.env.LOYVERSE_WEBHOOK_TOKEN; // token dari Loyverse

app.post('/loyverse-webhook', async (req, res) => {
  try {
    const tokenHeader = req.headers['x-webhook-token'];
    if (tokenHeader !== webhookToken) {
      console.log('❌ Token tidak valid');
      return res.sendStatus(403);
    }

    const receipt = req.body;
    if (!receipt || receipt.receipt_type !== 'SALE' || !receipt.line_items || receipt.total_money <= 0) {
      return res.sendStatus(200);
    }

    await sendReceiptToTelegram(receipt);
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Gagal memproses webhook:', error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webhook server berjalan di port ${PORT}`));
