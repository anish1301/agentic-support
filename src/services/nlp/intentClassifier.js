// Advanced Intent Classification Service
// Supports multi-intent detection, confidence scoring, and complex query parsing

class IntentClassifier {
  constructor() {
    // Intent patterns with confidence weights
    this.intentPatterns = {
      CANCEL_ORDER: {
        keywords: ['cancel', 'stop', 'abort', 'terminate', 'remove'],
        patterns: [
          /cancel\s+(?:my\s+)?order/i,
          /stop\s+(?:my\s+)?order/i,
          /don't\s+want\s+(?:my\s+)?order/i,
          /abort\s+order/i
        ],
        context: ['order', 'purchase', 'buying'],
        weight: 0.9
      },
      TRACK_ORDER: {
        keywords: ['track', 'status', 'where', 'shipped', 'delivery', 'when'],
        patterns: [
          /track\s+(?:my\s+)?order/i,
          /order\s+status/i,
          /where\s+is\s+(?:my\s+)?order/i,
          /when\s+will\s+(?:my\s+)?order/i,
          /has\s+(?:my\s+)?order\s+shipped/i
        ],
        context: ['order', 'shipment', 'delivery'],
        weight: 0.85
      },
      RETURN_ORDER: {
        keywords: ['return', 'refund', 'exchange', 'send back', 'money back'],
        patterns: [
          /return\s+(?:my\s+)?order/i,
          /want\s+(?:a\s+)?refund/i,
          /send\s+(?:it\s+)?back/i,
          /exchange\s+(?:my\s+)?order/i,
          /money\s+back/i
        ],
        context: ['order', 'product', 'dissatisfied'],
        weight: 0.8
      },
      MODIFY_ORDER: {
        keywords: ['change', 'modify', 'update', 'edit', 'different'],
        patterns: [
          /change\s+(?:my\s+)?order/i,
          /modify\s+(?:my\s+)?order/i,
          /update\s+(?:my\s+)?order/i,
          /want\s+(?:a\s+)?different/i
        ],
        context: ['order', 'address', 'size', 'color'],
        weight: 0.75
      },
      ORDER_INQUIRY: {
        keywords: ['order', 'purchase', 'bought', 'ordered'],
        patterns: [
          /about\s+(?:my\s+)?order/i,
          /regarding\s+(?:my\s+)?order/i,
          /question\s+about/i
        ],
        context: ['information', 'details', 'help'],
        weight: 0.6
      },
      PAYMENT_ISSUE: {
        keywords: ['payment', 'charge', 'card', 'bill', 'invoice'],
        patterns: [
          /payment\s+(?:issue|problem)/i,
          /charged\s+wrong/i,
          /billing\s+(?:issue|problem)/i,
          /card\s+(?:issue|problem)/i
        ],
        context: ['money', 'credit', 'debit'],
        weight: 0.8
      },
      GENERAL_INQUIRY: {
        keywords: ['help', 'support', 'question', 'info', 'how'],
        patterns: [
          /need\s+help/i,
          /can\s+you\s+help/i,
          /how\s+(?:do|can)/i,
          /what\s+is/i
        ],
        context: ['assistance', 'information'],
        weight: 0.4
      }
    }

    // Sentiment indicators
    this.sentimentIndicators = {
      negative: ['frustrated', 'angry', 'upset', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointed'],
      positive: ['great', 'awesome', 'love', 'excellent', 'perfect', 'amazing', 'wonderful', 'fantastic'],
      urgent: ['urgent', 'asap', 'immediately', 'now', 'emergency', 'quick', 'fast', 'hurry']
    }

    // Temporal references
    this.temporalPatterns = {
      'last week': /last\s+week/i,
      'yesterday': /yesterday/i,
      'today': /today/i,
      'recent': /recent(?:ly)?/i,
      'current': /current/i,
      'latest': /latest/i,
      'this month': /this\s+month/i
    }
  }

  /**
   * Analyze message and detect multiple intents with confidence scores
   * @param {string} message - User message to analyze
   * @param {object} context - Conversation context
   * @returns {object} Analysis result with multiple intents
   */
  async analyzeMessage(message, context = {}) {
    const analysis = {
      intents: [],
      entities: this.extractEntities(message),
      sentiment: this.analyzeSentiment(message),
      urgency: this.determineUrgency(message),
      temporal: this.extractTemporal(message),
      confidence: 0,
      isComplex: false,
      needsClarification: false
    }

    // Detect all potential intents
    const intentScores = this.calculateIntentScores(message, context)
    
    // Sort by confidence and filter above threshold
    const sortedIntents = Object.entries(intentScores)
      .map(([intent, score]) => ({ intent, confidence: score }))
      .filter(item => item.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)

    analysis.intents = sortedIntents
    analysis.confidence = sortedIntents[0]?.confidence || 0
    analysis.isComplex = sortedIntents.length > 1
    analysis.needsClarification = analysis.confidence < 0.6 && !analysis.entities.orderIds.length

    // Handle multi-intent scenarios
    if (analysis.isComplex) {
      analysis.primaryIntent = sortedIntents[0].intent
      analysis.secondaryIntents = sortedIntents.slice(1)
      analysis.executionPlan = this.createExecutionPlan(analysis.intents, analysis.entities)
    } else if (sortedIntents.length > 0) {
      analysis.primaryIntent = sortedIntents[0].intent
    } else {
      analysis.primaryIntent = 'GENERAL_INQUIRY'
      analysis.confidence = 0.3
    }

    return analysis
  }

  /**
   * Calculate confidence scores for all intents
   */
  calculateIntentScores(message, context) {
    const scores = {}
    const lowerMessage = message.toLowerCase()

    for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
      let score = 0

      // Keyword matching
      const keywordMatches = intentData.keywords.filter(keyword => 
        lowerMessage.includes(keyword.toLowerCase())
      ).length
      score += (keywordMatches / intentData.keywords.length) * 0.4

      // Pattern matching
      const patternMatches = intentData.patterns.filter(pattern => 
        pattern.test(message)
      ).length
      score += (patternMatches / intentData.patterns.length) * 0.4

      // Context matching
      const contextMatches = intentData.context.filter(ctx => 
        lowerMessage.includes(ctx.toLowerCase())
      ).length
      score += (contextMatches / intentData.context.length) * 0.2

      // Apply intent weight
      score *= intentData.weight

      // Context boost from conversation history
      if (context.recentIntents && context.recentIntents.includes(intentName)) {
        score *= 1.2
      }

      scores[intentName] = Math.min(score, 1.0)
    }

    return scores
  }

  /**
   * Extract entities from the message
   */
  extractEntities(message) {
    const entities = {
      orderIds: [],
      products: [],
      amounts: [],
      dates: [],
      emails: [],
      phoneNumbers: []
    }

    // Extract order IDs
    const orderPatterns = [
      /(?:order\s+(?:number\s+|#)?)?(?:ORD-)?(\w{3,8}(?:-\w{3,8})?)/gi,
      /#(\w+)/g,
      /order\s+(\w+)/gi
    ]

    orderPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(message)) !== null) {
        let orderId = match[1].toUpperCase()
        if (!orderId.startsWith('ORD-')) {
          orderId = `ORD-${orderId}`
        }
        if (!entities.orderIds.includes(orderId)) {
          entities.orderIds.push(orderId)
        }
      }
    })

    // Extract monetary amounts
    const amountPattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g
    let amountMatch
    while ((amountMatch = amountPattern.exec(message)) !== null) {
      entities.amounts.push(parseFloat(amountMatch[1].replace(',', '')))
    }

    // Extract emails
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    let emailMatch
    while ((emailMatch = emailPattern.exec(message)) !== null) {
      entities.emails.push(emailMatch[0])
    }

    // Extract phone numbers
    const phonePattern = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g
    let phoneMatch
    while ((phoneMatch = phonePattern.exec(message)) !== null) {
      entities.phoneNumbers.push(phoneMatch[0])
    }

    return entities
  }

  /**
   * Analyze sentiment and emotional state
   */
  analyzeSentiment(message) {
    const lowerMessage = message.toLowerCase()
    let sentiment = 'neutral'
    let intensity = 0.5
    let emotions = []

    // Check negative sentiment
    const negativeCount = this.sentimentIndicators.negative.filter(word => 
      lowerMessage.includes(word)
    ).length

    // Check positive sentiment
    const positiveCount = this.sentimentIndicators.positive.filter(word => 
      lowerMessage.includes(word)
    ).length

    if (negativeCount > positiveCount) {
      sentiment = 'negative'
      intensity = Math.min(0.3 + (negativeCount * 0.2), 1.0)
      emotions.push('frustrated')
    } else if (positiveCount > negativeCount) {
      sentiment = 'positive'
      intensity = Math.min(0.6 + (positiveCount * 0.1), 1.0)
      emotions.push('satisfied')
    }

    // Check for frustration indicators
    const frustrationPatterns = [
      /this is ridiculous/i,
      /fed up/i,
      /can't believe/i,
      /waste of time/i,
      /horrible service/i,
      /never again/i
    ]

    if (frustrationPatterns.some(pattern => pattern.test(message))) {
      sentiment = 'negative'
      intensity = Math.max(intensity, 0.8)
      emotions.push('angry')
    }

    return { sentiment, intensity, emotions }
  }

  /**
   * Determine urgency level
   */
  determineUrgency(message) {
    const lowerMessage = message.toLowerCase()
    let urgency = 'medium'
    let score = 0.5

    // Check urgent keywords
    const urgentCount = this.sentimentIndicators.urgent.filter(word => 
      lowerMessage.includes(word)
    ).length

    if (urgentCount > 0) {
      urgency = 'high'
      score = Math.min(0.7 + (urgentCount * 0.1), 1.0)
    }

    // Check for time-sensitive patterns
    const urgentPatterns = [
      /need\s+(?:it\s+)?(?:by\s+)?(?:today|tomorrow)/i,
      /leaving\s+(?:today|tomorrow)/i,
      /event\s+is\s+(?:today|tomorrow)/i,
      /deadline/i
    ]

    if (urgentPatterns.some(pattern => pattern.test(message))) {
      urgency = 'high'
      score = Math.max(score, 0.8)
    }

    return { level: urgency, score }
  }

  /**
   * Extract temporal references
   */
  extractTemporal(message) {
    const temporal = []

    for (const [term, pattern] of Object.entries(this.temporalPatterns)) {
      if (pattern.test(message)) {
        temporal.push(term)
      }
    }

    return temporal
  }

  /**
   * Create execution plan for multi-intent scenarios
   */
  createExecutionPlan(intents, entities) {
    const plan = {
      steps: [],
      requiresClarification: false,
      estimatedDuration: 0
    }

    // Sort intents by logical execution order
    const executionOrder = {
      'CANCEL_ORDER': 1,
      'MODIFY_ORDER': 2,
      'RETURN_ORDER': 3,
      'TRACK_ORDER': 4,
      'ORDER_INQUIRY': 5,
      'PAYMENT_ISSUE': 6,
      'GENERAL_INQUIRY': 7
    }

    const sortedIntents = intents.sort((a, b) => 
      (executionOrder[a.intent] || 999) - (executionOrder[b.intent] || 999)
    )

    for (const intentObj of sortedIntents) {
      const step = {
        intent: intentObj.intent,
        confidence: intentObj.confidence,
        requiresOrderId: ['CANCEL_ORDER', 'TRACK_ORDER', 'RETURN_ORDER', 'MODIFY_ORDER'].includes(intentObj.intent),
        hasOrderId: entities.orderIds.length > 0,
        canExecute: true
      }

      if (step.requiresOrderId && !step.hasOrderId) {
        step.canExecute = false
        plan.requiresClarification = true
      }

      plan.steps.push(step)
      plan.estimatedDuration += this.getIntentDuration(intentObj.intent)
    }

    return plan
  }

  /**
   * Get estimated duration for intent processing
   */
  getIntentDuration(intent) {
    const durations = {
      'CANCEL_ORDER': 2000,
      'TRACK_ORDER': 1500,
      'RETURN_ORDER': 3000,
      'MODIFY_ORDER': 2500,
      'ORDER_INQUIRY': 1000,
      'PAYMENT_ISSUE': 2000,
      'GENERAL_INQUIRY': 500
    }
    return durations[intent] || 1000
  }

  /**
   * Check if customer should be escalated to human agent
   */
  shouldEscalate(analysis, conversationContext = {}) {
    const escalationReasons = []

    // High frustration
    if (analysis.sentiment.sentiment === 'negative' && analysis.sentiment.intensity > 0.7) {
      escalationReasons.push('high_frustration')
    }

    // Low confidence in understanding
    if (analysis.confidence < 0.4) {
      escalationReasons.push('low_confidence')
    }

    // Complex multi-intent with dependencies
    if (analysis.isComplex && analysis.executionPlan.requiresClarification) {
      escalationReasons.push('complex_request')
    }

    // Repeated failed attempts
    if (conversationContext.failedAttempts > 2) {
      escalationReasons.push('repeated_failures')
    }

    // Payment or billing issues (often require human touch)
    if (analysis.primaryIntent === 'PAYMENT_ISSUE') {
      escalationReasons.push('payment_sensitive')
    }

    return {
      shouldEscalate: escalationReasons.length > 0,
      reasons: escalationReasons,
      priority: this.getEscalationPriority(escalationReasons, analysis)
    }
  }

  /**
   * Determine escalation priority
   */
  getEscalationPriority(reasons, analysis) {
    if (reasons.includes('high_frustration') || reasons.includes('payment_sensitive')) {
      return 'high'
    }
    if (reasons.includes('repeated_failures') || analysis.urgency.level === 'high') {
      return 'medium'
    }
    return 'low'
  }
}

export default IntentClassifier
