<template>
  <div class="order-card">
    <!-- Order Header -->
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">{{ order.id }}</h3>
        <p class="text-sm text-gray-500">
          Ordered on {{ formatDate(order.orderDate) }}
        </p>
      </div>
      
      <OrderStatus :status="order.status" />
    </div>

    <!-- Customer Info -->
    <div class="mb-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-medium">
            {{ order.customerName.charAt(0) }}
          </span>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-900">{{ order.customerName }}</p>
          <p class="text-xs text-gray-500">{{ order.customerEmail }}</p>
        </div>
      </div>
    </div>

    <!-- Order Items -->
    <div class="mb-4">
      <h4 class="text-sm font-medium text-gray-900 mb-2">Items ({{ order.items.length }})</h4>
      <div class="space-y-2">
        <div 
          v-for="item in order.items" 
          :key="item.id"
          class="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
        >
          <img 
            :src="item.image" 
            :alt="item.name"
            class="w-12 h-12 object-cover rounded-lg"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ item.name }}
            </p>
            <p class="text-xs text-gray-500">{{ item.variant }}</p>
            <p class="text-xs text-gray-600">Qty: {{ item.qty }} • ${{ item.price }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Total -->
    <div class="mb-4 p-3 bg-primary-50 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium text-gray-900">Total</span>
        <span class="text-lg font-bold text-primary-600">${{ order.total }}</span>
      </div>
    </div>

    <!-- Tracking Info (if applicable) -->
    <div v-if="order.trackingNumber && order.status !== 'cancelled'" class="mb-4 p-3 bg-blue-50 rounded-lg">
      <div class="flex items-center space-x-2">
        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0H4m16 0l-2-2m0 0l-2 2m2-2v-2m0 2v2"></path>
        </svg>
        <div class="flex-1">
          <p class="text-sm font-medium text-blue-900">{{ order.carrier }}: {{ order.trackingNumber }}</p>
          <p class="text-xs text-blue-700">
            {{ order.status === 'delivered' ? 'Delivered' : `Est. delivery: ${formatDate(order.estimatedDelivery)}` }}
          </p>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-wrap gap-2">
      <button
        v-if="order.canCancel"
        @click="handleAction('cancel')"
        class="flex-1 btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Cancel Order
      </button>
      
      <button
        v-if="order.trackingNumber"
        @click="handleAction('track')"
        class="flex-1 btn-secondary text-blue-600 hover:bg-blue-50 hover:text-blue-700"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        Track Order
      </button>
      
      <button
        v-if="order.canReturn"
        @click="handleAction('return')"
        class="flex-1 btn-secondary text-orange-600 hover:bg-orange-50 hover:text-orange-700"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
        </svg>
        Return Items
      </button>
    </div>
  </div>
</template>

<script>
import OrderStatus from './OrderStatus.vue'

export default {
  name: 'OrderCard',
  components: {
    OrderStatus
  },
  props: {
    order: {
      type: Object,
      required: true
    }
  },
  methods: {
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },
    
    handleAction(action) {
      this.$emit('action-triggered', {
        action,
        orderId: this.order.id,
        data: {
          reason: 'Manual action from order management'
        }
      })
    }
  }
}
</script>
