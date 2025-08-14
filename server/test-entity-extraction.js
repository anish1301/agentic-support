// Test the improved entity extraction
const SmartHybridAIService = require('./src/services/smartHybridAI');

function testEntityExtraction() {
  const smartAI = new SmartHybridAIService();
  
  const testCases = [
    'I want to cancel order',  // Should NOT extract any order ID
    'Cancel my order',         // Should NOT extract any order ID  
    'cancel order ORD-12345',  // Should extract ORD-12345
    'track order 12345',       // Should extract ORD-12345
    'I need to return order ORD-67890',  // Should extract ORD-67890
    'please cancel order 98765',  // Should extract ORD-98765
  ];
  
  console.log('🧪 Testing Entity Extraction:\n');
  
  testCases.forEach(message => {
    const analysis = smartAI.intentClassifier.analyzeMessage(message);
    console.log(`Message: "${message}"`);
    console.log(`Intent: ${analysis.primaryIntent}`);
    console.log(`Order IDs: [${analysis.entities.orderIds.join(', ')}]`);
    console.log('---');
  });
  
  console.log('\n✅ Entity extraction test completed!');
}

testEntityExtraction();
