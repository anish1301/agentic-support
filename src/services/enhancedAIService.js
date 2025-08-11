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
   * @param {string} customerId - Customer identifier
   * @param {string} sessionId - Session identifier
   * @returns {object} Complete response with actions and context
   */
  async processMessage(message, customerId, sessionId) {
    try {
      // Get conversation context
      const conversationContext = this.contextMemory.getAnalysisContext(sessionId)
      
      // Analyze message with full context
      const analysis = await this.intentClassifier.analyzeMessage(message, conversationContext)
      
      // Create message object
      const messageObj = {
        content: message,
        type: 'user',
        sender: 'customer',
        customerId
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
        return await this.handleMultiIntentMessage(sessionId, analysis, customerId)
      } else {
        return await this.handleSingleIntentMessage(sessionId, analysis, customerId)
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
   * Handle cancel order requests
   */
  async handleCancelOrder(sessionId, entities, customerId) {
    if (!entities.orderIds.length) {
      return {
        message: "I'd be happy to help you cancel an order. Could you please provide the order number?",
        success: false,
        needsOrderId: true
      }
    }

    // For POC, we'll simulate order cancellation
    const orderId = entities.orderIds[0]
    const mockSuccess = Math.random() > 0.2 // 80% success rate

    if (mockSuccess) {
      return {
        message: `✅ Perfect! I've successfully cancelled order ${orderId} for you. You'll receive a confirmation email shortly with the cancellation details. Is there anything else I can help you with?`,
        success: true,
        orderId,
        actions: ['CANCEL_ORDER']
      }
    } else {
      return {
        message: `I apologize, but I'm unable to cancel order ${orderId}. This could be because the order is already being processed or shipped. Would you like me to connect you with our support team for further assistance?`,
        success: false,
        orderId,
        recommendEscalation: true
      }
    }
  }

  /**
   * Handle track order requests
   */
  async handleTrackOrder(sessionId, entities, customerId) {
    if (!entities.orderIds.length) {
      return {
        message: "I can help you track your order! Please provide the order number you'd like to track.",
        success: false,
        needsOrderId: true
      }
    }

    const orderId = entities.orderIds[0]
    
    // Mock tracking information
    const trackingInfo = this.generateMockTrackingInfo(orderId)
    
    return {
      message: `📦 Here's the latest tracking information for order ${orderId}:\n\n` +
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

  /**
   * Handle return order requests
   */
  async handleReturnOrder(sessionId, entities, customerId) {
    if (!entities.orderIds.length) {
      return {
        message: "I can help you with a return! Please provide the order number for the items you'd like to return.",
        success: false,
        needsOrderId: true
      }
    }

    const orderId = entities.orderIds[0]
    
    return {
      message: `🔄 I can help you start a return for order ${orderId}. Let me check the return eligibility...\n\n` +
               `✅ Good news! This order is eligible for return. I've initiated the return process and you'll receive an email with return instructions and a prepaid shipping label within the next few minutes.\n\n` +
               `Return window: 30 days from delivery\n` +
               `Refund processing time: 3-5 business days after we receive the items\n\n` +
               `Is there anything specific about the return you'd like to know?`,
      success: true,
      orderId,
      actions: ['INITIATE_RETURN']
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
   * Generate mock tracking information
   */
  generateMockTrackingInfo(orderId) {
    const statuses = ['Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered']
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
    
    return {
      status: randomStatus,
      trackingNumber: `1Z999AA${Math.random().toString().slice(2, 8)}`,
      estimatedDelivery: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toDateString(),
      lastUpdate: new Date().toLocaleString(),
      statusMessage: randomStatus === 'Delivered' ? 
        '📦 Your package has been delivered!' :
        '🚚 Your package is on its way and will be delivered soon!'
    }
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
