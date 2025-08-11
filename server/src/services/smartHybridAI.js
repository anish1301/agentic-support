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

  analyzeMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    const analysis = {
      primaryIntent: 'GENERAL_INQUIRY',
      confidence: 0.5,
      entities: this.extractEntities(message),
      isFrustrated: this.detectFrustration(message),
      source: 'local',
      timestamp: Date.now()
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

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intentName;
      }
    }

    analysis.primaryIntent = bestIntent;
    analysis.confidence = bestScore;

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

  extractEntities(message) {
    const entities = { orderIds: [] };

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
        createdAt: Date.now()
      });
    }
    return this.contexts.get(sessionId);
  }

  addMessage(sessionId, message, analysis) {
    const context = this.getContext(sessionId);
    context.messages.push({ message, analysis, timestamp: Date.now() });
    
    // Keep only recent messages
    if (context.messages.length > this.maxContextHistory) {
      context.messages = context.messages.slice(-this.maxContextHistory);
    }
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

  async processMessage(message, customerId, sessionId) {
    try {
      // Step 1: Always do local analysis first (fast)
      const localAnalysis = this.intentClassifier.analyzeMessage(message);
      console.log(`[SmartHybrid] Local analysis: ${localAnalysis.primaryIntent}, frustrated: ${localAnalysis.isFrustrated}`);

      // Step 2: Add to context
      const context = this.contextMemory.getContext(sessionId);
      this.contextMemory.addMessage(sessionId, message, localAnalysis);

      // Step 3: Decision tree for processing approach
      if (localAnalysis.isFrustrated && !context.geminiAttempted) {
        if (this.model) {
          // Customer is frustrated and Gemini is available - use it for empathetic response
          return await this.handleWithGemini(message, localAnalysis, sessionId, customerId);
        } else {
          // Customer is frustrated but Gemini not available - use enhanced local response
          console.log('[SmartHybrid] Customer frustrated but Gemini unavailable - using enhanced local response');
          return this.handleFrustratedLocally(message, localAnalysis, sessionId, customerId);
        }
      } else if (context.geminiAttempted && context.failedAttempts > 0) {
        // Gemini already tried and customer still not happy - escalate to human
        return this.escalateToHuman(sessionId, 'gemini_insufficient');
      } else if (context.failedAttempts > 2) {
        // Too many failed attempts - escalate to human
        return this.escalateToHuman(sessionId, 'repeated_failures');
      } else {
        // Normal case - use local processing
        return this.handleLocally(message, localAnalysis, sessionId, customerId);
      }

    } catch (error) {
      console.error('[SmartHybrid] Error processing message:', error);
      this.contextMemory.recordFailure(sessionId);
      
      return {
        message: "I apologize, but I encountered an error. Let me connect you with a human agent who can help you right away.",
        intent: 'ESCALATION',
        success: false,
        error: error.message,
        escalateToHuman: true
      };
    }
  }

  async handleWithGemini(message, localAnalysis, sessionId, customerId) {
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

  handleLocally(message, analysis, sessionId, customerId) {
    const { primaryIntent, entities } = analysis;
    
    switch (primaryIntent) {
      case 'CANCEL_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          // Execute the actual cancellation
          const result = this.executeOrderAction('cancel', orderId);
          
          return {
            message: result.message,
            intent: 'CANCEL_ORDER',
            orderId,
            success: result.success,
            actions: result.success ? ['CANCEL_ORDER'] : [],
            sessionId,
            source: 'local'
          };
        } else {
          // No order ID provided - show available cancellable orders
          const availableOrders = this.getAvailableOrders('cancel');
          const orderList = availableOrders.length > 0 ? 
            `\n\nHere are your orders that can be cancelled:\n${availableOrders.map(order => `• **${order.id}** - ${order.items[0].name} ($${order.total}) - Status: ${order.status}`).join('\n')}` :
            '\n\nYou currently have no orders that can be cancelled.';
          
          return {
            message: `I'd be happy to help you cancel an order. Could you please provide the order number? For example: "cancel order ORD-12345"${orderList}`,
            intent: 'CANCEL_ORDER',
            success: false,
            needsOrderId: true,
            availableOrders: availableOrders,
            sessionId,
            source: 'local'
          };
        }
        
      case 'TRACK_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          return {
            message: `📦 Here's the tracking information for order ${orderId}:\n\n**Status:** In Transit\n**Tracking:** 1Z999AA${Math.floor(Math.random() * 1000000)}\n**Est. Delivery:** ${new Date(Date.now() + 2*24*60*60*1000).toDateString()}\n\nYour package is on its way! Is there anything else you need help with?`,
            intent: 'TRACK_ORDER',
            orderId,
            success: true,
            actions: ['TRACK_ORDER'],
            sessionId,
            source: 'local'
          };
        } else {
          return {
            message: "I can help you track your order! Please provide the order number you'd like to track.",
            intent: 'TRACK_ORDER',
            success: false,
            needsOrderId: true,
            sessionId,
            source: 'local'
          };
        }
        
      case 'RETURN_ORDER':
        if (entities.orderIds.length > 0) {
          const orderId = entities.orderIds[0];
          // Execute the actual return
          const result = this.executeOrderAction('return', orderId);
          
          return {
            message: result.message,
            intent: 'RETURN_ORDER',
            orderId,
            success: result.success,
            actions: result.success ? ['RETURN_ORDER'] : [],
            sessionId,
            source: 'local'
          };
        } else {
          return {
            message: "I can help you with a return! Please provide the order number for the items you'd like to return.",
            intent: 'RETURN_ORDER',
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

  // Execute actual order actions
  executeOrderAction(action, orderId) {
    const { mockOrders } = require('../utils/mockData');
    const order = mockOrders.find(o => o.id === orderId);
    
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

  handleFrustratedLocally(message, analysis, sessionId, customerId) {
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
      'GENERAL_INQUIRY': ['GREETING']
    };
    
    return actions[intent] || [];
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
