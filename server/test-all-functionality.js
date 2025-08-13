const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api';

async function testChatMessage(message, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`💬 Message: "${message}"`);
  
  try {
    const response = await axios.post(`${BASE_URL}/chat`, {
      message: message,
      customerId: 'CUST-001',
      sessionId: `test_${Date.now()}`
    });
    
    console.log(`✅ Success: ${response.data.success}`);
    console.log(`🤖 Bot Response: "${response.data.message.substring(0, 100)}..."`);
    console.log(`📊 Intent: ${response.data.intent || 'N/A'}`);
    console.log(`🔧 Actions: ${JSON.stringify(response.data.actions || [])}`);
    
    if (!response.data.success) {
      console.log(`❌ Error: ${response.data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log(`💥 Request Failed: ${error.message}`);
    if (error.response) {
      console.log(`📋 Status: ${error.response.status}`);
      console.log(`📋 Response: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  console.log('-'.repeat(50));
}

async function runTests() {
  console.log('🔍 Testing All Functionality\n');
  
  // Test cases that should work
  await testChatMessage('cancel my iphone', 'Cancel iPhone order');
  await testChatMessage('return my macbook', 'Return MacBook order');
  await testChatMessage('track my order', 'Track any order');
  await testChatMessage('return my airpods', 'Return AirPods order');
  await testChatMessage('cancel order ORD-101', 'Cancel order by ID');
  await testChatMessage('track order ORD-102', 'Track order by ID');
  await testChatMessage('help me', 'General help request');
  await testChatMessage('what are my orders?', 'List orders request');
  
  console.log('\n🎯 All tests completed!');
}

runTests().catch(console.error);
