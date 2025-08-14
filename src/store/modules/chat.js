// Chat module for managing chat conversations with MongoDB integration
import apiService from '../../services/apiService'

const state = {
  messages: [],
  isTyping: false,
  currentSession: null,
  chatHistory: [],
  isMongoConnected: false
}

const mutations = {
  ADD_MESSAGE(state, message) {
    const newMessage = {
      id: Date.now() + Math.random(),
      ...message,
      timestamp: new Date().toISOString()
    }
    state.messages.push(newMessage)
    return newMessage // Return for MongoDB saving
  },

  SET_TYPING(state, isTyping) {
    state.isTyping = isTyping
  },

  CLEAR_MESSAGES(state) {
    state.messages = []
  },

  SET_CURRENT_SESSION(state, sessionId) {
    state.currentSession = sessionId
  },

  UPDATE_MESSAGE(state, { messageId, updates }) {
    const message = state.messages.find(m => m.id === messageId)
    if (message) {
      Object.assign(message, updates)
    }
  },

  SET_MONGO_CONNECTION(state, isConnected) {
    state.isMongoConnected = isConnected
  },

  LOAD_MESSAGES_FROM_MONGO(state, messages) {
    state.messages = messages || []
  },

  // Enhanced mutation for state restoration (used by undo/redo if needed)
  RESTORE_STATE(state, restoredState) {
    Object.assign(state, restoredState)
  }
}

const actions = {
  // Initialize chat session (create or load from MongoDB)
  async initializeSession({ commit, dispatch, rootState }) {
    try {
      // Check if MongoDB is available
      const isMongoAvailable = rootState.$mongoChat?.isAvailable() || false
      commit('SET_MONGO_CONNECTION', isMongoAvailable)

      if (isMongoAvailable) {
        // Try to create a new session in MongoDB
        const result = await dispatch('createMongoSession')
        if (result.success) {
          commit('SET_CURRENT_SESSION', result.sessionId)
          return { success: true, sessionId: result.sessionId }
        }
      }

      // Fallback to local session
      const localSessionId = `local_${Date.now()}`
      commit('SET_CURRENT_SESSION', localSessionId)
      return { success: true, sessionId: localSessionId, isLocal: true }

    } catch (error) {
      console.error('Error initializing chat session:', error)
      const fallbackSessionId = `fallback_${Date.now()}`
      commit('SET_CURRENT_SESSION', fallbackSessionId)
      return { success: false, sessionId: fallbackSessionId, error: error.message }
    }
  },

  // Create session in MongoDB
  async createMongoSession({ rootState }, sessionData = {}) {
    try {
      if (rootState.$mongoChat?.isAvailable()) {
        return await rootState.$mongoChat.createSession(sessionData)
      }
      return { success: false, error: 'MongoDB not available' }
    } catch (error) {
      console.error('Error creating MongoDB session:', error)
      return { success: false, error: error.message }
    }
  },

  // Load session from MongoDB
  async loadMongoSession({ commit, rootState }, sessionId) {
    try {
      if (rootState.$mongoChat?.isAvailable()) {
        const result = await rootState.$mongoChat.loadSession(sessionId)
        if (result.success && result.session) {
          commit('SET_CURRENT_SESSION', sessionId)
          commit('LOAD_MESSAGES_FROM_MONGO', result.session.messages || [])
          return { success: true, session: result.session }
        }
      }
      return { success: false, error: 'Could not load session' }
    } catch (error) {
      console.error('Error loading MongoDB session:', error)
      return { success: false, error: error.message }
    }
  },

  async sendMessage({ commit, state, dispatch, rootState }, { content, type = 'user' }) {
    // Add user message
    const userMessage = {
      content,
      type,
      sender: type === 'user' ? 'customer' : 'agent'
    }
    const savedMessage = commit('ADD_MESSAGE', userMessage)

    // Save to MongoDB if available
    if (state.isMongoConnected && state.currentSession) {
      try {
        await rootState.$mongoChat?.saveMessage(state.currentSession, savedMessage)
      } catch (error) {
        console.warn('Failed to save message to MongoDB:', error)
      }
    }

    if (type === 'user') {
      // Show typing indicator
      commit('SET_TYPING', true)
      
      try {
        // Get user orders for context (filter for current user)
        const allOrders = rootState.orders?.orders || []
        const primaryUserId = 'CUST-001' // Sarah Johnson - our primary user
        const userOrders = allOrders.filter(order => order.customerId === primaryUserId)
        
        // Send message to API with user context
        const response = await apiService.sendMessage(content, state.currentSession, userOrders)
        
        // Add agent response
        const agentMessage = {
          content: response.message,
          type: 'agent',
          sender: 'agent',
          context: response.context
        }
        const savedAgentMessage = commit('ADD_MESSAGE', agentMessage)
        
        // Save agent message to MongoDB
        if (state.isMongoConnected && state.currentSession) {
          try {
            await rootState.$mongoChat?.saveMessage(state.currentSession, savedAgentMessage)
          } catch (error) {
            console.warn('Failed to save agent message to MongoDB:', error)
          }
        }
        
        // Update session ID if provided
        if (response.sessionId && response.sessionId !== state.currentSession) {
          commit('SET_CURRENT_SESSION', response.sessionId)
        }
        
        // Handle order actions from AI response
        if (response.success && response.actions && response.actions.length > 0) {
          for (const action of response.actions) {
            await dispatch('processOrderAction', {
              action: action.type, // Use action.type instead of action directly
              orderId: action.orderId, // Get orderId from the action object
              intent: response.intent,
              aiResponse: response
            })
          }
        }
        
      } catch (error) {
        console.error('Error sending message:', error)
        const errorMessage = {
          content: 'Sorry, I encountered an error. Please try again.',
          type: 'agent',
          sender: 'agent'
        }
        commit('ADD_MESSAGE', errorMessage)
        
        // Save error message to MongoDB
        if (state.isMongoConnected && state.currentSession) {
          try {
            await rootState.$mongoChat?.saveMessage(state.currentSession, errorMessage)
          } catch (mongoError) {
            console.warn('Failed to save error message to MongoDB:', mongoError)
          }
        }
      } finally {
        commit('SET_TYPING', false)
      }
    }
  },

  async processOrderAction({ dispatch }, { action, orderId, intent, aiResponse }) {
    try {
      let result = null
      let notificationMessage = ''
      
      // Process different order actions
      if (action === 'CANCEL_ORDER' && orderId) {
        result = await dispatch('orders/cancelOrder', {
          orderId: orderId,
          reason: 'Customer request via AI chat'
        }, { root: true })
        
        if (result.success) {
          notificationMessage = `✅ Order ${orderId} has been cancelled successfully!`
          
          // Also refresh orders from server to get the actual updated data
          try {
            await dispatch('orders/fetchOrders', null, { root: true })
          } catch (error) {
            console.log('Note: Using local order update (server sync not available)')
          }
        }
      } else if (action === 'RETURN_ORDER' && orderId) {
        result = await dispatch('orders/returnOrder', {
          orderId: orderId,
          reason: 'Customer request via AI chat'
        }, { root: true })
        
        if (result.success) {
          notificationMessage = `✅ Return request for order ${orderId} has been submitted!`
          
          // Refresh orders from server
          try {
            await dispatch('orders/fetchOrders', null, { root: true })
          } catch (error) {
            console.log('Note: Using local order update (server sync not available)')
          }
        }
      } else if (action === 'TRACK_ORDER' && orderId) {
        // For tracking, just show a notification that tracking info was provided
        notificationMessage = `📦 Tracking information provided for order ${orderId}`
      }
      
      // Show notification
      if (notificationMessage) {
        dispatch('ui/showNotification', {
          type: result?.success ? 'success' : 'info',
          message: notificationMessage,
          duration: 6000 // Show longer for important actions
        }, { root: true })
      }
      
    } catch (error) {
      console.error('Error processing order action:', error)
      dispatch('ui/showNotification', {
        type: 'error',
        message: 'There was an issue processing your request. Please try again.'
      }, { root: true })
    }
  },

  async loadChatHistory({ commit, dispatch }, sessionId) {
    try {
      // Try to load from MongoDB first
      const mongoResult = await dispatch('loadMongoSession', sessionId)
      if (mongoResult.success) {
        return mongoResult
      }

      // Fallback to API
      const response = await apiService.getChatHistory(sessionId)
      commit('SET_CURRENT_SESSION', response.sessionId)
      
      // Load history messages if any
      if (response.history && response.history.length > 0) {
        response.history.forEach(msg => {
          commit('ADD_MESSAGE', {
            content: msg.message,
            type: msg.type,
            sender: msg.type === 'user' ? 'customer' : 'agent'
          })
        })
      }
      return { success: true }
    } catch (error) {
      console.error('Error loading chat history:', error)
      return { success: false, error: error.message }
    }
  },

  addAgentMessage({ commit, state, rootState }, content) {
    const message = {
      content,
      type: 'agent',
      sender: 'agent'
    }
    const savedMessage = commit('ADD_MESSAGE', message)
    
    // Save to MongoDB if available
    if (state.isMongoConnected && state.currentSession) {
      rootState.$mongoChat?.saveMessage(state.currentSession, savedMessage).catch(error => {
        console.warn('Failed to save agent message to MongoDB:', error)
      })
    }
  },

  clearChat({ commit, state, rootState }) {
    // Clear local messages
    commit('CLEAR_MESSAGES')
    
    // Optionally delete MongoDB session
    if (state.isMongoConnected && state.currentSession) {
      rootState.$mongoChat?.deleteSession(state.currentSession).catch(error => {
        console.warn('Failed to delete MongoDB session:', error)
      })
    }
    
    commit('SET_CURRENT_SESSION', null)
  }
}

const getters = {
  chatMessages: state => state.messages,
  isAgentTyping: state => state.isTyping,
  lastMessage: state => state.messages[state.messages.length - 1] || null,
  isMongoConnected: state => state.isMongoConnected,
  currentSessionId: state => state.currentSession,
  messageCount: state => state.messages.length
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
