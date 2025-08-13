// Mock data for realistic POC demo
const mockCustomers = [
  {
    id: 'CUST-001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1-555-0123',
    tier: 'premium'
  },
  {
    id: 'CUST-002',
    name: 'Mike Chen',
    email: 'mike.chen@email.com',
    phone: '+1-555-0124',
    tier: 'standard'
  }
];

const mockOrders = [
  {
    id: 'ORD-12345',
    customerId: 'CUST-001',
    customerName: 'Sarah Johnson',
    status: 'confirmed',
    items: [
      { 
        id: 'PROD-001',
        name: 'iPhone 15 Pro',
        variant: '256GB',
        sku: 'IPH15PRO-256-BLU',
        qty: 1,
        price: 1099,
        image: 'https://via.placeholder.com/100/007bff/ffffff?text=iPhone'
      }
    ],
    total: 1099,
    orderDate: '2025-07-28T10:30:00Z',
    estimatedDelivery: '2025-08-02',
    canCancel: true,
    canReturn: false,
    trackingNumber: '1Z999AA1234567890',
    shippingAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105'
    }
  },
  {
    id: 'ORD-12346',
    customerId: 'CUST-001',
    customerName: 'Sarah Johnson',
    status: 'shipped',
    items: [
      {
        id: 'PROD-002',
        name: 'MacBook Pro 14',
        variant: 'M3 Pro, 512GB',
        sku: 'MBP14-M3-512-SLV',
        qty: 1,
        price: 1999,
        image: 'https://via.placeholder.com/100/28a745/ffffff?text=MacBook'
      }
    ],
    total: 1999,
    orderDate: '2025-07-25T14:15:00Z',
    estimatedDelivery: '2025-08-01',
    canCancel: false,
    canReturn: true,
    trackingNumber: '1Z999BB9876543210',
    shippingAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105'
    }
  },
  {
    id: 'ORD-12347',
    customerId: 'CUST-002',
    customerName: 'Mike Chen',
    status: 'delivered',
    items: [
      {
        id: 'PROD-003',
        name: 'AirPods Pro 2nd Gen',
        variant: 'White',
        sku: 'APP-2ND-WHT',
        qty: 2,
        price: 249,
        image: 'https://via.placeholder.com/100/dc3545/ffffff?text=AirPods'
      }
    ],
    total: 498,
    orderDate: '2025-07-20T09:45:00Z',
    deliveredDate: '2025-07-26T16:30:00Z',
    canCancel: false,
    canReturn: true,
    trackingNumber: '1Z999CC1122334455'
  }
];

const mockChatHistory = [
  {
    id: 'MSG-001',
    customerId: 'CUST-001',
    message: 'Hi, I need help with my recent order',
    sender: 'customer',
    timestamp: '2025-08-01T10:00:00Z'
  },
  {
    id: 'MSG-002',
    customerId: 'CUST-001',
    message: 'Hello Sarah! I\'d be happy to help you with your order. Could you please provide your order number?',
    sender: 'agent',
    timestamp: '2025-08-01T10:00:30Z'
  }
];

module.exports = {
  mockCustomers,
  mockOrders,
  mockChatHistory
};
