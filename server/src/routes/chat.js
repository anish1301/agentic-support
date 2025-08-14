const express = require('express');
const router = express.Router();
const simpleAIService = require('../services/simpleAIService');
const chatCacheService = require('../services/chatCacheService');
const { MongoClient } = require('mongodb');

// MongoDB connection settings
const MONGODB_URL = 'mongodb://localhost:27017'
const DATABASE_NAME = 'richpanel_ai_agent'
const COLLECTION_NAME = 'chat_sessions'

let mongoCollection = null

// Initialize MongoDB connection for chat logging
async function initMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URL)
    await client.connect()
    const db = client.db(DATABASE_NAME)
    mongoCollection = db.collection(COLLECTION_NAME)
    console.log('✅ Chat route MongoDB logging enabled')
  } catch (error) {
    console.warn('⚠️ Chat route MongoDB logging disabled:', error.message)
  }
}

// Log message to MongoDB
async function logMessage(sessionId, customerId, message, type = 'user') {
  if (!mongoCollection) return

  try {
    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: message,
      type: type,
      sender: type === 'user' ? 'customer' : 'agent',
      timestamp: new Date(),
      customerId: customerId
    }

    // Check if session exists
    const session = await mongoCollection.findOne({ sessionId })
    
    if (session) {
      // Add message to existing session
      await mongoCollection.updateOne(
        { sessionId },
        { 
          $push: { messages: messageData },
          $set: { lastMessageAt: new Date() }
        }
      )
    } else {
      // Create new session with message
      await mongoCollection.insertOne({
        sessionId,
        customerId,
        createdAt: new Date(),
        messages: [messageData],
        lastMessageAt: new Date(),
        metadata: {}
      })
    }
  } catch (error) {
    console.warn('⚠️ Failed to log message to MongoDB:', error.message)
  }
}

// Initialize MongoDB on startup
initMongoDB()

// POST /api/chat - Intelligent AI chat with advanced caching
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, customerId = 'CUST-001' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`[ChatRoute] Processing: "${message}" for customer: ${customerId}, session: ${sessionId}`);
    
    // Log user message to MongoDB
    await chatCacheService.logMessage(sessionId, customerId, message, 'user');
    
    // Try to find similar question in cache first
    const cachedResponse = await chatCacheService.findSimilarQuestion(message, 0.6); // Lowered threshold
    
    let aiResponseMessage;
    let usedCache = false;
    let cacheInfo = null;
    
    if (cachedResponse) {
      // Use cached response
      aiResponseMessage = cachedResponse.answer;
      usedCache = true;
      cacheInfo = {
        similarity: Math.round(cachedResponse.similarity * 100),
        matchType: cachedResponse.matchType,
        usageCount: cachedResponse.usageCount
      };
      console.log(`🎯 Using cached response (${cacheInfo.similarity}% match, used ${cachedResponse.usageCount} times)`);
    } else {
      // No similar question found, use AI service
      console.log('🤖 No cached response found, querying AI service');
      const aiResponse = await simpleAIService.processUserRequest(message, customerId, sessionId);
      aiResponseMessage = aiResponse.message;
      
      // Cache this new response for future use
      await chatCacheService.cacheResponse(message, aiResponseMessage, {
        customerId,
        sessionId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log AI response to MongoDB
    await chatCacheService.logMessage(sessionId, customerId, aiResponseMessage, 'agent');
    
    const response = {
      message: aiResponseMessage,
      sessionId: sessionId || `session_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'agent',
      success: true,
      cache: {
        used: usedCache,
        ...cacheInfo
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ 
      error: 'I encountered an issue processing your request. Please try again.',
      message: 'Sorry, I had a temporary issue. How can I help you?',
      type: 'agent',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/chat/history/:sessionId - Get chat history
router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  const history = [
    {
      id: 1,
      message: "Hello! How can I help you today?",
      type: 'agent',
      timestamp: new Date().toISOString()
    }
  ];
  
  res.json({ sessionId, history });
});

// GET /api/chat/cache/stats - Get cache statistics
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await chatCacheService.getCacheStats();
    res.json({
      success: true,
      stats: stats || {
        totalEntries: 0,
        totalUsage: 0,
        avgUsage: 0,
        recentEntries: 0,
        hitRate: 0
      }
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

// POST /api/chat/cache/clear - Clear old cache entries
router.post('/cache/clear', async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    const deletedCount = await chatCacheService.clearOldCache(daysOld);
    
    res.json({
      success: true,
      message: `Cleared ${deletedCount} old cache entries`,
      deletedCount
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Initialize chat cache service when module loads
chatCacheService.initialize();

module.exports = router;
