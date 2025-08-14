// Test script for Enhanced AI Service
// Run with: node test-enhanced-ai.js

const EnhancedAIService = require('./server/src/services/enhancedAIService.js');

async function testEnhancedAI() {
  console.log('🚀 Testing Enhanced AI Service...\n');
  
  const aiService = new EnhancedAIService();
  const testCustomerId = 'TEST-CUSTOMER-001';
  const testSessionId = 'test-session-123';
  
  // Test cases
  const testMessages = [
    "Hi there!",
    "I want to cancel order ORD-12345",
    "Can you track my order ORD-67890 and also help me return ORD-11111?",
    "I'm really frustrated with my order, this is taking too long and I'm very angry",
    "Track order ABC123",
    "What's the status of my recent purchase?",
    "I need help with payment issues for my order"
  ];
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\n📝 Test ${i + 1}: "${message}"`);
    console.log('─'.repeat(50));
    
    try {
      const response = await aiService.processMessage(message, testCustomerId, testSessionId);
      
      console.log('🤖 AI Response:', response.message);
      console.log('🎯 Intent:', response.intent);
      console.log('🔍 Confidence:', response.confidence);
      console.log('📊 Actions:', response.actions || 'None');
      console.log('🔧 Debug - Full Response:', JSON.stringify(response, null, 2));
      
      if (response.escalation) {
        console.log('⚠️  Escalation:', response.escalation.priority, '- Reasons:', response.escalation.reasons.join(', '));
      }
      
      if (response.context && response.context.isComplex) {
        console.log('🔄 Complex Query: Multiple intents detected');
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  // Test service statistics
  console.log('\n📊 Service Statistics:');
  console.log('─'.repeat(30));
  const stats = aiService.getServiceStats();
  console.log(JSON.stringify(stats, null, 2));
  
  console.log('\n✅ Testing completed!');
  
  // Cleanup
  aiService.destroy();
}

// Run the test
testEnhancedAI().catch(console.error);
