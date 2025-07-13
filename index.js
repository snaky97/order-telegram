require('dotenv').config();
const axios = require('axios');

const loyverseToken = process.env.LOYVERSE_ACCESS_TOKEN;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let lastSentReceiptId = null;

async function getLatestOrder() {
  try {
    console.log('🔍 [DEBUG] Mengecek pesanan...');

    const res = await axios.get('https://api.loyverse.com/v1.0/receipts', {
      headers: {
        Authorization: `Bearer ${loyverseToken}`,
      },
      params: {
        limit: 1,
        sort: '-created_at'
      }
    });

    const receipt = res.data.receipts?.[0];
    if (!receipt) {
      console.log('❗ Tidak ada data receipt.');
      return;
    }

    if (receipt.receipt_type !== 'SALE') {
      console.log(`⛔ Dilewati karena bukan tipe SALE, melainkan: ${receipt.receipt_type}`);
      return;
    }

    if (!receipt.line_items || receipt.total_money <= 0) {
      console.log('⛔ Dilewati karena kosong atau total 0');
      return;
    }

    if (receipt.receipt_number === lastSentReceiptId) {
      console.log(`✅ Tidak ada pesanan baru. Sudah kirim struk: ${receipt.receipt_number}`);
      return;
    }

    lastSentReceiptId = receipt.receipt_number;

    const waktu = new Date(receipt.created_at).toLocaleString('id-ID');
    const total = new Intl.NumberFormat('id-ID').format(receipt.total_money);
    const paymentType = receipt.payments?.[0]?.name || 'Tidak diketahui';
    const diningOption = receipt.dining_option || 'Tidak ditentukan';

    // Format item dengan catatan & pengubah
    const items = receipt.line_items.map(item => {
      const namaProduk = `🍽️*${item.item_name}* x${item.quantity}`;
      const hargaProduk = `Rp ${new Intl.NumberFormat('id-ID').format(item.total_money)}`;
      const catatan = item.line_note ? `✏️ _${item.line_note}_` : '';
      const modifiers = item.line_modifiers?.length
        ? `🔧 Pengubah: ${item.line_modifiers.map(mod => `${mod.name}: (${mod.option})`).join(', ')}`
        : '';
      
      return `${namaProduk}\n${hargaProduk}\n${catatan}\n${modifiers}`.trim();
    }).join('\n\n');

    // Format struk pesan
    const message = `🧾 *PESANAN BARU*\n---------------------\n${items}\n---------------------\n🍽️ *Tipe:* ${diningOption}\n💳 *Pembayaran:* ${paymentType}\n💰 *Total:* Rp ${total}\n🕒 *Waktu:* ${waktu}\n📄 *Struk:* ${receipt.receipt_number}\n----------------------`;

    // Kirim ke Telegram
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

    console.log('✅ Pesanan baru dikirim ke Telegram.');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

console.log('⏳ Bot sedang memantau pesanan setiap 10 detik...');
setInterval(getLatestOrder, 10000);
