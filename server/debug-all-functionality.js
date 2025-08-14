const SmartHybridAIService = require('./src/services/smartHybridAI');
const { mockOrders } = require('./src/utils/mockData');

async function testAllFunctionality() {
  const service = new SmartHybridAIService();
  
  console.log('🧪 Testing All AI Functionality\n');
  
  const userOrders = mockOrders.filter(o => o.customerId === 'CUST-001');
  
  const testCases = [
    'cancel my order',
    'track my order', 
    'return my order',
    'cancel my iphone',
    'track my macbook',
    'return my macbook',
    'where is my order',
    'help me with my order',
    'what are my options',
    'hello',
    'I need help',
    'what can you do',
    'I have a problem with my order'
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const message = testCases[i];
    const sessionId = `test_session_${i}_${Date.now()}`;
    
    try {
      console.log(`\n📝 Test ${i + 1}: "${message}"`);
      const response = await service.processMessage(message, 'CUST-001', sessionId, userOrders);
      
      console.log(`✅ Intent: ${response.intent}, Success: ${response.success}`);
      if (response.actions && response.actions.length > 0) {
        console.log(`🎯 Actions: ${JSON.stringify(response.actions)}`);
      }
      if (response.error) {
        console.log(`⚠️  Error: ${response.error}`);
      }
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed:`, error.message);
      console.error('Stack trace:', error.stack);
      break;
    }
  }
  
  console.log('\n🎉 All tests completed!');
}

testAllFunctionality();
