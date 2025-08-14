// Agent module for AI agent logic and actions
const state = {
  isProcessing: false,
  lastAction: null,
  processingHistory: [],
  capabilities: [
    'cancel_order',
    'track_order', 
    'initiate_return',
    'provide_order_info',
    'general_support'
  ]
}

const mutations = {
  SET_PROCESSING(state, isProcessing) {
    state.isProcessing = isProcessing
  },

  SET_LAST_ACTION(state, action) {
    state.lastAction = action
  },

  ADD_TO_HISTORY(state, entry) {
    state.processingHistory.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...entry
    })
  }
}

const actions = {
  async processMessage({ commit, dispatch, rootState }, message) {
    commit('SET_PROCESSING', true)
    
    try {
      // Simulate AI processing with Gemini API
      const analysis = await analyzeMessage(message)
      
      commit('ADD_TO_HISTORY', {
        input: message,
        analysis,
        action: analysis.intent
      })

      // Execute action based on intent
      let result = null
      switch (analysis.intent) {
        case 'cancel_order':
          if (analysis.orderId) {
            result = await dispatch('orders/cancelOrder', {
              orderId: analysis.orderId,
              reason: analysis.reason || 'Customer request'
            }, { root: true })
          } else {
            await dispatch('chat/addAgentMessage', 
              "I'd be happy to help you cancel an order. Could you please provide the order number?",
              { root: true }
            )
          }
          break

        case 'track_order':
          if (analysis.orderId) {
            result = await dispatch('orders/trackOrder', analysis.orderId, { root: true })
          } else {
            await dispatch('chat/addAgentMessage', 
              "I can help you track your order. Please provide the order number you'd like to track.",
              { root: true }
            )
          }
          break

        case 'initiate_return':
          if (analysis.orderId) {
            result = await dispatch('orders/initiateReturn', {
              orderId: analysis.orderId,
              reason: analysis.reason || 'Customer request',
              items: analysis.items || []
            }, { root: true })
          } else {
            await dispatch('chat/addAgentMessage', 
              "I can help you with a return. Please provide the order number for the items you'd like to return.",
              { root: true }
            )
          }
          break

        case 'provide_order_info':
          if (analysis.orderId) {
            const order = rootState.orders.orders.find(o => o.id === analysis.orderId)
            if (order) {
              const orderInfo = `📋 **Order ${order.id}**\n\n` +
                `**Status:** ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}\n` +
                `**Items:** ${order.items.map(item => `${item.name} (Qty: ${item.qty})`).join(', ')}\n` +
                `**Total:** $${order.total}\n` +
                `**Order Date:** ${new Date(order.orderDate).toLocaleDateString()}\n` +
                (order.trackingNumber ? `**Tracking:** ${order.trackingNumber}` : '')
              
              await dispatch('chat/addAgentMessage', orderInfo, { root: true })
            } else {
              await dispatch('chat/addAgentMessage', 
                `I couldn't find an order with the number ${analysis.orderId}. Please check the order number and try again.`,
                { root: true }
              )
            }
          }
          break

        case 'general_support':
        default:
          // Generate contextual response
          const response = generateSupportResponse(message, analysis)
          await dispatch('chat/addAgentMessage', response, { root: true })
          break
      }

      commit('SET_LAST_ACTION', {
        intent: analysis.intent,
        orderId: analysis.orderId,
        success: result?.success !== false,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error processing message:', error)
      await dispatch('chat/addAgentMessage', 
        "I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
        { root: true }
      )
    } finally {
      commit('SET_PROCESSING', false)
    }
  }
}

// Simulate AI message analysis (in real app, this would call Gemini API)
async function analyzeMessage(message) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerMessage = message.toLowerCase()
      let intent = 'general_support'
      let orderId = null
      let reason = null
      let confidence = 0.5

      // Extract order ID patterns
      const orderPattern = /(?:order|#|ord-?)(\w+[-]?\w+)/i
      const orderMatch = message.match(orderPattern)
      if (orderMatch) {
        orderId = orderMatch[1].toUpperCase()
        if (!orderId.startsWith('ORD-')) {
          orderId = `ORD-${orderId}`
        }
      }

      // Intent classification
      if (lowerMessage.includes('cancel') && (lowerMessage.includes('order') || orderId)) {
        intent = 'cancel_order'
        confidence = 0.9
      } else if ((lowerMessage.includes('track') || lowerMessage.includes('status') || lowerMessage.includes('where')) && (lowerMessage.includes('order') || orderId)) {
        intent = 'track_order'
        confidence = 0.85
      } else if ((lowerMessage.includes('return') || lowerMessage.includes('refund')) && (lowerMessage.includes('order') || orderId)) {
        intent = 'initiate_return'
        confidence = 0.8
      } else if (lowerMessage.includes('order') && orderId) {
        intent = 'provide_order_info'
        confidence = 0.7
      }

      // Extract reason if provided
      if (lowerMessage.includes('because') || lowerMessage.includes('reason')) {
        const reasonStart = Math.max(
          lowerMessage.indexOf('because'),
          lowerMessage.indexOf('reason')
        )
        if (reasonStart !== -1) {
          reason = message.substring(reasonStart).replace(/^(because|reason:?)\s*/i, '')
        }
      }

      resolve({
        intent,
        orderId,
        reason,
        confidence,
        extractedEntities: { orderId, reason },
        originalMessage: message
      })
    }, 800) // Simulate API processing time
  })
}

// Generate contextual support responses
function generateSupportResponse(message, analysis) {
  const responses = [
    "I'm here to help! I can assist you with order cancellations, tracking, returns, and general inquiries. What would you like to know?",
    "Hi there! I'm your AI support agent. I can help you manage your orders, track shipments, process returns, and answer any questions you have.",
    "Hello! I'm ready to assist you with your order-related needs. Feel free to ask me about cancellations, tracking, returns, or any other questions.",
    "Welcome! I can help you with various order management tasks. Just let me know what you need assistance with.",
    "Hi! I'm here to provide instant support. Whether you need to cancel an order, track a shipment, or start a return, I'm ready to help!"
  ]

  // Return a random response for general queries
  return responses[Math.floor(Math.random() * responses.length)]
}

const getters = {
  isProcessing: state => state.isProcessing,
  lastAction: state => state.lastAction,
  processingHistory: state => state.processingHistory,
  capabilities: state => state.capabilities
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
