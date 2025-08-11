// Gemini-Powered Context Management Service
// Uses Gemini API for advanced context analysis while maintaining local memory for speed

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiContextService {
  constructor() {
    // Initialize Gemini API
    this.model = null;
    this.initializeGemini();
    
    // Local context cache for speed
    this.contextCache = new Map();
    this.analysisCache = new Map();
    
    // Gemini prompts
    this.contextAnalysisPrompt = `You are an expert at analyzing customer support conversations for context and intent. Analyze the conversation and return detailed insights.

Return JSON only in this format:
{
  "primaryIntent": "CANCEL_ORDER|TRACK_ORDER|RETURN_ORDER|PAYMENT_ISSUE|GENERAL_INQUIRY",
  "confidence": 0.95,
  "sentiment": {
    "overall": "positive|neutral|negative",
    "intensity": 0.8,
    "emotions": ["frustrated", "angry", "satisfied"],
    "escalationRisk": "low|medium|high"
  },
  "entities": {
    "orderIds": ["ORD-12345"],
    "products": ["iPhone", "Headphones"],
    "amounts": [299.99],
    "timeReferences": ["last week", "yesterday"]
  },
  "contextInsights": {
    "isNewCustomer": false,
    "hasOrderHistory": true,
    "previousIssues": ["delivery delay"],
    "customerTier": "premium|standard|new",
    "urgencyLevel": "low|medium|high|critical"
  },
  "recommendations": {
    "responseStyle": "empathetic|professional|friendly|urgent",
    "suggestedActions": ["apologize", "offer_compensation", "escalate"],
    "followUpNeeded": true,
    "estimatedResolutionTime": "immediate|within_hour|within_day"
  },
  "conversationFlow": {
    "stage": "initial|clarifying|resolving|closing",
    "nextBestActions": ["gather_info", "take_action", "confirm_satisfaction"],
    "potentialComplications": ["policy_exception_needed", "technical_limitation"]
  }
}`;

    this.intentRefinementPrompt = `Based on the conversation history and current message, provide a refined intent analysis that considers:
1. Previous customer interactions
2. Conversation patterns
3. Escalation indicators
4. Multi-intent scenarios

Return refined JSON with the same structure but improved accuracy based on conversation context.`;
  }

  async initializeGemini() {
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = genAI.getGenerativeModel({ 
          model: 'gemini-pro',
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent analysis
            maxOutputTokens: 1024,
          }
        });
        console.log('[GeminiContext] Gemini API initialized for context analysis');
      } catch (error) {
        console.log('[GeminiContext] Gemini API failed to initialize:', error.message);
      }
    } else {
      console.log('[GeminiContext] No Gemini API key provided, using fallback analysis');
    }
  }

  /**
   * Analyze message with Gemini API for deep context understanding
   */
  async analyzeWithGemini(message, conversationHistory = [], customerProfile = {}) {
    if (!this.model) {
      return this.fallbackAnalysis(message, conversationHistory);
    }

    // Create cache key
    const cacheKey = this.createCacheKey(message, conversationHistory);
    if (this.analysisCache.has(cacheKey)) {
      console.log('[GeminiContext] Using cached analysis');
      return this.analysisCache.get(cacheKey);
    }

    try {
      // Build conversation context for Gemini
      const contextPrompt = this.buildContextPrompt(message, conversationHistory, customerProfile);
      
      const result = await this.model.generateContent(contextPrompt);
      const response = await result.response;
      const analysisText = response.text().trim();
      
      // Parse JSON response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      
      // Enhance with additional processing
      analysis.geminiProcessed = true;
      analysis.processingTime = Date.now();
      analysis.cacheKey = cacheKey;
      
      // Cache the result (expire after 5 minutes)
      this.analysisCache.set(cacheKey, analysis);
      setTimeout(() => this.analysisCache.delete(cacheKey), 300000);
      
      return analysis;
      
    } catch (error) {
      console.error('[GeminiContext] Gemini analysis failed:', error.message);
      return this.fallbackAnalysis(message, conversationHistory);
    }
  }

  /**
   * Build comprehensive context prompt for Gemini
   */
  buildContextPrompt(message, conversationHistory, customerProfile) {
    let prompt = `${this.contextAnalysisPrompt}\n\nCURRENT MESSAGE: "${message}"\n\n`;
    
    // Add conversation history
    if (conversationHistory.length > 0) {
      prompt += `CONVERSATION HISTORY (most recent first):\n`;
      conversationHistory.slice(-5).reverse().forEach((msg, index) => {
        prompt += `${index + 1}. ${msg.sender}: "${msg.content}"\n`;
      });
      prompt += '\n';
    }
    
    // Add customer profile if available
    if (customerProfile && Object.keys(customerProfile).length > 0) {
      prompt += `CUSTOMER PROFILE:\n`;
      prompt += `- Customer ID: ${customerProfile.customerId || 'Unknown'}\n`;
      prompt += `- Tier: ${customerProfile.tier || 'Standard'}\n`;
      prompt += `- Previous Issues: ${customerProfile.previousIssues?.join(', ') || 'None'}\n`;
      prompt += `- Satisfaction Score: ${customerProfile.satisfactionScore || 'Unknown'}\n`;
      prompt += `- Preferred Language: ${customerProfile.preferredLanguage || 'English'}\n\n`;
    }
    
    prompt += `Analyze this message in context and provide detailed insights that will help provide the best customer support experience.`;
    
    return prompt;
  }

  /**
   * Refine intent based on conversation flow
   */
  async refineIntentWithContext(initialAnalysis, conversationHistory, patterns) {
    if (!this.model) {
      return initialAnalysis;
    }

    try {
      const refinementPrompt = `${this.intentRefinementPrompt}

INITIAL ANALYSIS: ${JSON.stringify(initialAnalysis)}

CONVERSATION PATTERNS:
- Recent intents: ${patterns.recentIntents?.join(', ') || 'None'}
- Failed attempts: ${patterns.failedAttempts || 0}
- Sentiment trend: ${patterns.sentimentTrend || 'Stable'}
- Time in conversation: ${patterns.conversationDuration || 'New'}

CONVERSATION HISTORY:
${conversationHistory.slice(-3).map((msg, i) => `${i+1}. ${msg.sender}: "${msg.content}"`).join('\n')}

Provide refined analysis that considers the conversation context and patterns.`;

      const result = await this.model.generateContent(refinementPrompt);
      const response = await result.response;
      const refinedText = response.text().trim();
      
      const jsonMatch = refinedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const refinedAnalysis = JSON.parse(jsonMatch[0]);
        refinedAnalysis.refined = true;
        refinedAnalysis.originalConfidence = initialAnalysis.confidence;
        return refinedAnalysis;
      }
      
    } catch (error) {
      console.error('[GeminiContext] Intent refinement failed:', error.message);
    }
    
    return initialAnalysis;
  }

  /**
   * Generate contextual response suggestions
   */
  async generateResponseSuggestions(analysis, conversationHistory, availableActions) {
    if (!this.model) {
      return this.getBasicResponseSuggestions(analysis);
    }

    try {
      const responsePrompt = `Based on the conversation analysis, generate response suggestions for the AI agent.

ANALYSIS: ${JSON.stringify(analysis)}

AVAILABLE ACTIONS: ${availableActions.join(', ')}

CONVERSATION HISTORY:
${conversationHistory.slice(-3).map((msg, i) => `${i+1}. ${msg.sender}: "${msg.content}"`).join('\n')}

Generate response suggestions in this JSON format:
{
  "primaryResponse": "Main response text",
  "alternativeResponses": ["Alternative 1", "Alternative 2"],
  "suggestedActions": ["action1", "action2"],
  "tone": "empathetic|professional|friendly|urgent",
  "followUpQuestions": ["clarifying question 1"],
  "escalationRecommended": false,
  "estimatedSatisfaction": 0.8
}`;

      const result = await this.model.generateContent(responsePrompt);
      const response = await result.response;
      const suggestionsText = response.text().trim();
      
      const jsonMatch = suggestionsText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
    } catch (error) {
      console.error('[GeminiContext] Response generation failed:', error.message);
    }
    
    return this.getBasicResponseSuggestions(analysis);
  }

  /**
   * Hybrid approach: Use local cache + Gemini enhancement
   */
  async getEnhancedContext(sessionId, message, localContext) {
    // Start with local context for speed
    const baseAnalysis = this.quickLocalAnalysis(message, localContext);
    
    // Enhance with Gemini in background if available
    const geminiAnalysis = await this.analyzeWithGemini(
      message, 
      localContext.messages,
      localContext.customerProfile
    );
    
    // Merge local + Gemini insights
    return this.mergeAnalyses(baseAnalysis, geminiAnalysis);
  }

  /**
   * Quick local analysis for immediate response
   */
  quickLocalAnalysis(message, localContext) {
    const lowerMessage = message.toLowerCase();
    
    // Simple pattern matching for immediate classification
    let intent = 'GENERAL_INQUIRY';
    let confidence = 0.5;
    
    if (lowerMessage.includes('cancel') && (lowerMessage.includes('order') || localContext.knownOrderIds?.length > 0)) {
      intent = 'CANCEL_ORDER';
      confidence = 0.8;
    } else if (lowerMessage.includes('track') || lowerMessage.includes('status')) {
      intent = 'TRACK_ORDER';
      confidence = 0.75;
    } else if (lowerMessage.includes('return') || lowerMessage.includes('refund')) {
      intent = 'RETURN_ORDER';
      confidence = 0.7;
    }
    
    return {
      primaryIntent: intent,
      confidence,
      sentiment: { overall: 'neutral', intensity: 0.5 },
      entities: this.extractBasicEntities(message),
      source: 'local_analysis',
      processingTime: Date.now()
    };
  }

  /**
   * Merge local and Gemini analyses for best result
   */
  mergeAnalyses(localAnalysis, geminiAnalysis) {
    if (!geminiAnalysis.geminiProcessed) {
      return localAnalysis;
    }
    
    // Use Gemini's superior understanding but keep local speed
    return {
      ...geminiAnalysis,
      fallbackAnalysis: localAnalysis,
      hybrid: true,
      confidenceBoost: geminiAnalysis.confidence > localAnalysis.confidence,
      processingMethod: 'hybrid_local_gemini'
    };
  }

  /**
   * Extract basic entities quickly
   */
  extractBasicEntities(message) {
    const entities = { orderIds: [], products: [], amounts: [] };
    
    // Order ID patterns
    const orderPattern = /(?:ORD-)?([A-Z0-9]{3,8})/gi;
    let match;
    while ((match = orderPattern.exec(message)) !== null) {
      const orderId = match[1].startsWith('ORD-') ? match[1] : `ORD-${match[1]}`;
      entities.orderIds.push(orderId);
    }
    
    // Amount patterns
    const amountPattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
    while ((match = amountPattern.exec(message)) !== null) {
      entities.amounts.push(parseFloat(match[1].replace(',', '')));
    }
    
    return entities;
  }

  /**
   * Fallback analysis when Gemini is unavailable
   */
  fallbackAnalysis(message, conversationHistory) {
    return {
      primaryIntent: 'GENERAL_INQUIRY',
      confidence: 0.6,
      sentiment: { overall: 'neutral', intensity: 0.5, emotions: [] },
      entities: this.extractBasicEntities(message),
      contextInsights: { isNewCustomer: conversationHistory.length <= 1 },
      recommendations: { responseStyle: 'friendly', suggestedActions: [] },
      source: 'fallback_analysis',
      geminiProcessed: false
    };
  }

  /**
   * Basic response suggestions without Gemini
   */
  getBasicResponseSuggestions(analysis) {
    const intent = analysis.primaryIntent;
    const suggestions = {
      'CANCEL_ORDER': {
        primaryResponse: "I can help you cancel that order. Let me process that for you.",
        tone: "helpful",
        suggestedActions: ["cancel_order"]
      },
      'TRACK_ORDER': {
        primaryResponse: "I'll get you the latest tracking information for your order.",
        tone: "informative", 
        suggestedActions: ["track_order"]
      },
      'GENERAL_INQUIRY': {
        primaryResponse: "I'm here to help! What can I do for you today?",
        tone: "friendly",
        suggestedActions: ["provide_options"]
      }
    };
    
    return suggestions[intent] || suggestions['GENERAL_INQUIRY'];
  }

  /**
   * Create cache key for analysis caching
   */
  createCacheKey(message, conversationHistory) {
    const historyKey = conversationHistory.slice(-3).map(m => m.content).join('|');
    return `${message}:${historyKey}`.substring(0, 100);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      hasGeminiAPI: !!this.model,
      cacheSize: this.analysisCache.size,
      contextCacheSize: this.contextCache.size,
      apiCallsAvailable: !!process.env.GEMINI_API_KEY
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.analysisCache.clear();
    this.contextCache.clear();
  }
}

module.exports = GeminiContextService;
