const SmartHybridAIService = require('./src/services/smartHybridAI');

async function testSmartHybridAI() {
  console.log('🧪 Testing SmartHybridAIService...\n');
  
  const smartAI = new SmartHybridAIService();
  
  // Test cases
  const testCases = [
    {
      name: 'Order Cancellation (Local Processing)',
      message: 'I want to cancel order ORD-12345',
      customerId: 'CUST-001',
      sessionId: 'test-session-1'
    },
    {
      name: 'Order Tracking (Local Processing)',
      message: 'track my order ORD-67890',
      customerId: 'CUST-001', 
      sessionId: 'test-session-2'
    },
    {
      name: 'Frustrated Customer (Should trigger Gemini)',
      message: 'This is ridiculous! I have been trying to cancel my stupid order for hours and nothing works! Your system is garbage and I want my money back right now!',
      customerId: 'CUST-002',
      sessionId: 'test-session-3'
    },
    {
      name: 'General Greeting (Local Processing)',
      message: 'Hello, I need some help',
      customerId: 'CUST-001',
      sessionId: 'test-session-4'
    },
    {
      name: 'Complex Query (Should trigger Gemini)',
      message: 'I am extremely frustrated because I ordered a product 2 weeks ago and it still has not arrived. I have tried tracking it multiple times but the tracking number does not work. This is the worst experience ever and I am considering never shopping here again!',
      customerId: 'CUST-003', 
      sessionId: 'test-session-5'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📝 ${testCase.name}`);
    console.log(`Input: "${testCase.message}"`);
    
    try {
      const startTime = Date.now();
      const response = await smartAI.processMessage(
        testCase.message,
        testCase.customerId,
        testCase.sessionId
      );
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Response (${processingTime}ms):`, {
        message: response.message,
        intent: response.intent,
        source: response.source,
        confidence: response.confidence,
        escalateToHuman: response.escalateToHuman,
        actions: response.actions
      });
      
      // Show if Gemini was used
      if (response.source === 'gemini') {
        console.log('🤖 Gemini API was triggered for this response');
      } else {
        console.log('⚡ Local processing was used');
      }
      
    } catch (error) {
      console.log(`❌ Error:`, error.message);
    }
    
    console.log('---\n');
  }
  
  // Show service statistics
  console.log('📊 Service Statistics:');
  const stats = smartAI.getServiceStats();
  console.log(JSON.stringify(stats, null, 2));
  
  // Show cache status
  console.log('\n💾 Cache Status:');
  console.log('Cached responses:', smartAI.geminiCache.size);
  
  // Test cache by repeating a frustrated message
  console.log('\n🔄 Testing cache with repeated frustrated message...');
  const cacheTestMessage = 'I am so angry about this terrible service!';
  
  console.log('First call (should use Gemini):');
  const startTime1 = Date.now();
  const response1 = await smartAI.processMessage(cacheTestMessage, 'CUST-CACHE-1', 'cache-test-1');
  const time1 = Date.now() - startTime1;
  console.log(`Response time: ${time1}ms, Source: ${response1.source}`);
  
  console.log('\nSecond call (should use cache):');
  const startTime2 = Date.now();
  const response2 = await smartAI.processMessage(cacheTestMessage, 'CUST-CACHE-2', 'cache-test-2');
  const time2 = Date.now() - startTime2;
  console.log(`Response time: ${time2}ms, Source: ${response2.source}`);
  
  console.log('\n🎉 Smart Hybrid AI Service test completed!');
}

// Run the test
testSmartHybridAI().catch(console.error);
