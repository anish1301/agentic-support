// Orders module for managing customer orders
import apiService from '../../services/apiService'

const state = {
  orders: [
    {
      id: 'ORD-12345',
      customerId: 'CUST-001',
      customerName: 'John Doe',
      customerEmail: 'john.doe@email.com',
      status: 'confirmed',
      items: [
        { 
          id: 'ITEM-001',
          name: 'iPhone 14 Pro Max', 
          variant: '256GB Deep Purple',
          qty: 1, 
          price: 1099,
          image: 'https://via.placeholder.com/100x100?text=iPhone'
        }
      ],
      total: 1099,
      orderDate: '2025-07-25T10:30:00Z',
      canCancel: true,
      canReturn: false,
      trackingNumber: '1Z999AA1234567890',
      carrier: 'UPS',
      estimatedDelivery: '2025-07-30T18:00:00Z'
    },
    {
      id: 'ORD-12346',
      customerId: 'CUST-001',
      customerName: 'John Doe',
      customerEmail: 'john.doe@email.com',
      status: 'shipped',
      items: [
        { 
          id: 'ITEM-002',
          name: 'AirPods Pro (2nd generation)', 
          variant: 'White',
          qty: 2, 
          price: 249,
          image: 'https://via.placeholder.com/100x100?text=AirPods'
        }
      ],
      total: 498,
      orderDate: '2025-07-23T14:15:00Z',
      canCancel: false,
      canReturn: true,
      trackingNumber: '1Z999BB9876543210',
      carrier: 'FedEx',
      estimatedDelivery: '2025-07-29T16:00:00Z'
    },
    {
      id: 'ORD-12347',
      customerId: 'CUST-002',
      customerName: 'Jane Smith',
      customerEmail: 'jane.smith@email.com',
      status: 'delivered',
      items: [
        { 
          id: 'ITEM-003',
          name: 'MacBook Air M2', 
          variant: '13-inch, 8GB RAM, 256GB SSD, Midnight',
          qty: 1, 
          price: 1199,
          image: 'https://via.placeholder.com/100x100?text=MacBook'
        }
      ],
      total: 1199,
      orderDate: '2025-07-20T09:45:00Z',
      canCancel: false,
      canReturn: true,
      trackingNumber: '1Z999CC1122334455',
      carrier: 'UPS',
      deliveredDate: '2025-07-25T14:30:00Z'
    }
  ],
  selectedOrder: null,
  actionHistory: []
}

const mutations = {
  SET_ORDERS(state, orders) {
    state.orders = orders
  },

  UPDATE_ORDER(state, updatedOrder) {
    const index = state.orders.findIndex(o => o.id === updatedOrder.id)
    if (index !== -1) {
      state.orders[index] = { ...state.orders[index], ...updatedOrder }
    } else {
      state.orders.push(updatedOrder)
    }
  },

  UPDATE_ORDER_STATUS(state, { orderId, status, additionalData = {} }) {
    const order = state.orders.find(o => o.id === orderId)
    if (order) {
      order.status = status
      Object.assign(order, additionalData)
      
      // Add to action history
      state.actionHistory.push({
        id: Date.now(),
        orderId,
        action: `Status changed to ${status}`,
        timestamp: new Date().toISOString(),
        ...additionalData
      })
    }
  },

  SET_SELECTED_ORDER(state, order) {
    state.selectedOrder = order
  },

  ADD_ACTION_TO_HISTORY(state, action) {
    state.actionHistory.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...action
    })
  },

  UPDATE_ORDER_TRACKING(state, { orderId, trackingInfo }) {
    const order = state.orders.find(o => o.id === orderId)
    if (order) {
      Object.assign(order, trackingInfo)
    }
  }
}

const actions = {
  async fetchOrders({ commit }) {
    try {
      const response = await apiService.getOrders()
      if (response.success) {
        commit('SET_ORDERS', response.data)
      }
      return response
    } catch (error) {
      console.error('Error fetching orders:', error)
      throw error
    }
  },

  async fetchOrder({ commit }, orderId) {
    try {
      const response = await apiService.getOrder(orderId)
      if (response.success) {
        commit('UPDATE_ORDER', response.data)
      }
      return response
    } catch (error) {
      console.error('Error fetching order:', error)
      throw error
    }
  },

  async cancelOrder({ commit, state, dispatch }, { orderId, reason = 'Customer request' }) {
    try {
      // Find the order in local state
      const order = state.orders.find(o => o.id === orderId)
      
      if (!order) {
        return { success: false, message: 'Order not found' }
      }

      if (order.status === 'cancelled') {
        return { success: false, message: 'Order is already cancelled' }
      }

      if (order.status === 'delivered') {
        return { 
          success: false, 
          message: 'This order has already been delivered and cannot be cancelled.' 
        }
      }

      // Call API to cancel order
      const response = await apiService.cancelOrder(orderId)
      
      if (response.success) {
        // Update local state
        commit('UPDATE_ORDER_STATUS', {
          orderId,
          status: 'cancelled',
          additionalData: {
            cancellationReason: reason,
            cancelledAt: new Date().toISOString(),
            refundAmount: order.total,
            refundStatus: 'processing',
            estimatedRefundDays: '3-5 business days'
          }
        })
        
        return { 
          success: true, 
          message: `Order ${orderId} cancelled successfully`,
          order: response.data
        }
      } else {
        return { success: false, message: response.message || 'Failed to cancel order' }
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
      return { success: false, message: 'Failed to cancel order due to a network error' }
    }
  async returnOrder({ commit, state, dispatch }, { orderId, reason = 'Customer request' }) {
    try {
      // Find the order in local state  
      const order = state.orders.find(o => o.id === orderId)
      
      if (!order) {
        return { success: false, message: 'Order not found' }
      }

      if (order.status !== 'delivered') {
        return { 
          success: false, 
          message: 'Only delivered orders can be returned' 
        }
      }

      // Call API to return order
      const response = await apiService.returnOrder(orderId)
      
      if (response.success) {
        // Update local state
        commit('UPDATE_ORDER_STATUS', {
          orderId,
          status: 'return_requested',
          additionalData: {
            returnReason: reason,
            returnDate: new Date().toISOString(),
            refundAmount: order.total,
            refundStatus: 'pending',
            estimatedRefundDays: '5-7 business days'
          }
        })
        
        return { 
          success: true, 
          message: `Return request for order ${orderId} submitted successfully`,
          order: response.data
        }
      } else {
        return { success: false, message: response.message || 'Failed to process return' }
      }
    } catch (error) {
      console.error('Error processing return:', error)
      return { success: false, message: 'Failed to process return due to a network error' }
    }
  },  async trackOrder({ commit, dispatch }, orderId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const order = state.orders.find(o => o.id === orderId)
        
        if (!order) {
          resolve({ success: false, message: 'Order not found' })
          return
        }

        // Simulate real tracking info
        const trackingInfo = {
          trackingNumber: order.trackingNumber,
          carrier: order.carrier,
          status: order.status,
          estimatedDelivery: order.estimatedDelivery,
          trackingHistory: [
            { date: '2025-07-25T10:30:00Z', status: 'Order Confirmed', location: 'Processing Center' },
            { date: '2025-07-26T14:20:00Z', status: 'Shipped', location: 'Distribution Center' },
            { date: '2025-07-27T09:15:00Z', status: 'In Transit', location: 'Regional Hub' },
            { date: '2025-07-28T16:45:00Z', status: 'Out for Delivery', location: 'Local Facility' }
          ]
        }

        let statusMessage = ''
        switch (order.status) {
          case 'confirmed':
            statusMessage = `📦 Your order ${orderId} is confirmed and being prepared for shipment.`
            break
          case 'shipped':
            statusMessage = `🚚 Your order ${orderId} has been shipped via ${order.carrier}. Tracking number: ${order.trackingNumber}. Expected delivery: ${new Date(order.estimatedDelivery).toLocaleDateString()}.`
            break
          case 'delivered':
            statusMessage = `✅ Your order ${orderId} has been delivered on ${new Date(order.deliveredDate).toLocaleDateString()}.`
            break
          case 'cancelled':
            statusMessage = `❌ Your order ${orderId} has been cancelled.`
            break
        }

        dispatch('chat/addAgentMessage', statusMessage, { root: true })

        resolve({ 
          success: true, 
          order,
          trackingInfo
        })
      }, 1000)
    })
  },

  async initiateReturn({ commit, dispatch }, { orderId, items, reason }) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const order = state.orders.find(o => o.id === orderId)
        
        if (!order) {
          resolve({ success: false, message: 'Order not found' })
          return
        }

        if (!order.canReturn) {
          resolve({ 
            success: false, 
            message: 'This order is not eligible for return.' 
          })
          return
        }

        const returnId = `RET-${Date.now()}`
        
        commit('ADD_ACTION_TO_HISTORY', {
          orderId,
          action: 'Return initiated',
          returnId,
          reason,
          items
        })

        dispatch('chat/addAgentMessage', 
          `📤 Return request ${returnId} has been initiated for order ${orderId}. You'll receive a return label via email within 24 hours.`,
          { root: true }
        )

        resolve({ 
          success: true, 
          returnId,
          message: 'Return initiated successfully'
        })
      }, 1200)
    })
  }
}

const getters = {
  getOrderById: (state) => (orderId) => {
    return state.orders.find(order => order.id === orderId)
  },

  getOrdersByCustomer: (state) => (customerId) => {
    return state.orders.filter(order => order.customerId === customerId)
  },

  getActionHistory: state => state.actionHistory,

  orderStatistics: state => {
    const stats = state.orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {})
    return stats
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
