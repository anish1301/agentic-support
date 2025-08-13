// Enhanced AI Service with Advanced NLP and Context Memory
// Integrates IntentClassifier and ContextMemoryService for sophisticated conversation handling

import IntentClassifier from './nlp/intentClassifier.js'
import ContextMemoryService from './nlp/contextMemory.js'

class EnhancedAIService {
  constructor() {
    this.intentClassifier = new IntentClassifier()
    this.contextMemory = new ContextMemoryService()
    
    // Gemini API setup (if available)
    this.model = null
    this.initializeGeminiAPI()
    
    // Response templates for different scenarios
    this.responseTemplates = {
      greeting: [
        "👋 Hello! I'm Riley, your AI support assistant. I'm here to help you with orders, tracking, returns, and any questions you might have. What can I do for you today?",
        "Hi there! I'm Riley, and I'm ready to assist you with all your support needs. Whether it's about an order, tracking, or returns, just let me know how I can help!",
        "Welcome! I'm your AI support agent Riley. I can help you cancel orders, track shipments, process returns, and answer any questions. What would you like to do?"
      ],
      clarification: [
        "I want to make sure I understand correctly. Could you please provide a bit more detail about what you need help with?",
        "To better assist you, could you clarify what specific action you'd like me to take?",
        "I'm here to help! Could you be more specific about what you need assistance with?"
      ],
      escalation: [
        "I understand this is important to you. Let me connect you with one of our human support specialists who can provide more personalized assistance.",
        "I can see you've been trying to resolve this issue. I'm going to escalate this to our support team for immediate attention.",
        "Let me get a human agent involved to ensure we resolve this properly for you."
      ],
      multiIntent: [
        "I can see you have a few different requests. Let me handle them one by one to make sure everything gets resolved properly.",
        "I understand you need help with multiple things. I'll take care of each item for you step by step.",
        "Great! I can help you with all of those requests. Let me process them in the best order for you."
      ]
    }
  }

  /**
   * Initialize Gemini API if available
   */
  async initializeGeminiAPI() {
    try {
      // This would be implemented with actual Gemini SDK
      // For now, we'll simulate it
      console.log('[EnhancedAI] Gemini API initialization attempted')
      // this.model = await initializeGemini()
    } catch (error) {
      console.log('[EnhancedAI] Running without Gemini API - using enhanced fallback')
    }
  }

  /**
   * Process user message with full context awareness
   * @param {string} message - User message
   * @param {string} customerId - Customer identifier (defaults to primary user for single-user panel)
   * @param {string} sessionId - Session identifier
   * @param {array} userOrders - Current user's orders for context
   * @returns {object} Complete response with actions and context
   */
  async processMessage(message, customerId = null, sessionId, userOrders = []) {
    try {
      // For single-user panel, always use the primary user
      const userId = customerId || this.contextMemory.primaryUser.id
      
      // Update user context with latest orders
      if (userOrders.length > 0) {
        this.contextMemory.updateUserOrders(userOrders)
      }
      
      // Get enhanced conversation context with user-specific data
      const conversationContext = this.contextMemory.getAnalysisContext(sessionId)
      
      // Analyze message with full user context
      const analysis = await this.intentClassifier.analyzeMessage(message, conversationContext)
      
      // Create message object
      const messageObj = {
        content: message,
        type: 'user',
        sender: 'customer',
        customerId: userId
      }
      
      // Update context with new message and analysis
      this.contextMemory.updateContext(sessionId, messageObj, analysis)
      
      // Check for escalation needs
      const escalationCheck = this.intentClassifier.shouldEscalate(analysis, conversationContext)
      
      if (escalationCheck.shouldEscalate) {
        return await this.handleEscalation(sessionId, analysis, escalationCheck)
      }
      
      // Handle the message based on complexity
      if (analysis.isComplex) {
        return await this.handleMultiIntentMessage(sessionId, analysis, userId)
      } else {
        return await this.handleSingleIntentMessage(sessionId, analysis, userId)
      }
      
    } catch (error) {
      console.error('[EnhancedAI] Error processing message:', error)
      return {
        message: "I apologize, but I encountered an error processing your request. Please try again or contact our support team.",
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Handle single intent messages
   */
  async handleSingleIntentMessage(sessionId, analysis, customerId) {
    const { primaryIntent, entities, confidence } = analysis
    
    // Low confidence - ask for clarification
    if (confidence < 0.6 && !entities.orderIds.length) {
      const response = this.getRandomTemplate('clarification')
      return {
        message: response,
        intent: 'CLARIFICATION_NEEDED',
        confidence,
        needsClarification: true,
        actions: []
      }
    }
    
    // Generate response based on intent
    let response
    let actions = []
    
    switch (primaryIntent) {
      case 'CANCEL_ORDER':
        response = await this.handleCancelOrder(sessionId, entities, customerId)
        break
        
      case 'TRACK_ORDER':
        response = await this.handleTrackOrder(sessionId, entities, customerId)
        break
        
      case 'RETURN_ORDER':
        response = await this.handleReturnOrder(sessionId, entities, customerId)
        break
        
      case 'ORDER_INQUIRY':
        response = await this.handleOrderInquiry(sessionId, entities, customerId)
        break
        
      case 'PAYMENT_ISSUE':
        response = await this.handlePaymentIssue(sessionId, entities, customerId)
        break
        
      case 'GENERAL_INQUIRY':
      default:
        response = await this.handleGeneralInquiry(sessionId, analysis, customerId)
        break
    }
    
    // Record the action result
    if (response.orderId) {
      this.contextMemory.recordAction(sessionId, {
        intent: primaryIntent,
        orderId: response.orderId,
        customerId
      }, response.success !== false)
    }
    
    return {
      ...response,
      intent: primaryIntent,
      confidence,
      sessionId,
      context: {
        isComplex: false,
        hasContext: true
      }
    }
  }

  /**
   * Handle multi-intent messages
   */
  async handleMultiIntentMessage(sessionId, analysis, customerId) {
    const { intents, executionPlan } = analysis
    const responses = []
    const actions = []
    
    // Get random multi-intent intro
    const intro = this.getRandomTemplate('multiIntent')
    responses.push(intro)
    
    // Process each intent in the execution plan
    for (const step of executionPlan.steps) {
      if (!step.canExecute) {
        responses.push(`For ${step.intent.toLowerCase().replace('_', ' ')}, I'll need the order number. Could you provide that?`)
        continue
      }
      
      // Process the individual intent
      const stepAnalysis = {
        primaryIntent: step.intent,
        entities: analysis.entities,
        confidence: step.confidence
      }
      
      const stepResponse = await this.handleSingleIntentMessage(sessionId, stepAnalysis, customerId)
      if (stepResponse.message) {
        responses.push(stepResponse.message)
      }
      if (stepResponse.actions) {
        actions.push(...stepResponse.actions)
      }
    }
    
    return {
      message: responses.join('\n\n'),
      intent: 'MULTI_INTENT',
      intents: intents.map(i => i.intent),
      confidence: analysis.confidence,
      actions,
      executionPlan,
      sessionId,
      context: {
        isComplex: true,
        stepCount: executionPlan.steps.length
      }
    }
  }

  /**
   * Handle escalation to human agent
   */
  async handleEscalation(sessionId, analysis, escalationCheck) {
    const summary = this.contextMemory.getConversationSummary(sessionId)
    const response = this.getRandomTemplate('escalation')
    
    // Mark context as escalated
    const context = this.contextMemory.getContext(sessionId)
    context.customerState.isEscalated = true
    
    return {
      message: response,
      intent: 'ESCALATION',
      escalation: {
        priority: escalationCheck.priority,
        reasons: escalationCheck.reasons,
        summary
      },
      sessionId,
      context: {
        isEscalated: true,
        escalationReasons: escalationCheck.reasons
      }
    }
  }

  /**
   * Handle cancel order requests with enhanced product name matching
   */
  async handleCancelOrder(sessionId, entities, customerId) {
    const userContext = this.contextMemory.getUserContext(sessionId)
    
    // Check if we have direct order ID
    if (entities.orderIds.length > 0) {
      const orderId = entities.orderIds[0]
      const userOrder = userContext.activeOrders.find(order => order.id === orderId)
      
      if (!userOrder) {
        return {
          message: `I couldn't find order ${orderId} in your account. Let me show you your current orders that can be cancelled:\n\n${this.formatOrderList(userContext.activeOrders.filter(o => o.canCancel))}`,
          success: false,
          needsOrderSelection: true,
          availableOrders: userContext.activeOrders.filter(o => o.canCancel)
        }
      }
      
      if (!userOrder.canCancel) {
        return {
          message: `I'm sorry, but order ${orderId} cannot be cancelled as it's already in ${userOrder.status} status. You may be able to return it after delivery instead.`,
          success: false,
          alternativeAction: 'return'
        }
      }
      
      return {
        message: `✅ Perfect! I've successfully cancelled order ${orderId} (${userOrder.items.map(item => item.name).join(', ')}) for you. You'll receive a confirmation email shortly. Is there anything else I can help you with?`,
        success: true,
        orderId,
        cancelledItems: userOrder.items,
        actions: ['CANCEL_ORDER']
      }
    }
    
    // Check if we have product name matches
    if (entities.matchedOrders.length > 0) {
      const matchedOrder = entities.matchedOrders[0]
      const userOrder = userContext.activeOrders.find(order => order.id === matchedOrder.orderId)
      
      if (!userOrder || !userOrder.canCancel) {
        return {
          message: `I found your ${matchedOrder.matchedProduct} order, but it cannot be cancelled at this time. It's currently in ${userOrder?.status || 'unknown'} status.`,
          success: false,
          foundOrder: userOrder
        }
      }
      
      return {
        message: `✅ Found your ${matchedOrder.matchedProduct} order! I've successfully cancelled order ${userOrder.id} for you. You'll receive a confirmation email shortly with the cancellation details. Is there anything else I can help you with?`,
        success: true,
        orderId: userOrder.id,
        matchedProduct: matchedOrder.matchedProduct,
        cancelledItems: userOrder.items,
        actions: ['CANCEL_ORDER']
      }
    }
    
    // No specific order found - show available orders
    const cancellableOrders = userContext.activeOrders.filter(order => order.canCancel)
    
    if (cancellableOrders.length === 0) {
      return {
        message: "You don't currently have any orders that can be cancelled. All your recent orders are either already shipped or delivered. Would you like to check if any can be returned instead?",
        success: false,
        alternativeAction: 'return'
      }
    }
    
    if (cancellableOrders.length === 1) {
      const order = cancellableOrders[0]
      return {
        message: `I found one order that can be cancelled:\n\n**Order ${order.id}**\n${order.items.map(item => `• ${item.name}`).join('\n')}\nTotal: $${order.total}\n\nWould you like me to cancel this order?`,
        success: false,
        needsConfirmation: true,
        suggestedOrder: order
      }
    }
    
    return {
      message: `I'd be happy to help you cancel an order! Here are your orders that can be cancelled:\n\n${this.formatOrderList(cancellableOrders)}\n\nWhich order would you like to cancel? You can tell me the order number or just mention the product name.`,
      success: false,
      needsOrderSelection: true,
      availableOrders: cancellableOrders
    }
  }

  /**
   * Handle track order requests with enhanced product name matching
   */
  async handleTrackOrder(sessionId, entities, customerId) {
    const userContext = this.contextMemory.getUserContext(sessionId)
    
    // Check if we have direct order ID
    if (entities.orderIds.length > 0) {
      const orderId = entities.orderIds[0]
      const userOrder = [...userContext.activeOrders, ...userContext.orderHistory]
        .find(order => order.id === orderId)
      
      if (!userOrder) {
        return {
          message: `I couldn't find order ${orderId} in your account. Let me show you your trackable orders:\n\n${this.formatOrderList(userContext.activeOrders)}`,
          success: false,
          availableOrders: userContext.activeOrders
        }
      }
      
      const trackingInfo = this.generateTrackingInfoFromOrder(userOrder)
      
      return {
        message: `📦 Here's the latest tracking information for your ${userOrder.items.map(item => item.name).join(', ')} order:\n\n` +
                 `**Order:** ${orderId}\n` +
                 `**Status:** ${trackingInfo.status}\n` +
                 `**Tracking Number:** ${trackingInfo.trackingNumber}\n` +
                 `**Estimated Delivery:** ${trackingInfo.estimatedDelivery}\n` +
                 `**Last Update:** ${trackingInfo.lastUpdate}\n\n` +
                 `${trackingInfo.statusMessage}\n\n` +
                 `Is there anything else you'd like to know about this order?`,
        success: true,
        orderId,
        trackingInfo,
        actions: ['TRACK_ORDER']
      }
    }
    
    // Check if we have product name matches
    if (entities.matchedOrders.length > 0) {
      const matchedOrder = entities.matchedOrders[0]
      const userOrder = [...userContext.activeOrders, ...userContext.orderHistory]
        .find(order => order.id === matchedOrder.orderId)
      
      if (userOrder) {
        const trackingInfo = this.generateTrackingInfoFromOrder(userOrder)
        
        return {
          message: `📦 Found your ${matchedOrder.matchedProduct} order! Here's the tracking info:\n\n` +
                   `**Order:** ${userOrder.id}\n` +
                   `**Status:** ${trackingInfo.status}\n` +
                   `**Tracking Number:** ${trackingInfo.trackingNumber}\n` +
                   `**Estimated Delivery:** ${trackingInfo.estimatedDelivery}\n\n` +
                   `${trackingInfo.statusMessage}`,
          success: true,
          orderId: userOrder.id,
          matchedProduct: matchedOrder.matchedProduct,
          trackingInfo,
          actions: ['TRACK_ORDER']
        }
      }
    }
    
    // No specific order found - show trackable orders
    const trackableOrders = userContext.activeOrders
    
    if (trackableOrders.length === 0) {
      return {
        message: "You don't have any active orders to track right now. All your recent orders have been delivered. Would you like to check your order history?",
        success: false,
        alternativeAction: 'order_history'
      }
    }
    
    if (trackableOrders.length === 1) {
      const order = trackableOrders[0]
      const trackingInfo = this.generateTrackingInfoFromOrder(order)
      
      return {
        message: `📦 I found your current order! Here's the tracking information:\n\n` +
                 `**Order:** ${order.id}\n` +
                 `**Items:** ${order.items.map(item => item.name).join(', ')}\n` +
                 `**Status:** ${trackingInfo.status}\n` +
                 `**Tracking Number:** ${trackingInfo.trackingNumber}\n` +
                 `**Estimated Delivery:** ${trackingInfo.estimatedDelivery}\n\n` +
                 `${trackingInfo.statusMessage}`,
        success: true,
        orderId: order.id,
        trackingInfo,
        actions: ['TRACK_ORDER']
      }
    }
    
    return {
      message: `I can help you track your orders! Here are your active orders:\n\n${this.formatOrderList(trackableOrders)}\n\nWhich order would you like to track? You can tell me the order number or mention the product name.`,
      success: false,
      needsOrderSelection: true,
      availableOrders: trackableOrders
    }
  }

  /**
   * Handle return order requests with enhanced product name matching
   */
  async handleReturnOrder(sessionId, entities, customerId) {
    const userContext = this.contextMemory.getUserContext(sessionId)
    
    // Check if we have direct order ID
    if (entities.orderIds.length > 0) {
      const orderId = entities.orderIds[0]
      const userOrder = [...userContext.activeOrders, ...userContext.orderHistory]
        .find(order => order.id === orderId)
      
      if (!userOrder) {
        return {
          message: `I couldn't find order ${orderId} in your account. Let me show you orders that are eligible for return:\n\n${this.formatReturnableOrders(userContext)}`,
          success: false,
          availableOrders: this.getReturnableOrders(userContext)
        }
      }
      
      if (!userOrder.canReturn && userOrder.status !== 'delivered') {
        return {
          message: `Order ${orderId} is not eligible for return yet. Orders can only be returned after delivery. Current status: ${userOrder.status}`,
          success: false,
          currentStatus: userOrder.status
        }
      }
      
      return {
        message: `🔄 Great! I can help you return your ${userOrder.items.map(item => item.name).join(', ')} from order ${orderId}.\n\n` +
                 `✅ This order is eligible for return. I've initiated the return process and you'll receive an email with return instructions and a prepaid shipping label within the next few minutes.\n\n` +
                 `**Return Details:**\n` +
                 `• Return window: 30 days from delivery\n` +
                 `• Refund processing time: 3-5 business days after we receive the items\n` +
                 `• Original payment method will be refunded\n\n` +
                 `Is there a specific reason for the return that might help us improve?`,
        success: true,
        orderId,
        returnedItems: userOrder.items,
        actions: ['INITIATE_RETURN']
      }
    }
    
    // Check if we have product name matches
    if (entities.matchedOrders.length > 0) {
      const matchedOrder = entities.matchedOrders[0]
      const userOrder = [...userContext.activeOrders, ...userContext.orderHistory]
        .find(order => order.id === matchedOrder.orderId)
      
      if (userOrder && (userOrder.canReturn || userOrder.status === 'delivered')) {
        return {
          message: `🔄 Found your ${matchedOrder.matchedProduct} order! I've initiated the return process for order ${userOrder.id}.\n\n` +
                   `You'll receive an email with return instructions and a prepaid shipping label within the next few minutes.\n\n` +
                   `**Return Details:**\n` +
                   `• Return window: 30 days from delivery\n` +
                   `• Refund processing time: 3-5 business days\n\n` +
                   `Is there anything specific about the ${matchedOrder.matchedProduct} that prompted the return?`,
          success: true,
          orderId: userOrder.id,
          matchedProduct: matchedOrder.matchedProduct,
          actions: ['INITIATE_RETURN']
        }
      } else if (userOrder) {
        return {
          message: `I found your ${matchedOrder.matchedProduct} order, but it's not eligible for return yet. Current status: ${userOrder.status}. Orders can only be returned after delivery.`,
          success: false,
          foundOrder: userOrder
        }
      }
    }
    
    // No specific order found - show returnable orders
    const returnableOrders = this.getReturnableOrders(userContext)
    
    if (returnableOrders.length === 0) {
      return {
        message: "You don't currently have any orders that are eligible for return. Orders can only be returned within 30 days of delivery. Would you like to check your recent orders?",
        success: false,
        alternativeAction: 'order_history'
      }
    }
    
    if (returnableOrders.length === 1) {
      const order = returnableOrders[0]
      return {
        message: `I found one order eligible for return:\n\n**Order ${order.id}** (${order.status})\n${order.items.map(item => `• ${item.name}`).join('\n')}\n\nWould you like to start the return process for this order?`,
        success: false,
        needsConfirmation: true,
        suggestedOrder: order
      }
    }
    
    return {
      message: `I can help you with a return! Here are your orders eligible for return:\n\n${this.formatReturnableOrders(userContext)}\n\nWhich order would you like to return? You can tell me the order number or mention the product name.`,
      success: false,
      needsOrderSelection: true,
      availableOrders: returnableOrders
    }
  }

  /**
   * Handle order inquiries
   */
  async handleOrderInquiry(sessionId, entities, customerId) {
    if (!entities.orderIds.length) {
      return {
        message: "I'm here to help with any questions about your orders! Could you provide the order number you're asking about?",
        success: false,
        needsOrderId: true
      }
    }

    const orderId = entities.orderIds[0]
    const orderDetails = this.generateMockOrderDetails(orderId)
    
    return {
      message: `📋 Here are the details for order ${orderId}:\n\n` +
               `**Order Date:** ${orderDetails.orderDate}\n` +
               `**Status:** ${orderDetails.status}\n` +
               `**Items:** ${orderDetails.items.join(', ')}\n` +
               `**Total:** $${orderDetails.total}\n` +
               `**Shipping Address:** ${orderDetails.shippingAddress}\n\n` +
               `What specific information would you like to know about this order?`,
      success: true,
      orderId,
      orderDetails,
      actions: ['PROVIDE_ORDER_INFO']
    }
  }

  /**
   * Handle payment issues
   */
  async handlePaymentIssue(sessionId, entities, customerId) {
    return {
      message: `💳 I understand you're having a payment issue. Payment and billing matters require careful attention, so I'm going to connect you with our specialized billing support team who can securely access your payment information and resolve this for you.\n\n` +
               `They'll be able to help with:\n` +
               `• Payment method updates\n` +
               `• Billing disputes\n` +
               `• Refund processing\n` +
               `• Charge inquiries\n\n` +
               `You'll be connected to the next available agent.`,
      success: false,
      requiresEscalation: true,
      escalationReason: 'payment_issue'
    }
  }

  /**
   * Handle general inquiries
   */
  async handleGeneralInquiry(sessionId, analysis, customerId) {
    const context = this.contextMemory.getContext(sessionId)
    
    // First time user
    if (context.messages.length <= 1) {
      return {
        message: this.getRandomTemplate('greeting'),
        success: true,
        actions: ['GREETING']
      }
    }
    
    // Return helpful general response
    return {
      message: `I'm here to help! I can assist you with:\n\n` +
               `✅ **Cancel orders** - Just say "cancel order [order number]"\n` +
               `📦 **Track orders** - Ask "track order [order number]"\n` +
               `🔄 **Process returns** - Say "return order [order number]"\n` +
               `📋 **Order information** - Ask about any order details\n` +
               `💳 **Payment issues** - I can connect you with billing support\n\n` +
               `What would you like help with today?`,
      success: true,
      actions: ['GENERAL_SUPPORT']
    }
  }

  /**
   * Generate tracking information from order data
   */
  generateTrackingInfoFromOrder(order) {
    const statusMessages = {
      'confirmed': '📋 Your order has been confirmed and is being prepared',
      'processing': '⚡ Your order is being processed and will ship soon',
      'shipped': '🚚 Your order has been shipped and is on its way',
      'in_transit': '📦 Your package is in transit',
      'delivered': '✅ Your order has been delivered'
    }

    return {
      status: order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' '),
      trackingNumber: order.trackingNumber || 'TBD',
      estimatedDelivery: order.estimatedDelivery || 'TBD',
      lastUpdate: new Date().toLocaleString(),
      statusMessage: statusMessages[order.status] || 'Your order is being processed'
    }
  }

  /**
   * Format order list for display
   */
  formatOrderList(orders) {
    return orders.map(order => 
      `**${order.id}** - ${order.items.map(item => item.name).join(', ')} ($${order.total}) - ${order.status}`
    ).join('\n')
  }

  /**
   * Get returnable orders from user context
   */
  getReturnableOrders(userContext) {
    return [...userContext.activeOrders, ...userContext.orderHistory]
      .filter(order => order.canReturn || order.status === 'delivered')
  }

  /**
   * Format returnable orders for display
   */
  formatReturnableOrders(userContext) {
    const returnableOrders = this.getReturnableOrders(userContext)
    return returnableOrders.map(order => 
      `**${order.id}** - ${order.items.map(item => item.name).join(', ')} ($${order.total}) - ${order.status}${order.canReturn ? ' ✅' : ''}`
    ).join('\n')
  }

  /**
   * Generate mock order details
   */
  generateMockOrderDetails(orderId) {
    const products = ['Wireless Headphones', 'Smartphone Case', 'Laptop Stand', 'USB Cable', 'Power Bank']
    const randomItems = products.slice(0, Math.floor(Math.random() * 3) + 1)
    
    return {
      orderDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toDateString(),
      status: 'Confirmed',
      items: randomItems,
      total: (Math.random() * 200 + 50).toFixed(2),
      shippingAddress: '123 Main St, Anytown, ST 12345'
    }
  }

  /**
   * Get random template from category
   */
  getRandomTemplate(category) {
    const templates = this.responseTemplates[category] || []
    return templates[Math.floor(Math.random() * templates.length)] || 
           "I'm here to help! How can I assist you today?"
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      memory: this.contextMemory.getMemoryStats(),
      hasGeminiAPI: !!this.model,
      serviceStatus: 'active'
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.contextMemory) {
      this.contextMemory.destroy()
    }
  }
}

export default EnhancedAIService
