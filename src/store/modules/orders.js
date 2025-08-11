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
          name: 'AirPods Pro 2nd Gen', 
          variant: 'with MagSafe Case',
          qty: 2, 
          price: 249,
          image: 'https://via.placeholder.com/100x100?text=AirPods'
        }
      ],
      total: 498,
      orderDate: '2025-07-22T14:15:00Z',
      canCancel: false,
      canReturn: false,
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
        return { success: true, data: response.data }
      }
      return response
    } catch (error) {
      console.error('Error fetching orders:', error)
      // If API fails, keep using local data
      return { success: false, message: 'Using local order data', useLocal: true }
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

  async cancelOrder({ commit, state }, { orderId, reason = 'Customer request' }) {
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

      // Update local state immediately for better UX
      commit('UPDATE_ORDER_STATUS', {
        orderId,
        status: 'cancelled',
        additionalData: {
          cancellationReason: reason,
          cancelledAt: new Date().toISOString(),
          canCancel: false,
          canReturn: false
        }
      })
      
      return { 
        success: true, 
        message: `Order ${orderId} cancelled successfully`,
        order: order
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
      return { success: false, message: 'Failed to cancel order due to a network error' }
    }
  },

  async returnOrder({ commit, state }, { orderId, reason = 'Customer request' }) {
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

      // Update local state immediately for better UX
      commit('UPDATE_ORDER_STATUS', {
        orderId,
        status: 'return_requested',
        additionalData: {
          returnReason: reason,
          returnDate: new Date().toISOString(),
          canReturn: false
        }
      })
      
      return { 
        success: true, 
        message: `Return request for order ${orderId} submitted successfully`,
        order: order
      }
    } catch (error) {
      console.error('Error processing return:', error)
      return { success: false, message: 'Failed to process return due to a network error' }
    }
  }
}

const getters = {
  allOrders: state => state.orders,
  orderById: state => orderId => state.orders.find(o => o.id === orderId),
  selectedOrder: state => state.selectedOrder,
  actionHistory: state => state.actionHistory,
  ordersByStatus: state => status => state.orders.filter(o => o.status === status),
  totalOrderValue: state => state.orders.reduce((sum, order) => sum + order.total, 0),
  recentOrders: state => state.orders
    .slice()
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    .slice(0, 5),
  orderStatistics: state => {
    const stats = {}
    
    state.orders.forEach(order => {
      stats[order.status] = (stats[order.status] || 0) + 1
    })
    
    return stats
  },
  orderSummary: state => {
    const summary = {
      total: state.orders.length,
      byStatus: {},
      totalValue: 0,
      averageOrderValue: 0
    }
    
    state.orders.forEach(order => {
      // Count by status
      summary.byStatus[order.status] = (summary.byStatus[order.status] || 0) + 1
      // Add to total value
      summary.totalValue += order.total
    })
    
    // Calculate average order value
    summary.averageOrderValue = summary.total > 0 ? summary.totalValue / summary.total : 0
    
    return summary
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
