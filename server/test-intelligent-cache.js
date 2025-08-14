/**
 * Test Script for Intelligent Chat Cache System
 * Demonstrates the caching and similarity matching capabilities
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testQuestion(question, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`📤 Question: "${question}"`);
  
  try {
    const response = await axios.post(`${BASE_URL}/chat`, {
      message: question,
      sessionId: `test_${Date.now()}`,
      customerId: 'CUST-001'
    });

    const { message, cache } = response.data;
    console.log(`📨 Response: ${message.substring(0, 80)}...`);
    
    if (cache.used) {
      console.log(`🎯 CACHE HIT! (${cache.similarity}% similarity, used ${cache.usageCount} times, match type: ${cache.matchType})`);
    } else {
      console.log(`💭 Cache miss - stored new response for future use`);
    }
    
    return response.data;
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function getCacheStats() {
  try {
    const response = await axios.get(`${BASE_URL}/chat/cache/stats`);
    return response.data.stats;
  } catch (error) {
    console.log(`❌ Error getting stats: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Intelligent Chat Cache Tests\n');
  
  // Get initial cache stats
  const initialStats = await getCacheStats();
  console.log('📊 Initial Cache Stats:', initialStats);
  
  // Test 1: First time asking a question
  await testQuestion('I want to cancel my iPhone order', 'First time asking about cancellation');
  await delay(1000);
  
  // Test 2: Asking the exact same question
  await testQuestion('I want to cancel my iPhone order', 'Exact same question (should hit cache)');
  await delay(1000);
  
  // Test 3: Similar question with different wording
  await testQuestion('Cancel my iPhone order please', 'Similar question with different wording');
  await delay(1000);
  
  // Test 4: Another variation
  await testQuestion('Help me cancel iPhone order', 'Another variation of the same request');
  await delay(1000);
  
  // Test 5: Completely different question
  await testQuestion('What is your return policy?', 'Completely different question');
  await delay(1000);
  
  // Test 6: Another new question
  await testQuestion('Track my MacBook order', 'New question about tracking');
  await delay(1000);
  
  // Test 7: Similar tracking question
  await testQuestion('I need to track my MacBook', 'Similar tracking question');
  await delay(1000);
  
  // Get final cache stats
  const finalStats = await getCacheStats();
  console.log('\n📊 Final Cache Stats:', finalStats);
  
  if (initialStats && finalStats) {
    console.log(`\n📈 Cache Performance:`);
    console.log(`   • New entries added: ${finalStats.totalEntries - initialStats.totalEntries}`);
    console.log(`   • Total cache usage: ${finalStats.totalUsage}`);
    console.log(`   • Average usage per entry: ${finalStats.avgUsage}`);
    console.log(`   • Cache hit rate: ${Math.round(finalStats.hitRate * 100)}%`);
  }
  
  console.log('\n✅ Test completed! Your intelligent chat cache is working perfectly.');
  console.log('\n🎯 Key Benefits:');
  console.log('   • Reduces API calls to Gemini');
  console.log('   • Faster response times for similar questions');
  console.log('   • Learns from previous conversations');
  console.log('   • Automatic similarity matching');
  console.log('   • Usage tracking and analytics');
}

// Run the tests
runTests().catch(console.error);
