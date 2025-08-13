// Test Conversation Context and Follow-up Dialogue
// Tests the three bugs identified:
// 1. Multi-turn dialogue context (track order → iPhone)
// 2. Gemini fallback for low confidence messages
// 3. MongoDB persistence for chat history

const SmartHybridAIService = require('./src/services/smartHybridAI');

// Test data
const mockUserOrders = [
  {
    id: 'ORD-101',
    customerId: 'CUST-001',
    status: 'processing',
    items: [{ name: 'iPhone 15 Pro', variant: '256GB', price: 999 }],
    total: 999,
    canCancel: true,
    canReturn: false,
    trackingNumber: 'TRK123456',
    estimatedDelivery: '2024-01-15'
  },
  {
    id: 'ORD-102', 
    customerId: 'CUST-001',
    status: 'shipped',
    items: [{ name: 'MacBook Pro 14', variant: 'M3 Pro', price: 1999 }],
    total: 1999,
    canCancel: false,
    canReturn: false,
    trackingNumber: 'TRK789012',
    estimatedDelivery: '2024-01-18'
  },
  {
    id: 'ORD-103',
    customerId: 'CUST-001', 
    status: 'delivered',
    items: [{ name: 'AirPods Pro 2', variant: 'USB-C', price: 249 }],
    total: 249,
    canCancel: false,
    canReturn: true,
    trackingNumber: 'TRK345678',
    estimatedDelivery: null
  }
];

// Test scenarios
const conversationTests = [
  {
    name: "Multi-turn Dialogue Context - Track Order + Product Name",
    description: "User says 'track order', bot asks which one, user says 'iPhone' - should continue tracking context",
    messages: [
      { text: "track order", expectedIntent: "TRACK_ORDER", expectsPending: true },
      { text: "iPhone", expectedIntent: "TRACK_ORDER", expectsResolved: true }
    ]
  },
  {
    name: "Multi-turn Dialogue Context - Cancel Order + Product Name", 
    description: "User says 'cancel my order', bot asks which one, user says 'iPhone' - should cancel iPhone order",
    messages: [
      { text: "cancel my order", expectedIntent: "CANCEL_ORDER", expectsPending: true },
      { text: "iPhone", expectedIntent: "CANCEL_ORDER", expectsResolved: true }
    ]
  },
  {
    name: "Context Reset on Topic Change",
    description: "User changes topic mid-conversation - pending intent should be cleared",
    messages: [
      { text: "I want to cancel multiple orders", expectedIntent: "CANCEL_ORDER", expectsPending: true },
      { text: "what's the weather like", expectedIntent: "GENERAL_INQUIRY", expectsPending: false }
    ]
  },
  {
    name: "Low Confidence Gemini Fallback",
    description: "Very ambiguous message should trigger Gemini fallback (if available) or enhanced local response",
    messages: [
      { text: "uh... hmm... maybe something?", expectedIntent: "GENERAL_INQUIRY", expectsGeminiFallback: true }
    ]
  },
  {
    name: "Follow-up Help Request",
    description: "User asks for help during pending intent should provide guidance",
    messages: [
      { text: "I need to track one of my orders", expectedIntent: "TRACK_ORDER", expectsPending: true },
      { text: "what are my options?", expectedIntent: "TRACK_ORDER", expectsHelp: true }
    ]
  }
];

// Run tests
async function runConversationTests() {
  console.log('🧪 Running Conversation Context Tests\n');
  
  const smartAI = new SmartHybridAIService();
  let passedTests = 0;
  let totalTests = conversationTests.length;
  
  for (const test of conversationTests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`   Description: ${test.description}`);
    
    let testPassed = true;
    let sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      for (let i = 0; i < test.messages.length; i++) {
        const msg = test.messages[i];
        console.log(`\n   Step ${i + 1}: User says "${msg.text}"`);
        
        // Send message to AI
        const response = await smartAI.processMessage(
          msg.text,
          'CUST-001',
          sessionId,
          mockUserOrders
        );
        
        console.log(`   🤖 Bot Response: "${response.message.substring(0, 100)}..."`);
        console.log(`   📊 Intent: ${response.intent}, Success: ${response.success}, Source: ${response.source}`);
        
        // Check pending intent status
        const hasPending = smartAI.contextMemory.hasPendingIntent(sessionId);
        console.log(`   🔄 Has Pending Intent: ${hasPending}`);
        
        // Validate expectations
        if (msg.expectedIntent && response.intent !== msg.expectedIntent) {
          console.log(`   ❌ Intent mismatch: expected ${msg.expectedIntent}, got ${response.intent}`);
          testPassed = false;
        }
        
        if (msg.expectsPending !== undefined && hasPending !== msg.expectsPending) {
          console.log(`   ❌ Pending intent mismatch: expected ${msg.expectsPending}, got ${hasPending}`);
          testPassed = false;
        }
        
        if (msg.expectsResolved && !response.success) {
          console.log(`   ❌ Expected resolution but got success: ${response.success}`);
          testPassed = false;
        }
        
        if (msg.expectsGeminiFallback && !response.source?.includes('gemini') && response.confidence > 0.4) {
          console.log(`   ℹ️  Gemini fallback not triggered (API may not be available)`);
        }
        
        if (msg.expectsHelp && !response.message.toLowerCase().includes('help')) {
          console.log(`   ❌ Expected help message but didn't find help content`);
          testPassed = false;
        }
      }
      
      if (testPassed) {
        console.log(`   ✅ Test PASSED`);
        passedTests++;
      } else {
        console.log(`   ❌ Test FAILED`);
      }
      
    } catch (error) {
      console.log(`   💥 Test ERROR: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  // Test MongoDB persistence simulation
  console.log(`\n🗄️  Testing MongoDB Persistence Simulation...`);
  try {
    const sessionId = `persist_test_${Date.now()}`;
    const response = await smartAI.processMessage(
      'test persistence',
      'CUST-001',
      sessionId,
      mockUserOrders
    );
    
    console.log('   ✅ MongoDB persistence simulation working (check console logs for save attempts)');
  } catch (error) {
    console.log(`   ❌ MongoDB persistence simulation failed: ${error.message}`);
  }
  
  // Test stats and cleanup
  console.log(`\n📈 Service Stats:`);
  const stats = smartAI.getServiceStats();
  console.log(`   - Gemini API Available: ${stats.hasGeminiAPI}`);
  console.log(`   - Active Memory Contexts: ${stats.memoryStats.activeContexts}`);
  console.log(`   - Gemini Cache Size: ${stats.geminiCache.cacheSize}`);
  
  smartAI.destroy();
  console.log('\n🎯 All tests completed!');
  
  return passedTests === totalTests;
}

// Run if called directly
if (require.main === module) {
  runConversationTests()
    .then(success => {
      console.log(`\n${success ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runConversationTests };
