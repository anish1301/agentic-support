// Quick test to verify the conversation flow
const axios = require('axios');

async function testConversationFlow() {
  const API_BASE = 'http://localhost:3002/api';
  
  console.log('🔄 Testing conversation flow...\n');
  
  try {
    // Step 1: Say "cancel my order"
    console.log('Step 1: User says "cancel my order"');
    const response1 = await axios.post(`${API_BASE}/chat`, {
      message: 'cancel my order',
      customerId: 'CUST-001'
    });
    
    console.log('Response:', response1.data.message);
    console.log('Actions:', response1.data.actions);
    console.log('NeedsConfirmation:', response1.data.needsConfirmation);
    console.log('SessionId:', response1.data.sessionId);
    console.log('\n');
    
    // Step 2: User specifies "iPhone"  
    console.log('Step 2: User says "iPhone"');
    const response2 = await axios.post(`${API_BASE}/chat`, {
      message: 'iPhone',
      customerId: 'CUST-001',
      sessionId: response1.data.sessionId
    });
    
    console.log('Response:', response2.data.message);
    console.log('Actions:', response2.data.actions);
    console.log('NeedsConfirmation:', response2.data.needsConfirmation);
    console.log('\n');
    
    // Step 3: User confirms with "yes"
    console.log('Step 3: User confirms with "yes"');
    const response3 = await axios.post(`${API_BASE}/chat`, {
      message: 'yes',
      customerId: 'CUST-001',
      sessionId: response1.data.sessionId
    });
    
    console.log('Response:', response3.data.message);
    console.log('Actions:', response3.data.actions);
    console.log('Success:', response3.data.success);
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testConversationFlow();
