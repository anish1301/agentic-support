const { mockOrders, mockCustomers } = require('../utils/mockData');

// Simple conversation states
const STATES = {
  IDLE: 'idle',
  WAITING_ORDER_SELECTION: 'waiting_order_selection',
  WAITING_CONFIRMATION: 'waiting_confirmation'
};

// Simple session storage (in memory for POC)
const sessions = new Map();

class SimpleAIService {
  
  // Get or create session
  getSession(sessionId) {
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        state: STATES.IDLE,
        pendingAction: null,
        candidateOrders: [],
        intent: null,
        selectedProduct: null,
        createdAt: new Date()
      });
    }
    
    return { sessionId, context: sessions.get(sessionId) };
  }

  // Main processing method
  async processUserRequest(message, customerId = 'CUST-001', sessionId = null) {
    const { sessionId: finalSessionId, context } = this.getSession(sessionId);
    const customer = mockCustomers.find(c => c.id === customerId) || { name: 'there' };
    
    console.log(`[SimpleAI] State: ${context.state}, Message: "${message}"`);
    
    // Handle based on current state
    switch (context.state) {
      case STATES.WAITING_ORDER_SELECTION:
        return this.handleOrderSelection(message, context, customer, finalSessionId);
      
      case STATES.WAITING_CONFIRMATION:
        return this.handleConfirmation(message, context, customer, finalSessionId);
      
      default: // IDLE
        return this.handleNewRequest(message, context, customer, finalSessionId);
    }
  }

  // Handle new request (IDLE state)
  handleNewRequest(message, context, customer, sessionId) {
    const intent = this.detectIntent(message);
    const product = this.extractProduct(message);
    const orderId = this.extractOrderId(message);
    
    console.log(`[SimpleAI] Intent: ${intent}, Product: ${product}, OrderId: ${orderId}`);
    
    // Find matching orders
    let matchingOrders = mockOrders.filter(o => o.customerId === customer.id);
    
    if (orderId) {
      matchingOrders = matchingOrders.filter(o => o.id === orderId);
    } else if (product) {
      matchingOrders = matchingOrders.filter(o => 
        o.items.some(item => item.name.toLowerCase().includes(product.toLowerCase()))
      );
    }
    
    if (intent === 'cancel') {
      return this.handleCancelIntent(matchingOrders, context, customer, sessionId, product);
    } else if (intent === 'track') {
      return this.handleTrackIntent(matchingOrders, context, customer, sessionId, product);
    } else if (intent === 'return') {
      return this.handleReturnIntent(matchingOrders, context, customer, sessionId, product);
    } else {
      return this.handleGeneralInquiry(message, customer, sessionId);
    }
  }

  // Handle cancel intent
  handleCancelIntent(matchingOrders, context, customer, sessionId, product) {
    if (matchingOrders.length === 0) {
      return {
        message: `Hi ${customer.name}! I couldn't find any orders${product ? ` for "${product}"` : ''} that can be cancelled. You currently have these orders:\n\n${this.formatOrdersList(mockOrders.filter(o => o.customerId === customer.id))}`,
        sessionId,
        needsConfirmation: false
      };
    }
    
    if (matchingOrders.length === 1) {
      const order = matchingOrders[0];
      if (!order.canCancel) {
        return {
          message: `Hi ${customer.name}! Order ${order.id} cannot be cancelled as it's already ${order.status}.`,
          sessionId,
          needsConfirmation: false
        };
      }
      
      // Ask for confirmation
      context.state = STATES.WAITING_CONFIRMATION;
      context.pendingAction = { type: 'cancel', order };
      
      return {
        message: `Hi ${customer.name}! I can cancel order ${order.id}:\n${order.items.map(i => `• ${i.name}`).join('\n')}\nTotal refund: $${order.total}\n\nShould I proceed with the cancellation? (Yes/No)`,
        sessionId,
        needsConfirmation: true
      };
    }
    
    // Multiple orders - ask user to select
    context.state = STATES.WAITING_ORDER_SELECTION;
    context.candidateOrders = matchingOrders;
    context.intent = 'cancel';
    
    return {
      message: `Hi ${customer.name}! I found multiple orders${product ? ` with "${product}"` : ''}:\n\n${this.formatOrdersList(matchingOrders)}\n\nWhich item would you like me to cancel? Just say the product name.`,
      sessionId,
      needsConfirmation: true
    };
  }

  // Handle when user selects an order
  handleOrderSelection(message, context, customer, sessionId) {
    const selectedProduct = this.extractProduct(message);
    
    if (!selectedProduct) {
      return {
        message: "Please specify which item you'd like me to work with.",
        sessionId,
        needsConfirmation: true
      };
    }
    
    // Find the order with this product
    const selectedOrder = context.candidateOrders.find(order =>
      order.items.some(item => 
        item.name.toLowerCase().includes(selectedProduct.toLowerCase())
      )
    );
    
    if (!selectedOrder) {
      return {
        message: `I couldn't find "${selectedProduct}" in your orders. Please choose from:\n\n${this.formatOrdersList(context.candidateOrders)}`,
        sessionId,
        needsConfirmation: true
      };
    }
    
    // Move to confirmation state
    context.state = STATES.WAITING_CONFIRMATION;
    context.pendingAction = { type: context.intent, order: selectedOrder };
    
    const actionText = context.intent === 'cancel' ? 'cancel' : context.intent;
    
    return {
      message: `Found it! I can ${actionText} order ${selectedOrder.id}:\n${selectedOrder.items.map(i => `• ${i.name}`).join('\n')}\n\nShould I proceed? (Yes/No)`,
      sessionId,
      needsConfirmation: true
    };
  }

  // Handle confirmation
  handleConfirmation(message, context, customer, sessionId) {
    const isConfirmed = this.isPositiveResponse(message);
    
    if (isConfirmed === null) {
      return {
        message: "Please say 'Yes' to proceed or 'No' to cancel.",
        sessionId,
        needsConfirmation: true
      };
    }
    
    if (!isConfirmed) {
      // User said no - reset to idle
      context.state = STATES.IDLE;
      context.pendingAction = null;
      return {
        message: "Okay, I've cancelled that action. How else can I help you?",
        sessionId,
        needsConfirmation: false
      };
    }
    
    // User confirmed - execute action
    const result = this.executeAction(context.pendingAction, customer, sessionId);
    
    // Reset to idle
    context.state = STATES.IDLE;
    context.pendingAction = null;
    context.candidateOrders = [];
    
    return result;
  }

  // Execute the confirmed action
  executeAction(pendingAction, customer, sessionId) {
    const { type, order } = pendingAction;
    
    if (type === 'cancel') {
      // Actually cancel the order (update the mock data)
      order.status = 'cancelled';
      order.canCancel = false;
      
      return {
        message: `✅ Perfect! I've cancelled order ${order.id}. You'll receive a full refund of $${order.total} within 3-5 business days.`,
        actions: [{ type: 'CANCEL_ORDER', orderId: order.id }],
        sessionId,
        needsConfirmation: false
      };
    }
    
    if (type === 'return') {
      // Actually process the return (update the mock data)
      order.status = 'returned';
      order.canReturn = false;
      
      return {
        message: `✅ Perfect! I've initiated a return for order ${order.id}. You'll receive a return label within 24 hours and a refund of $${order.total} once we receive the item.`,
        actions: [{ type: 'RETURN_ORDER', orderId: order.id }],
        sessionId,
        needsConfirmation: false
      };
    }
    
    if (type === 'track') {
      // For track, we don't need to change the order, just provide info
      const statusMap = {
        'confirmed': 'being prepared',
        'shipped': 'on its way to you',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
      };
      const statusText = statusMap[order.status] || order.status;
      const trackingInfo = order.trackingNumber ? `\nTracking: ${order.trackingNumber}` : '';
      
      return {
        message: `📦 Order ${order.id} is ${statusText}.${trackingInfo}`,
        actions: [{ type: 'TRACK_ORDER', orderId: order.id }],
        sessionId,
        needsConfirmation: false
      };
    }
    
    return {
      message: "Action completed!",
      sessionId,
      needsConfirmation: false
    };
  }

  // Helper methods
  detectIntent(message) {
    const msg = message.toLowerCase();
    if (msg.includes('cancel') || msg.includes('stop') || msg.includes('remove')) return 'cancel';
    if (msg.includes('track') || msg.includes('status') || msg.includes('where')) return 'track';
    if (msg.includes('return') || msg.includes('send back')) return 'return';
    return 'general';
  }

  extractProduct(message) {
    const msg = message.toLowerCase();
    // Common product keywords
    if (msg.includes('iphone') || msg.includes('phone')) return 'iPhone';
    if (msg.includes('laptop') || msg.includes('macbook')) return 'MacBook';
    if (msg.includes('watch') || msg.includes('apple watch')) return 'Apple Watch';
    if (msg.includes('airpods') || msg.includes('earbuds')) return 'AirPods';
    return null;
  }

  extractOrderId(message) {
    const orderPattern = /ORD-\d+/i;
    const match = message.match(orderPattern);
    return match ? match[0] : null;
  }

  isPositiveResponse(message) {
    const msg = message.toLowerCase().trim();
    if (['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'proceed', 'go ahead', 'do it'].includes(msg)) return true;
    if (['no', 'nope', 'cancel', 'stop', 'don\'t', 'abort', 'nevermind'].includes(msg)) return false;
    return null; // Unclear
  }

  formatOrdersList(orders) {
    return orders.map(o => 
      `• ${o.id}: ${o.items.map(i => i.name).join(', ')} - $${o.total} (${o.status})`
    ).join('\n');
  }

  handleGeneralInquiry(message, customer, sessionId) {
    return {
      message: `Hi ${customer.name}! I can help you cancel, track, or return your orders. What would you like to do?`,
      sessionId,
      needsConfirmation: false
    };
  }

  // Handle track and return intents (simplified for now)
  handleTrackIntent(matchingOrders, context, customer, sessionId, product) {
    if (matchingOrders.length === 0) {
      return {
        message: `Hi ${customer.name}! I couldn't find any orders${product ? ` for "${product}"` : ''} to track. You currently have these orders:\n\n${this.formatOrdersList(mockOrders.filter(o => o.customerId === customer.id))}`,
        sessionId,
        needsConfirmation: false
      };
    }
    
    if (matchingOrders.length === 1) {
      const order = matchingOrders[0];
      const statusMap = {
        'confirmed': 'being prepared',
        'shipped': 'on its way to you',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
      };
      const statusText = statusMap[order.status] || order.status;
      const trackingInfo = order.trackingNumber ? `\nTracking: ${order.trackingNumber}` : '';
      
      return {
        message: `Hi ${customer.name}! 📦 Order ${order.id} is ${statusText}.${trackingInfo}`,
        sessionId,
        needsConfirmation: false
      };
    }
    
    // Multiple orders - ask user to select
    context.state = STATES.WAITING_ORDER_SELECTION;
    context.candidateOrders = matchingOrders;
    context.intent = 'track';
    
    return {
      message: `Hi ${customer.name}! I found multiple orders${product ? ` with "${product}"` : ''}:\n\n${this.formatOrdersList(matchingOrders)}\n\nWhich item would you like me to track? Just say the product name.`,
      sessionId,
      needsConfirmation: true
    };
  }

  handleReturnIntent(matchingOrders, context, customer, sessionId, product) {
    // Filter only returnable orders
    const returnableOrders = matchingOrders.filter(o => o.canReturn);
    
    if (returnableOrders.length === 0) {
      if (matchingOrders.length > 0) {
        return {
          message: `Hi ${customer.name}! The order${matchingOrders.length > 1 ? 's' : ''} you mentioned cannot be returned as ${matchingOrders.length > 1 ? 'they are' : 'it is'} not yet delivered or already past the return window.`,
          sessionId,
          needsConfirmation: false
        };
      } else {
        return {
          message: `Hi ${customer.name}! I couldn't find any orders${product ? ` for "${product}"` : ''} that can be returned. You currently have these orders:\n\n${this.formatOrdersList(mockOrders.filter(o => o.customerId === customer.id))}`,
          sessionId,
          needsConfirmation: false
        };
      }
    }
    
    if (returnableOrders.length === 1) {
      const order = returnableOrders[0];
      
      // Ask for confirmation
      context.state = STATES.WAITING_CONFIRMATION;
      context.pendingAction = { type: 'return', order };
      
      return {
        message: `Hi ${customer.name}! I can process a return for order ${order.id}:\n${order.items.map(i => `• ${i.name}`).join('\n')}\nReturn value: $${order.total}\n\nShould I proceed with the return? (Yes/No)`,
        sessionId,
        needsConfirmation: true
      };
    }
    
    // Multiple orders - ask user to select
    context.state = STATES.WAITING_ORDER_SELECTION;
    context.candidateOrders = returnableOrders;
    context.intent = 'return';
    
    return {
      message: `Hi ${customer.name}! I found multiple returnable orders${product ? ` with "${product}"` : ''}:\n\n${this.formatOrdersList(returnableOrders)}\n\nWhich item would you like me to return? Just say the product name.`,
      sessionId,
      needsConfirmation: true
    };
  }
}

module.exports = new SimpleAIService();
