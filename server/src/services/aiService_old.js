const { GoogleGenerativeAI } = require('@google/generative-ai');
const { mockOrders, mockCustomers } = require('../utils/mockData');

// Enhanced AI service with Gemini API integration
class AIService {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
    this.model = this.genAI ? this.genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' }) : null;
    
    this.systemPrompt = `You are a helpful AI customer support agent for an e-commerce platform. Your name is Riley and you specialize in helping customers with their orders.

CAPABILITIES:
- Cancel orders (if status allows)
- Process returns (for delivered orders)
- Track orders and provide status updates
- Answer general questions about orders and policies

PERSONALITY:
- Friendly, professional, and empathetic
- Use emojis appropriately (✅, 📦, ❌, etc.)
- Be concise but thorough
- Always acknowledge the customer's request first

IMPORTANT RULES:
1. Always extract order IDs from customer messages (format: ORD-12345)
2. Check order status before suggesting actions
3. For order actions, respond with clear confirmation of what was done
4. If you can't help with something, explain why and offer alternatives
5. Always end with asking how else you can help

AVAILABLE ORDERS:
${mockOrders.map(order => `- ${order.id}: ${order.status} ($${order.total})`).join('\n')}

Current conversation context: You're helping a customer with their order inquiries.`;
  }

  // Extract order ID from message
  extractOrderId(message) {
    const orderRegex = /(?:ORD-|order\s*#?\s*)([A-Z0-9-]+)/i;
    const match = message.match(orderRegex);
    return match ? match[1].toUpperCase().replace(/^(?!ORD-)/, 'ORD-') : null;
  }

  // Determine intent and extract entities using Gemini
  async analyzeMessage(message) {
    if (!this.model) {
      return this.fallbackAnalysis(message);
    }

    try {
      const analysisPrompt = `Analyze this customer support message and return a JSON response with the intent and entities:

Message: "${message}"

Return JSON in this format:
{
  "intent": "CANCEL_ORDER|RETURN_ORDER|TRACK_ORDER|GENERAL_INQUIRY",
  "orderId": "ORD-12345 or null",
  "confidence": 0.0-1.0,
  "entities": {
    "action": "cancel|return|track|question",
    "urgency": "low|medium|high"
  }
}

Only respond with valid JSON.`;

      const result = await this.model.generateContent(analysisPrompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse Gemini analysis response:', parseError);
        return this.fallbackAnalysis(message);
      }
    } catch (error) {
      console.error('Gemini analysis failed:', error);
      return this.fallbackAnalysis(message);
    }
  }

  // Fallback analysis for when Gemini is unavailable
  fallbackAnalysis(message) {
    const lowerMessage = message.toLowerCase();
    const orderId = this.extractOrderId(message);
    
    let intent = 'GENERAL_INQUIRY';
    if (lowerMessage.includes('cancel')) intent = 'CANCEL_ORDER';
    else if (lowerMessage.includes('return')) intent = 'RETURN_ORDER';
    else if (lowerMessage.includes('track')) intent = 'TRACK_ORDER';
    
    return {
      intent,
      orderId,
      confidence: 0.7,
      entities: {
        action: intent.toLowerCase().split('_')[0],
        urgency: 'medium'
      }
    };
  }

  // Generate intelligent response using Gemini
  async generateResponse(message, customerId, context = {}) {
    const analysis = await this.analyzeMessage(message);
    const orderId = analysis.orderId;
    const order = orderId ? mockOrders.find(o => o.id === orderId) : null;
    const customer = mockCustomers.find(c => c.id === customerId);

    // If using Gemini API, generate contextual response
    if (this.model) {
      try {
        const responsePrompt = `${this.systemPrompt}

CUSTOMER MESSAGE: "${message}"

ANALYSIS:
- Intent: ${analysis.intent}
- Order ID: ${orderId || 'None mentioned'}
- Customer ID: ${customerId}

${order ? `ORDER DETAILS:
- Order ID: ${order.id}
- Status: ${order.status}
- Total: $${order.total}
- Items: ${order.items.map(item => item.name).join(', ')}
- Can Cancel: ${order.canCancel}
- Can Return: ${order.canReturn}` : 'No order found'}

TASK: Generate a helpful response that:
1. Acknowledges the customer's request
2. Takes appropriate action if possible (cancel/return/track)
3. Provides clear status updates
4. Uses appropriate emojis
5. Asks how else you can help

Respond as Riley, the AI support agent. Be conversational and helpful.`;

        const result = await this.model.generateContent(responsePrompt);
        const response = await result.response;
        const aiMessage = response.text();

        return {
          message: aiMessage,
          intent: analysis.intent,
          orderId,
          actions: this.determineActions(analysis.intent, order),
          context: {
            orderFound: !!order,
            orderStatus: order?.status,
            canPerformAction: this.canPerformAction(analysis.intent, order)
          }
        };
      } catch (error) {
        console.error('Gemini response generation failed:', error);
        // Fall back to template responses
        return this.generateFallbackResponse(message, analysis, order);
      }
    }

    // Fallback to template responses
    return this.generateFallbackResponse(message, analysis, order);
  }

  // Generate fallback response using templates
  generateFallbackResponse(message, analysis, order) {
    let responseMessage = '';
    let actions = [];

    switch (analysis.intent) {
      case 'CANCEL_ORDER':
        if (!order) {
          responseMessage = `❌ I couldn't find the order you mentioned. Could you please provide the correct order number? It should look like ORD-12345.`;
        } else if (order.status === 'cancelled') {
          responseMessage = `📋 Order ${order.id} is already cancelled. Is there anything else I can help you with?`;
        } else if (!order.canCancel) {
          responseMessage = `❌ I'm sorry, but order ${order.id} cannot be cancelled as it has already been ${order.status}. However, I can help you with a return if it's been delivered.`;
        } else {
          responseMessage = `✅ Perfect! I've successfully cancelled order ${order.id} for you. You'll receive a refund of $${order.total} within 3-5 business days to your original payment method. Is there anything else I can help you with?`;
          actions.push({ type: 'CANCEL_ORDER', orderId: order.id });
        }
        break;

      case 'RETURN_ORDER':
        if (!order) {
          responseMessage = `❌ I couldn't find the order you mentioned. Could you please provide the correct order number?`;
        } else if (order.status !== 'delivered') {
          responseMessage = `❌ Order ${order.id} cannot be returned as it hasn't been delivered yet. Current status: ${order.status}. Would you like to cancel it instead?`;
        } else {
          responseMessage = `✅ Great! I've initiated a return request for order ${order.id}. You'll receive an email with return instructions and a prepaid shipping label within 2 hours. Once we receive the item, your refund of $${order.total} will be processed within 5-7 business days. Anything else I can help with?`;
          actions.push({ type: 'RETURN_ORDER', orderId: order.id });
        }
        break;

      case 'TRACK_ORDER':
        if (!order) {
          responseMessage = `❌ I couldn't find the order you mentioned. Could you please check the order number?`;
        } else {
          const statusMessages = {
            'processing': 'is currently being prepared in our warehouse',
            'shipped': 'has been shipped and is on its way to you',
            'delivered': 'has been delivered successfully',
            'cancelled': 'has been cancelled'
          };
          const statusMessage = statusMessages[order.status] || 'has an unknown status';
          const trackingInfo = order.trackingNumber ? ` Your tracking number is ${order.trackingNumber}.` : '';
          responseMessage = `📦 Your order ${order.id} ${statusMessage}.${trackingInfo} ${order.estimatedDelivery ? `Estimated delivery: ${new Date(order.estimatedDelivery).toLocaleDateString()}.` : ''} Need any other assistance?`;
        }
        break;

      default:
        responseMessage = `👋 Hi! I'm Riley, your AI support assistant. I can help you with:\n• Cancel orders\n• Track order status\n• Process returns\n• Answer questions about your orders\n\nWhat can I do for you today?`;
    }

    return {
      message: responseMessage,
      intent: analysis.intent,
      orderId: order?.id,
      actions,
      context: {
        orderFound: !!order,
        orderStatus: order?.status,
        canPerformAction: this.canPerformAction(analysis.intent, order)
      }
    };
  }

  // Determine what actions should be taken
  determineActions(intent, order) {
    const actions = [];
    
    if (!order) return actions;

    switch (intent) {
      case 'CANCEL_ORDER':
        if (order.canCancel && order.status !== 'cancelled') {
          actions.push({ type: 'CANCEL_ORDER', orderId: order.id });
        }
        break;
      case 'RETURN_ORDER':
        if (order.status === 'delivered' && order.canReturn) {
          actions.push({ type: 'RETURN_ORDER', orderId: order.id });
        }
        break;
    }
    
    return actions;
  }

  // Check if action can be performed
  canPerformAction(intent, order) {
    if (!order) return false;

    switch (intent) {
      case 'CANCEL_ORDER':
        return order.canCancel && order.status !== 'cancelled';
      case 'RETURN_ORDER':
        return order.status === 'delivered' && order.canReturn;
      default:
        return true;
    }
  }

  async handleCancelOrder(orderId, customer) {
    if (!orderId) {
      return {
        message: `I'd be happy to help you cancel an order, ${customer?.name || 'there'}! Could you please provide your order number? It usually starts with "ORD-".`,
        intent: 'CANCEL_ORDER',
        orderId: null,
        actions: ['REQUEST_ORDER_ID']
      };
    }

    const order = mockOrders.find(o => o.id === orderId);
    
    if (!order) {
      return {
        message: `I couldn't find order ${orderId}. Please check the order number and try again.`,
        intent: 'CANCEL_ORDER',
        orderId,
        actions: ['ORDER_NOT_FOUND']
      };
    }

    if (!order.canCancel) {
      return {
        message: `I'm sorry, but order ${orderId} cannot be cancelled as it has already been shipped. However, you can return it once you receive it. Would you like me to help you with a return instead?`,
        intent: 'CANCEL_ORDER',
        orderId,
        actions: ['CANCEL_NOT_ALLOWED']
      };
    }

    return {
      message: `Perfect! I've successfully cancelled order ${orderId} for you. Your refund of $${order.total} will be processed within 3-5 business days back to your original payment method. You'll receive an email confirmation shortly. Is there anything else I can help you with?`,
      intent: 'CANCEL_ORDER',
      orderId,
      actions: ['ORDER_CANCELLED'],
      context: {
        refundAmount: order.total,
        refundDays: '3-5 business days'
      }
    };
  }

  async handleTrackOrder(orderId, customer) {
    if (!orderId) {
      return {
        message: `I can help you track your order! Please provide your order number so I can get the latest shipping information for you.`,
        intent: 'TRACK_ORDER',
        actions: ['REQUEST_ORDER_ID']
      };
    }

    const order = mockOrders.find(o => o.id === orderId);
    
    if (!order) {
      return {
        message: `I couldn't find order ${orderId}. Please verify the order number and try again.`,
        intent: 'TRACK_ORDER',
        orderId,
        actions: ['ORDER_NOT_FOUND']
      };
    }

    let statusMessage = '';
    switch (order.status) {
      case 'confirmed':
        statusMessage = `Order ${orderId} is confirmed and being prepared for shipment. Expected delivery: ${order.estimatedDelivery}`;
        break;
      case 'shipped':
        statusMessage = `Great news! Order ${orderId} has been shipped. Tracking number: ${order.trackingNumber}. Expected delivery: ${order.estimatedDelivery}`;
        break;
      case 'delivered':
        statusMessage = `Order ${orderId} was successfully delivered on ${order.deliveredDate}. Enjoy your purchase!`;
        break;
      case 'cancelled':
        statusMessage = `Order ${orderId} has been cancelled. Your refund is being processed.`;
        break;
    }

    return {
      message: statusMessage,
      intent: 'TRACK_ORDER',
      orderId,
      actions: ['ORDER_TRACKED'],
      context: {
        status: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery
      }
    };
  }

  async handleReturnOrder(orderId, customer) {
    if (!orderId) {
      return {
        message: `I can help you process a return! Please provide your order number and I'll check if it's eligible for return.`,
        intent: 'RETURN_ORDER',
        actions: ['REQUEST_ORDER_ID']
      };
    }

    const order = mockOrders.find(o => o.id === orderId);
    
    if (!order) {
      return {
        message: `I couldn't find order ${orderId}. Please check the order number.`,
        intent: 'RETURN_ORDER',
        orderId,
        actions: ['ORDER_NOT_FOUND']
      };
    }

    if (!order.canReturn) {
      return {
        message: `I'm sorry, but order ${orderId} is not eligible for return at this time. This might be because it's still being processed or outside the return window.`,
        intent: 'RETURN_ORDER',
        orderId,
        actions: ['RETURN_NOT_ALLOWED']
      };
    }

    return {
      message: `I've initiated a return for order ${orderId}. You'll receive a prepaid return label via email within 24 hours. Once we receive and process your returned items, your refund of $${order.total} will be issued within 5-7 business days. Is there anything specific about the return you'd like to know?`,
      intent: 'RETURN_ORDER',
      orderId,
      actions: ['RETURN_INITIATED'],
      context: {
        refundAmount: order.total,
        refundDays: '5-7 business days'
      }
    };
  }
}

module.exports = new AIService();
