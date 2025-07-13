require('dotenv').config();
const axios = require('axios');

const loyverseToken = process.env.LOYVERSE_ACCESS_TOKEN;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let lastSentReceiptId = null;

async function getLatestOrder() {
  try {
    const res = await axios.get('https://api.loyverse.com/v1.0/receipts', {
      headers: {
        Authorization: `Bearer ${loyverseToken}`,
      },
      params: {
        limit: 1,
        sort: '-created_at'
      }
    });

    const receipt = res.data.receipts[0];
    if (!receipt) {
      console.log('❗ Tidak ada pesanan.');
      return;
    }

    if (receipt.receipt_number === lastSentReceiptId) {
      console.log('✅ Belum ada pesanan baru.');
      return;
    }

    lastSentReceiptId = receipt.receipt_number;

    const waktu = new Date(receipt.created_at).toLocaleString('id-ID');
    const total = new Intl.NumberFormat('id-ID').format(receipt.total_money);
    const items = receipt.line_items
      .map(item => `🍽️ *${item.item_name}* x${item.quantity}`)
      .join('\n');

    const paymentType = receipt.payments?.[0]?.name || 'Tidak diketahui';
    const diningOption = receipt.dining_option || 'Tidak ditentukan';

    const message = `🧾 *Pesanan Baru Masuk!*\n\n${items}\n\n🍽️ *Tipe Pesanan:* ${diningOption}\n💰 *Total:* Rp ${total}\n💳 *Pembayaran:* ${paymentType}\n🕒 ${waktu}\n\n🟢 *Kode Struk:* ${receipt.receipt_number}`;

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

    console.log('✅ Pesanan dikirim ke Telegram.');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

setInterval(getLatestOrder, 10000);
console.log('⏳ Bot sedang memantau pesanan setiap 10 detik...');