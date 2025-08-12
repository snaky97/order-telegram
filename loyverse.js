require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json()); // supaya bisa baca body JSON dari webhook

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const webhookToken = process.env.LOYVERSE_WEBHOOK_TOKEN; // token rahasia dari Loyverse

// Endpoint untuk menerima webhook dari Loyverse
app.post('/loyverse-webhook', async (req, res) => {
  try {
    // Verifikasi token
    const tokenHeader = req.headers['x-webhook-token'];
    if (tokenHeader !== webhookToken) {
      console.log('❌ Token webhook salah');
      return res.sendStatus(403);
    }

    const receipt = req.body;
    if (!receipt || receipt.receipt_type !== 'SALE' || !receipt.line_items || receipt.total_money <= 0) {
      return res.sendStatus(200); // data tidak relevan
    }

    const waktu = new Date(receipt.created_at).toLocaleString('id-ID');
    const total = new Intl.NumberFormat('id-ID').format(receipt.total_money);
    const paymentType = receipt.payments?.[0]?.name || 'Tidak diketahui';
    const diningOption = receipt.dining_option || 'Tidak ditentukan';

    const items = receipt.line_items.map(item => {
      const namaProduk = `🍽️*${item.item_name}* x${item.quantity}`;
      const hargaProduk = `Rp ${new Intl.NumberFormat('id-ID').format(item.total_money)}`;
      const catatan = item.line_note ? `✏️ _${item.line_note}_` : '';
      const modifiers = item.line_modifiers?.length
        ? `🔧 Pengubah: ${item.line_modifiers.map(mod => `${mod.name}: (${mod.option})`).join(', ')}`
        : '';
      return `${namaProduk}\n${hargaProduk}\n${catatan}\n${modifiers}`.trim();
    }).join('\n\n');

    const message = `🧾 *PESANAN BARU*\n---------------------\n${items}\n---------------------\n🍽️ *Tipe:* ${diningOption}\n💳 *Pembayaran:* ${paymentType}\n💰 *Total:* Rp ${total}\n🕒 *Waktu:* ${waktu}\n📄 *Struk:* ${receipt.receipt_number}\n----------------------`;

    // Kirim ke Telegram
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

    console.log('✅ Pesanan baru dikirim ke Telegram.');
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Gagal memproses webhook:', error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webhook server berjalan di port ${PORT}`));
