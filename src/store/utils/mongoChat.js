/**
 * MongoDB Chat Integration
 * Handles chat storage and retrieval from MongoDB localhost:27017
 * Simple, debuggable implementation
 */

const MONGODB_URL = 'mongodb://localhost:27017'
const DATABASE_NAME = 'richpanel_ai_agent'
const COLLECTION_NAME = 'chat_sessions'

/**
 * MongoDB Chat Service
 * Provides methods for chat persistence
 */
class MongoChatService {
  constructor() {
    this.baseUrl = 'http://localhost:3002' // Your server URL
    this.debug = process.env.NODE_ENV !== 'production'
  }

  /**
   * Create a new chat session
   */
  async createSession(sessionData = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/mongo-chat/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.generateSessionId(),
          createdAt: new Date().toISOString(),
          messages: [],
          ...sessionData
        })
      })

      const result = await response.json()
      
      if (this.debug) {
        console.log('📝 Chat session created:', result.sessionId)
      }
      
      return result
    } catch (error) {
      console.error('❌ Error creating chat session:', error)
      return { success: false, error: error.message, sessionId: this.generateSessionId() }
    }
  }

  /**
   * Save message to session
   */
  async saveMessage(sessionId, message) {
    try {
      const messageData = {
        id: this.generateMessageId(),
        content: message.content,
        type: message.type || 'user',
        sender: message.sender || (message.type === 'user' ? 'customer' : 'agent'),
        timestamp: new Date().toISOString(),
        context: message.context || null
      }

      const response = await fetch(`${this.baseUrl}/api/mongo-chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      })

      const result = await response.json()
      
      if (this.debug) {
        console.log('💬 Message saved:', messageData.id)
      }
      
      return { success: true, message: result.message || messageData }
    } catch (error) {
      console.error('❌ Error saving message:', error)
      return { success: false, error: error.message, message }
    }
  }

  /**
   * Load chat session with messages
   */
  async loadSession(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/mongo-chat/sessions/${sessionId}`)
      const result = await response.json()
      
      if (this.debug) {
        console.log('📂 Chat session loaded:', sessionId)
      }
      
      return result
    } catch (error) {
      console.error('❌ Error loading chat session:', error)
      return { 
        success: false, 
        error: error.message,
        session: { sessionId, messages: [] }
      }
    }
  }

  /**
   * Get recent chat sessions
   */
  async getRecentSessions(limit = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/api/mongo-chat/sessions?limit=${limit}`)
      const result = await response.json()
      
      return result
    } catch (error) {
      console.error('❌ Error loading recent sessions:', error)
      return { success: false, error: error.message, sessions: [] }
    }
  }

  /**
   * Delete chat session
   */
  async deleteSession(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/mongo-chat/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (this.debug) {
        console.log('🗑️ Chat session deleted:', sessionId)
      }
      
      return result
    } catch (error) {
      console.error('❌ Error deleting session:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Search messages across sessions
   */
  async searchMessages(query, sessionId = null) {
    try {
      const params = new URLSearchParams({ query })
      if (sessionId) {
        params.append('sessionId', sessionId)
      }

      const response = await fetch(`${this.baseUrl}/api/mongo-chat/search?${params}`)
      const result = await response.json()
      
      return result
    } catch (error) {
      console.error('❌ Error searching messages:', error)
      return { success: false, error: error.message, results: [] }
    }
  }

  /**
   * Get chat analytics
   */
  async getChatAnalytics() {
    try {
      const response = await fetch(`${this.baseUrl}/api/mongo-chat/analytics`)
      const result = await response.json()
      
      return result
    } catch (error) {
      console.error('❌ Error loading chat analytics:', error)
      return { 
        success: false, 
        error: error.message,
        analytics: { totalSessions: 0, totalMessages: 0, avgMessagesPerSession: 0 }
      }
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Check if MongoDB service is available
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/mongo-chat/health`)
      const result = await response.json()
      return result.success || false
    } catch (error) {
      console.warn('⚠️ MongoDB chat service unavailable, using local fallback')
      return false
    }
  }
}

// Export singleton instance
export const mongoChatService = new MongoChatService()

/**
 * Vuex plugin for MongoDB chat integration
 */
export function createMongoChatPlugin(options = {}) {
  const {
    debug = false,
    fallbackToLocal = true
  } = options

  return function mongoChatPlugin(store) {
    let isMongoAvailable = false

    // Check MongoDB availability on plugin initialization
    mongoChatService.checkConnection().then(available => {
      isMongoAvailable = available
      if (debug) {
        console.log(`🗄️ MongoDB chat service: ${available ? 'Available' : 'Unavailable'}`)
      }
    })

    // Add MongoDB methods to store
    store.$mongoChat = {
      // Check if MongoDB is available
      isAvailable: () => isMongoAvailable,
      
      // Create session
      createSession: async (sessionData) => {
        if (!isMongoAvailable && !fallbackToLocal) {
          return { success: false, error: 'MongoDB unavailable' }
        }
        return await mongoChatService.createSession(sessionData)
      },
      
      // Save message
      saveMessage: async (sessionId, message) => {
        if (!isMongoAvailable && !fallbackToLocal) {
          return { success: false, error: 'MongoDB unavailable' }
        }
        return await mongoChatService.saveMessage(sessionId, message)
      },
      
      // Load session
      loadSession: async (sessionId) => {
        if (!isMongoAvailable && !fallbackToLocal) {
          return { success: false, error: 'MongoDB unavailable' }
        }
        return await mongoChatService.loadSession(sessionId)
      },
      
      // Get recent sessions
      getRecentSessions: async (limit) => {
        if (!isMongoAvailable && !fallbackToLocal) {
          return { success: false, error: 'MongoDB unavailable' }
        }
        return await mongoChatService.getRecentSessions(limit)
      },
      
      // Delete session
      deleteSession: async (sessionId) => {
        if (!isMongoAvailable && !fallbackToLocal) {
          return { success: false, error: 'MongoDB unavailable' }
        }
        return await mongoChatService.deleteSession(sessionId)
      },
      
      // Search messages
      searchMessages: async (query, sessionId) => {
        if (!isMongoAvailable && !fallbackToLocal) {
          return { success: false, error: 'MongoDB unavailable' }
        }
        return await mongoChatService.searchMessages(query, sessionId)
      },
      
      // Get analytics
      getChatAnalytics: async () => {
        if (!isMongoAvailable && !fallbackToLocal) {
          return { success: false, error: 'MongoDB unavailable' }
        }
        return await mongoChatService.getChatAnalytics()
      }
    }

    // Subscribe to chat mutations to auto-save to MongoDB
    store.subscribe(async (mutation, state) => {
      if (mutation.type === 'chat/ADD_MESSAGE' && isMongoAvailable) {
        const currentSession = state.chat.currentSession
        if (currentSession) {
          // Auto-save message to MongoDB
          const message = mutation.payload
          await mongoChatService.saveMessage(currentSession, message).catch(error => {
            if (debug) {
              console.warn('⚠️ Auto-save to MongoDB failed:', error)
            }
          })
        }
      }
    })
  }
}

/**
 * Debug helper for MongoDB chat
 */
export async function debugMongoChat() {
  console.log('🔍 MongoDB Chat Service Debug:')
  console.log('Connection:', await mongoChatService.checkConnection())
  
  try {
    const recent = await mongoChatService.getRecentSessions(5)
    console.log('Recent sessions:', recent.sessions?.length || 0)
    
    const analytics = await mongoChatService.getChatAnalytics()
    console.log('Analytics:', analytics.analytics)
  } catch (error) {
    console.log('Error during debug:', error.message)
  }
}
