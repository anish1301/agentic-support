const SmartHybridAIService = require('./src/services/smartHybridAI');
const { mockOrders } = require('./src/utils/mockData');

async function testReturnOrder() {
  const service = new SmartHybridAIService();
  
  console.log('🧪 Testing Return Order Functionality\n');
  
  try {
    // Test 1: "return my order"
    console.log('Test 1: User says "return my order"');
    const response1 = await service.processMessage(
      'return my order',
      'CUST-001',
      'test_return_123',
      mockOrders.filter(o => o.customerId === 'CUST-001')
    );
    
    console.log('Response:', response1);
    console.log('✅ Test 1 passed\n');
    
    // Test 2: "return my macbook" (specific product)
    console.log('Test 2: User says "return my macbook"');
    const response2 = await service.processMessage(
      'return my macbook',
      'CUST-001',
      'test_return_456',
      mockOrders.filter(o => o.customerId === 'CUST-001')
    );
    
    console.log('Response:', response2);
    console.log('✅ Test 2 passed\n');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

testReturnOrder();
