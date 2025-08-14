const express = require('express');
const router = express.Router();
const { mockOrders } = require('../utils/mockData');

// Cancel order action
router.post('/cancel-order', async (req, res) => {
  try {
    const { orderId, reason, customerId } = req.body;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const orderIndex = mockOrders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }
    
    const order = mockOrders[orderIndex];
    
    if (!order.canCancel) {
      return res.status(400).json({
        error: 'Order cannot be cancelled'
      });
    }
    
    // Update order status
    mockOrders[orderIndex] = {
      ...order,
      status: 'cancelled',
      cancellationReason: reason,
      cancellationDate: new Date().toISOString(),
      canCancel: false
    };
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: mockOrders[orderIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to cancel order',
      message: error.message
    });
  }
});

// Return order action
router.post('/return-order', async (req, res) => {
  try {
    const { orderId, reason, customerId } = req.body;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const orderIndex = mockOrders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }
    
    const order = mockOrders[orderIndex];
    
    if (!order.canReturn) {
      return res.status(400).json({
        error: 'Order is not eligible for return'
      });
    }
    
    // Update order status
    mockOrders[orderIndex] = {
      ...order,
      status: 'return_initiated',
      returnReason: reason,
      returnDate: new Date().toISOString(),
      canReturn: false
    };
    
    res.json({
      success: true,
      message: 'Return initiated successfully',
      data: mockOrders[orderIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to initiate return',
      message: error.message
    });
  }
});

// POST /api/agent/action - Execute agent action (unified endpoint)
router.post('/action', async (req, res) => {
  try {
    const { action, orderId, parameters } = req.body;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let result = {};
    
    switch (action) {
      case 'cancel_order':
        const orderToCancel = mockOrders.find(o => o.id === orderId);
        if (!orderToCancel) {
          return res.status(404).json({ error: 'Order not found' });
        }
        
        result = {
          success: true,
          message: `Order ${orderId} has been cancelled successfully`,
          action: 'cancel_order',
          orderId,
          data: { ...orderToCancel, status: 'cancelled' }
        };
        break;
        
      case 'track_order':
        const orderToTrack = mockOrders.find(o => o.id === orderId);
        if (!orderToTrack) {
          return res.status(404).json({ error: 'Order not found' });
        }
        
        result = {
          success: true,
          message: `Order ${orderId} is currently ${orderToTrack.status}`,
          action: 'track_order',
          orderId,
          status: orderToTrack.status,
          data: orderToTrack
        };
        break;
        
      case 'return_order':
        const orderToReturn = mockOrders.find(o => o.id === orderId);
        if (!orderToReturn) {
          return res.status(404).json({ error: 'Order not found' });
        }
        
        result = {
          success: true,
          message: `Return request for order ${orderId} has been submitted`,
          action: 'return_order',
          orderId,
          data: { ...orderToReturn, status: 'return_requested' }
        };
        break;
        
      default:
        result = {
          success: false,
          message: `Unknown action: ${action}`
        };
    }
    
    res.json(result);
  } catch (error) {
    console.error('Agent action error:', error);
    res.status(500).json({ error: 'Failed to execute agent action' });
  }
});

// GET /api/agent/capabilities - Get agent capabilities
router.get('/capabilities', (req, res) => {
  const capabilities = [
    'cancel_order',
    'track_order',
    'return_order',
    'check_inventory',
    'update_shipping_address'
  ];
  
  res.json({ 
    success: true,
    data: capabilities 
  });
});

module.exports = router;
