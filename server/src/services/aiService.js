const { GoogleGenerativeAI } = require('@google/generative-ai');
const { mockOrders, mockCustomers } = require('../utils/mockData');
const conversationContext = require('./conversationContext');

// Simple AI service focused on NLP understanding and user intent
class AIService {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
    this.model = this.genAI ? this.genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' 
    }) : null;
  }

  // Simple NLP intent classification
  analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Intent patterns with higher accuracy
    const intentPatterns = {
      cancel: /\b(cancel|stop|abort|remove|delete)\b.*\b(order|purchase|item)\b|\bcancel\b.*\b(my|iphone|ipad|macbook|watch|airpods)\b/,
      track: /\b(track|where|find|status|locate)\b.*\b(order|package|shipment)\b|\btrack\b.*\b(my|iphone|ipad|macbook|watch|airpods)\b/,
      return: /\b(return|refund|send back|give back)\b/,
      help: /\b(help|support|assist|problem|issue)\b/
    };
    
    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(lowerMessage)) {
        return intent;
      }
    }
    
    // If message mentions a product, it's likely about that product
    if (this.extractProductFromMessage(message)) {
      return 'product_inquiry';
    }
    
    return 'general';
  }

  // Extract product mentions from message
  extractProductFromMessage(message) {
    const lowerMessage = message.toLowerCase();
    const productKeywords = {
      'iphone': ['iphone', 'i phone', 'phone', 'mobile'],
      'ipad': ['ipad', 'i pad', 'tablet'],
      'macbook': ['macbook', 'mac book', 'laptop', 'computer'],
      'airpods': ['airpods', 'air pods', 'earphones', 'headphones'],
      'watch': ['watch', 'apple watch', 'smartwatch']
    };
    
    for (const [product, keywords] of Object.entries(productKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return product;
      }
    }
    return null;
  }

  // Find orders by product mention
  findOrdersByProduct(product, customerId) {
    return mockOrders.filter(order => {
      if (order.customerId !== customerId) return false;
      return order.items.some(item => {
        const itemName = item.name.toLowerCase();
        return itemName.includes(product.toLowerCase());
      });
    });
  }

  // Extract order ID from message
  extractOrderId(message) {
    const orderMatch = message.match(/\b(ORD[-\s]*)([A-Z0-9]+)\b/i);
    if (orderMatch) {
      return `ORD-${orderMatch[2]}`;
    }
    return null;
  }

  // Main method: Process user message and provide service with conversation context
  async processUserRequest(message, customerId = 'CUST-001', sessionId = null) {
    try {
      console.log(`[AIService] Processing: "${message}" for customer: ${customerId}, session: ${sessionId}`);
      
      // Generate session ID if not provided
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Get conversation context
      const context = conversationContext.getContext(sessionId);
      conversationContext.addMessage(sessionId, message, 'user');
      
      // Check if we're waiting for a confirmation or selection
      if (context.waitingFor) {
        return this.handleContextualResponse(message, customerId, sessionId, context);
      }
      
      // Step 1: Understand what the user wants (NLP)
      const intent = this.analyzeIntent(message);
      const product = this.extractProductFromMessage(message);
      const orderId = this.extractOrderId(message);
      const customer = mockCustomers.find(c => c.id === customerId) || { name: 'there' };

      conversationContext.setLastIntent(sessionId, intent);
      conversationContext.updateEntities(sessionId, { product, orderId });

      // Step 2: Find relevant order
      let targetOrder = null;
      let candidateOrders = [];

      if (orderId) {
        targetOrder = mockOrders.find(o => o.id === orderId && o.customerId === customerId);
      } else if (product) {
        candidateOrders = this.findOrdersByProduct(product, customerId);
        if (candidateOrders.length === 1) {
          targetOrder = candidateOrders[0];
        }
      }

      // Step 3: Provide the service based on intent
      return await this.provideService(intent, targetOrder, candidateOrders, customer, message, sessionId);

    } catch (error) {
      console.error('Error processing user request:', error);
      return {
        message: "I'm sorry, I encountered an error processing your request. Please try again.",
        actions: [],
        needsConfirmation: false,
        sessionId
      };
    }
  }

  // Handle contextual responses when waiting for user input
  async handleContextualResponse(message, customerId, sessionId, context) {
    const waitingFor = context.waitingFor;
    const pendingAction = context.pendingAction;
    
    console.log(`[AIService] Handling contextual response - waiting for: ${waitingFor}`);
    
    if (waitingFor === 'order_selection') {
      // User is selecting which order to work with
      const selectedProduct = this.extractProductFromMessage(message);
      const candidateOrders = pendingAction.candidateOrders;
      
      let selectedOrder = null;
      if (selectedProduct) {
        selectedOrder = candidateOrders.find(order => 
          order.items.some(item => 
            item.name.toLowerCase().includes(selectedProduct.toLowerCase())
          )
        );
      }
      
      if (selectedOrder) {
        // Clear waiting state and perform the action
        conversationContext.clearWaiting(sessionId);
        return await this.performAction(pendingAction.intent, selectedOrder, customerId, sessionId);
      } else {
        return {
          message: "I couldn't find that item in your orders. Please specify which order you'd like to work with:\n\n" +
                   candidateOrders.map(order => 
                     `• ${order.id}: ${order.items.map(item => item.name).join(', ')}`
                   ).join('\n'),
          sessionId,
          needsConfirmation: true
        };
      }
    }
    
    if (waitingFor === 'confirmation') {
      // User is confirming an action
      const confirmation = this.extractConfirmation(message);
      conversationContext.clearWaiting(sessionId);
      
      if (confirmation) {
        return await this.executeAction(pendingAction, customerId, sessionId);
      } else {
        return {
          message: "Okay, I've cancelled that action. How else can I help you?",
          sessionId
        };
      }
    }
    
    return {
      message: "I didn't understand your response. Can you please clarify?",
      sessionId
    };
  }

  // Provide the actual service based on intent
  async provideService(intent, targetOrder, candidateOrders, customer, originalMessage, sessionId) {
    const customerName = customer.name || 'there';

    switch (intent) {
      case 'cancel':
        return this.handleCancelRequest(targetOrder, candidateOrders, customerName, sessionId);
      
      case 'track':
        return this.handleTrackRequest(targetOrder, candidateOrders, customerName, sessionId);
      
      case 'return':
        return this.handleReturnRequest(targetOrder, candidateOrders, customerName, sessionId);
      
      case 'product_inquiry':
        return this.handleProductInquiry(candidateOrders, customerName, originalMessage, sessionId);
      
      case 'help':
        return this.handleHelpRequest(customerName, sessionId);
      
      default:
        // Try to use Gemini for complex queries, fallback to helpful response
        if (this.model) {
          try {
            return await this.handleWithGemini(originalMessage, customer, sessionId);
          } catch (error) {
            console.log('Gemini unavailable, using smart fallback');
          }
        }
        return this.handleGeneralInquiry(customerName, originalMessage);
    }
  }

  // Handle cancel order requests
  handleCancelRequest(targetOrder, candidateOrders, customerName, sessionId) {
    if (targetOrder) {
      if (targetOrder.status === 'cancelled') {
        return {
          message: `Hi ${customerName}! Order ${targetOrder.id} is already cancelled. Your refund is being processed.`,
          actions: [],
          needsConfirmation: false,
          sessionId
        };
      } else if (!targetOrder.canCancel) {
        return {
          message: `Hi ${customerName}! Sorry, order ${targetOrder.id} can't be cancelled as it's already ${targetOrder.status}. I can help you with a return if it's delivered!`,
          actions: [],
          needsConfirmation: false,
          sessionId
        };
      } else {
        // Set up confirmation for cancel action
        conversationContext.setWaitingFor(sessionId, 'confirmation', {
          intent: 'cancel',
          order: targetOrder,
          action: 'CANCEL_ORDER'
        });

        return {
          message: `Hi ${customerName}! I can cancel order ${targetOrder.id} (${targetOrder.items.map(i => i.name).join(', ')}) for a full refund of $${targetOrder.total}.\n\nShould I proceed with the cancellation?`,
          actions: [],
          needsConfirmation: true,
          sessionId
        };
      }
    } else if (candidateOrders.length > 0) {
      // Multiple orders found - ask user to specify
      conversationContext.setWaitingFor(sessionId, 'order_selection', {
        intent: 'cancel',
        candidateOrders: candidateOrders
      });

      const orderList = candidateOrders
        .map(o => `• ${o.id}: ${o.items.map(item => item.name).join(', ')} (${o.status}) - $${o.total}`)
        .join('\n');
      return {
        message: `Hi ${customerName}! I found these matching orders:\n\n${orderList}\n\nWhich item would you like me to cancel?`,
        actions: [],
        needsConfirmation: true,
        sessionId
      };
    } else {
      const allOrders = mockOrders.filter(o => o.customerId === 'CUST-001');
      if (allOrders.length > 0) {
        const orderList = allOrders
          .map(o => `• ${o.id}: ${o.items[0].name} (${o.status}) - $${o.total}`)
          .join('\n');
        return {
          message: `Hi ${customerName}! Here are your current orders:\n\n${orderList}\n\nWhich one would you like to cancel?`,
          actions: [],
          needsConfirmation: false
        };
      } else {
        return {
          message: `Hi ${customerName}! I couldn't find any orders in your account.`,
          actions: [],
          needsConfirmation: false
        };
      }
    }
  }

  // Handle track order requests
  handleTrackRequest(targetOrder, candidateOrders, customerName, sessionId) {
    if (targetOrder) {
      const statusMap = {
        'processing': 'is being prepared',
        'shipped': 'is on its way to you',
        'delivered': 'has been delivered',
        'cancelled': 'was cancelled'
      };
      const statusText = statusMap[targetOrder.status] || `has status: ${targetOrder.status}`;
      const trackingInfo = targetOrder.trackingNumber ? ` Tracking: ${targetOrder.trackingNumber}` : '';
      
      return {
        message: `Hi ${customerName}! 📦 Your order ${targetOrder.id} ${statusText}.${trackingInfo}`,
        actions: [],
        needsConfirmation: false,
        sessionId
      };
    } else if (candidateOrders.length > 0) {
      // Multiple orders found - ask user to specify
      conversationContext.setWaitingFor(sessionId, 'order_selection', {
        intent: 'track',
        candidateOrders: candidateOrders
      });

      const orderList = candidateOrders
        .map(o => `• ${o.id}: ${o.items.map(item => item.name).join(', ')} (${o.status})`)
        .join('\n');
      return {
        message: `Hi ${customerName}! I found these matching orders:\n\n${orderList}\n\nWhich item would you like me to track?`,
        actions: [],
        needsConfirmation: true,
        sessionId
      };
    } else {
      return {
        message: `Hi ${customerName}! I couldn't find any matching orders to track.`,
        actions: [],
        needsConfirmation: false,
        sessionId
      };
    }
  }

  // Handle return requests
  handleReturnRequest(targetOrder, candidateOrders, customerName, sessionId) {
    if (targetOrder) {
      if (targetOrder.status !== 'delivered') {
        return {
          message: `Hi ${customerName}! Order ${targetOrder.id} can't be returned yet as it's ${targetOrder.status}. Would you like me to cancel it instead?`,
          actions: [],
          needsConfirmation: false
        };
      } else if (!targetOrder.canReturn) {
        return {
          message: `Hi ${customerName}! Sorry, order ${targetOrder.id} is not eligible for return.`,
          actions: [],
          needsConfirmation: false
        };
      } else {
        return {
          message: `Hi ${customerName}! ✅ I've initiated a return for order ${targetOrder.id}. You'll get return instructions within 2 hours.`,
          actions: [{ type: 'RETURN_ORDER', orderId: targetOrder.id }],
          needsConfirmation: false
        };
      }
    } else {
      return {
        message: `Hi ${customerName}! I couldn't find a specific order to return. Could you provide the order ID?`,
        actions: [],
        needsConfirmation: false
      };
    }
  }

  // Handle product inquiries
  handleProductInquiry(candidateOrders, customerName, message) {
    if (candidateOrders.length > 0) {
      const orderList = candidateOrders
        .map(o => `• ${o.id}: ${o.items[0].name} (${o.status}) - $${o.total}`)
        .join('\n');
      return {
        message: `Hi ${customerName}! I found these orders matching your request:\n\n${orderList}\n\nWhat would you like me to help you with?`,
        actions: [],
        needsConfirmation: false
      };
    } else {
      return {
        message: `Hi ${customerName}! I couldn't find any orders matching that product. What can I help you with?`,
        actions: [],
        needsConfirmation: false
      };
    }
  }

  // Handle help requests
  handleHelpRequest(customerName) {
    return {
      message: `Hi ${customerName}! 👋 I'm here to help you with:\n\n✅ Cancel orders\n📦 Track shipments\n🔄 Process returns\n❓ Answer order questions\n\nWhat can I do for you?`,
      actions: [],
      needsConfirmation: false
    };
  }

  // Handle general inquiries with smart fallback
  handleGeneralInquiry(customerName, message) {
    // Try to be helpful based on keywords in the message
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return {
        message: `Hi ${customerName}! 👋 How can I help you today? I can cancel orders, track shipments, or process returns.`,
        actions: [],
        needsConfirmation: false
      };
    }
    
    if (lowerMessage.includes('refund') || lowerMessage.includes('money back')) {
      return {
        message: `Hi ${customerName}! I can help you with refunds. Would you like me to cancel an order or process a return?`,
        actions: [],
        needsConfirmation: false
      };
    }
    
    return {
      message: `Hi ${customerName}! I'd be happy to help, but I'm not sure exactly what you need. Could you tell me if you want to:\n\n• Cancel an order\n• Track a shipment\n• Return an item\n• Something else?`,
      actions: [],
      needsConfirmation: false
    };
  }

  // Use Gemini for complex queries when available
  async handleWithGemini(message, customer) {
    const prompt = `You are Riley, a helpful AI customer support agent. The user said: "${message}". 

Available orders for customer ${customer.name} (ID: ${customer.id}):
${mockOrders.filter(o => o.customerId === customer.id).map(o => 
  `- ${o.id}: ${o.items[0].name} (${o.status}) - $${o.total}`
).join('\n')}

Respond naturally and helpfully. If they want to cancel/track/return an order, be specific about which order and what action you're taking.`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    
    return {
      message: response.text(),
      actions: [], // Gemini responses don't automatically trigger actions
      needsConfirmation: false,
      sessionId
    };
  }

  // Perform an action on a specific order
  async performAction(intent, order, customerId, sessionId) {
    const customer = mockCustomers.find(c => c.id === customerId) || { name: 'there' };
    
    if (intent === 'cancel') {
      return this.handleCancelRequest(order, [], customer.name, sessionId);
    } else if (intent === 'track') {
      return this.handleTrackRequest(order, [], customer.name, sessionId);
    } else if (intent === 'return') {
      return this.handleReturnRequest(order, [], customer.name, sessionId);
    }
    
    return {
      message: "I couldn't perform that action. How can I help you?",
      sessionId
    };
  }

  // Execute a confirmed action
  async executeAction(pendingAction, customerId, sessionId) {
    const { intent, order, action } = pendingAction;
    
    if (action === 'CANCEL_ORDER') {
      // Actually cancel the order
      order.status = 'cancelled';
      order.canCancel = false;
      
      return {
        message: `✅ Order ${order.id} has been cancelled successfully! You'll receive a full refund of $${order.total} within 3-5 business days.`,
        actions: [{ type: 'CANCEL_ORDER', orderId: order.id }],
        sessionId
      };
    }
    
    return {
      message: "Action completed successfully!",
      sessionId
    };
  }

  // Extract confirmation from user message
  extractConfirmation(message) {
    const msg = message.toLowerCase();
    const positiveWords = ['yes', 'yeah', 'yep', 'confirm', 'proceed', 'go ahead', 'do it', 'ok', 'okay'];
    const negativeWords = ['no', 'nope', 'cancel', 'stop', 'don\'t', 'abort'];
    
    if (positiveWords.some(word => msg.includes(word))) {
      return true;
    }
    if (negativeWords.some(word => msg.includes(word))) {
      return false;
    }
    
    return null; // Unclear
  }
}

module.exports = new AIService();