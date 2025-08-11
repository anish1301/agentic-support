// Load environment variables first
require('dotenv').config();

const SmartHybridAIService = require('./src/services/smartHybridAI');

async function testWithGeminiAPI() {
  console.log('🧪 Testing SmartHybridAIService with Gemini API...\n');
  console.log('🔑 Gemini API Key loaded:', process.env.GEMINI_API_KEY ? 'Yes' : 'No');
  
  const smartAI = new SmartHybridAIService();
  
  // Test cases focusing on Gemini activation
  const testCases = [
    {
      name: 'Regular Order Cancellation (Should use local)',
      message: 'I want to cancel order ORD-12345',
      customerId: 'CUST-001',
      sessionId: 'test-session-1'
    },
    {
      name: 'Frustrated Customer - Cancellation (Should use Gemini)',
      message: 'This is absolutely ridiculous! I have been trying to cancel my stupid order ORD-98765 for hours and your terrible system keeps failing! I am so frustrated and angry! Your customer service is garbage!',
      customerId: 'CUST-002',
      sessionId: 'test-session-2'
    },
    {
      name: 'Very Upset Customer - Tracking (Should use Gemini)',
      message: 'I am extremely frustrated!! My order is taking forever and I can\'t get any help from your awful support team. This is the worst experience ever and I want answers NOW!',
      customerId: 'CUST-003',
      sessionId: 'test-session-3'
    },
    {
      name: 'Same Frustrated Message (Should use cache)',
      message: 'This is absolutely ridiculous! I have been trying to cancel my stupid order ORD-98765 for hours and your terrible system keeps failing! I am so frustrated and angry! Your customer service is garbage!',
      customerId: 'CUST-004',
      sessionId: 'test-session-4'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📝 ${testCase.name}`);
    console.log(`Input: "${testCase.message.substring(0, 80)}${testCase.message.length > 80 ? '...' : ''}"`);
    
    try {
      const startTime = Date.now();
      const response = await smartAI.processMessage(
        testCase.message,
        testCase.customerId,
        testCase.sessionId
      );
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Response (${processingTime}ms):`, {
        intent: response.intent,
        source: response.source,
        confidence: response.confidence,
        escalateToHuman: response.escalateToHuman,
        messagePreview: response.message.substring(0, 100) + '...'
      });
      
      // Show processing method
      if (response.source === 'gemini_enhanced') {
        console.log('🤖 Gemini API was used for this frustrated customer');
      } else if (response.source === 'gemini_cached') {
        console.log('💾 Gemini cached response was used');
      } else if (response.source === 'local_empathetic') {
        console.log('💝 Enhanced empathetic local response was used');
      } else {
        console.log('⚡ Standard local processing was used');
      }
      
    } catch (error) {
      console.log(`❌ Error:`, error.message);
    }
    
    console.log('---\n');
  }
  
  // Show final statistics
  console.log('📊 Final Service Statistics:');
  const stats = smartAI.getServiceStats();
  console.log(JSON.stringify(stats, null, 2));
  
  console.log('\n🎉 Gemini-enabled test completed!');
}

// Run the test
testWithGeminiAPI().catch(console.error);
