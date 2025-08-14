<!--
  Enhanced Order Status with Contextual Undo/Redo
  Shows status with inline undo/redo buttons when applicable
-->
<template>
  <div class="flex items-center space-x-2">
    <!-- Status Badge -->
    <span 
      :class="[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        statusClasses[status] || statusClasses.default
      ]"
    >
      <span :class="['w-1.5 h-1.5 mr-1.5 rounded-full', dotClasses[status] || dotClasses.default]"></span>
      {{ statusLabels[status] || status }}
    </span>

    <!-- Undo/Redo Buttons (shown when applicable) -->
    <div v-if="showUndoRedo" class="flex items-center space-x-1">
      <!-- Undo Button -->
      <button
        v-if="canUndoForOrder"
        @click="handleUndo"
        :disabled="!canPerformUndo"
        class="p-1 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        :class="{ 'opacity-50 cursor-not-allowed': !canPerformUndo }"
        :title="undoTooltip"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
        </svg>
      </button>

      <!-- Redo Button -->
      <button
        v-if="canRedoForOrder"
        @click="handleRedo"
        :disabled="!canPerformRedo"
        class="p-1 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
        :class="{ 'opacity-50 cursor-not-allowed': !canPerformRedo }"
        :title="redoTooltip"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6"></path>
        </svg>
      </button>

      <!-- Rate Limit Warning -->
      <span v-if="undoRedoCount >= 2" class="text-xs text-orange-500" :title="rateLimitWarning">
        ⚠️
      </span>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { undoRedoRateLimit } from '../../store/utils/rateLimiter'

export default {
  name: 'OrderStatus',
  props: {
    status: {
      type: String,
      required: true
    },
    orderId: {
      type: String,
      required: true
    }
  },
  
  data() {
    return {
      statusLabels: {
        confirmed: 'Confirmed',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        processing: 'Processing',
        refunded: 'Refunded',
        return_requested: 'Return Requested'
      },
      statusClasses: {
        confirmed: 'bg-yellow-100 text-yellow-800',
        shipped: 'bg-blue-100 text-blue-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        processing: 'bg-purple-100 text-purple-800',
        refunded: 'bg-gray-100 text-gray-800',
        return_requested: 'bg-orange-100 text-orange-800',
        default: 'bg-gray-100 text-gray-800'
      },
      dotClasses: {
        confirmed: 'bg-yellow-400',
        shipped: 'bg-blue-400',
        delivered: 'bg-green-400',
        cancelled: 'bg-red-400',
        processing: 'bg-purple-400',
        refunded: 'bg-gray-400',
        return_requested: 'bg-orange-400',
        default: 'bg-gray-400'
      }
    }
  },

  computed: {
    // Check if undo/redo should be shown for this specific order
    showUndoRedo() {
      return this.canUndoCurrentStatus || this.canRedoForOrder
    },

    // Check if current status can be undone
    canUndoCurrentStatus() {
      return this.status === 'cancelled' || this.status === 'return_requested'
    },

    // Check if this specific order can be undone
    canUndoForOrder() {
      return this.canUndoCurrentStatus
    },

    // Check if this specific order can be redone
    canRedoForOrder() {
      const redoHistory = this.$store.helpers?.getRedoHistory() || []
      return redoHistory.some(entry => entry.orderId === this.orderId)
    },

    // Rate limiting check for undo
    canPerformUndo() {
      const rateCheck = undoRedoRateLimit.canPerformOperation(this.orderId)
      return this.canUndoCurrentStatus && rateCheck.allowed
    },

    // Rate limiting check for redo  
    canPerformRedo() {
      const rateCheck = undoRedoRateLimit.canPerformOperation(this.orderId)
      return this.canRedoForOrder && rateCheck.allowed
    },

    // Count of undo/redo operations for this order
    undoRedoCount() {
      return undoRedoRateLimit.getOperationCount(this.orderId)
    },

    // Tooltips
    undoTooltip() {
      const rateCheck = undoRedoRateLimit.canPerformOperation(this.orderId)
      
      if (!rateCheck.allowed) {
        return rateCheck.message
      }
      
      if (this.status === 'cancelled') {
        return 'Undo cancellation - restore order to confirmed status'
      } else if (this.status === 'return_requested') {
        return 'Undo return request - restore order to delivered status'  
      }
      
      return 'Undo last action'
    },

    redoTooltip() {
      const rateCheck = undoRedoRateLimit.canPerformOperation(this.orderId)
      
      if (!rateCheck.allowed) {
        return rateCheck.message
      }
      
      const redoHistory = this.$store.helpers?.getRedoHistory() || []
      const lastRedo = redoHistory.find(entry => entry.orderId === this.orderId)
      return lastRedo ? `Redo: ${lastRedo.description}` : 'Redo last action'
    },

    rateLimitWarning() {
      const rateCheck = undoRedoRateLimit.canPerformOperation(this.orderId)
      return `${rateCheck.remaining || 0} operations remaining`
    }
  },

  methods: {
    ...mapActions('ui', ['showNotification']),

    async handleUndo() {
      const rateCheck = undoRedoRateLimit.canPerformOperation(this.orderId)
      
      if (!rateCheck.allowed) {
        this.showNotification({
          type: 'warning',
          message: rateCheck.message
        })
        return
      }

      try {
        // Get current order to determine what to undo
        const currentOrder = this.$store.getters['orders/orderById'](this.orderId)
        
        if (!currentOrder) {
          this.showNotification({
            type: 'warning',
            message: 'Order not found'
          })
          return
        }

        let undoEndpoint = null
        let undoMessage = ''

        // Determine what action to undo based on current status
        if (currentOrder.status === 'cancelled') {
          undoEndpoint = `/api/orders/${this.orderId}/undo-cancel`
          undoMessage = 'Order cancellation undone successfully'
        } else if (currentOrder.status === 'return_requested') {
          undoEndpoint = `/api/orders/${this.orderId}/undo-return`
          undoMessage = 'Return request undone successfully'
        } else {
          this.showNotification({
            type: 'warning',
            message: 'No recent action to undo for this order'
          })
          return
        }

        // Call the backend undo endpoint
        const response = await fetch(`http://localhost:3002${undoEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const result = await response.json()
        
        if (result.success) {
          // Update the order in the store
          this.$store.commit('orders/UPDATE_ORDER', result.data)
          
          // Record the operation for rate limiting
          const stats = undoRedoRateLimit.recordOperation(this.orderId)
          
          this.showNotification({
            type: 'success',
            message: `✅ ${undoMessage} (${stats.remaining} operations remaining)`,
            duration: 4000
          })
        } else {
          this.showNotification({
            type: 'error',
            message: result.message || 'Undo failed'
          })
        }
      } catch (error) {
        console.error('Undo failed:', error)
        this.showNotification({
          type: 'error',
          message: 'Undo operation failed'
        })
      }
    },

    async handleRedo() {
      const rateCheck = undoRedoRateLimit.canPerformOperation(this.orderId)
      
      if (!rateCheck.allowed) {
        this.showNotification({
          type: 'warning',
          message: rateCheck.message
        })
        return
      }

      try {
        // Get only redo entries for this order
        const redoHistory = this.$store.helpers?.getRedoHistory() || []
        const orderRedoEntry = redoHistory.reverse().find(entry => entry.orderId === this.orderId)
        
        if (!orderRedoEntry) {
          this.showNotification({
            type: 'warning',
            message: 'No redo available for this order'
          })
          return
        }

        const result = this.$store.helpers?.redo()
        
        if (result?.success) {
          // Record the operation
          const stats = undoRedoRateLimit.recordOperation(this.orderId)
          
          this.showNotification({
            type: 'success',
            message: `✅ ${result.message} (${stats.remaining} operations remaining)`,
            duration: 4000
          })
        } else {
          this.showNotification({
            type: 'error',
            message: result?.message || 'Redo failed'
          })
        }
      } catch (error) {
        console.error('Redo failed:', error)
        this.showNotification({
          type: 'error',
          message: 'Redo operation failed'
        })
      }
    }
  }
}
</script>
