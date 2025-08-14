const axios = require('axios');

async function testAPIEndpoint() {
  console.log('🌐 Testing API Endpoint Integration\n');
  
  const testCases = [
    { message: 'return my order', description: 'Return order request' },
    { message: 'return my macbook', description: 'Return specific product' },
    { message: 'track my order', description: 'Track order request' },
    { message: 'cancel my iphone', description: 'Cancel specific product' }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing: ${testCase.description} - "${testCase.message}"`);
      
      const response = await axios.post('http://localhost:3002/api/chat', {
        message: testCase.message,
        sessionId: `test_api_${Date.now()}`,
        customerId: 'CUST-001'
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📨 Response: ${JSON.stringify(response.data, null, 2)}\n`);
      
    } catch (error) {
      console.error(`❌ API Error: ${error.response ? error.response.status : 'Network'}`);
      if (error.response) {
        console.error(`💬 Error Message: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.error(`🔥 Error Details: ${error.message}`);
      }
      console.log('');
    }
  }
}

testAPIEndpoint();
