require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = 3000;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(bodyParser.json());

app.post('/order-telegram', async (req, res) => {
  try {
    const body = req.body;

    // Cek event
    if (body.event === 'receipt.created') {
      const receipt = body.data;

      // Format pesan Telegram
      let pesan = `🧾 *Pesanan Baru*\n`;
      pesan += `No: *${receipt.receipt_number}*\n`;
      pesan += `Tipe: *${receipt.receipt_type}*\n`;
      pesan += `Metode: *${receipt.payments[0]?.name || '-'}*\n`;
      pesan += `Total: *Rp ${receipt.total_money.toLocaleString()}*\n`;
      pesan += `🕒 Waktu: ${new Date(receipt.created_at).toLocaleString('id-ID')}\n`;
      pesan += `🍽️ Dine: ${receipt.dining_option}\n\n`;

      // Daftar item
      pesan += `🧾 *Detail Pesanan:*\n`;
      receipt.line_items.forEach((item, i) => {
        pesan += `${i + 1}. ${item.item_name} x${item.quantity} - Rp ${item.total_money.toLocaleString()}\n`;
        if (item.line_note) pesan += `   📝 Note: ${item.line_note}\n`;
        if (item.line_modifiers?.length > 0) {
          item.line_modifiers.forEach(mod => {
            pesan += `   ➕ ${mod.name}: ${mod.option}\n`;
          });
        }
      });

      // Kirim ke Telegram
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: pesan,
        parse_mode: "Markdown"
      });

      console.log('✅ Pesan terkirim ke Telegram');
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Gagal memproses webhook:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server aktif di http://localhost:${port}`);
});
