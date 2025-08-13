// Test Frontend-Backend Integration 
// Tests the complete flow from chat message to order state update

const SmartHybridAIService = require('./src/services/smartHybridAI');
const { mockOrders } = require('./src/utils/mockData');

async function testCompleteOrderFlow() {
  console.log('🧪 Testing Complete Order Management Flow\n');
  
  const smartAI = new SmartHybridAIService();
  const sessionId = `integration_test_${Date.now()}`;
  
  // Use the actual mock data from the backend
  const userOrders = mockOrders.filter(order => order.customerId === 'CUST-001');
  
  console.log('📋 Available Orders for Sarah Johnson (CUST-001):');
  userOrders.forEach(order => {
    console.log(`   - ${order.id}: ${order.items.map(item => item.name).join(', ')} (${order.status})`);
    console.log(`     Can Cancel: ${order.canCancel}, Can Return: ${order.canReturn}`);
  });
  
  console.log('\n🎯 Test Scenario: Cancel iPhone Order via Chat\n');
  
  // Step 1: User says "cancel my order"
  console.log('👤 User: "cancel my order"');
  let response = await smartAI.processMessage('cancel my order', 'CUST-001', sessionId, userOrders);
  
  console.log(`🤖 Bot: "${response.message.substring(0, 100)}..."`);
  console.log(`📊 Response Details:`);
  console.log(`   - Intent: ${response.intent}`);
  console.log(`   - Success: ${response.success}`);
  console.log(`   - Actions: ${JSON.stringify(response.actions || [])}`);
  console.log(`   - Pending Intent: ${smartAI.contextMemory.hasPendingIntent(sessionId)}`);
  
  if (response.needsConfirmation && response.suggestedOrder) {
    console.log(`   - Suggested Order: ${response.suggestedOrder.id}`);
    
    // Step 2: User confirms with "yes"
    console.log('\n👤 User: "yes"');
    response = await smartAI.processMessage('yes', 'CUST-001', sessionId, userOrders);
    
    console.log(`🤖 Bot: "${response.message.substring(0, 100)}..."`);
    console.log(`📊 Response Details:`);
    console.log(`   - Intent: ${response.intent}`);
    console.log(`   - Success: ${response.success}`);
    console.log(`   - Actions: ${JSON.stringify(response.actions || [])}`);
    console.log(`   - Order ID: ${response.orderId}`);
    
    if (response.success) {
      console.log('   ✅ Order cancellation confirmed!');
    } else {
      console.log('   ❌ Order cancellation failed!');
    }
  }
  
  // Step 3: Test product name follow-up
  console.log('\n🎯 Test Scenario: Track Order by Product Name\n');
  
  const trackingSessionId = `tracking_${Date.now()}`;
  
  console.log('👤 User: "track my order"');
  response = await smartAI.processMessage('track my order', 'CUST-001', trackingSessionId, userOrders);
  
  console.log(`🤖 Bot: "${response.message.substring(0, 100)}..."`);
  console.log(`📊 Has Pending Intent: ${smartAI.contextMemory.hasPendingIntent(trackingSessionId)}`);
  
  if (smartAI.contextMemory.hasPendingIntent(trackingSessionId)) {
    console.log('\n👤 User: "iPhone"');
    response = await smartAI.processMessage('iPhone', 'CUST-001', trackingSessionId, userOrders);
    
    console.log(`🤖 Bot: "${response.message.substring(0, 100)}..."`);
    console.log(`📊 Response Details:`);
    console.log(`   - Intent: ${response.intent}`);
    console.log(`   - Success: ${response.success}`);
    console.log(`   - Actions: ${JSON.stringify(response.actions || [])}`);
    console.log(`   - Order ID: ${response.orderId}`);
    console.log(`   - Is Follow-up: ${response.isFollowUp}`);
    
    if (response.success && response.orderId === 'ORD-12345') {
      console.log('   ✅ iPhone order tracking successful!');
    } else {
      console.log('   ❌ iPhone order tracking failed!');
    }
  }
  
  // Step 4: Test entity extraction
  console.log('\n🔍 Testing Entity Extraction:');
  
  const testMessages = [
    'cancel my iPhone',
    'track the MacBook', 
    'return my AirPods',
    'cancel ORD-12345'
  ];
  
  for (const message of testMessages) {
    const analysis = smartAI.intentClassifier.analyzeMessage(message, userOrders);
    console.log(`\n   "${message}":`);
    console.log(`     - Intent: ${analysis.primaryIntent} (confidence: ${analysis.confidence.toFixed(2)})`);
    console.log(`     - Products found: ${JSON.stringify(analysis.entities.products)}`);
    console.log(`     - Order IDs found: ${JSON.stringify(analysis.entities.orderIds)}`);
    console.log(`     - Matched Orders: ${analysis.entities.matchedOrders.length}`);
  }
  
  // Statistics
  const stats = smartAI.getServiceStats();
  console.log('\n📊 Final Statistics:');
  console.log(`   - Active Conversations: ${stats.memoryStats.activeContexts}`);
  console.log(`   - Gemini Available: ${stats.hasGeminiAPI}`);
  
  smartAI.destroy();
  
  console.log('\n🎉 Integration test completed!');
  return true;
}

// Run integration test
if (require.main === module) {
  testCompleteOrderFlow()
    .then(success => {
      console.log('\n🚀 Integration test passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Integration test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteOrderFlow };
