// Test the complete order flow with the fixed entity extraction
require('dotenv').config();
const SmartHybridAIService = require('./src/services/smartHybridAI');

async function testOrderFlow() {
  console.log('🧪 Testing Complete Order Flow:\n');
  
  const smartAI = new SmartHybridAIService();
  
  const testCases = [
    {
      name: 'Quick action without order ID',
      message: 'cancel order',
      expected: 'Should show available orders'
    },
    {
      name: 'Specific order cancellation',
      message: 'cancel order ORD-12345',
      expected: 'Should cancel the specific order'
    },
    {
      name: 'Return without order ID',
      message: 'return my order',
      expected: 'Should show available returnable orders'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📝 ${testCase.name}`);
    console.log(`Input: "${testCase.message}"`);
    console.log(`Expected: ${testCase.expected}`);
    
    try {
      const response = await smartAI.processMessage(
        testCase.message,
        'CUST-001',
        `test-session-${Date.now()}`
      );
      
      console.log(`✅ Response:`, {
        intent: response.intent,
        success: response.success,
        hasOrderId: !!response.orderId,
        needsOrderId: response.needsOrderId,
        messagePreview: response.message.substring(0, 80) + '...'
      });
      
      if (response.availableOrders && response.availableOrders.length > 0) {
        console.log(`📋 Available orders shown: ${response.availableOrders.length} orders`);
      }
      
    } catch (error) {
      console.log(`❌ Error:`, error.message);
    }
    
    console.log('---\n');
  }
  
  console.log('🎉 Order flow test completed!');
}

testOrderFlow().catch(console.error);
