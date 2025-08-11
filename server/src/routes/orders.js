const express = require('express');
const router = express.Router();
const { mockOrders } = require('../utils/mockData');

// GET /api/orders - Get all orders
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      data: mockOrders,
      count: mockOrders.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

// Get all orders for a customer
router.get('/customer/:customerId', (req, res) => {
  try {
    const { customerId } = req.params;
    const customerOrders = mockOrders.filter(order => order.customerId === customerId);
    
    res.json({
      success: true,
      data: customerOrders,
      count: customerOrders.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

// Get specific order
router.get('/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = mockOrders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch order',
      message: error.message
    });
  }
});

// POST /api/orders/:id/cancel - Cancel order
router.post('/:orderId/cancel', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = mockOrders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ 
        error: `Cannot cancel ${order.status} order` 
      });
    }
    
    order.status = 'cancelled';
    order.updatedAt = new Date().toISOString();
    
    res.json({ 
      success: true,
      message: 'Order cancelled successfully', 
      data: order 
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to cancel order',
      message: error.message
    });
  }
});

// POST /api/orders/:id/return - Return order
router.post('/:orderId/return', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = mockOrders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status !== 'delivered') {
      return res.status(400).json({ 
        error: 'Can only return delivered orders' 
      });
    }
    
    order.status = 'return_requested';
    order.updatedAt = new Date().toISOString();
    
    res.json({ 
      success: true,
      message: 'Return request submitted successfully', 
      data: order 
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process return request',
      message: error.message
    });
  }
});

module.exports = router;
