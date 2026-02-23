// test-api.js - ทดสอบ API
const ALPHA_VANTAGE_KEY = 'ใส่_API_KEY_ของคุณ'; // ← แก้ตรงนี้

async function testAPI() {
  console.log('🔍 Testing Alpha Vantage API...');
  
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${ALPHA_VANTAGE_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('✅ API Response:', JSON.stringify(data, null, 2));
    
    if (data['Global Quote']) {
      console.log('✅ Success! Price:', data['Global Quote']['05. price']);
    } else if (data['Note']) {
      console.log('⚠️ API Limit reached:', data['Note']);
    } else if (data['Error Message']) {
      console.log('❌ Error:', data['Error Message']);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
