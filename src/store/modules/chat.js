// Chat module for managing chat conversations
import apiService from '../../services/apiService'

const state = {
  messages: [],
  isTyping: false,
  currentSession: null,
  chatHistory: []
}

const mutations = {
  ADD_MESSAGE(state, message) {
    state.messages.push({
      id: Date.now() + Math.random(),
      ...message,
      timestamp: new Date().toISOString()
    })
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
  }
}

const actions = {
  async sendMessage({ commit, state, dispatch }, { content, type = 'user' }) {
    // Add user message
    const userMessage = {
      content,
      type,
      sender: type === 'user' ? 'customer' : 'agent'
    }
    commit('ADD_MESSAGE', userMessage)

    if (type === 'user') {
      // Show typing indicator
      commit('SET_TYPING', true)
      
      try {
        // Send message to API
        const response = await apiService.sendMessage(content, state.currentSession)
        
        // Add agent response
        commit('ADD_MESSAGE', {
          content: response.message,
          type: 'agent',
          sender: 'agent',
          context: response.context
        })
        
        // Update session ID if provided
        if (response.sessionId && response.sessionId !== state.currentSession) {
          commit('SET_CURRENT_SESSION', response.sessionId)
        }
        
        // Handle order actions from AI response
        if (response.success && response.actions && response.actions.length > 0) {
          for (const action of response.actions) {
            await dispatch('processOrderAction', {
              action,
              orderId: response.orderId,
              intent: response.intent,
              aiResponse: response
            })
          }
        }
        
      } catch (error) {
        console.error('Error sending message:', error)
        commit('ADD_MESSAGE', {
          content: 'Sorry, I encountered an error. Please try again.',
          type: 'agent',
          sender: 'agent'
        })
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

  async loadChatHistory({ commit }, sessionId) {
    try {
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
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  },

  addAgentMessage({ commit }, content) {
    commit('ADD_MESSAGE', {
      content,
      type: 'agent',
      sender: 'agent'
    })
  },

  clearChat({ commit }) {
    commit('CLEAR_MESSAGES')
    commit('SET_CURRENT_SESSION', null)
  }
}

const getters = {
  chatMessages: state => state.messages,
  isAgentTyping: state => state.isTyping,
  lastMessage: state => state.messages[state.messages.length - 1] || null
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
