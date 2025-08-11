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
          sender: 'agent'
        })
        
        // Update session ID if provided
        if (response.sessionId && response.sessionId !== state.currentSession) {
          commit('SET_CURRENT_SESSION', response.sessionId)
        }
        
        // If this was a successful order action, update the orders store
        if (response.action && response.success && response.orderId) {
          const orderAction = response.action === 'cancel' ? 'cancelOrder' : 
                            response.action === 'return' ? 'returnOrder' : null;
          
          if (orderAction) {
            await dispatch(`orders/${orderAction}`, {
              orderId: response.orderId,
              reason: 'Customer request via chat'
            }, { root: true });
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
