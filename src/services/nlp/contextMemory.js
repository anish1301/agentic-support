// Context Memory Service
// Handles conversation context, user preferences, and session memory

class ContextMemoryService {
  constructor() {
    // In-memory storage for fast access (production would use Redis)
    this.conversationContexts = new Map()
    this.userPreferences = new Map()
    this.sessionMemory = new Map()
    this.userContexts = new Map() // User-specific context storage
    
    // Configuration
    this.maxContextHistory = 20
    this.contextTTL = 1800000 // 30 minutes
    this.persistenceDelay = 5000 // 5 seconds delay for DB writes
    
    // Single user panel configuration (for POC)
    this.primaryUser = {
      id: 'CUST-001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com'
    }
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 300000) // Clean up every 5 minutes
  }

  /**
   * Get conversation context for a session
   * @param {string} sessionId - Session identifier
   * @returns {object} Context object
   */
  getContext(sessionId) {
    if (!this.conversationContexts.has(sessionId)) {
      this.conversationContexts.set(sessionId, {
        sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        messages: [],
        intents: [],
        entities: {
          orderIds: new Set(),
          products: new Set(),
          issues: new Set()
        },
        customerState: {
          sentiment: 'neutral',
          frustrationLevel: 0,
          satisfactionScore: 0.5,
          isEscalated: false
        },
        preferences: {
          communicationStyle: 'friendly',
          preferredChannel: 'chat',
          timezone: null
        },
        actionHistory: [],
        failedAttempts: 0,
        successfulActions: 0
      })
    }

    const context = this.conversationContexts.get(sessionId)
    context.lastActivity = Date.now()
    return context
  }

  /**
   * Update context with new message and analysis
   * @param {string} sessionId - Session identifier
   * @param {object} message - Message object
   * @param {object} analysis - NLP analysis result
   */
  updateContext(sessionId, message, analysis) {
    const context = this.getContext(sessionId)

    // Add message to history (keep only recent messages)
    context.messages.push({
      ...message,
      analysis,
      timestamp: Date.now()
    })
    if (context.messages.length > this.maxContextHistory) {
      context.messages = context.messages.slice(-this.maxContextHistory)
    }

    // Track intents
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

    // Update entities
    if (analysis.entities) {
      analysis.entities.orderIds.forEach(id => context.entities.orderIds.add(id))
      analysis.entities.products.forEach(product => context.entities.products.add(product))
    }

    // Update customer sentiment tracking
    this.updateCustomerState(context, analysis)

    // Schedule persistence
    this.schedulePersistence(sessionId)

    return context
  }

  /**
   * Update customer emotional state
   * @param {object} context - Conversation context
   * @param {object} analysis - NLP analysis result
   */
  updateCustomerState(context, analysis) {
    const state = context.customerState

    // Update sentiment
    if (analysis.sentiment) {
      state.sentiment = analysis.sentiment.sentiment
      
      // Track frustration level
      if (analysis.sentiment.sentiment === 'negative') {
        state.frustrationLevel = Math.min(state.frustrationLevel + 0.2, 1.0)
      } else if (analysis.sentiment.sentiment === 'positive') {
        state.frustrationLevel = Math.max(state.frustrationLevel - 0.1, 0)
      }

      // Update satisfaction score
      const sentimentWeight = {
        'positive': 0.8,
        'neutral': 0.5,
        'negative': 0.2
      }
      const newScore = sentimentWeight[analysis.sentiment.sentiment] || 0.5
      state.satisfactionScore = (state.satisfactionScore * 0.7) + (newScore * 0.3)
    }
  }

  /**
   * Get user-specific context (for single-user panel)
   * @param {string} sessionId - Session identifier
   * @returns {object} User context with orders and preferences
   */
  getUserContext(sessionId) {
    const userId = this.primaryUser.id
    
    if (!this.userContexts.has(userId)) {
      this.userContexts.set(userId, {
        userId,
        userName: this.primaryUser.name,
        userEmail: this.primaryUser.email,
        activeOrders: [],
        orderHistory: [],
        preferences: {
          communicationStyle: 'friendly',
          preferredProducts: [],
          frequentActions: []
        },
        personalizedIntents: new Map(), // Track user-specific intent patterns
        productNameMappings: new Map(), // Map product names to order IDs
        lastOrdersUpdate: null,
        pendingIntent: null, // Track when we're waiting for clarification
        pendingContext: null, // Additional context for pending intent
        lastBotResponse: null // Track what the bot last asked for
      })
    }
    
    return this.userContexts.get(userId)
  }

  /**
   * Update user's order context with current orders
   * @param {array} orders - Current user orders
   */
  updateUserOrders(orders) {
    const userId = this.primaryUser.id
    const userContext = this.getUserContext()
    
    // Filter orders for current user
    const userOrders = orders.filter(order => order.customerId === userId)
    
    // Update active orders
    userContext.activeOrders = userOrders.filter(order => 
      ['confirmed', 'processing', 'shipped', 'in_transit'].includes(order.status)
    )
    
    // Update order history  
    userContext.orderHistory = userOrders.filter(order =>
      ['delivered', 'cancelled', 'returned'].includes(order.status)
    )
    
    // Build product name to order ID mappings for natural language processing
    userContext.productNameMappings.clear()
    userOrders.forEach(order => {
      order.items.forEach(item => {
        const productName = item.name.toLowerCase()
        const productVariant = item.variant ? item.variant.toLowerCase() : ''
        
        // Map full product name
        userContext.productNameMappings.set(productName, order.id)
        
        // Map product keywords (e.g., "iPhone" from "iPhone 15 Pro")
        const keywords = productName.split(' ')
        keywords.forEach(keyword => {
          if (keyword.length > 2) { // Ignore short words
            userContext.productNameMappings.set(keyword, order.id)
          }
        })
        
        // Map variant information
        if (productVariant) {
          userContext.productNameMappings.set(`${productName} ${productVariant}`, order.id)
        }
      })
    })
    
    userContext.lastOrdersUpdate = Date.now()
  }

  /**
   * Find orders by product name or keywords
   * @param {string} productQuery - Product name or keywords
   * @returns {array} Matching orders
   */
  findOrdersByProduct(productQuery) {
    const userContext = this.getUserContext()
    const query = productQuery.toLowerCase().trim()
    const matchingOrderIds = new Set()
    
    // Direct mapping lookup
    if (userContext.productNameMappings.has(query)) {
      matchingOrderIds.add(userContext.productNameMappings.get(query))
    }
    
    // Partial matching for complex queries
    for (const [productName, orderId] of userContext.productNameMappings) {
      if (productName.includes(query) || query.includes(productName)) {
        matchingOrderIds.add(orderId)
      }
    }
    
    // Find the actual order objects
    const allUserOrders = [...userContext.activeOrders, ...userContext.orderHistory]
    return allUserOrders.filter(order => matchingOrderIds.has(order.id))
  }

  /**
   * Get user's actionable orders by intent type
   * @param {string} intentType - Type of action (cancel, track, return)
   * @returns {array} Orders that can have the action performed
   */
  getActionableOrders(intentType) {
    const userContext = this.getUserContext()
    
    switch (intentType.toLowerCase()) {
      case 'cancel':
        return userContext.activeOrders.filter(order => order.canCancel)
      
      case 'track':
        return userContext.activeOrders.filter(order => 
          ['confirmed', 'processing', 'shipped', 'in_transit'].includes(order.status)
        )
      
      case 'return':
        return [...userContext.activeOrders, ...userContext.orderHistory]
          .filter(order => order.canReturn || order.status === 'delivered')
      
      default:
        return [...userContext.activeOrders, ...userContext.orderHistory]
    }
  }

  /**
   * Set a pending intent when waiting for user clarification
   * @param {string} sessionId - Session identifier  
   * @param {string} intent - The pending intent (e.g., 'TRACK_ORDER')
   * @param {object} context - Additional context
   */
  setPendingIntent(sessionId, intent, context = {}) {
    const userContext = this.getUserContext(sessionId)
    userContext.pendingIntent = intent
    userContext.pendingContext = context
    userContext.lastBotResponse = context.botMessage || null
  }

  /**
   * Get and clear pending intent
   * @param {string} sessionId - Session identifier
   * @returns {object} Pending intent and context
   */
  getPendingIntent(sessionId) {
    const userContext = this.getUserContext(sessionId)
    const pending = {
      intent: userContext.pendingIntent,
      context: userContext.pendingContext,
      lastBotResponse: userContext.lastBotResponse
    }
    
    // Clear after retrieving
    userContext.pendingIntent = null
    userContext.pendingContext = null
    userContext.lastBotResponse = null
    
    return pending
  }

  /**
   * Check if there's a pending intent
   * @param {string} sessionId - Session identifier
   * @returns {boolean}
   */
  hasPendingIntent(sessionId) {
    const userContext = this.getUserContext(sessionId)
    return userContext.pendingIntent !== null
  }

  /**
   * Enhanced context for personalized intent processing
   * @param {string} sessionId - Session identifier
   * @returns {object} Enhanced context with user-specific data
   */
  getAnalysisContext(sessionId) {
    const context = this.getContext(sessionId)
    const userContext = this.getUserContext(sessionId)
    const pending = {
      intent: userContext.pendingIntent,
      context: userContext.pendingContext,
      lastBotResponse: userContext.lastBotResponse
    }
    
    return {
      // Original context
      recentIntents: context.intents.slice(-3).map(i => i.intent),
      knownOrderIds: Array.from(context.entities.orderIds),
      customerSentiment: context.customerState.sentiment,
      frustrationLevel: context.customerState.frustrationLevel,
      failedAttempts: context.failedAttempts,
      conversationLength: context.messages.length,
      lastActivity: context.lastActivity,
      isNewCustomer: context.messages.length <= 1,
      
      // Enhanced user-specific context
      user: {
        id: userContext.userId,
        name: userContext.userName,
        email: userContext.userEmail
      },
      userOrders: {
        active: userContext.activeOrders.map(order => ({
          id: order.id,
          status: order.status,
          items: order.items.map(item => ({
            name: item.name,
            variant: item.variant
          })),
          canCancel: order.canCancel,
          canReturn: order.canReturn
        })),
        total: userContext.activeOrders.length + userContext.orderHistory.length
      },
      productMappings: Object.fromEntries(userContext.productNameMappings),
      userPreferences: userContext.preferences,
      
      // Pending intent context for follow-up conversations
      pendingIntent: pending
    }
  }

  /**
   * Record action result
   * @param {string} sessionId - Session identifier
   * @param {object} action - Action details
   * @param {boolean} success - Whether action succeeded
   */
  recordAction(sessionId, action, success) {
    const context = this.getContext(sessionId)
    
    const actionRecord = {
      ...action,
      success,
      timestamp: Date.now(),
      attempts: (context.actionHistory.filter(a => 
        a.intent === action.intent && a.orderId === action.orderId
      ).length + 1)
    }
    
    context.actionHistory.push(actionRecord)
    
    if (success) {
      context.successfulActions++
      context.failedAttempts = 0 // Reset on success
    } else {
      context.failedAttempts++
    }

    // Limit action history size
    if (context.actionHistory.length > 20) {
      context.actionHistory = context.actionHistory.slice(-20)
    }

    this.schedulePersistence(sessionId)
  }

  /**
   * Get user preferences
   * @param {string} userId - User identifier
   * @returns {object} User preferences
   */
  getUserPreferences(userId) {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {
        userId,
        communicationStyle: 'friendly', // friendly, formal, casual
        preferredLanguage: 'en',
        timezone: null,
        notificationPrefs: {
          orderUpdates: true,
          promotions: false,
          reminders: true
        },
        supportHistory: {
          commonIssues: [],
          preferredSolutions: [],
          escalationTriggers: []
        },
        lastUpdated: Date.now()
      })
    }
    
    return this.userPreferences.get(userId)
  }

  /**
   * Update user preferences based on interactions
   * @param {string} userId - User identifier
   * @param {object} updates - Preference updates
   */
  updateUserPreferences(userId, updates) {
    const prefs = this.getUserPreferences(userId)
    Object.assign(prefs, updates)
    prefs.lastUpdated = Date.now()
    
    // Schedule persistence
    this.schedulePersistence(`user_${userId}`)
  }

  /**
   * Get conversation summary for handoff to human agent
   * @param {string} sessionId - Session identifier
   * @returns {object} Conversation summary
   */
  getConversationSummary(sessionId) {
    const context = this.getContext(sessionId)
    
    const summary = {
      sessionId,
      duration: Date.now() - context.createdAt,
      messageCount: context.messages.length,
      customerState: context.customerState,
      keyEntities: {
        orderIds: Array.from(context.entities.orderIds),
        products: Array.from(context.entities.products),
        issues: Array.from(context.entities.issues)
      },
      intentFlow: context.intents.map(i => i.intent),
      actionHistory: context.actionHistory,
      escalationReasons: [],
      recommendations: this.generateAgentRecommendations(context)
    }

    // Determine escalation reasons
    if (context.customerState.frustrationLevel > 0.6) {
      summary.escalationReasons.push('High customer frustration')
    }
    if (context.failedAttempts > 2) {
      summary.escalationReasons.push('Multiple failed attempts')
    }
    if (context.customerState.satisfactionScore < 0.3) {
      summary.escalationReasons.push('Low satisfaction score')
    }

    return summary
  }

  /**
   * Generate recommendations for human agents
   * @param {object} context - Conversation context
   * @returns {array} Array of recommendations
   */
  generateAgentRecommendations(context) {
    const recommendations = []

    // Sentiment-based recommendations
    if (context.customerState.frustrationLevel > 0.6) {
      recommendations.push({
        type: 'approach',
        text: 'Customer is frustrated - use empathetic language and offer immediate solutions'
      })
    }

    // Action-based recommendations
    const recentFailures = context.actionHistory
      .filter(a => !a.success && Date.now() - a.timestamp < 600000) // Last 10 minutes
    
    if (recentFailures.length > 0) {
      recommendations.push({
        type: 'issue',
        text: `Recent failures: ${recentFailures.map(f => f.intent).join(', ')}`
      })
    }

    // Order-specific recommendations
    if (context.entities.orderIds.size > 0) {
      recommendations.push({
        type: 'context',
        text: `Customer discussing orders: ${Array.from(context.entities.orderIds).join(', ')}`
      })
    }

    return recommendations
  }

  /**
   * Schedule persistence to database (async, non-blocking)
   * @param {string} key - Storage key
   */
  schedulePersistence(key) {
    // Clear existing timeout
    if (this.persistenceTimeouts?.has(key)) {
      clearTimeout(this.persistenceTimeouts.get(key))
    }

    if (!this.persistenceTimeouts) {
      this.persistenceTimeouts = new Map()
    }

    // Schedule new persistence
    const timeout = setTimeout(async () => {
      try {
        await this.persistToDatabase(key)
        this.persistenceTimeouts.delete(key)
      } catch (error) {
        console.error('Persistence failed:', error)
      }
    }, this.persistenceDelay)

    this.persistenceTimeouts.set(key, timeout)
  }

  /**
   * Persist data to database (placeholder - implement with MongoDB)
   * @param {string} key - Storage key
   */
  async persistToDatabase(key) {
    // This would integrate with MongoDB in production
    // For now, just log the operation
    console.log(`[ContextMemory] Persisting data for key: ${key}`)
    
    // Example MongoDB implementation:
    /*
    try {
      if (key.startsWith('user_')) {
        const userId = key.replace('user_', '')
        const preferences = this.userPreferences.get(userId)
        await db.collection('user_preferences').updateOne(
          { userId },
          { $set: preferences },
          { upsert: true }
        )
      } else {
        const context = this.conversationContexts.get(key)
        await db.collection('conversation_contexts').updateOne(
          { sessionId: key },
          { $set: context },
          { upsert: true }
        )
      }
    } catch (error) {
      console.error('Database persistence failed:', error)
    }
    */
  }

  /**
   * Load context from database
   * @param {string} sessionId - Session identifier
   */
  async loadFromDatabase(sessionId) {
    // Placeholder for MongoDB integration
    console.log(`[ContextMemory] Loading context for session: ${sessionId}`)
    
    // Example implementation:
    /*
    try {
      const storedContext = await db.collection('conversation_contexts')
        .findOne({ sessionId })
      
      if (storedContext) {
        // Convert sets back from arrays
        storedContext.entities.orderIds = new Set(storedContext.entities.orderIds)
        storedContext.entities.products = new Set(storedContext.entities.products)
        storedContext.entities.issues = new Set(storedContext.entities.issues)
        
        this.conversationContexts.set(sessionId, storedContext)
      }
    } catch (error) {
      console.error('Failed to load context from database:', error)
    }
    */
  }

  /**
   * Clean up expired contexts
   */
  cleanup() {
    const now = Date.now()
    const expiredSessions = []

    for (const [sessionId, context] of this.conversationContexts) {
      if (now - context.lastActivity > this.contextTTL) {
        expiredSessions.push(sessionId)
      }
    }

    expiredSessions.forEach(sessionId => {
      this.conversationContexts.delete(sessionId)
      console.log(`[ContextMemory] Cleaned up expired session: ${sessionId}`)
    })
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    return {
      conversationContexts: this.conversationContexts.size,
      userPreferences: this.userPreferences.size,
      sessionMemory: this.sessionMemory.size,
      pendingPersistence: this.persistenceTimeouts?.size || 0
    }
  }

  /**
   * Cleanup on service shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    // Clear all persistence timeouts
    if (this.persistenceTimeouts) {
      for (const timeout of this.persistenceTimeouts.values()) {
        clearTimeout(timeout)
      }
    }
  }
}

export default ContextMemoryService
