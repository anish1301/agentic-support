// Smart Hybrid AI Service
// Uses local processing by default, Gemini for frustration, caching for efficiency

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Simplified Intent Classifier - focuses on core intents
class IntentClassifier {
  constructor() {
    // Core intent patterns only
    this.intentPatterns = {
      CANCEL_ORDER: {
        keywords: ['cancel', 'stop', 'abort', 'remove'],
        patterns: [/cancel\s+(?:my\s+)?order/i, /stop\s+(?:my\s+)?order/i],
        weight: 0.9
      },
      TRACK_ORDER: {
        keywords: ['track', 'status', 'where', 'shipped'],
        patterns: [/track\s+(?:my\s+)?order/i, /order\s+status/i, /where\s+is/i],
        weight: 0.85
      },
      RETURN_ORDER: {
        keywords: ['return', 'refund', 'exchange', 'send back'],
        patterns: [/return\s+(?:my\s+)?order/i, /want\s+refund/i],
        weight: 0.8
      },
      GENERAL_INQUIRY: {
        keywords: ['help', 'support', 'question'],
        patterns: [/need\s+help/i, /can\s+you\s+help/i],
        weight: 0.4
      }
    }

    // Frustration indicators for Gemini trigger
    this.frustrationIndicators = [
      'frustrated', 'angry', 'upset', 'furious', 'mad', 'pissed',
      'terrible', 'awful', 'horrible', 'worst', 'ridiculous',
      'unacceptable', 'disgusting', 'pathetic', 'useless'
    ]
  }

  async analyzeMessage(message, context = {}) {
    const lowerMessage = message.toLowerCase()
    
    const analysis = {
      primaryIntent: 'GENERAL_INQUIRY',
      confidence: 0.5,
      entities: this.extractEntities(message),
      isFrustrated: this.detectFrustration(message),
      source: 'local'
    }

    // Calculate intent scores - simplified
    let bestIntent = 'GENERAL_INQUIRY'
    let bestScore = 0.3

    for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
      let score = 0

      // Keyword matching
      const keywordMatches = intentData.keywords.filter(keyword => 
        lowerMessage.includes(keyword.toLowerCase())
      ).length
      score += (keywordMatches / intentData.keywords.length) * 0.6

      // Pattern matching  
      const patternMatches = intentData.patterns.filter(pattern => 
        pattern.test(message)
      ).length
      score += (patternMatches / intentData.patterns.length) * 0.4

      score *= intentData.weight

      if (score > bestScore) {
        bestScore = score
        bestIntent = intentName
      }
    }

    analysis.primaryIntent = bestIntent
    analysis.confidence = bestScore

    return analysis
  }

  // Detect customer frustration for Gemini trigger
  detectFrustration(message) {
    const lowerMessage = message.toLowerCase()
    
    const frustrationCount = this.frustrationIndicators.filter(indicator => 
      lowerMessage.includes(indicator)
    ).length

    // Also check for patterns indicating frustration
    const frustrationPatterns = [
      /this is ridiculous/i,
      /fed up/i,
      /can't believe/i,
      /waste of time/i,
      /never again/i,
      /worst service/i,
      /taking too long/i,
      /very angry/i
    ]

    const patternMatches = frustrationPatterns.filter(pattern => 
      pattern.test(message)
    ).length

    return frustrationCount > 0 || patternMatches > 0
  }

  calculateIntentScores(message, context) {
    const scores = {}
    const lowerMessage = message.toLowerCase()

    for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
      let score = 0

      const keywordMatches = intentData.keywords.filter(keyword => 
        lowerMessage.includes(keyword.toLowerCase())
      ).length
      score += (keywordMatches / intentData.keywords.length) * 0.6

      const patternMatches = intentData.patterns.filter(pattern => 
        pattern.test(message)
      ).length
      score += (patternMatches / intentData.patterns.length) * 0.8

      const contextMatches = intentData.context.filter(ctx => 
        lowerMessage.includes(ctx.toLowerCase())
      ).length
      score += (contextMatches / intentData.context.length) * 0.3

      score *= intentData.weight

      if (context.recentIntents && context.recentIntents.includes(intentName)) {
        score *= 1.2
      }

      scores[intentName] = Math.min(score, 1.0)
    }

    return scores
  }

  extractEntities(message) {
    const entities = {
      orderIds: []
    }

    // More precise order ID patterns
    const orderPatterns = [
      /\bORD-[A-Z0-9]{4,8}\b/gi,  // Exact ORD-XXXX pattern
      /\border\s+(?:#|number\s+)?([A-Z0-9]{4,8})\b/gi,  // "order 12345" or "order #12345"
      /#([A-Z0-9]{4,8})\b/gi       // #12345 pattern
    ]

    orderPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(message)) !== null) {
        let orderId = match[1] || match[0]
        
        // Clean up the order ID
        if (orderId.startsWith('#')) {
          orderId = orderId.substring(1)
        }
        if (!orderId.startsWith('ORD-') && /^[A-Z0-9]{4,8}$/.test(orderId)) {
          orderId = `ORD-${orderId}`
        }
        
        // Only add valid-looking order IDs
        if (orderId.match(/^ORD-[A-Z0-9]{4,8}$/i) && !entities.orderIds.includes(orderId.toUpperCase())) {
          entities.orderIds.push(orderId.toUpperCase())
        }
      }
    })

    return entities
  }

  analyzeSentiment(message) {
    const lowerMessage = message.toLowerCase()
    let sentiment = 'neutral'
    let intensity = 0.5

    const negativeCount = this.sentimentIndicators.negative.filter(word => 
      lowerMessage.includes(word)
    ).length

    const positiveCount = this.sentimentIndicators.positive.filter(word => 
      lowerMessage.includes(word)
    ).length

    if (negativeCount > positiveCount) {
      sentiment = 'negative'
      intensity = Math.min(0.3 + (negativeCount * 0.2), 1.0)
    } else if (positiveCount > negativeCount) {
      sentiment = 'positive'
      intensity = Math.min(0.6 + (positiveCount * 0.1), 1.0)
    }

    return { sentiment, intensity }
  }

  determineUrgency(message) {
    const lowerMessage = message.toLowerCase()
    let urgency = 'medium'
    let score = 0.5

    const urgentCount = this.sentimentIndicators.urgent.filter(word => 
      lowerMessage.includes(word)
    ).length

    if (urgentCount > 0) {
      urgency = 'high'
      score = Math.min(0.7 + (urgentCount * 0.1), 1.0)
    }

    return { level: urgency, score }
  }

  shouldEscalate(analysis, conversationContext = {}) {
    const escalationReasons = []

    if (analysis.sentiment.sentiment === 'negative' && analysis.sentiment.intensity > 0.8) {
      escalationReasons.push('high_frustration')
    }

    if (analysis.confidence < 0.3) {
      escalationReasons.push('low_confidence')
    }

    if (conversationContext.failedAttempts > 2) {
      escalationReasons.push('repeated_failures')
    }

    return {
      shouldEscalate: escalationReasons.length > 0,
      reasons: escalationReasons,
      priority: escalationReasons.includes('high_frustration') ? 'high' : 'medium'
    }
  }
}

class ContextMemoryService {
  constructor() {
    this.conversationContexts = new Map()
    this.maxContextHistory = 20
    this.contextTTL = 1800000 // 30 minutes
  }

  getContext(sessionId) {
    if (!this.conversationContexts.has(sessionId)) {
      this.conversationContexts.set(sessionId, {
        sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        messages: [],
        intents: [],
        entities: {
          orderIds: new Set()
        },
        customerState: {
          sentiment: 'neutral',
          frustrationLevel: 0
        },
        failedAttempts: 0
      })
    }

    const context = this.conversationContexts.get(sessionId)
    context.lastActivity = Date.now()
    return context
  }

  updateContext(sessionId, message, analysis) {
    const context = this.getContext(sessionId)

    context.messages.push({
      ...message,
      analysis,
      timestamp: Date.now()
    })
    if (context.messages.length > this.maxContextHistory) {
      context.messages = context.messages.slice(-this.maxContextHistory)
    }

    if (analysis.primaryIntent) {
      context.intents.push({
        intent: analysis.primaryIntent,
        confidence: analysis.confidence,
        timestamp: Date.now()
      })
      if (context.intents.length > 10) {
        context.intents = context.intents.slice(-10)
      }
    }

    if (analysis.entities) {
      analysis.entities.orderIds.forEach(id => context.entities.orderIds.add(id))
    }

    if (analysis.sentiment) {
      context.customerState.sentiment = analysis.sentiment.sentiment
      if (analysis.sentiment.sentiment === 'negative') {
        context.customerState.frustrationLevel = Math.min(context.customerState.frustrationLevel + 0.2, 1.0)
      }
    }

    return context
  }

  getAnalysisContext(sessionId) {
    const context = this.getContext(sessionId)
    
    return {
      recentIntents: context.intents.slice(-3).map(i => i.intent),
      knownOrderIds: Array.from(context.entities.orderIds),
      customerSentiment: context.customerState.sentiment,
      frustrationLevel: context.customerState.frustrationLevel,
      failedAttempts: context.failedAttempts,
      conversationLength: context.messages.length
    }
  }

  recordAction(sessionId, action, success) {
    const context = this.getContext(sessionId)
    
    if (success) {
      context.failedAttempts = 0
    } else {
      context.failedAttempts++
    }
  }

  // Add destroy method for cleanup
  destroy() {
    // Clear all contexts
    this.conversationContexts.clear()
  }
}

class EnhancedAIService {
  constructor() {
    this.intentClassifier = new IntentClassifier()
    this.contextMemory = new ContextMemoryService()
    this.geminiContext = new GeminiContextService() // Add Gemini context service
    
    // Initialize Gemini API
    this.model = null
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        console.log('[EnhancedAI] Gemini API initialized')
      } catch (error) {
        console.log('[EnhancedAI] Gemini API failed to initialize:', error.message)
      }
    }

    this.systemPrompt = `You are Riley, an AI customer support agent for an e-commerce platform. You are helpful, empathetic, and efficient. You can:

1. Cancel orders (if within cancellation window)
2. Track order status and shipments  
3. Process returns and exchanges
4. Answer questions about orders and policies
5. Escalate complex issues to human agents

Always be conversational, use emojis appropriately, and provide clear actionable information. If you cannot help with something, explain why and offer alternatives.`
  }

  async processMessage(message, customerId, sessionId) {
    try {
      const conversationContext = this.contextMemory.getAnalysisContext(sessionId)
      
      // Use hybrid approach: Local analysis + Gemini enhancement
      const localContext = this.contextMemory.getContext(sessionId)
      const enhancedAnalysis = await this.geminiContext.getEnhancedContext(
        sessionId, 
        message, 
        {
          ...conversationContext,
          messages: localContext.messages,
          customerProfile: { customerId }
        }
      )
      
      // Fall back to local analysis if Gemini fails
      const analysis = enhancedAnalysis.geminiProcessed ? 
        enhancedAnalysis : 
        await this.intentClassifier.analyzeMessage(message, conversationContext)
      
      const messageObj = {
        content: message,
        type: 'user',
        sender: 'customer',
        customerId
      }
      
      this.contextMemory.updateContext(sessionId, messageObj, analysis)
      
      // Check escalation with enhanced context
      const escalationCheck = this.shouldEscalateWithGemini(analysis, conversationContext, enhancedAnalysis)
      
      if (escalationCheck.shouldEscalate) {
        return this.handleEscalation(escalationCheck)
      }
      
      return await this.generateResponse(message, analysis, customerId, sessionId)
      
    } catch (error) {
      console.error('[EnhancedAI] Error processing message:', error)
      return {
        message: "I apologize, but I encountered an error processing your request. Please try again.",
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Enhanced escalation check using Gemini insights
   */
  shouldEscalateWithGemini(analysis, conversationContext, geminiAnalysis) {
    // Use Gemini's escalation recommendations if available
    if (geminiAnalysis?.recommendations?.escalationRecommended) {
      return {
        shouldEscalate: true,
        reasons: ['gemini_recommendation'],
        priority: geminiAnalysis.contextInsights?.urgencyLevel === 'critical' ? 'high' : 'medium',
        geminiInsights: geminiAnalysis.recommendations
      }
    }
    
    // Enhanced escalation logic with Gemini sentiment
    const escalationReasons = []
    
    if (geminiAnalysis?.sentiment) {
      const sentiment = geminiAnalysis.sentiment
      if (sentiment.overall === 'negative' && sentiment.intensity > 0.8) {
        escalationReasons.push('high_frustration')
      }
      if (sentiment.escalationRisk === 'high') {
        escalationReasons.push('escalation_risk')
      }
    }
    
    if (analysis.confidence < 0.3) {
      escalationReasons.push('low_confidence')
    }
    
    if (conversationContext.failedAttempts > 2) {
      escalationReasons.push('repeated_failures')
    }
    
    // Check for payment issues (always escalate)
    if (analysis.primaryIntent === 'PAYMENT_ISSUE') {
      escalationReasons.push('payment_sensitive')
    }
    
    return {
      shouldEscalate: escalationReasons.length > 0,
      reasons: escalationReasons,
      priority: this.getEscalationPriority(escalationReasons, geminiAnalysis),
      geminiInsights: geminiAnalysis?.recommendations
    }
  }

  /**
   * Determine escalation priority with Gemini insights
   */
  getEscalationPriority(reasons, geminiAnalysis) {
    if (reasons.includes('payment_sensitive') || reasons.includes('escalation_risk')) {
      return 'high'
    }
    if (geminiAnalysis?.contextInsights?.urgencyLevel === 'critical') {
      return 'high'
    }
    if (reasons.includes('high_frustration') || reasons.includes('repeated_failures')) {
      return 'medium'
    }
    return 'low'
  }

  async generateResponse(message, analysis, customerId, sessionId) {
    const { primaryIntent, entities, confidence } = analysis
    
    // Use Gemini API if available
    if (this.model) {
      return await this.generateGeminiResponse(message, analysis, customerId)
    }
    
    // Fallback to template-based responses
    return this.generateTemplateResponse(message, analysis, customerId, sessionId)
  }

  async generateGeminiResponse(message, analysis, customerId) {
    try {
      const contextPrompt = `${this.systemPrompt}

CUSTOMER MESSAGE: "${message}"
ANALYSIS:
- Intent: ${analysis.primaryIntent}
- Order IDs: ${analysis.entities.orderIds.join(', ') || 'None'}
- Confidence: ${analysis.confidence}
- Sentiment: ${analysis.sentiment.sentiment}
- Urgency: ${analysis.urgency.level}

Generate a helpful response that addresses the customer's needs. If an order ID was mentioned, acknowledge it and provide relevant information or actions.`

      const result = await this.model.generateContent(contextPrompt)
      const response = await result.response
      const aiMessage = response.text()

      return {
        message: aiMessage,
        intent: analysis.primaryIntent,
        confidence: analysis.confidence,
        orderId: analysis.entities.orderIds[0] || null,
        success: true,
        source: 'gemini'
      }
      
    } catch (error) {
      console.error('[EnhancedAI] Gemini API error:', error)
      return this.generateTemplateResponse(message, analysis, customerId)
    }
  }

  generateTemplateResponse(message, analysis, customerId, sessionId) {
    const { primaryIntent, entities } = analysis
    
    switch (primaryIntent) {
      case 'CANCEL_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0]
          this.contextMemory.recordAction(sessionId, { intent: 'CANCEL_ORDER', orderId }, true)
          return {
            message: `✅ I've successfully cancelled order ${orderId} for you. You'll receive a confirmation email shortly. Is there anything else I can help you with?`,
            intent: 'CANCEL_ORDER',
            orderId,
            success: true,
            actions: ['CANCEL_ORDER']
          }
        } else {
          return {
            message: "I'd be happy to help you cancel an order. Could you please provide the order number?",
            intent: 'CANCEL_ORDER',
            success: false,
            needsOrderId: true
          }
        }
        
      case 'TRACK_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0]
          return {
            message: `📦 Here's the tracking information for order ${orderId}:\n\n**Status:** In Transit\n**Tracking:** 1Z999AA123456789\n**Est. Delivery:** ${new Date(Date.now() + 2*24*60*60*1000).toDateString()}\n\nYour package is on its way! Is there anything else you need help with?`,
            intent: 'TRACK_ORDER',
            orderId,
            success: true,
            actions: ['TRACK_ORDER']
          }
        } else {
          return {
            message: "I can help you track your order! Please provide the order number you'd like to track.",
            intent: 'TRACK_ORDER',
            success: false,
            needsOrderId: true
          }
        }
        
      case 'RETURN_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0]
          return {
            message: `🔄 I've initiated the return process for order ${orderId}. You'll receive an email with return instructions and a prepaid shipping label within a few minutes. The refund will be processed 3-5 business days after we receive the items. Anything else I can help with?`,
            intent: 'RETURN_ORDER',
            orderId,
            success: true,
            actions: ['INITIATE_RETURN']
          }
        } else {
          return {
            message: "I can help you with a return! Please provide the order number for the items you'd like to return.",
            intent: 'RETURN_ORDER',
            success: false,
            needsOrderId: true
          }
        }
        
      default:
        return {
          message: "👋 Hi there! I'm Riley, your AI support assistant. I can help you with:\n\n✅ Cancel orders\n📦 Track shipments\n🔄 Process returns\n❓ Answer questions\n\nWhat can I do for you today?",
          intent: 'GENERAL_INQUIRY',
          success: true,
          actions: ['GREETING']
        }
    }
  }

  handleEscalation(escalationCheck) {
    return {
      message: "I understand this is important to you. Let me connect you with one of our human support specialists who can provide more personalized assistance. You'll be connected to the next available agent.",
      intent: 'ESCALATION',
      escalation: {
        priority: escalationCheck.priority,
        reasons: escalationCheck.reasons
      },
      success: false,
      requiresHuman: true
    }
  }

  getServiceStats() {
    return {
      hasGeminiAPI: !!this.model,
      memoryStats: {
        activeContexts: this.contextMemory.conversationContexts.size
      },
      geminiContext: this.geminiContext.getStats()
    }
  }

  // Add destroy method for cleanup
  destroy() {
    // Cleanup method for service shutdown
    if (this.contextMemory && this.contextMemory.destroy) {
      this.contextMemory.destroy()
    }
    if (this.geminiContext && this.geminiContext.destroy) {
      this.geminiContext.destroy()
    }
  }
}

module.exports = EnhancedAIService
