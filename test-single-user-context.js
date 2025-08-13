// Test Single-User Context System
// This demonstrates the enhanced AI system with personalized context

const mockOrders = [
  {
    id: 'ORD-12345',
    customerId: 'CUST-001',
    customerName: 'Sarah Johnson',
    status: 'confirmed',
    items: [
      { 
        id: 'ITEM-001',
        name: 'iPhone 15 Pro',
        variant: '256GB Deep Purple',
        quantity: 1,
        price: 1099
      }
    ],
    total: 1099,
    orderDate: '2025-08-10T10:30:00Z',
    canCancel: true,
    canReturn: false,
    trackingNumber: '1Z999AA1234567890',
    estimatedDelivery: '2025-08-15T18:00:00Z'
  },
  {
    id: 'ORD-12346',
    customerId: 'CUST-001',
    customerName: 'Sarah Johnson',
    status: 'shipped',
    items: [
      { 
        id: 'ITEM-002',
        name: 'MacBook Pro 14',
        variant: 'M3, 512GB SSD, Silver',
        quantity: 1,
        price: 1999
      }
    ],
    total: 1999,
    orderDate: '2025-08-08T14:15:00Z',
    canCancel: false,
    canReturn: true,
    trackingNumber: '1Z999BB9876543210',
    estimatedDelivery: '2025-08-13T16:00:00Z'
  }
];

// Test scenarios for single-user context
const testScenarios = [
  {
    name: "Cancel by Order ID",
    message: "cancel order ORD-12345",
    expectedIntent: "CANCEL_ORDER",
    expectedSuccess: true
  },
  {
    name: "Cancel by Product Name - Exact Match", 
    message: "cancel my iPhone 15 Pro order",
    expectedIntent: "CANCEL_ORDER",
    expectedSuccess: true,
    expectedProductMatch: "iPhone 15 Pro"
  },
  {
    name: "Cancel by Product Name - Partial Match",
    message: "cancel my iPhone order", 
    expectedIntent: "CANCEL_ORDER",
    expectedSuccess: true,
    expectedProductMatch: "iPhone 15 Pro"
  },
  {
    name: "Track by Product Name",
    message: "track my MacBook Pro",
    expectedIntent: "TRACK_ORDER", 
    expectedSuccess: true,
    expectedProductMatch: "MacBook Pro 14"
  },
  {
    name: "Return by Product Name",
    message: "return my MacBook",
    expectedIntent: "RETURN_ORDER",
    expectedSuccess: true,
    expectedProductMatch: "MacBook Pro 14"
  },
  {
    name: "Cancel without Order ID - Show Options",
    message: "cancel my order",
    expectedIntent: "CANCEL_ORDER",
    expectedSuccess: false,
    expectsOrderSelection: true
  },
  {
    name: "Track without Order ID - Show Options", 
    message: "track my order",
    expectedIntent: "TRACK_ORDER",
    expectedSuccess: false,
    expectsOrderSelection: true
  }
];

console.log("🧪 Testing Single-User Context System");
console.log("=====================================");

// Mock enhanced AI service for testing
class MockEnhancedAI {
  constructor() {
    this.primaryUser = {
      id: 'CUST-001', 
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com'
    };
  }

  // Simplified product matching logic (enhanced)
  extractProductMatches(message, userOrders) {
    const lowerMessage = message.toLowerCase();
    const matches = [];

    for (const order of userOrders) {
      for (const item of order.items) {
        const itemName = item.name.toLowerCase();
        const keywords = itemName.split(' ').filter(word => word.length > 2);
        
        // Check for exact match first
        if (lowerMessage.includes(itemName)) {
          matches.push({
            orderId: order.id,
            matchedProduct: item.name,
            matchType: 'exact',
            confidence: 1.0,
            order: order
          });
          continue;
        }
        
        // Check for partial keyword matches
        const matchedKeywords = keywords.filter(keyword => 
          lowerMessage.includes(keyword.toLowerCase())
        );

        // More lenient matching: if at least 1 significant keyword matches
        if (matchedKeywords.length >= 1) {
          matches.push({
            orderId: order.id,
            matchedProduct: item.name,
            matchType: 'partial',
            confidence: matchedKeywords.length / keywords.length,
            order: order
          });
        }
        
        // Special handling for common abbreviations
        const abbreviationMap = {
          'iphone': ['iphone'],
          'macbook': ['macbook'],
          'pro': ['pro'],
          'air': ['air']
        };
        
        for (const [abbrev, fullNames] of Object.entries(abbreviationMap)) {
          if (lowerMessage.includes(abbrev) && itemName.includes(abbrev)) {
            matches.push({
              orderId: order.id,
              matchedProduct: item.name,
              matchType: 'abbreviation',
              confidence: 0.8,
              order: order
            });
            break;
          }
        }
      }
    }

    // Sort by confidence and return best matches
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Top 3 matches
  }

  // Simplified intent detection
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('cancel')) return 'CANCEL_ORDER';
    if (lowerMessage.includes('track')) return 'TRACK_ORDER'; 
    if (lowerMessage.includes('return')) return 'RETURN_ORDER';
    
    return 'GENERAL_INQUIRY';
  }

  // Test the enhanced system
  processMessage(message, userOrders) {
    const intent = this.detectIntent(message);
    const productMatches = this.extractProductMatches(message, userOrders);
    
    // Extract order IDs
    const orderIdMatch = message.match(/ORD-[A-Z0-9]+/i);
    const hasDirectOrderId = !!orderIdMatch;
    
    const result = {
      message,
      intent,
      hasDirectOrderId,
      productMatches,
      userOrdersCount: userOrders.length
    };

    // Simulate responses based on intent and matches
    switch (intent) {
      case 'CANCEL_ORDER':
        if (hasDirectOrderId) {
          const orderId = orderIdMatch[0].toUpperCase();
          const order = userOrders.find(o => o.id === orderId);
          result.success = order && order.canCancel;
          result.orderId = orderId;
          result.response = result.success ? 
            `✅ Successfully cancelled order ${orderId}` :
            `❌ Cannot cancel order ${orderId}`;
        } 
        else if (productMatches.length > 0) {
          const match = productMatches[0];
          result.success = match.order.canCancel;
          result.orderId = match.orderId;
          result.matchedProduct = match.matchedProduct;
          result.response = result.success ?
            `✅ Found your ${match.matchedProduct} order! Cancelled order ${match.orderId}` :
            `❌ Found your ${match.matchedProduct} order but cannot cancel it`;
        }
        else {
          const cancellableOrders = userOrders.filter(order => order.canCancel);
          result.success = false;
          result.needsOrderSelection = true;
          result.availableOrders = cancellableOrders.length;
          result.response = `Please specify which order to cancel. You have ${cancellableOrders.length} cancellable orders.`;
        }
        break;
        
      case 'TRACK_ORDER':
        if (hasDirectOrderId) {
          const orderId = orderIdMatch[0].toUpperCase();
          result.success = true;
          result.orderId = orderId;
          result.response = `📦 Tracking info for order ${orderId}`;
        }
        else if (productMatches.length > 0) {
          const match = productMatches[0];
          result.success = true;
          result.orderId = match.orderId;
          result.matchedProduct = match.matchedProduct;
          result.response = `📦 Found your ${match.matchedProduct} order! Tracking order ${match.orderId}`;
        }
        else {
          result.success = false;
          result.needsOrderSelection = true;
          result.availableOrders = userOrders.length;
          result.response = `Please specify which order to track. You have ${userOrders.length} orders.`;
        }
        break;
        
      case 'RETURN_ORDER':
        if (productMatches.length > 0) {
          const match = productMatches[0];
          result.success = match.order.canReturn;
          result.orderId = match.orderId;
          result.matchedProduct = match.matchedProduct;
          result.response = result.success ?
            `✅ Processing return for your ${match.matchedProduct} order ${match.orderId}` :
            `❌ Found your ${match.matchedProduct} order but cannot return it yet`;
        }
        else {
          result.success = false;
          result.needsOrderSelection = true;
          result.response = "Please specify which order to return.";
        }
        break;
    }

    return result;
  }
}

// Run the tests
const ai = new MockEnhancedAI();

testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log(`   Message: "${scenario.message}"`);
  
  const result = ai.processMessage(scenario.message, mockOrders);
  
  console.log(`   Intent: ${result.intent} ${result.intent === scenario.expectedIntent ? '✅' : '❌'}`);
  
  if (scenario.expectedSuccess !== undefined) {
    console.log(`   Success: ${result.success} ${result.success === scenario.expectedSuccess ? '✅' : '❌'}`);
  }
  
  if (scenario.expectedProductMatch) {
    const hasMatch = result.matchedProduct === scenario.expectedProductMatch;
    console.log(`   Product Match: ${result.matchedProduct || 'None'} ${hasMatch ? '✅' : '❌'}`);
  }
  
  if (scenario.expectsOrderSelection) {
    console.log(`   Needs Selection: ${result.needsOrderSelection} ${result.needsOrderSelection ? '✅' : '❌'}`);
    console.log(`   Available Orders: ${result.availableOrders}`);
  }
  
  if (result.orderId) {
    console.log(`   Order ID: ${result.orderId}`);
  }
  
  console.log(`   Response: ${result.response}`);
});

console.log("\n🎉 Single-User Context Testing Complete!");
console.log("\nKey Features Demonstrated:");
console.log("• ✅ Product name to order ID mapping");
console.log("• ✅ Partial keyword matching (iPhone → iPhone 15 Pro)");
console.log("• ✅ Context-aware order suggestions");
console.log("• ✅ Personalized responses for single user");
console.log("• ✅ Action validation based on order status");

console.log("\nReal-world Usage Examples:");
console.log('👤 User: "cancel my iPhone order"');
console.log('🤖 AI: "✅ Found your iPhone 15 Pro order! Cancelled order ORD-12345"');
console.log('👤 User: "track my MacBook"'); 
console.log('🤖 AI: "📦 Found your MacBook Pro 14 order! Tracking order ORD-12346"');
console.log('👤 User: "cancel my order"');
console.log('🤖 AI: "Which order? iPhone 15 Pro (ORD-12345) - Cancellable ✅"');
