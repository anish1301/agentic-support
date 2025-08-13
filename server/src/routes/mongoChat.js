/**
 * MongoDB Chat Routes
 * Simple, debuggable chat persistence endpoints
 */

const express = require('express')
const { MongoClient, ObjectId } = require('mongodb')
const router = express.Router()

// MongoDB connection settings
const MONGODB_URL = 'mongodb://localhost:27017'
const DATABASE_NAME = 'richpanel_ai_agent'
const COLLECTION_NAME = 'chat_sessions'

let db = null
let collection = null

// Initialize MongoDB connection
async function initMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URL)
    await client.connect()
    db = client.db(DATABASE_NAME)
    collection = db.collection(COLLECTION_NAME)
    
    // Create indexes for better performance
    await collection.createIndex({ sessionId: 1 })
    await collection.createIndex({ createdAt: -1 })
    await collection.createIndex({ 'messages.timestamp': -1 })
    
    console.log('✅ MongoDB connected successfully')
    return true
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message)
    return false
  }
}

// Health check endpoint
router.get('/health', (req, res) => {
  const isHealthy = db && collection
  res.json({
    success: isHealthy,
    status: isHealthy ? 'connected' : 'disconnected',
    database: DATABASE_NAME,
    collection: COLLECTION_NAME,
    timestamp: new Date().toISOString()
  })
})

// Create new chat session
router.post('/sessions', async (req, res) => {
  try {
    if (!collection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const sessionData = {
      sessionId: req.body.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      messages: req.body.messages || [],
      metadata: {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        ...req.body.metadata
      }
    }

    const result = await collection.insertOne(sessionData)
    
    res.json({
      success: true,
      sessionId: sessionData.sessionId,
      _id: result.insertedId,
      createdAt: sessionData.createdAt
    })
  } catch (error) {
    console.error('Error creating chat session:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get chat session with messages
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    if (!collection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { sessionId } = req.params
    const session = await collection.findOne({ sessionId })

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      })
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        messages: session.messages || [],
        messageCount: (session.messages || []).length
      }
    })
  } catch (error) {
    console.error('Error loading chat session:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Add message to session
router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    if (!collection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { sessionId } = req.params
    const message = {
      id: req.body.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: req.body.content,
      type: req.body.type || 'user',
      sender: req.body.sender || (req.body.type === 'user' ? 'customer' : 'agent'),
      timestamp: new Date(req.body.timestamp) || new Date(),
      context: req.body.context || null
    }

    const result = await collection.updateOne(
      { sessionId },
      { 
        $push: { messages: message },
        $set: { lastMessageAt: new Date() }
      },
      { upsert: false }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      })
    }

    res.json({
      success: true,
      message,
      messageCount: result.modifiedCount
    })
  } catch (error) {
    console.error('Error saving message:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get recent sessions
router.get('/sessions', async (req, res) => {
  try {
    if (!collection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 100)
    
    const sessions = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({
        sessionId: 1,
        createdAt: 1,
        lastMessageAt: 1,
        messageCount: { $size: { $ifNull: ['$messages', []] } }
      })
      .toArray()

    res.json({
      success: true,
      sessions,
      count: sessions.length
    })
  } catch (error) {
    console.error('Error loading recent sessions:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Delete session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    if (!collection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { sessionId } = req.params
    const result = await collection.deleteOne({ sessionId })

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      })
    }

    res.json({
      success: true,
      deletedCount: result.deletedCount
    })
  } catch (error) {
    console.error('Error deleting session:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Search messages
router.get('/search', async (req, res) => {
  try {
    if (!collection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { query, sessionId } = req.query
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      })
    }

    const searchFilter = {
      'messages.content': { $regex: query, $options: 'i' }
    }

    if (sessionId) {
      searchFilter.sessionId = sessionId
    }

    const results = await collection
      .find(searchFilter)
      .project({
        sessionId: 1,
        createdAt: 1,
        messages: {
          $filter: {
            input: '$messages',
            cond: { $regexMatch: { input: '$$this.content', regex: query, options: 'i' } }
          }
        }
      })
      .limit(50)
      .toArray()

    res.json({
      success: true,
      results,
      count: results.length,
      query
    })
  } catch (error) {
    console.error('Error searching messages:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get chat analytics
router.get('/analytics', async (req, res) => {
  try {
    if (!collection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const analytics = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalMessages: { $sum: { $size: { $ifNull: ['$messages', []] } } },
          avgMessagesPerSession: { $avg: { $size: { $ifNull: ['$messages', []] } } }
        }
      }
    ]).toArray()

    const result = analytics[0] || {
      totalSessions: 0,
      totalMessages: 0,
      avgMessagesPerSession: 0
    }

    res.json({
      success: true,
      analytics: {
        totalSessions: result.totalSessions,
        totalMessages: result.totalMessages,
        avgMessagesPerSession: Math.round(result.avgMessagesPerSession || 0),
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error getting analytics:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Initialize MongoDB when module loads
initMongoDB()

module.exports = router
