require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Escape karakter MarkdownV2 agar tidak error saat dikirim
function escapeMarkdown(text) {
  return text
    .toString()
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.type === 'receipts.update' && body.receipts?.length > 0) {
      const receipt = body.receipts[0];

      // Abaikan jika refund
      if (receipt.receipt_type.toLowerCase().includes('refund')) {
        console.log("⛔ Struk refund tidak dikirim ke Telegram");
        return res.status(200).send('Refund - skipped');
      }

      // Format waktu
      const waktu = new Date(receipt.created_at).toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ' WIB';

      // Buat pesan Telegram
      let pesan = `🧾 *Pesanan Baru*\n`;
      pesan += `━━━━━━━━━━━━━━━━━━━\n`;

      receipt.line_items.forEach((item, i) => {
        pesan += `🍽️ *${escapeMarkdown(item.item_name)}* x${item.quantity}\n`;
        pesan += `💸 Rp ${escapeMarkdown(item.total_money.toLocaleString('id-ID'))}\n`;

        if (item.line_note) {
          pesan += `📝 Note: ${escapeMarkdown(item.line_note)}\n`;
        }

        if (item.line_modifiers?.length > 0) {
          item.line_modifiers.forEach(mod => {
            pesan += `➕ ${escapeMarkdown(mod.name)}: ${escapeMarkdown(mod.option)}\n`;
          });
        }

        pesan += `\n`; // Spasi antar item
      });

      pesan += `━━━━━━━━━━━━━━━━━━━\n`;
      pesan += `📄 No: *${escapeMarkdown(receipt.receipt_number)}*\n`;
      pesan += `📌 Tipe: *${escapeMarkdown(receipt.receipt_type)}*\n`;
      pesan += `💳 Metode: *${escapeMarkdown(receipt.payments[0]?.name || '-') }*\n`;
      pesan += `💰 Total: *Rp ${escapeMarkdown(receipt.total_money.toLocaleString('id-ID'))}*\n`;
      pesan += `🕒 Waktu: ${escapeMarkdown(waktu)}\n`;
      pesan += `🍽️ Dine in: *${escapeMarkdown(receipt.dining_option || '-')}*\n`;
      pesan += `━━━━━━━━━━━━━━━━━━━\n`;

      // Kirim ke Telegram
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: pesan,
        parse_mode: 'MarkdownV2',
      });

      console.log('✅ Pesan terkirim ke Telegram');
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server aktif di http://localhost:${port}`);
});
