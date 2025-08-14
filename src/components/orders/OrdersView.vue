<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 theme-transition">
    <!-- Header -->
    <div class="p-6 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">Order Management</h2>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-500">{{ orders.length }} orders</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="p-4 border-b border-gray-200 bg-gray-50">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="status in orderStatuses"
          :key="status.value"
          @click="selectedStatus = selectedStatus === status.value ? null : status.value"
          :class="[
            'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            selectedStatus === status.value
              ? 'bg-primary-600 text-white'
            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 theme-transition'
          ]"
        >
          {{ status.label }} ({{ getOrderCountByStatus(status.value) }})
        </button>
      </div>
    </div>

    <!-- Orders List -->
    <div class="divide-y divide-gray-200">
      <div 
        v-for="order in filteredOrders" 
        :key="order.id"
        class="p-6 hover:bg-gray-50 transition-colors"
      >
        <OrderCard 
          :order="order"
          @action-triggered="handleOrderAction"
        />
      </div>
      
      <!-- Empty State -->
      <div v-if="filteredOrders.length === 0" class="p-12 text-center">
        <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-1">No orders found</h3>
        <p class="text-gray-500">
          {{ selectedStatus ? `No orders with status "${selectedStatus}"` : 'No orders available' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import OrderCard from './OrderCard.vue'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'OrdersView',
  components: {
    OrderCard
  },
  data() {
    return {
      selectedStatus: null,
      orderStatuses: [
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    }
  },
  computed: {
    ...mapState('orders', ['orders']),
    ...mapGetters('orders', ['orderStatistics']),
    
    filteredOrders() {
      if (!this.selectedStatus) return this.orders
      return this.orders.filter(order => order.status === this.selectedStatus)
    }
  },
  methods: {
    getOrderCountByStatus(status) {
      return this.orderStatistics[status] || 0
    },
    
    async handleOrderAction({ action, orderId, data }) {
      try {
        this.$store.dispatch('ui/setLoading', true)
        
        switch (action) {
          case 'cancel':
            await this.$store.dispatch('orders/cancelOrder', { 
              orderId, 
              reason: data?.reason || 'Manual cancellation' 
            })
            this.$store.dispatch('ui/showNotification', {
              message: `Order ${orderId} has been cancelled successfully`,
              type: 'success'
            })
            break
            
          case 'track':
            await this.$store.dispatch('orders/trackOrder', orderId)
            break
            
          case 'return':
            await this.$store.dispatch('orders/initiateReturn', {
              orderId,
              items: data?.items || [],
              reason: data?.reason || 'Customer request'
            })
            this.$store.dispatch('ui/showNotification', {
              message: `Return initiated for order ${orderId}`,
              type: 'success'
            })
            break
        }
      } catch (error) {
        console.error('Order action failed:', error)
        this.$store.dispatch('ui/showNotification', {
          message: 'Action failed. Please try again.',
          type: 'error'
        })
      } finally {
        this.$store.dispatch('ui/setLoading', false)
      }
    }
  }
}
</script>
