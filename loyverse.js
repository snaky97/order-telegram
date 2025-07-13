require('dotenv').config();
const axios = require('axios');

const loyverseToken = process.env.LOYVERSE_ACCESS_TOKEN;

async function getOrders() {
  try {
    const response = await axios.get('https://api.loyverse.com/v1.0/receipts', {
      headers: {
        Authorization: `Bearer ${loyverseToken}`,
      },
    });

    const data = response.data;

    console.log(data); // Lihat data pesanan
  } catch (error) {
    console.error('Gagal ambil data dari Loyverse:', error.response?.data || error.message);
  }
}

getOrders();