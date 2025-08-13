// Test the exact issue: "cancel my iPhone"
const SmartHybridAIService = require('./src/services/smartHybridAI');

// This should match the frontend orders exactly
const frontendOrders = [
  {
    id: 'ORD-12345',
    customerId: 'CUST-001',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.johnson@email.com',
    status: 'confirmed',
    items: [
      { 
        id: 'PROD-001',
        name: 'iPhone 15 Pro', 
        variant: '256GB Deep Purple',
        qty: 1, 
        price: 1099,
        image: 'https://via.placeholder.com/100x100?text=iPhone'
      }
    ],
    total: 1099,
    orderDate: '2025-07-28T10:30:00Z',
    canCancel: true,
    canReturn: false,
    trackingNumber: '1Z999AA1234567890',
    carrier: 'UPS',
    estimatedDelivery: '2025-08-02T18:00:00Z'
  },
  {
    id: 'ORD-12346',
    customerId: 'CUST-001',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.johnson@email.com',
    status: 'shipped',
    items: [
      { 
        id: 'PROD-002',
        name: 'MacBook Pro 14',
        variant: 'M3 Pro, 512GB, Silver',
        qty: 1, 
        price: 1999,
        image: 'https://via.placeholder.com/100x100?text=MacBook'
      }
    ],
    total: 1999,
    orderDate: '2025-07-25T14:15:00Z',
    canCancel: false,
    canReturn: true,
    trackingNumber: '1Z999BB9876543210',
    carrier: 'FedEx',
    estimatedDelivery: '2025-08-01T16:00:00Z'
  }
];

async function testCancelIphone() {
  console.log('🧪 Testing "cancel my iPhone" with real frontend orders\n');
  
  const smartAI = new SmartHybridAIService();
  const sessionId = `test_${Date.now()}`;
  
  console.log('Frontend orders being passed:');
  console.log(JSON.stringify(frontendOrders.map(o => ({
    id: o.id,
    status: o.status,
    canCancel: o.canCancel,
    items: o.items.map(i => ({ name: i.name, variant: i.variant }))
  })), null, 2));
  
  console.log('\n👤 User: "cancel my iPhone"');
  
  try {
    const response = await smartAI.processMessage(
      'cancel my iPhone',
      'CUST-001',
      sessionId,
      frontendOrders
    );
    
    console.log('\n🤖 Bot Response:');
    console.log('Message:', response.message);
    console.log('Intent:', response.intent);
    console.log('Success:', response.success);
    console.log('Order ID:', response.orderId);
    console.log('Source:', response.source);
    
    if (response.success) {
      console.log('✅ SUCCESS: iPhone order was found and cancelled!');
    } else {
      console.log('❌ FAILED: Could not cancel iPhone order');
      console.log('Available orders:', response.availableOrders?.map(o => o.id) || 'None');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
  
  smartAI.destroy();
}

// Run test
if (require.main === module) {
  testCancelIphone()
    .then(() => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}
