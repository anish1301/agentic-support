<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900">Order Summary</h3>
    </div>

    <!-- Order Statistics -->
    <div class="p-4">
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div 
          v-for="(count, status) in orderStatistics" 
          :key="status"
          class="text-center p-3 bg-gray-50 rounded-lg"
        >
          <div class="text-2xl font-bold text-gray-900">{{ count }}</div>
          <div class="text-sm text-gray-600 capitalize">{{ status }}</div>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="mb-6">
        <h4 class="text-sm font-medium text-gray-900 mb-3">Recent Orders</h4>
        <div class="space-y-2">
          <div 
            v-for="order in recentOrders" 
            :key="order.id"
            class="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
          >
            <div>
              <div class="font-medium text-gray-900">{{ order.id }}</div>
              <div class="text-gray-500">${{ order.total }}</div>
            </div>
            <OrderStatus :status="order.status" />
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mb-6">
        <h4 class="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
        <div class="space-y-2">
          <button
            v-for="action in quickActions"
            :key="action.label"
            @click="triggerQuickAction(action)"
            class="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-2"
          >
            <span v-html="action.icon"></span>
            <span>{{ action.label }}</span>
          </button>
        </div>
      </div>

      <!-- Action History -->
      <div>
        <h4 class="text-sm font-medium text-gray-900 mb-3">Recent Actions</h4>
        <div class="space-y-2 max-h-32 overflow-y-auto">
          <div 
            v-for="action in actionHistory.slice(-5)" 
            :key="action.id"
            class="p-2 bg-gray-50 rounded-lg text-xs"
          >
            <div class="font-medium text-gray-900">{{ action.action }}</div>
            <div class="text-gray-500">
              {{ action.orderId }} • {{ formatTimestamp(action.timestamp) }}
            </div>
          </div>
          
          <div v-if="actionHistory.length === 0" class="text-center py-4 text-gray-500 text-sm">
            No recent actions
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import OrderStatus from './OrderStatus.vue'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'OrdersSidebar',
  components: {
    OrderStatus
  },
  data() {
    return {
      quickActions: [
        {
          label: 'Cancel Order ORD-12345',
          icon: '<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
          action: 'cancel',
          orderId: 'ORD-12345'
        },
        {
          label: 'Track Order ORD-12346',
          icon: '<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>',
          action: 'track',
          orderId: 'ORD-12346'
        },
        {
          label: 'Return Order ORD-12347',
          icon: '<svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>',
          action: 'return',
          orderId: 'ORD-12347'
        }
      ]
    }
  },
  computed: {
    ...mapState('orders', ['orders', 'actionHistory']),
    ...mapGetters('orders', ['orderStatistics']),
    
    recentOrders() {
      return this.orders
        .slice()
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        .slice(0, 5)
    }
  },
  methods: {
    async triggerQuickAction(action) {
      const message = `${action.action} order ${action.orderId}`
      
      // Send message to chat to trigger AI processing
      this.$store.dispatch('chat/sendMessage', { 
        content: message, 
        type: 'user' 
      })
    },
    
    formatTimestamp(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      
      if (diffInMinutes < 1) return 'Just now'
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      
      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) return `${diffInHours}h ago`
      
      return date.toLocaleDateString()
    }
  }
}
</script>
