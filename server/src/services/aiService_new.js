const { GoogleGenerativeAI } = require('@google/generative-ai');
const { mockOrders, mockCustomers } = require('../utils/mockData');

// Enhanced AI service with Gemini API integration
class AIService {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
    this.model = this.genAI ? this.genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' }) : null;
    
    this.systemPrompt = `You are Riley, a helpful AI customer support agent for Richpanel's e-commerce platform. You specialize in helping customers with their orders.

CAPABILITIES:
- Cancel orders (if status allows)
- Process returns (for delivered orders)  
- Track orders and provide status updates
- Answer general questions about orders and policies

PERSONALITY:
- Friendly, professional, and empathetic
- Use emojis appropriately (✅, 📦, ❌, 🎉, etc.)
- Be concise but thorough
- Always acknowledge the customer's request first
- Show genuine care for customer satisfaction

IMPORTANT RULES:
1. Always extract order IDs from customer messages (format: ORD-12345)
2. Check order status before suggesting actions
3. For order actions, respond with clear confirmation of what was done
4. If you can't help with something, explain why and offer alternatives
5. Always end with asking how else you can help
6. Use natural, conversational language

AVAILABLE ORDERS (current status):
${mockOrders.map(order => `- ${order.id}: ${order.status} ($${order.total}) - ${order.items[0]?.name}`).join('\n')}

Remember: You can actually perform these actions, so be confident when confirming order cancellations, returns, or providing tracking info.`;
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
      const analysisPrompt = `Analyze this customer support message for intent and entities:

Message: "${message}"

Return JSON only:
{
  "intent": "CANCEL_ORDER|RETURN_ORDER|TRACK_ORDER|GENERAL_INQUIRY",
  "orderId": "ORD-12345 or null",
  "confidence": 0.9,
  "urgency": "low|medium|high",
  "sentiment": "positive|neutral|negative"
}`;

      const result = await this.model.generateContent(analysisPrompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Clean up the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Gemini analysis failed:', error.message);
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
    else if (lowerMessage.includes('track') || lowerMessage.includes('status')) intent = 'TRACK_ORDER';
    
    return {
      intent,
      orderId,
      confidence: 0.8,
      urgency: 'medium',
      sentiment: 'neutral'
    };
  }

  // Generate intelligent response using Gemini
  async generateResponse(message, customerId, context = {}) {
    const analysis = await this.analyzeMessage(message);
    const orderId = analysis.orderId;
    const order = orderId ? mockOrders.find(o => o.id === orderId) : null;
    const customer = mockCustomers.find(c => c.id === customerId) || { name: 'there' };

    // If using Gemini API, generate contextual response
    if (this.model) {
      try {
        const responsePrompt = `${this.systemPrompt}

CUSTOMER MESSAGE: "${message}"
CUSTOMER NAME: ${customer.name}

ANALYSIS:
- Intent: ${analysis.intent}
- Order ID: ${orderId || 'None mentioned'}
- Urgency: ${analysis.urgency}
- Sentiment: ${analysis.sentiment}

${order ? `ORDER DETAILS:
- Order ID: ${order.id}
- Status: ${order.status}
- Total: $${order.total}
- Items: ${order.items.map(item => `${item.name} (${item.variant || 'default'})`).join(', ')}
- Can Cancel: ${order.canCancel}
- Can Return: ${order.canReturn}
- Tracking: ${order.trackingNumber || 'Not available'}
- Estimated Delivery: ${order.estimatedDelivery || 'Not set'}` : 'ORDER: Not found or not mentioned'}

INSTRUCTIONS:
1. Address the customer by name when appropriate
2. Take the appropriate action if possible (cancel/return/track)
3. Provide specific, helpful information
4. Use appropriate emojis but don't overuse them
5. Be natural and conversational
6. End with offering further assistance

Respond as Riley. Make it feel like a real conversation with a helpful human agent.`;

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
            canPerformAction: this.canPerformAction(analysis.intent, order),
            customerSentiment: analysis.sentiment,
            urgency: analysis.urgency
          }
        };
      } catch (error) {
        console.error('Gemini response generation failed:', error.message);
        // Fall back to template responses
        return this.generateFallbackResponse(message, analysis, order, customer);
      }
    }

    // Fallback to template responses when Gemini is not available
    return this.generateFallbackResponse(message, analysis, order, customer);
  }

  // Generate fallback response using templates
  generateFallbackResponse(message, analysis, order, customer) {
    let responseMessage = '';
    let actions = [];

    const customerName = customer?.name || 'there';

    switch (analysis.intent) {
      case 'CANCEL_ORDER':
        if (!order) {
          responseMessage = `Hi ${customerName}! ❌ I couldn't find the order you mentioned. Could you please double-check the order number? It should look like ORD-12345.`;
        } else if (order.status === 'cancelled') {
          responseMessage = `Hi ${customerName}! 📋 Order ${order.id} is already cancelled. Your refund is being processed. Is there anything else I can help you with?`;
        } else if (!order.canCancel) {
          responseMessage = `Hi ${customerName}! ❌ I'm sorry, but order ${order.id} cannot be cancelled since it has already been ${order.status}. However, if it's been delivered, I can help you with a return instead!`;
        } else {
          responseMessage = `Hi ${customerName}! ✅ Perfect! I've successfully cancelled order ${order.id} for you. You'll receive a full refund of $${order.total} within 3-5 business days to your original payment method. You should get a confirmation email shortly. Is there anything else I can help you with? 😊`;
          actions.push({ type: 'CANCEL_ORDER', orderId: order.id });
        }
        break;

      case 'RETURN_ORDER':
        if (!order) {
          responseMessage = `Hi ${customerName}! ❌ I couldn't find the order you mentioned. Could you please provide the correct order number?`;
        } else if (order.status !== 'delivered') {
          responseMessage = `Hi ${customerName}! ❌ Order ${order.id} cannot be returned as it hasn't been delivered yet (current status: ${order.status}). Would you like me to cancel it instead?`;
        } else if (!order.canReturn) {
          responseMessage = `Hi ${customerName}! ❌ I'm sorry, but order ${order.id} is not eligible for return. This might be due to the return window expiring or the item type. Let me know if you have questions about our return policy!`;
        } else {
          responseMessage = `Hi ${customerName}! ✅ Great! I've initiated a return request for order ${order.id}. You'll receive an email with return instructions and a prepaid shipping label within the next 2 hours. Once we receive the items back, your refund of $${order.total} will be processed within 5-7 business days. Anything else I can help with? 📦`;
          actions.push({ type: 'RETURN_ORDER', orderId: order.id });
        }
        break;

      case 'TRACK_ORDER':
        if (!order) {
          responseMessage = `Hi ${customerName}! ❌ I couldn't find that order number. Could you please double-check it?`;
        } else {
          const statusMessages = {
            'processing': 'is currently being prepared in our fulfillment center',
            'shipped': 'has been shipped and is on its way to you',
            'delivered': 'has been successfully delivered',
            'cancelled': 'was cancelled',
            'return_requested': 'has a return request in progress'
          };
          const statusMessage = statusMessages[order.status] || 'has an unknown status';
          const trackingInfo = order.trackingNumber ? ` 📋 Your tracking number is ${order.trackingNumber}.` : '';
          const deliveryInfo = order.estimatedDelivery ? ` 🚚 Estimated delivery: ${new Date(order.estimatedDelivery).toLocaleDateString()}.` : '';
          
          responseMessage = `Hi ${customerName}! 📦 Your order ${order.id} ${statusMessage}.${trackingInfo}${deliveryInfo} Need help with anything else?`;
        }
        break;

      default:
        responseMessage = `Hi ${customerName}! 👋 I'm Riley, your AI support assistant. I'm here to help you with:\n\n✅ Cancel orders\n📦 Track order status  \n🔄 Process returns\n❓ Answer questions about your orders\n\nWhat can I do for you today?`;
    }

    return {
      message: responseMessage,
      intent: analysis.intent,
      orderId: order?.id,
      actions,
      context: {
        orderFound: !!order,
        orderStatus: order?.status,
        canPerformAction: this.canPerformAction(analysis.intent, order),
        customerSentiment: analysis.sentiment || 'neutral',
        urgency: analysis.urgency || 'medium'
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
      case 'TRACK_ORDER':
        return true; // Can always track if order exists
      default:
        return true;
    }
  }
}

module.exports = new AIService();
