const axios = require('axios');

async function testReturn() {
  console.log('🧪 Testing Return Order Functionality\n');
  
  try {
    const response = await axios.post('http://localhost:3002/api/chat', {
      message: 'return my macbook',
      customerId: 'CUST-001',
      sessionId: `test_${Date.now()}`
    });
    
    console.log('✅ Request successful!');
    console.log('📋 Full Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Request failed!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testReturn();
