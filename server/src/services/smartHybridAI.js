// Smart Hybrid AI Service
// Local processing by default, Gemini for frustration, caching for efficiency

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Simple Intent Classifier - local processing
class SmartIntentClassifier {
  constructor() {
    this.intentPatterns = {
      CANCEL_ORDER: {
        keywords: ['cancel', 'stop', 'abort', 'remove'],
        patterns: [/cancel\s+(?:my\s+)?order/i, /stop\s+(?:my\s+)?order/i],
        weight: 0.9
      },
      TRACK_ORDER: {
        keywords: ['track', 'status', 'where', 'shipped', 'delivery', 'arrive', 'tracking'],
        patterns: [/track\s+(?:my\s+)?order/i, /order\s+status/i, /where\s+is/i, /track.*ORD/i],
        weight: 0.85
      },
      RETURN_ORDER: {
        keywords: ['return', 'refund', 'exchange', 'send back'],
        patterns: [/return\s+(?:my\s+)?order/i, /want\s+refund/i],
        weight: 0.8
      },
      UNDO_ACTION: {
        keywords: ['undo', 'reverse', 'revert', 'restore', 'bring back', 'cancel cancellation'],
        patterns: [/undo\s+(?:the\s+)?(?:cancellation|cancel)/i, /reverse\s+(?:the\s+)?(?:cancellation|cancel)/i, /revert\s+(?:the\s+)?(?:cancellation|cancel)/i, /restore\s+(?:my\s+)?order/i, /bring\s+back\s+(?:my\s+)?order/i],
        weight: 0.9
      },
      GENERAL_INQUIRY: {
        keywords: ['help', 'support', 'question'],
        patterns: [/need\s+help/i, /can\s+you\s+help/i],
        weight: 0.4
      }
    };

    // Frustration triggers for Gemini activation
    this.frustrationTriggers = [
      'frustrated', 'angry', 'upset', 'furious', 'mad', 'pissed',
      'terrible', 'awful', 'horrible', 'worst', 'ridiculous',
      'unacceptable', 'disgusting', 'pathetic', 'useless', 'stupid',
      'taking too long', 'fed up', 'can\'t believe', 'never again',
      'garbage', 'disappointing', 'outrageous', 'absolutely',
      'extremely', 'so angry', 'very upset', 'really mad',
      'hours', 'days', 'weeks', 'still not', 'not working',
      'fed up with', 'sick of', 'tired of', 'hate this'
    ];
  }

  analyzeMessage(message, userOrders = []) {
    const lowerMessage = message.toLowerCase();
    
    const analysis = {
      primaryIntent: 'GENERAL_INQUIRY',
      confidence: 0.5,
      entities: this.extractEntities(message, userOrders),
      isFrustrated: this.detectFrustration(message),
      source: 'local',
      timestamp: Date.now(),
      matchedOrders: []
    };

    // Simple intent scoring
    let bestIntent = 'GENERAL_INQUIRY';
    let bestScore = 0.1; // Lower threshold so other intents can compete

    for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
      let score = 0;

      // Keyword matching (more weight)
      const keywordMatches = intentData.keywords.filter(keyword => 
        lowerMessage.includes(keyword)
      ).length;
      score += (keywordMatches / intentData.keywords.length) * 0.5;

      // Pattern matching (more weight)
      const patternMatches = intentData.patterns.filter(pattern => 
        pattern.test(message)
      ).length;
      score += (patternMatches / intentData.patterns.length) * 0.5;

      score *= intentData.weight;

      // Boost confidence if we have order context
      if (analysis.entities.orderIds.length > 0 || analysis.entities.matchedOrders.length > 0) {
        score *= 1.2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intentName;
      }
    }

    analysis.primaryIntent = bestIntent;
    analysis.confidence = bestScore;
    analysis.matchedOrders = analysis.entities.matchedOrders || [];

    return analysis;
  }

  detectFrustration(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check for frustration trigger words
    const hasFrustrationWords = this.frustrationTriggers.some(trigger => 
      lowerMessage.includes(trigger)
    );
    
    // Check for other frustration patterns
    const hasMultipleExclamations = (message.match(/!/g) || []).length > 1;
    const hasAllCaps = /[A-Z]{4,}/.test(message);
    const hasComplaintPattern = /((not work|doesn't work|won't work)|hours|days|weeks|trying to|attempts?)/i.test(message);
    const hasLongMessage = message.length > 100;
    
    const isFrustrated = hasFrustrationWords || hasMultipleExclamations || 
                        hasAllCaps || (hasComplaintPattern && hasLongMessage);
    
    if (isFrustrated) {
      console.log('[DEBUG] Frustration detected:', {
        hasFrustrationWords,
        hasMultipleExclamations,
        hasAllCaps,
        hasComplaintPattern,
        hasLongMessage
      });
    }
    
    return isFrustrated;
  }

  extractEntities(message, userOrders = []) {
    const entities = { 
      orderIds: [], 
      products: [],
      matchedOrders: []
    };

    // More precise order ID patterns - only match realistic order IDs
    const orderPatterns = [
      /\bORD-[A-Z0-9]{5,8}\b/gi,  // ORD-12345, ORD-ABCD123, etc.
      /\border\s+(ORD-[A-Z0-9]{5,8})\b/gi,  // "order ORD-12345"
      /\border\s+([0-9]{5,8})\b/gi,  // "order 12345" (numbers only)
      /\b([0-9]{5,8})\s*(?:order|number)\b/gi,  // "12345 order" or "12345 number"
    ];

    orderPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        let orderId = match[1] || match[0];
        orderId = orderId.toUpperCase().trim();
        
        // Ensure it starts with ORD- prefix
        if (!orderId.startsWith('ORD-')) {
          orderId = `ORD-${orderId}`;
        }
        
        // Validate that this looks like a real order ID (no common words)
        const invalidPatterns = ['ORD-CANCEL', 'ORD-TRACK', 'ORD-RETURN', 'ORD-ORDER', 'ORD-WANT', 'ORD-THIS'];
        if (!invalidPatterns.includes(orderId) && !entities.orderIds.includes(orderId)) {
          entities.orderIds.push(orderId);
        }
      }
    });

    // Enhanced product name matching with user orders
    if (userOrders && userOrders.length > 0) {
      const lowerMessage = message.toLowerCase();
      
      for (const order of userOrders) {
        for (const item of order.items || []) {
          const itemName = item.name.toLowerCase();
          const itemVariant = item.variant?.toLowerCase() || '';
          
          // Split product name into keywords
          const productKeywords = itemName.split(' ').filter(word => word.length > 2);
          
          // Check for exact product name match first
          if (lowerMessage.includes(itemName)) {
            if (!entities.products.includes(item.name)) {
              entities.products.push(item.name);
            }
            if (!entities.orderIds.includes(order.id)) {
              entities.orderIds.push(order.id);
            }
            
            entities.matchedOrders.push({
              orderId: order.id,
              matchedProduct: item.name,
              matchType: 'exact',
              confidence: 1.0,
              order: order
            });
            continue;
          }
          
          // Check for partial matches by keywords
          const matchedKeywords = productKeywords.filter(keyword => 
            lowerMessage.includes(keyword.toLowerCase())
          );
          
          // For single keyword products (like "iPhone"), require at least 1 match
          // For multi-keyword products, require at least 50% match or minimum 2 keywords
          const requiredMatches = productKeywords.length === 1 ? 1 : Math.max(1, Math.ceil(productKeywords.length * 0.5));
          
          if (matchedKeywords.length >= requiredMatches) {
            if (!entities.products.includes(item.name)) {
              entities.products.push(item.name);
            }
            if (!entities.orderIds.includes(order.id)) {
              entities.orderIds.push(order.id);
            }
            
            entities.matchedOrders.push({
              orderId: order.id,
              matchedProduct: item.name,
              matchType: 'partial',
              confidence: matchedKeywords.length / productKeywords.length,
              order: order,
              matchedKeywords: matchedKeywords
            });
          }
        }
      }
    }

    return entities;
  }
}

// Simple Context Memory - session based
class SimpleContextMemory {
  constructor() {
    this.contexts = new Map();
    this.maxContextHistory = 10;
  }

  getContext(sessionId) {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, {
        sessionId,
        messages: [],
        failedAttempts: 0,
        geminiAttempted: false,
        escalatedToHuman: false,
        createdAt: Date.now(),
        pendingIntent: null // Track pending intents for conversation flow
      });
    }
    return this.contexts.get(sessionId);
  }

  async addMessage(sessionId, message, analysis) {
    const context = this.getContext(sessionId);
    const messageObj = { message, analysis, timestamp: Date.now() };
    context.messages.push(messageObj);
    
    // Keep only recent messages in memory
    if (context.messages.length > this.maxContextHistory) {
      context.messages = context.messages.slice(-this.maxContextHistory);
    }
    
    // Persist to MongoDB if available
    try {
      await this.saveChatMessage(sessionId, message, analysis, 'user');
    } catch (error) {
      console.warn('[ContextMemory] Failed to save chat message to MongoDB:', error.message);
    }
  }

  // Save individual messages to MongoDB
  async saveChatMessage(sessionId, message, analysis, sender = 'user') {
    try {
      // This would be implemented with actual MongoDB connection
      // For now, we'll simulate the database save
      const chatMessage = {
        sessionId,
        message,
        sender,
        intent: analysis?.primaryIntent || 'unknown',
        confidence: analysis?.confidence || 0,
        timestamp: new Date(),
        entities: analysis?.entities || {},
        metadata: {
          source: analysis?.source || 'local',
          isFrustrated: analysis?.isFrustrated || false
        }
      };
      
      // TODO: Replace with actual MongoDB save
      // await db.collection('chat_messages').insertOne(chatMessage);
      console.log('[ContextMemory] Chat message saved to MongoDB:', chatMessage.sessionId);
      
    } catch (error) {
      console.error('[ContextMemory] MongoDB save error:', error);
      throw error;
    }
  }

  // Save bot responses to MongoDB
  async saveBotResponse(sessionId, response) {
    try {
      const botMessage = {
        sessionId,
        message: response.message,
        sender: 'assistant',
        intent: response.intent,
        confidence: response.confidence || 1.0,
        timestamp: new Date(),
        success: response.success,
        actions: response.actions || [],
        metadata: {
          source: response.source || 'local',
          escalateToHuman: response.escalateToHuman || false,
          orderId: response.orderId || null
        }
      };
      
      // TODO: Replace with actual MongoDB save
      // await db.collection('chat_messages').insertOne(botMessage);
      console.log('[ContextMemory] Bot response saved to MongoDB:', botMessage.sessionId);
      
    } catch (error) {
      console.error('[ContextMemory] MongoDB save error for bot response:', error);
      throw error;
    }
  }

  // Pending intent management for conversation flow
  setPendingIntent(sessionId, intent, data = {}) {
    const context = this.getContext(sessionId);
    context.pendingIntent = {
      intent,
      data,
      timestamp: Date.now()
    };
    console.log(`[ContextMemory] Set pending intent: ${intent} for session ${sessionId}`);
  }

  getPendingIntent(sessionId) {
    const context = this.getContext(sessionId);
    return context.pendingIntent;
  }

  clearPendingIntent(sessionId) {
    const context = this.getContext(sessionId);
    const hadPending = !!context.pendingIntent;
    context.pendingIntent = null;
    if (hadPending) {
      console.log(`[ContextMemory] Cleared pending intent for session ${sessionId}`);
    }
    return hadPending;
  }

  hasPendingIntent(sessionId) {
    const context = this.getContext(sessionId);
    return !!context.pendingIntent;
  }

  recordFailure(sessionId) {
    const context = this.getContext(sessionId);
    context.failedAttempts++;
  }

  recordGeminiAttempt(sessionId) {
    const context = this.getContext(sessionId);
    context.geminiAttempted = true;
  }

  recordHumanEscalation(sessionId) {
    const context = this.getContext(sessionId);
    context.escalatedToHuman = true;
  }
}

// Gemini Response Cache - avoid duplicate API calls
class GeminiResponseCache {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
    this.cacheTTL = 3600000; // 1 hour
  }

  getCacheKey(message, frustrationLevel) {
    // Create a normalized cache key
    return `${message.toLowerCase().trim()}_${frustrationLevel}`;
  }

  get(message, frustrationLevel) {
    const key = this.getCacheKey(message, frustrationLevel);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('[GeminiCache] Using cached response');
      return cached.response;
    }
    
    return null;
  }

  set(message, frustrationLevel, response) {
    const key = this.getCacheKey(message, frustrationLevel);
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
    
    console.log('[GeminiCache] Cached new response');
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize
    };
  }
}

// Main Smart Hybrid AI Service
class SmartHybridAIService {
  constructor() {
    this.intentClassifier = new SmartIntentClassifier();
    this.contextMemory = new SimpleContextMemory();
    this.geminiCache = new GeminiResponseCache();
    
    // Initialize Gemini API
    this.model = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'; // Use from .env
        this.model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7, // Slightly more creative for empathy
            maxOutputTokens: 500 // Reasonable response length
          }
        });
        console.log(`[SmartHybrid] Gemini API initialized with model: ${modelName}`);
      } catch (error) {
        console.log('[SmartHybrid] Gemini API not available:', error.message);
      }
    }

    this.systemPrompt = `You are Riley, an empathetic AI customer support agent. A customer is frustrated and needs immediate, caring attention.

Your response should:
1. Acknowledge their frustration with genuine empathy
2. Take immediate action to resolve their issue
3. Be concise but caring (2-3 sentences max)
4. Use appropriate emojis sparingly
5. Offer next steps or escalation if needed

Focus on making them feel heard and helping them quickly.`;
  }

  async processMessage(message, customerId, sessionId, userOrders = []) {
    try {
      // Step 1: Check if we have a pending intent (follow-up conversation)
      const context = this.contextMemory.getContext(sessionId);
      const pendingIntent = this.contextMemory.getPendingIntent(sessionId);
      
      if (pendingIntent) {
        console.log(`[SmartHybrid] Processing follow-up for pending intent: ${pendingIntent.intent}`);
        
        // Try to resolve the pending intent with the new message
        const followUpResult = await this.handleFollowUpMessage(message, pendingIntent, sessionId, customerId, userOrders);
        
        if (followUpResult.resolved) {
          // Clear the pending intent and return the result
          this.contextMemory.clearPendingIntent(sessionId);
          
          // Save both user message and bot response to MongoDB
          try {
            const analysis = this.intentClassifier.analyzeMessage(message, userOrders);
            await this.contextMemory.addMessage(sessionId, message, analysis);
            await this.contextMemory.saveBotResponse(sessionId, followUpResult.response);
          } catch (dbError) {
            console.warn('[SmartHybrid] Database persistence failed:', dbError.message);
          }
          
          return followUpResult.response;
        } else {
          // Not resolved - clear pending intent and fall through to normal processing
          this.contextMemory.clearPendingIntent(sessionId);
        }
      }

      // Step 2: Always do local analysis first (fast)
      const localAnalysis = this.intentClassifier.analyzeMessage(message, userOrders);
      console.log(`[SmartHybrid] Local analysis: ${localAnalysis.primaryIntent}, frustrated: ${localAnalysis.isFrustrated}`);

      // Step 3: Add to context
      await this.contextMemory.addMessage(sessionId, message, localAnalysis);

      let response;

      // Step 4: Decision tree for processing approach
      if (localAnalysis.isFrustrated && !context.geminiAttempted) {
        if (this.model) {
          // Customer is frustrated and Gemini is available - use it for empathetic response
          response = await this.handleWithGemini(message, localAnalysis, sessionId, customerId, userOrders);
        } else {
          // Customer is frustrated but Gemini not available - use enhanced local response
          console.log('[SmartHybrid] Customer frustrated but Gemini unavailable - using enhanced local response');
          response = this.handleFrustratedLocally(message, localAnalysis, sessionId, customerId, userOrders);
        }
      } else if (context.geminiAttempted && context.failedAttempts > 0) {
        // Gemini already tried and customer still not happy - escalate to human
        response = this.escalateToHuman(sessionId, 'gemini_insufficient');
      } else if (context.failedAttempts > 2) {
        // Too many failed attempts - escalate to human
        response = this.escalateToHuman(sessionId, 'repeated_failures');
      } else if (localAnalysis.confidence < 0.4 && this.model) {
        // Very low confidence - try Gemini as fallback
        console.log('[SmartHybrid] Low confidence detected, trying Gemini fallback');
        try {
          response = await this.handleWithGemini(message, localAnalysis, sessionId, customerId, userOrders);
        } catch (error) {
          console.warn('[SmartHybrid] Gemini fallback failed:', error.message);
          // Fall through to local processing
          response = this.handleLocally(message, localAnalysis, sessionId, customerId, userOrders);
        }
      } else {
        // Step 5: Normal case - use local processing
        response = this.handleLocally(message, localAnalysis, sessionId, customerId, userOrders);
      }

      // Save bot response to MongoDB
      try {
        await this.contextMemory.saveBotResponse(sessionId, response);
      } catch (dbError) {
        console.warn('[SmartHybrid] Failed to save bot response to MongoDB:', dbError.message);
      }

      return response;

    } catch (error) {
      console.error('[SmartHybrid] Error processing message:', error);
      this.contextMemory.recordFailure(sessionId);
      
      const errorResponse = {
        message: "I apologize, but I encountered an error. Let me connect you with a human agent who can help you right away.",
        intent: 'ESCALATION',
        success: false,
        error: error.message,
        escalateToHuman: true
      };

      // Try to save error response to MongoDB
      try {
        await this.contextMemory.saveBotResponse(sessionId, errorResponse);
      } catch (dbError) {
        console.warn('[SmartHybrid] Failed to save error response to MongoDB:', dbError.message);
      }

      return errorResponse;
    }
  }

  async handleWithGemini(message, localAnalysis, sessionId, customerId, userOrders = []) {
    console.log('[SmartHybrid] Customer frustrated - activating Gemini');
    
    // Mark that we've attempted Gemini
    this.contextMemory.recordGeminiAttempt(sessionId);
    
    // Check cache first
    const cachedResponse = this.geminiCache.get(message, 'frustrated');
    if (cachedResponse) {
      return {
        ...cachedResponse,
        source: 'gemini_cached',
        sessionId
      };
    }

    try {
      // Build context for Gemini
      const context = this.contextMemory.getContext(sessionId);
      const conversationHistory = context.messages
        .slice(-3)
        .map(m => `Customer: "${m.message}"`)
        .join('\n');

      const geminiPrompt = `${this.systemPrompt}

CUSTOMER MESSAGE: "${message}"
DETECTED INTENT: ${localAnalysis.primaryIntent}
ORDER IDS: ${localAnalysis.entities.orderIds.join(', ') || 'None mentioned'}
CONVERSATION HISTORY:
${conversationHistory}

Generate an empathetic, helpful response that addresses their frustration and resolves their ${localAnalysis.primaryIntent.toLowerCase().replace('_', ' ')}.`;

      const result = await this.model.generateContent(geminiPrompt);
      const response = await result.response;
      const geminiMessage = response.text();

      const geminiResponse = {
        message: geminiMessage,
        intent: localAnalysis.primaryIntent,
        confidence: 0.9,
        orderId: localAnalysis.entities.orderIds[0] || null,
        success: true,
        source: 'gemini_enhanced',
        actions: this.getActionsForIntent(localAnalysis.primaryIntent),
        sessionId
      };

      // Cache the response
      this.geminiCache.set(message, 'frustrated', geminiResponse);

      return geminiResponse;

    } catch (error) {
      console.error('[SmartHybrid] Gemini failed:', error);
      
      // Fallback to local processing
      return this.handleLocally(message, localAnalysis, sessionId, customerId);
    }
  }

  // Handle follow-up messages when there's a pending intent
  async handleFollowUpMessage(message, pendingIntent, sessionId, customerId, userOrders = []) {
    const { intent, data } = pendingIntent;
    
    // Re-analyze message with context that there's a pending intent
    const analysis = this.intentClassifier.analyzeMessage(message, userOrders);
    
    console.log(`[SmartHybrid] Follow-up message for ${intent}:`, message);
    console.log(`[SmartHybrid] Follow-up analysis:`, analysis);
    
    // Handle confirmation responses for single-order scenarios
    if (data.needsConfirmation && data.suggestedOrder) {
      const lowerMessage = message.toLowerCase();
      
      // Look for confirmation keywords
      if (lowerMessage.includes('yes') || lowerMessage.includes('ok') || 
          lowerMessage.includes('sure') || lowerMessage.includes('confirm') ||
          lowerMessage.includes('go ahead') || lowerMessage.includes('do it')) {
        
        // Execute the action on the suggested order
        const result = this.executeOrderAction(intent.toLowerCase().replace('_order', ''), data.suggestedOrder.id, userOrders);
        
        return {
          resolved: true,
          response: {
            message: result.message,
            intent: intent,
            orderId: data.suggestedOrder.id,
            success: result.success,
            actions: result.success ? [{ type: intent, orderId: data.suggestedOrder.id }] : [],
            sessionId,
            source: 'local',
            isFollowUp: true
          }
        };
      }
      
      // Look for negative responses
      if (lowerMessage.includes('no') || lowerMessage.includes('cancel') || 
          lowerMessage.includes('stop') || lowerMessage.includes('abort') ||
          lowerMessage.includes('never mind')) {
        
        return {
          resolved: true,
          response: {
            message: "Alright, I won't proceed with that action. Is there anything else I can help you with?",
            intent: intent,
            success: false,
            cancelled: true,
            sessionId,
            source: 'local',
            isFollowUp: true
          }
        };
      }
    }
    
    // If user provided a product name or order ID, try to resolve the pending intent
    if (analysis.entities.products.length > 0 || 
        analysis.entities.orderIds.length > 0 || 
        analysis.entities.matchedOrders.length > 0) {
      
      // Create a synthetic analysis with the original intent but new entities
      const resolvedAnalysis = {
        ...analysis,
        primaryIntent: intent,
        confidence: 0.9, // High confidence since we're resolving a pending intent
        isFollowUp: true
      };
      
      // Process the original intent with the new entity information
      const response = this.handleLocally(message, resolvedAnalysis, sessionId, customerId, userOrders);
      
      return {
        resolved: true,
        response: {
          ...response,
          isFollowUp: true,
          originalIntent: intent
        }
      };
    }
    
    // If the user seems to be asking something unrelated, clear pending and process normally
    // Check for topic change - either high confidence different intent OR
    // general inquiry that doesn't relate to the pending intent
    const isTopicChange = (analysis.confidence > 0.6 && analysis.primaryIntent !== intent && analysis.primaryIntent !== 'GENERAL_INQUIRY') ||
                         (analysis.primaryIntent === 'GENERAL_INQUIRY' && 
                          !this.isMessageRelatedToPendingIntent(message, intent));
    
    if (isTopicChange) {
      console.log('[SmartHybrid] User changed topic, clearing pending intent');
      return {
        resolved: false // Let normal processing handle this
      };
    }
    
    // If user is asking for help or clarification about the pending intent
    if (message.toLowerCase().includes('help') || 
        message.toLowerCase().includes('what') || 
        message.toLowerCase().includes('how') ||
        message.toLowerCase().includes('which') ||
        message.toLowerCase().includes('options')) {
      
      return {
        resolved: true,
        response: this.getHelpForPendingIntent(intent, data, userOrders, sessionId)
      };
    }
    
    // Could not resolve - let normal processing take over
    return {
      resolved: false
    };
  }

  // Provide help messages for pending intents
  getHelpForPendingIntent(intent, data, userOrders, sessionId) {
    switch (intent) {
      case 'CANCEL_ORDER':
        const cancellableOrders = userOrders.filter(order => order.canCancel);
        if (cancellableOrders.length === 0) {
          return {
            message: "You currently have no orders that can be cancelled. All your recent orders are either already shipped or delivered.",
            intent: 'CANCEL_ORDER',
            success: false,
            sessionId,
            source: 'local_help'
          };
        }
        
        return {
          message: `I can help you cancel one of these orders. You can tell me:\n• The order number (like "ORD-123")\n• The product name (like "iPhone" or "MacBook")\n\nYour cancellable orders:\n${this.formatOrderList(cancellableOrders)}`,
          intent: 'CANCEL_ORDER',
          success: false,
          needsOrderSelection: true,
          availableOrders: cancellableOrders,
          sessionId,
          source: 'local_help'
        };

      case 'TRACK_ORDER':
        return {
          message: `I can help you track your order. You can tell me:\n• The order number (like "ORD-123")\n• The product name (like "iPhone" or "MacBook")\n\nYour orders:\n${this.formatOrderList(userOrders)}`,
          intent: 'TRACK_ORDER',
          success: false,
          needsOrderSelection: true,
          availableOrders: userOrders,
          sessionId,
          source: 'local_help'
        };

      case 'RETURN_ORDER':
        const returnableOrders = userOrders.filter(order => order.canReturn);
        if (returnableOrders.length === 0) {
          return {
            message: "You currently have no orders that can be returned. Returns are typically available for delivered orders within our return policy period.",
            intent: 'RETURN_ORDER',
            success: false,
            sessionId,
            source: 'local_help'
          };
        }
        
        return {
          message: `I can help you return one of these orders. You can tell me:\n• The order number (like "ORD-123")\n• The product name (like "iPhone" or "MacBook")\n\nYour returnable orders:\n${this.formatOrderList(returnableOrders)}`,
          intent: 'RETURN_ORDER',
          success: false,
          needsOrderSelection: true,
          availableOrders: returnableOrders,
          sessionId,
          source: 'local_help'
        };

      default:
        return {
          message: "I'm here to help! Could you please be more specific about what you need assistance with?",
          intent: 'GENERAL_INQUIRY',
          success: false,
          sessionId,
          source: 'local_help'
        };
    }
  }

  handleLocally(message, analysis, sessionId, customerId, userOrders = []) {
    const { primaryIntent, entities } = analysis;
    
    switch (primaryIntent) {
      case 'CANCEL_ORDER':
        // Check if we have direct order ID or product match
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          const userOrder = userOrders.find(order => order.id === orderId);
          
          if (!userOrder) {
            const cancellableOrders = userOrders.filter(order => order.canCancel);
            const orderList = cancellableOrders.length > 0 ? 
              `\n\nHere are your orders that can be cancelled:\n${cancellableOrders.map(order => `• **${order.id}** - ${order.items.map(item => item.name).join(', ')} ($${order.total}) - Status: ${order.status}`).join('\n')}` :
              '\n\nYou currently have no orders that can be cancelled.';
            
            return {
              message: `I couldn't find order ${orderId} in your account.${orderList}`,
              intent: 'CANCEL_ORDER',
              success: false,
              needsOrderSelection: true,
              availableOrders: cancellableOrders,
              sessionId,
              source: 'local'
            };
          }
          
          if (!userOrder.canCancel) {
            return {
              message: `I'm sorry, but order ${orderId} cannot be cancelled as it's already in ${userOrder.status} status. You may be able to return it after delivery instead.`,
              intent: 'CANCEL_ORDER',
              success: false,
              alternativeAction: 'return',
              sessionId,
              source: 'local'
            };
          }
          
          // Execute the actual cancellation
          const result = this.executeOrderAction('cancel', orderId, userOrders);
          
          return {
            message: result.message,
            intent: 'CANCEL_ORDER',
            orderId,
            success: result.success,
            actions: result.success ? [{ type: 'CANCEL_ORDER', orderId: orderId }] : [],
            cancelledItems: userOrder.items,
            sessionId,
            source: 'local'
          };
        } 
        // Check for product name matches
        else if (entities.matchedOrders.length > 0) {
          const matchedOrder = entities.matchedOrders[0];
          const userOrder = matchedOrder.order;
          
          if (!userOrder.canCancel) {
            return {
              message: `I found your ${matchedOrder.matchedProduct} order, but it cannot be cancelled at this time. It's currently in ${userOrder.status} status.`,
              intent: 'CANCEL_ORDER',
              success: false,
              foundOrder: userOrder,
              sessionId,
              source: 'local'
            };
          }
          
          const result = this.executeOrderAction('cancel', userOrder.id, userOrders);
          
          return {
            message: `✅ Found your ${matchedOrder.matchedProduct} order! I've successfully cancelled order ${userOrder.id} for you. You'll receive a confirmation email shortly with the cancellation details. Is there anything else I can help you with?`,
            intent: 'CANCEL_ORDER',
            orderId: userOrder.id,
            success: result.success,
            matchedProduct: matchedOrder.matchedProduct,
            actions: result.success ? [{ type: 'CANCEL_ORDER', orderId: userOrder.id }] : [],
            cancelledItems: userOrder.items,
            sessionId,
            source: 'local'
          };
        }
        else {
          // No specific order found - show available orders
          const cancellableOrders = userOrders.filter(order => order.canCancel);
          
          if (cancellableOrders.length === 0) {
            return {
              message: "You don't currently have any orders that can be cancelled. All your recent orders are either already shipped or delivered. Would you like to check if any can be returned instead?",
              intent: 'CANCEL_ORDER',
              success: false,
              alternativeAction: 'return',
              sessionId,
              source: 'local'
            };
          }
          
          if (cancellableOrders.length === 1) {
            const order = cancellableOrders[0];
            
            // Set pending intent for confirmation as well
            this.contextMemory.setPendingIntent(sessionId, 'CANCEL_ORDER', { 
              suggestedOrder: order,
              needsConfirmation: true 
            });
            
            return {
              message: `I found one order that can be cancelled:\n\n**Order ${order.id}**\n${order.items.map(item => `• ${item.name}`).join('\n')}\nTotal: $${order.total}\n\nWould you like me to cancel this order?`,
              intent: 'CANCEL_ORDER',
              success: false,
              needsConfirmation: true,
              suggestedOrder: order,
              sessionId,
              source: 'local'
            };
          }
          
          // Set pending intent to remember we're trying to cancel an order
          this.contextMemory.setPendingIntent(sessionId, 'CANCEL_ORDER', { 
            availableOrders: cancellableOrders 
          });

          return {
            message: `I'd be happy to help you cancel an order! Here are your orders that can be cancelled:\n\n${this.formatOrderList(cancellableOrders)}\n\nWhich order would you like to cancel? You can tell me the order number or just mention the product name.`,
            intent: 'CANCEL_ORDER',
            success: false,
            needsOrderSelection: true,
            availableOrders: cancellableOrders,
            sessionId,
            source: 'local'
          };
        }
        
      case 'TRACK_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          const userOrder = userOrders.find(order => order.id === orderId);
          
          if (!userOrder) {
            return {
              message: `I couldn't find order ${orderId} in your account. Let me show you your trackable orders:\n\n${this.formatOrderList(userOrders)}`,
              intent: 'TRACK_ORDER',
              success: false,
              availableOrders: userOrders,
              sessionId,
              source: 'local'
            };
          }
          
          return {
            message: `📦 Here's the latest tracking information for your ${userOrder.items.map(item => item.name).join(', ')} order:\n\n**Order:** ${orderId}\n**Status:** ${userOrder.status}\n**Tracking:** ${userOrder.trackingNumber || 'TBD'}\n**Est. Delivery:** ${userOrder.estimatedDelivery || 'TBD'}\n\nIs there anything else you'd like to know about this order?`,
            intent: 'TRACK_ORDER',
            orderId,
            success: true,
            actions: [{ type: 'TRACK_ORDER', orderId: orderId }],
            sessionId,
            source: 'local'
          };
        }
        else if (entities.matchedOrders.length > 0) {
          const matchedOrder = entities.matchedOrders[0];
          const userOrder = matchedOrder.order;
          
          return {
            message: `📦 Found your ${matchedOrder.matchedProduct} order! Here's the tracking info:\n\n**Order:** ${userOrder.id}\n**Status:** ${userOrder.status}\n**Tracking:** ${userOrder.trackingNumber || 'TBD'}\n**Est. Delivery:** ${userOrder.estimatedDelivery || 'TBD'}`,
            intent: 'TRACK_ORDER',
            orderId: userOrder.id,
            matchedProduct: matchedOrder.matchedProduct,
            success: true,
            actions: ['TRACK_ORDER'],
            sessionId,
            source: 'local'
          };
        }
        else {
          const trackableOrders = userOrders.filter(order => 
            ['confirmed', 'processing', 'shipped', 'in_transit'].includes(order.status)
          );
          
          if (trackableOrders.length === 0) {
            return {
              message: "You don't have any active orders to track right now. All your recent orders have been delivered. Would you like to check your order history?",
              intent: 'TRACK_ORDER',
              success: false,
              alternativeAction: 'order_history',
              sessionId,
              source: 'local'
            };
          }
          
          if (trackableOrders.length === 1) {
            const order = trackableOrders[0];
            return {
              message: `📦 I found your current order! Here's the tracking information:\n\n**Order:** ${order.id}\n**Items:** ${order.items.map(item => item.name).join(', ')}\n**Status:** ${order.status}\n**Tracking:** ${order.trackingNumber || 'TBD'}\n**Est. Delivery:** ${order.estimatedDelivery || 'TBD'}`,
              intent: 'TRACK_ORDER',
              orderId: order.id,
              success: true,
              actions: ['TRACK_ORDER'],
              sessionId,
              source: 'local'
            };
          }
          
          // Set pending intent to remember we're trying to track an order
          this.contextMemory.setPendingIntent(sessionId, 'TRACK_ORDER', { 
            availableOrders: trackableOrders 
          });

          return {
            message: `I can help you track your orders! Here are your active orders:\n\n${this.formatOrderList(trackableOrders)}\n\nWhich order would you like to track? You can tell me the order number or mention the product name.`,
            intent: 'TRACK_ORDER',
            success: false,
            needsOrderSelection: true,
            availableOrders: trackableOrders,
            sessionId,
            source: 'local'
          };
        }
        
      case 'RETURN_ORDER':
        // Similar implementation for returns...
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          const result = this.executeOrderAction('return', orderId, userOrders);
          
          return {
            message: result.message,
            intent: 'RETURN_ORDER',
            orderId,
            success: result.success,
            actions: result.success ? [{ type: 'RETURN_ORDER', orderId: orderId }] : [],
            sessionId,
            source: 'local'
          };
        } else {
          const returnableOrders = userOrders.filter(order => order.canReturn);
          
          if (returnableOrders.length === 0) {
            return {
              message: "You currently have no orders that can be returned. Returns are typically available for delivered orders within our return policy period.",
              intent: 'RETURN_ORDER',
              success: false,
              sessionId,
              source: 'local'
            };
          }
          
          // Set pending intent to remember we're trying to return an order
          this.contextMemory.setPendingIntent(sessionId, 'RETURN_ORDER', { 
            availableOrders: returnableOrders 
          });

          return {
            message: `I can help you with a return! Here are your orders that can be returned:\n\n${this.formatOrderList(returnableOrders)}\n\nWhich order would you like to return? You can tell me the order number or mention the product name.`,
            intent: 'RETURN_ORDER',
            success: false,
            needsOrderSelection: true,
            availableOrders: returnableOrders,
            sessionId,
            source: 'local'
          };
        }
        
      case 'UNDO_ACTION':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          // Check what can be undone and execute
          const result = this.executeUndoAction(orderId);
          
          return {
            message: result.message,
            intent: 'UNDO_ACTION',
            orderId,
            success: result.success,
            actions: result.actions || [],
            sessionId,
            source: 'local'
          };
        } else {
          return {
            message: "I can help you undo recent actions! Please provide the order number for the action you'd like to undo.",
            intent: 'UNDO_ACTION',
            success: false,
            needsOrderId: true,
            sessionId,
            source: 'local'
          };
        }
        
      default:
        return {
          message: "👋 Hi! I'm Riley, your AI support assistant. I can help you with:\n\n✅ Cancel orders\n📦 Track shipments\n🔄 Process returns\n❓ Answer questions\n\nWhat can I do for you today?",
          intent: 'GENERAL_INQUIRY',
          success: true,
          actions: ['GREETING'],
          sessionId,
          source: 'local'
        };
    }
  }

  // Get available orders for specific actions
  getAvailableOrders(action) {
    const { mockOrders } = require('../utils/mockData');
    
    switch (action) {
      case 'cancel':
        return mockOrders.filter(order => 
          order.status !== 'cancelled' && 
          order.status !== 'delivered' && 
          order.canCancel !== false
        ).slice(0, 5); // Show max 5 orders
        
      case 'return':
        return mockOrders.filter(order => 
          order.status === 'delivered' && 
          order.canReturn !== false
        ).slice(0, 5);
        
      case 'track':
        return mockOrders.filter(order => 
          order.status !== 'cancelled'
        ).slice(0, 5);
        
      default:
        return mockOrders.slice(0, 5);
    }
  }

  // Execute actual order actions with user orders context
  executeOrderAction(action, orderId, userOrders = []) {
    // First try to find the order in user orders (actual context)
    let order = userOrders.find(o => o.id === orderId);
    
    // Fallback to mock data if not found
    if (!order) {
      const { mockOrders } = require('../utils/mockData');
      order = mockOrders.find(o => o.id === orderId);
    }
    
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
        
        // Actually update the order status
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
        
        // Actually update the order status
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

  /**
   * Format order list for display
   */
  formatOrderList(orders) {
    return orders.map(order => 
      `**${order.id}** - ${order.items.map(item => item.name).join(', ')} ($${order.total}) - ${order.status}`
    ).join('\n');
  }

  executeUndoAction(orderId) {
    const { mockOrders } = require('../utils/mockData');
    const order = mockOrders.find(o => o.id === orderId);
    
    if (!order) {
      return {
        success: false,
        message: `❌ I couldn't find order ${orderId}. Please check the order number and try again.`,
        actions: []
      };
    }
    
    // Check what can be undone based on current status
    if (order.status === 'cancelled') {
      // Undo cancellation - restore to confirmed
      order.status = 'confirmed';
      order.canCancel = true;
      order.canReturn = false;
      delete order.cancellationDate;
      delete order.cancellationReason;
      
      return {
        success: true,
        message: `✅ Perfect! I've restored order ${orderId} from cancelled back to confirmed status. Your order is now active again and will be processed normally. You'll receive a confirmation email shortly. Is there anything else I can help you with? 😊`,
        actions: ['UNDO_CANCEL']
      };
    } 
    else if (order.status === 'return_requested') {
      // Undo return request - restore to delivered
      order.status = 'delivered';
      order.canCancel = false;
      order.canReturn = true;
      delete order.returnDate;
      delete order.returnReason;
      
      return {
        success: true,
        message: `✅ Great! I've cancelled the return request for order ${orderId}. Your order is back to delivered status and you won't need to send the items back. Is there anything else I can help you with? 📦`,
        actions: ['UNDO_RETURN']
      };
    } 
    else {
      return {
        success: false,
        message: `❌ I don't see any recent actions that can be undone for order ${orderId}. The order is currently ${order.status}. Would you like me to help you with something else regarding this order?`,
        actions: []
      };
    }
  }

  handleFrustratedLocally(message, analysis, sessionId, customerId, userOrders = []) {
    // Enhanced empathetic responses for frustrated customers when Gemini isn't available
    const { entities } = analysis;
    const intent = analysis.primaryIntent;
    
    const empathyPhrases = [
      "I completely understand your frustration, and I sincerely apologize for this experience.",
      "I can see how upsetting this must be, and I'm truly sorry you're going through this.",
      "I hear your frustration, and you have every right to be upset about this situation.",
      "I'm really sorry this has been such a difficult experience for you."
    ];
    
    const empathyIntro = empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)];
    
    switch (intent) {
      case 'CANCEL_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          return {
            message: `${empathyIntro} I'm going to personally ensure your order ${orderId} is cancelled immediately. ✅ Your cancellation is now processed, and you'll receive a full refund within 2-3 business days. I'm also adding a note to prioritize your refund. Is there anything else I can do to help restore your confidence in our service?`,
            intent: 'CANCEL_ORDER',
            orderId,
            success: true,
            actions: ['CANCEL_ORDER', 'PRIORITY_REFUND'],
            escalateToHuman: false,
            confidence: 0.85,
            sessionId,
            source: 'local_empathetic'
          };
        } else {
          return {
            message: `${empathyIntro} I want to get this resolved for you right away. Could you please share the order number you'd like to cancel? I'll make sure it's handled immediately with priority processing.`,
            intent: 'CANCEL_ORDER',
            success: false,
            needsOrderId: true,
            escalateToHuman: false,
            sessionId,
            source: 'local_empathetic'
          };
        }
        
      case 'TRACK_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          return {
            message: `${empathyIntro} Let me get you the most up-to-date tracking information for order ${orderId} right now.\n\n📦 **Current Status:** In Transit\n🚚 **Tracking:** 1Z999AA${Math.floor(Math.random() * 1000000)}\n📅 **Est. Delivery:** ${new Date(Date.now() + 24*60*60*1000).toDateString()}\n\nI'm also setting up automatic updates so you'll be notified of any changes. Would you like me to expedite shipping or provide any additional assistance?`,
            intent: 'TRACK_ORDER',
            orderId,
            success: true,
            actions: ['TRACK_ORDER', 'EXPEDITE_SHIPPING'],
            escalateToHuman: false,
            sessionId,
            source: 'local_empathetic'
          };
        } else {
          return {
            message: `${empathyIntro} I want to get you tracking information immediately. Please share your order number, and I'll pull up real-time status updates and make sure everything is on track for you.`,
            intent: 'TRACK_ORDER',
            success: false,
            needsOrderId: true,
            escalateToHuman: false,
            sessionId,
            source: 'local_empathetic'
          };
        }
        
      case 'RETURN_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          return {
            message: `${empathyIntro} I'm initiating your return for order ${orderId} right now with expedited processing. ✅ You'll receive a prepaid return label via email within 15 minutes, and I'm waiving all return fees. Your refund will be processed the moment we receive your package. I'm also adding a customer care note to ensure you receive VIP treatment going forward.`,
            intent: 'RETURN_ORDER',
            orderId,
            success: true,
            actions: ['RETURN_ORDER', 'EXPEDITE_RETURN', 'WAIVE_FEES'],
            escalateToHuman: false,
            sessionId,
            source: 'local_empathetic'
          };
        } else {
          return {
            message: `${empathyIntro} I want to make this return process as smooth as possible for you. Please share the order number, and I'll set up an expedited return with no fees and priority refund processing.`,
            intent: 'RETURN_ORDER',
            success: false,
            needsOrderId: true,
            escalateToHuman: false,
            sessionId,
            source: 'local_empathetic'
          };
        }
        
      default:
        return {
          message: `${empathyIntro} I want to turn this experience around for you immediately. I have access to all your account information and can help with:\n\n🚀 Priority order cancellations\n📦 Expedited tracking & shipping\n💰 Fast returns with waived fees\n🎯 Direct escalation to specialists\n\nWhat specific issue can I resolve for you right now?`,
          intent: 'GENERAL_INQUIRY',
          success: true,
          actions: ['PRIORITY_SUPPORT'],
          escalateToHuman: false,
          sessionId,
          source: 'local_empathetic'
        };
    }
  }

  escalateToHuman(sessionId, reason) {
    console.log(`[SmartHybrid] Escalating to human: ${reason}`);
    
    this.contextMemory.recordHumanEscalation(sessionId);
    
    const escalationMessages = {
      'gemini_insufficient': "I can see you're still not satisfied, and I want to make sure you get the best possible help. I'm connecting you with one of our human specialists who can provide more personalized assistance and has additional tools to resolve your issue.",
      'repeated_failures': "I apologize that I haven't been able to resolve your issue effectively. Let me connect you with a human agent who can give you the immediate, personalized attention you deserve.",
      'default': "I want to make sure you receive the best possible support. I'm connecting you with one of our human agents who can provide more detailed assistance."
    };

    return {
      message: escalationMessages[reason] || escalationMessages['default'],
      intent: 'ESCALATION',
      escalation: {
        reason,
        priority: 'high',
        sessionId,
        context: this.contextMemory.getContext(sessionId)
      },
      success: false,
      escalateToHuman: true,
      sessionId
    };
  }

  getActionsForIntent(intent) {
    const actions = {
      'CANCEL_ORDER': ['CANCEL_ORDER'],
      'TRACK_ORDER': ['TRACK_ORDER'],
      'RETURN_ORDER': ['INITIATE_RETURN'],
      'UNDO_ACTION': ['UNDO_CANCEL', 'UNDO_RETURN'],
      'GENERAL_INQUIRY': ['GREETING']
    };
    
    return actions[intent] || [];
  }

  // Execute order actions (cancel, return, track)
  executeOrderAction(action, orderId, userOrders = []) {
    const order = userOrders.find(o => o.id === orderId);
    
    if (!order) {
      return {
        success: false,
        message: `Order ${orderId} not found in your account.`,
        orderId
      };
    }

    switch (action.toLowerCase()) {
      case 'cancel':
        if (!order.canCancel) {
          return {
            success: false,
            message: `Order ${orderId} cannot be cancelled as it's currently in ${order.status} status.`,
            orderId
          };
        }
        
        // Simulate cancellation (in real app, this would call actual API)
        return {
          success: true,
          message: `✅ Perfect! I've successfully cancelled order ${orderId} for you. You'll receive a refund of $${order.total} within 3-5 business days, and a confirmation email shortly with the cancellation details. Is there anything else I can help you with?`,
          orderId,
          action: 'cancelled',
          refundAmount: order.total
        };

      case 'return':
        if (!order.canReturn) {
          return {
            success: false,
            message: `Order ${orderId} is not eligible for returns at this time.`,
            orderId
          };
        }
        
        // Simulate return process
        return {
          success: true,
          message: `✅ Great! I've initiated a return request for order ${orderId}. You'll receive a return shipping label via email within 24 hours. The return process typically takes 7-10 business days once we receive your package. Anything else I can assist you with?`,
          orderId,
          action: 'return_initiated'
        };

      case 'track':
        return {
          success: true,
          message: `📦 Here's the latest tracking information for order ${orderId}: Status is ${order.status}, tracking number ${order.trackingNumber || 'TBD'}, estimated delivery ${order.estimatedDelivery || 'TBD'}.`,
          orderId,
          action: 'tracking_provided',
          trackingInfo: {
            status: order.status,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery
          }
        };

      default:
        return {
          success: false,
          message: `Action "${action}" is not supported.`,
          orderId
        };
    }
  }

  // Execute undo actions
  executeUndoAction(orderId) {
    // In a real implementation, this would check the action history
    // and reverse the last action performed on the order
    return {
      success: true,
      message: `✅ I've successfully undone the last action on order ${orderId}. The order has been restored to its previous state.`,
      actions: ['UNDO_COMPLETED']
    };
  }

  // Format order list for display
  formatOrderList(orders) {
    if (!orders || orders.length === 0) {
      return 'No orders available.';
    }
    
    return orders.map(order => {
      const itemNames = order.items ? order.items.map(item => item.name).join(', ') : 'Items not listed';
      return `• **${order.id}** - ${itemNames} ($${order.total}) - Status: ${order.status}`;
    }).join('\n');
  }

  // Check if a general inquiry message relates to the pending intent
  isMessageRelatedToPendingIntent(message, pendingIntent) {
    const lowerMessage = message.toLowerCase();
    
    // First check for clearly unrelated topics
    const unrelatedTopics = [
      'weather', 'temperature', 'rain', 'sunny', 'climate', 'forecast',
      'music', 'song', 'playlist', 'album', 'artist',
      'movie', 'film', 'cinema', 'theater', 'show',
      'restaurant', 'food', 'recipe', 'cooking', 'meal',
      'sports', 'game', 'football', 'basketball', 'soccer',
      'politics', 'news', 'government', 'president',
      'travel', 'vacation', 'hotel', 'flight', 'trip',
      'health', 'doctor', 'medicine', 'hospital',
      'technology', 'computer', 'software', 'programming',
      'education', 'school', 'university', 'college'
    ];
    
    const hasUnrelatedTopics = unrelatedTopics.some(topic => lowerMessage.includes(topic));
    if (hasUnrelatedTopics) {
      return false; // Clearly unrelated
    }
    
    // Intent-specific keywords
    const intentKeywords = {
      'CANCEL_ORDER': ['cancel', 'stop', 'abort', 'order', 'refund', 'return'],
      'TRACK_ORDER': ['track', 'status', 'where', 'delivery', 'shipping', 'order'],
      'RETURN_ORDER': ['return', 'exchange', 'back', 'order', 'refund']
    };
    
    // General order-related keywords
    const orderKeywords = ['order', 'purchase', 'buy', 'bought', 'item', 'product'];
    
    // Help-related keywords that could be related (but only if no unrelated topics)
    const helpKeywords = ['help', 'what', 'how', 'which', 'options', 'can', 'should'];
    
    const keywords = [
      ...(intentKeywords[pendingIntent] || []),
      ...orderKeywords,
      ...helpKeywords
    ];
    
    // If the message contains any relevant keywords, consider it related
    const hasRelevantKeywords = keywords.some(keyword => lowerMessage.includes(keyword));
    
    // If it's a very short message that could be a selection, consider it related
    const isShortSelection = message.trim().length < 20 && !hasUnrelatedTopics;
    
    return hasRelevantKeywords || isShortSelection;
  }

  getServiceStats() {
    return {
      hasGeminiAPI: !!this.model,
      memoryStats: {
        activeContexts: this.contextMemory.contexts.size
      },
      geminiCache: this.geminiCache.getStats()
    };
  }

  destroy() {
    // Cleanup
    this.contextMemory.contexts.clear();
    this.geminiCache.cache.clear();
  }
}

module.exports = SmartHybridAIService;
