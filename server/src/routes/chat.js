const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

// POST /api/chat - Send message to AI agent (enhanced with Gemini)
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, customerId = 'CUST-001' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Use the enhanced AI service with Gemini API
    const aiResponse = await aiService.generateResponse(message, customerId);
    
    const response = {
      message: aiResponse.message,
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'agent',
      intent: aiResponse.intent,
      orderId: aiResponse.orderId,
      actions: aiResponse.actions,
      context: aiResponse.context
    };
    
    // If there are actions to perform, indicate success
    if (aiResponse.actions && aiResponse.actions.length > 0) {
      response.success = true;
      response.action = aiResponse.actions[0].type.toLowerCase().replace('_', ' ');
    }
    
    res.json(response);
  } catch (error) {
    console.error('Enhanced chat error:', error);
    res.status(500).json({ 
      error: 'I encountered an issue processing your request. Please try again.',
      message: 'Sorry, I had a temporary issue. Could you please repeat your request?',
      type: 'agent',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

// Helper function to execute order actions
async function executeOrderAction(action, orderId) {
  const { mockOrders } = require('../utils/mockData');
  const order = mockOrders.find(o => o.id === orderId);
  
  if (!order) {
    return {
      success: false,
      message: `❌ I couldn't find order ${orderId}. Please check the order number and try again.`,
      action: action
    };
  }
  
  switch (action) {
    case 'cancel':
      if (order.status === 'cancelled') {
        return {
          success: false,
          message: `📋 Order ${orderId} is already cancelled.`,
          action: 'cancel'
        };
      }
      if (order.status === 'delivered') {
        return {
          success: false,
          message: `❌ I'm sorry, but order ${orderId} has already been delivered and cannot be cancelled. However, I can help you with a return instead.`,
          action: 'cancel'
        };
      }
      
      // Update order status
      order.status = 'cancelled';
      order.cancellationDate = new Date().toISOString();
      order.canCancel = false;
      
      return {
        success: true,
        message: `✅ Perfect! I've successfully cancelled order ${orderId} for you. You'll receive a refund of $${order.total} within 3-5 business days to your original payment method. Is there anything else I can help you with?`,
        action: 'cancel'
      };
      
    case 'return':
      if (order.status !== 'delivered') {
        return {
          success: false,
          message: `❌ Order ${orderId} cannot be returned as it hasn't been delivered yet. Current status: ${order.status}. Would you like to cancel it instead?`,
          action: 'return'
        };
      }
      
      // Update order status
      order.status = 'return_requested';
      order.returnDate = new Date().toISOString();
      order.canReturn = false;
      
      return {
        success: true,
        message: `✅ Great! I've initiated a return request for order ${orderId}. You'll receive an email with return instructions and a prepaid shipping label within 2 hours. Once we receive the item, your refund of $${order.total} will be processed within 5-7 business days. Anything else I can help with?`,
        action: 'return'
      };
      
    case 'track':
      const statusMessages = {
        'processing': 'is currently being prepared in our warehouse',
        'shipped': 'has been shipped and is on its way to you',
        'delivered': 'has been delivered successfully',
        'cancelled': 'has been cancelled',
        'return_requested': 'has a return request in progress'
      };
      
      const statusMessage = statusMessages[order.status] || 'has an unknown status';
      const trackingInfo = order.trackingNumber ? ` Your tracking number is ${order.trackingNumber}.` : '';
      
      return {
        success: true,
        message: `📦 Your order ${orderId} ${statusMessage}.${trackingInfo} ${order.estimatedDelivery ? `Estimated delivery: ${new Date(order.estimatedDelivery).toLocaleDateString()}.` : ''} Need any other assistance?`,
        action: 'track'
      };
      
    default:
      return {
        success: false,
        message: `❌ I'm not sure how to ${action} an order. I can help you cancel, return, or track orders.`,
        action: action
      };
  }
}

// Helper function for contextual responses
function getContextualResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "👋 Hello! I'm your AI support agent. I can help you with order cancellations, tracking, returns, and answer any questions you have. What can I do for you today?";
  }
  
  if (lowerMessage.includes('help')) {
    return "🤝 I'm here to help! I can assist you with:\n• Cancel orders\n• Track order status\n• Process returns\n• Answer questions about your orders\n\nJust let me know what you need!";
  }
  
  if (lowerMessage.includes('order') && !lowerMessage.match(/(cancel|return|track)/)) {
    return "📋 I can help you with order-related tasks! Try asking me to:\n• 'Cancel order ORD-12345'\n• 'Track order ORD-12345'\n• 'Return order ORD-12345'\n\nWhat would you like to do?";
  }
  
  return `I understand you said: "${message}". I'm here to help with your orders! I can cancel, track, or process returns. Just let me know what you need assistance with.`;
}

// Process chat message (existing endpoint)
router.post('/message', async (req, res) => {
  try {
    const { message, customerId, context } = req.body;
    
    if (!message || !customerId) {
      return res.status(400).json({
        error: 'Message and customerId are required'
      });
    }

    const aiResponse = await aiService.generateResponse(message, customerId, context);
    
    res.json({
      success: true,
      data: aiResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
});

// GET /api/chat/history/:sessionId - Get chat history
router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // Mock chat history
  const history = [
    {
      id: 1,
      message: "Hello! How can I help you today?",
      type: 'agent',
      timestamp: new Date().toISOString()
    }
  ];
  
  res.json({ sessionId, history });
});

module.exports = router;
