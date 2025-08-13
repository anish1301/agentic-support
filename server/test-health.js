const axios = require('axios');

async function testHealthCheck() {
  try {
    console.log('🔍 Testing server health...');
    const response = await axios.get('http://localhost:3002/health');
    console.log('✅ Health check successful:', response.data);
    
    console.log('\n🔍 Testing chat endpoint...');
    const chatResponse = await axios.post('http://localhost:3002/api/chat', {
      message: 'hello',
      customerId: 'CUST-001'
    });
    console.log('✅ Chat endpoint successful:', chatResponse.data.success);
    console.log('🤖 Response:', chatResponse.data.message.substring(0, 100));
    
  } catch (error) {
    console.log('❌ Error:', error.code || error.message);
    if (error.response) {
      console.log('📋 Status:', error.response.status);
      console.log('📋 Response:', error.response.data);
    }
  }
}

testHealthCheck();
